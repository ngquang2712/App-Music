use reqwest::header::{HeaderMap, HeaderName, HeaderValue, RANGE};
use reqwest::Client;
use std::collections::HashMap;
use crate::models::StreamResult;
use crate::services::offline::OfflineCache;
use std::path::Path;
use std::sync::{Arc, Mutex, RwLock, Weak};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

#[allow(dead_code)]
pub struct StreamServer {
    port: u16,
    client: Client,
    pub offline: Arc<OfflineCache>,
    prepared: RwLock<HashMap<String, (Instant, StreamResult)>>,
    preparation_locks: Mutex<HashMap<String, Weak<tokio::sync::Mutex<()>>>>,
}

#[allow(dead_code)]
impl StreamServer {
    pub async fn start<P: AsRef<Path>>(root_dir: P) -> Result<Arc<Self>, String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Failed to bind stream server: {}", e))?;

        let port = listener
            .local_addr()
            .map_err(|e| format!("Failed to get local port: {}", e))?
            .port();

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_else(|_| Client::new());

        let cache_dir = root_dir.as_ref().join("cache").join("audio");
        let _ = std::fs::create_dir_all(&cache_dir);

        let server = Arc::new(Self {
            port,
            client,
            offline: OfflineCache::new(cache_dir),
            prepared: RwLock::new(HashMap::new()),
            preparation_locks: Mutex::new(HashMap::new()),
        });
        let server_clone = server.clone();

        tokio::spawn(async move {
            loop {
                if let Ok((socket, _)) = listener.accept().await {
                    let server_ref = server_clone.clone();
                    tokio::spawn(async move {
                        let _ = server_ref.handle_connection(socket).await;
                    });
                }
            }
        });

        Ok(server)
    }

    pub fn cache_dir(&self) -> &Path { self.offline.directory() }
    pub fn preparation_lock(&self, source: &str, id: &str) -> Arc<tokio::sync::Mutex<()>> {
        let key = Self::cache_key(source, id);
        let mut locks = self.preparation_locks.lock().unwrap();
        locks.retain(|_, lock| lock.strong_count() > 0);
        if let Some(lock) = locks.get(&key).and_then(Weak::upgrade) { return lock; }
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        locks.insert(key, Arc::downgrade(&lock));
        lock
    }
    pub fn prepared_stream(&self, source: &str, id: &str) -> Option<StreamResult> {
        let cache = self.prepared.read().ok()?;
        let (created, result) = cache.get(&Self::cache_key(source, id))?;
        if created.elapsed() >= Duration::from_secs(75) { return None; }
        if let Ok(url) = url::Url::parse(&result.stream_url) {
            let now = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
            if url.query_pairs().any(|(key, value)| {
                matches!(key.as_ref(), "expire" | "expires") && value.parse::<u64>().is_ok_and(|time| time <= now + 30)
            }) { return None; }
        }
        Some(result.clone())
    }
    pub fn remember_stream(&self, source: &str, id: &str, result: &StreamResult) {
        if let Ok(mut cache) = self.prepared.write() {
            cache.retain(|_, (created, _)| created.elapsed() < Duration::from_secs(75));
            cache.insert(Self::cache_key(source, id), (Instant::now(), result.clone()));
        }
    }
    pub fn cache_key(source: &str, id: &str) -> String { OfflineCache::key(source, id) }
    pub fn is_cached(&self, source: &str, id: &str) -> bool { self.offline.cached_file(source, id).is_some() }
    pub fn get_cached_content_type(&self, source: &str, id: &str) -> String {
        self.offline.cached_file(source, id).map(|(_,ctype)| ctype).unwrap_or_else(|| "audio/webm".into())
    }

    pub fn get_stream_url(&self, direct_url: &str, content_type: &str) -> String {
        format!(
            "http://127.0.0.1:{}/stream?url={}&type={}",
            self.port,
            url::form_urlencoded::byte_serialize(direct_url.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(content_type.as_bytes()).collect::<String>()
        )
    }

    pub fn get_stream_url_with_meta(
        &self,
        id: &str,
        source: &str,
        direct_url: &str,
        content_type: &str,
        http_headers: &HashMap<String, String>,
    ) -> String {
        let headers_json = serde_json::to_string(http_headers).unwrap_or_else(|_| "{}".into());
        format!(
            "http://127.0.0.1:{}/stream?id={}&source={}&url={}&type={}&headers={}",
            self.port,
            url::form_urlencoded::byte_serialize(id.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(source.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(direct_url.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(content_type.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(headers_json.as_bytes()).collect::<String>()
        )
    }

    pub fn get_cached_stream_url(&self, id: &str, source: &str, content_type: &str) -> String {
        format!(
            "http://127.0.0.1:{}/stream?id={}&source={}&type={}&cached=1",
            self.port,
            url::form_urlencoded::byte_serialize(id.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(source.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(content_type.as_bytes()).collect::<String>()
        )
    }

    async fn handle_connection(
        &self,
        mut socket: TcpStream,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut request_bytes = Vec::new();
        let mut buffer = [0u8; 4096];
        loop {
            let n =
                tokio::time::timeout(std::time::Duration::from_secs(10), socket.read(&mut buffer))
                    .await??;
            if n == 0 {
                return Ok(());
            }
            request_bytes.extend_from_slice(&buffer[..n]);
            if request_bytes.len() > 65536 {
                socket.write_all(b"HTTP/1.1 431 Request Header Fields Too Large\r\nContent-Length: 0\r\n\r\n").await?;
                return Ok(());
            }
            if request_bytes.windows(4).any(|part| part == b"\r\n\r\n") {
                break;
            }
        }

        let request_str = String::from_utf8_lossy(&request_bytes);
        let mut lines = request_str.lines();
        let request_line = match lines.next() {
            Some(l) => l,
            None => return Ok(()),
        };

        let mut parts = request_line.split_whitespace();
        let method = parts.next().unwrap_or("GET");
        let path_and_query = parts.next().unwrap_or("/");

        if method != "GET" && method != "HEAD" {
            let res = "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n";
            socket.write_all(res.as_bytes()).await?;
            return Ok(());
        }

        let mut range_header: Option<String> = None;
        for line in lines {
            if line.is_empty() {
                break;
            }
            if let Some(pos) = line.find(':') {
                let name = line[..pos].trim();
                let val = line[pos + 1..].trim();
                if name.eq_ignore_ascii_case("range") {
                    range_header = Some(val.to_string());
                }
            }
        }

        let parsed_url = match url::Url::parse(&format!("http://127.0.0.1{}", path_and_query)) {
            Ok(u) => u,
            Err(_) => {
                let res = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n";
                socket.write_all(res.as_bytes()).await?;
                return Ok(());
            }
        };

        if parsed_url.path() != "/stream" {
            let res = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
            socket.write_all(res.as_bytes()).await?;
            return Ok(());
        }

        let query_pairs: HashMap<String, String> = parsed_url.query_pairs().into_owned().collect();
        let http_headers: HashMap<String, String> = query_pairs
            .get("headers")
            .and_then(|value| serde_json::from_str(value).ok())
            .unwrap_or_default();
        let track_id = query_pairs.get("id").map(|s| s.as_str()).unwrap_or("");
        let source = query_pairs.get("source").map(|s| s.as_str()).unwrap_or("");
        let content_type = query_pairs
            .get("type")
            .map(|s| s.as_str())
            .unwrap_or("audio/webm");

        if let Some((cache_file, cached_type)) = self.offline.cached_file(source, track_id) {
            let file_len = tokio::fs::metadata(&cache_file).await?.len();
            return self.serve_local_file(socket, &cache_file, file_len, &cached_type, range_header.as_deref(), method == "HEAD").await;
        }
        if query_pairs.get("cached").is_some_and(|value| value == "1") {
            socket.write_all(b"HTTP/1.1 404 Offline File Missing\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\n\r\n").await?;
            return Ok(());
        }

        let direct_url = match query_pairs.get("url") {
            Some(u) if !u.is_empty() => u,
            _ => {
                let res = "HTTP/1.1 400 Missing URL\r\nContent-Length: 0\r\n\r\n";
                socket.write_all(res.as_bytes()).await?;
                return Ok(());
            }
        };

        let mut req_builder = self
            .client
            .get(direct_url)
            .headers(upstream_headers(&http_headers));

        if let Some(ref r) = range_header {
            if let Ok(val) = HeaderValue::from_str(r) {
                req_builder = req_builder.header(RANGE, val);
            }
        }

        let mut upstream_resp = match req_builder.send().await {
            Ok(r) => r,
            Err(_) => {
                let res = "HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n";
                socket.write_all(res.as_bytes()).await?;
                return Ok(());
            }
        };

        let status = upstream_resp.status();
        let headers: &HeaderMap = upstream_resp.headers();

        let mut response_header = format!(
            "HTTP/1.1 {}\r\nContent-Type: {}\r\nAccept-Ranges: bytes\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Range\r\nCache-Control: no-cache\r\n",
            format!("{} {}", status.as_u16(), status.canonical_reason().unwrap_or("Upstream")),
            content_type
        );

        if let Some(cl) = headers.get("content-length") {
            if let Ok(val) = cl.to_str() {
                response_header.push_str(&format!("Content-Length: {}\r\n", val));
            }
        }

        if let Some(cr) = headers.get("content-range") {
            if let Ok(val) = cr.to_str() {
                response_header.push_str(&format!("Content-Range: {}\r\n", val));
            }
        }

        response_header.push_str("\r\n");
        socket.write_all(response_header.as_bytes()).await?;

        if method == "HEAD" {
            return Ok(());
        }

        while let Some(chunk) = upstream_resp.chunk().await? {
            if socket.write_all(&chunk).await.is_err() {
                break;
            }
        }

        Ok(())
    }

    async fn serve_local_file(
        &self,
        mut socket: TcpStream,
        file_path: &Path,
        file_len: u64,
        content_type: &str,
        range_header: Option<&str>,
        is_head: bool,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut file = tokio::fs::File::open(file_path).await?;

        let (start, end) = match byte_range(range_header, file_len) {
            Some(range) => range,
            None => {
                socket.write_all(format!("HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */{file_len}\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\n\r\n").as_bytes()).await?;
                return Ok(());
            }
        };
        let partial = range_header.is_some();
        let status_line = if partial { "HTTP/1.1 206 Partial Content" } else { "HTTP/1.1 200 OK" };
        let chunk_len = end - start + 1;

        let mut headers = format!(
            "{}\r\nContent-Type: {}\r\nAccept-Ranges: bytes\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Range\r\nCache-Control: public, max-age=31536000\r\nContent-Length: {}\r\n",
            status_line, content_type, chunk_len
        );

        if status_line.contains("206") {
            headers.push_str(&format!(
                "Content-Range: bytes {}-{}/{}\r\n",
                start, end, file_len
            ));
        }

        headers.push_str("\r\n");
        socket.write_all(headers.as_bytes()).await?;

        if is_head || chunk_len == 0 {
            return Ok(());
        }

        file.seek(std::io::SeekFrom::Start(start)).await?;

        let mut remaining = chunk_len;
        let mut buf = [0u8; 65536];

        while remaining > 0 {
            let to_read = (remaining as usize).min(buf.len());
            let n = file.read(&mut buf[..to_read]).await?;
            if n == 0 {
                break;
            }
            if socket.write_all(&buf[..n]).await.is_err() {
                break;
            }
            remaining -= n as u64;
        }

        Ok(())
    }
}

fn byte_range(header: Option<&str>, length: u64) -> Option<(u64, u64)> {
    if length == 0 { return None; }
    let Some(header) = header else { return Some((0, length - 1)); };
    let (left, right) = header.strip_prefix("bytes=")?.split_once('-')?;
    if left.is_empty() {
        let suffix = right.parse::<u64>().ok()?;
        return (suffix > 0).then(|| (length.saturating_sub(suffix), length - 1));
    }
    let start = left.parse::<u64>().ok()?;
    let end = if right.is_empty() { length - 1 } else { right.parse::<u64>().ok()?.min(length - 1) };
    (start < length && start <= end).then_some((start, end))
}

fn upstream_headers(values: &HashMap<String, String>) -> HeaderMap {
    let mut headers = HeaderMap::new();
    for (name, value) in values {
        if !matches!(
            name.to_ascii_lowercase().as_str(),
            "user-agent" | "referer" | "origin" | "accept" | "accept-language" | "cookie"
        ) {
            continue;
        }
        if let (Ok(name), Ok(value)) = (
            HeaderName::from_bytes(name.as_bytes()),
            HeaderValue::from_str(value),
        ) {
            headers.insert(name, value);
        }
    }
    headers
}

#[cfg(test)]
mod tests {
    use super::StreamServer;
    use std::collections::HashMap;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn forwards_headers_range_and_preserves_upstream_status() {
        let root = std::env::temp_dir().join(format!("omni-proxy-test-{}", std::process::id()));
        let proxy = StreamServer::start(&root).await.unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let upstream = tokio::spawn(async move {
            for response in [
            b"HTTP/1.1 403 Forbidden\r\nContent-Length: 6\r\n\r\ndenied".as_slice(),
            b"HTTP/1.1 206 Partial Content\r\nContent-Length: 3\r\nContent-Range: bytes 0-2/9\r\n\r\nabc".as_slice(),
        ] {
            let (mut socket,_) = listener.accept().await.unwrap();
            let mut request=Vec::new();
            let mut chunk=[0u8;2048];
            loop {
                let n=socket.read(&mut chunk).await.unwrap();
                assert!(n>0);
                request.extend_from_slice(&chunk[..n]);
                if request.windows(4).any(|p| p==b"\r\n\r\n") {break;}
            }
            let text=String::from_utf8(request).unwrap().to_ascii_lowercase();
            assert!(text.contains("user-agent: fixture-agent"));
            assert!(text.contains("referer: https://www.youtube.com/"));
            assert!(text.contains("range: bytes=0-2"));
            socket.write_all(response).await.unwrap();
        }
        });
        let headers = HashMap::from([
            ("User-Agent".to_string(), "fixture-agent".to_string()),
            (
                "Referer".to_string(),
                "https://www.youtube.com/".to_string(),
            ),
        ]);
        // A signed URL exceeding the old single 4 KiB read must also work.
        let url = proxy.get_stream_url_with_meta(
            "",
            "",
            &format!("http://127.0.0.1:{}/audio?token={}", port, "x".repeat(6000)),
            "audio/mp4",
            &headers,
        );
        let client = reqwest::Client::new();
        let first = client
            .get(&url)
            .header("Range", "bytes=0-2")
            .send()
            .await
            .unwrap();
        assert_eq!(first.status(), 403);
        assert_eq!(first.bytes().await.unwrap(), b"denied".as_slice());
        let second = client
            .get(&url)
            .header("Range", "bytes=0-2")
            .send()
            .await
            .unwrap();
        assert_eq!(second.status(), 206);
        assert_eq!(second.headers()["content-range"], "bytes 0-2/9");
        assert_eq!(second.headers()["content-type"], "audio/mp4");
        assert_eq!(second.bytes().await.unwrap(), b"abc".as_slice());
        upstream.await.unwrap();
        let _ = std::fs::remove_dir_all(root);
    }
}
