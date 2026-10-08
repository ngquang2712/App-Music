use crate::models::{StreamResult, Track};
use crate::services::engine::{find_engine, find_optional_engine};
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;
use std::time::{Duration, Instant};
use tokio::process::Command;

const AUDIO_FORMAT: &str =
    "bestaudio[protocol=https][ext=m4a]/bestaudio[protocol=https]/best[protocol=https]";

struct CacheItem {
    result: StreamResult,
    created: Instant,
}

pub struct YouTubeService {
    resource_dir: Option<PathBuf>,
    cache: RwLock<HashMap<String, CacheItem>>,
}

impl YouTubeService {
    pub fn new(resource_dir: Option<PathBuf>) -> Self {
        Self {
            resource_dir,
            cache: RwLock::new(HashMap::new()),
        }
    }

    fn command(&self) -> Result<Command, String> {
        let engine = find_engine("yt-dlp", self.resource_dir.as_deref())?;
        let mut command = Command::new(&engine);
        command.kill_on_drop(true);
        #[cfg(windows)]
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        command.args([
            "--ignore-config",
            "--no-warnings",
            "--encoding",
            "utf-8",
            "--socket-timeout",
            "15",
            "--retries",
            "1",
            "--extractor-retries",
            "1",
        ]);
        let deno = engine
            .parent()
            .and_then(|dir| {
                let path = dir.join(if cfg!(windows) { "deno.exe" } else { "deno" });
                path.is_file().then_some(path)
            })
            .or_else(|| find_optional_engine("deno", self.resource_dir.as_deref()));
        if let Some(path) = deno {
            command
                .arg("--js-runtimes")
                .arg(format!("deno:{}", path.display()));
        } else if let Some(path) = find_optional_engine("node", self.resource_dir.as_deref()) {
            command
                .arg("--js-runtimes")
                .arg(format!("node:{}", path.display()));
        } else {
            return Err("Thiếu deno.exe. Chạy CapNhatEngine.bat hoặc đặt deno.exe cạnh yt-dlp.exe trong DuLieu/ThucThi.".into());
        }
        Ok(command)
    }

    async fn run_json(&self, mut command: Command, timeout_secs: u64) -> Result<Value, String> {
        let output = tokio::time::timeout(Duration::from_secs(timeout_secs), command.output())
            .await
            .map_err(|_| {
                format!(
                    "yt-dlp không phản hồi sau {} giây. Kiểm tra kết nối mạng.",
                    timeout_secs
                )
            })?
            .map_err(|e| format!("Không chạy được yt-dlp: {}", e))?;
        if !output.status.success() {
            return Err(format!(
                "yt-dlp: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }
        serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Không đọc được dữ liệu JSON từ yt-dlp: {}", e))
    }

    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<Track>, String> {
        let query = query.trim();
        if query.is_empty() || limit == 0 {
            return Ok(Vec::new());
        }
        let mut command = self.command()?;
        command
            .args([
                "--dump-single-json",
                "--flat-playlist",
                "--skip-download",
                "--ignore-errors",
            ])
            .arg(format!("ytsearch{}:{}", limit.min(50), query));
        let info = self.run_json(command, 60).await?;
        let entries = info.get("entries").and_then(Value::as_array);
        Ok(entries
            .into_iter()
            .flatten()
            .filter_map(track_from_info)
            .take(limit)
            .collect())
    }

    pub async fn get_stream_url(&self, video_id: &str) -> Result<StreamResult, String> {
        let id = normalize_video_id(video_id)?;
        if let Ok(cache) = self.cache.read() {
            if let Some(item) = cache.get(&id) {
                if item.created.elapsed() < Duration::from_secs(300)
                    && !url_expires_soon(&item.result.stream_url)
                {
                    return Ok(item.result.clone());
                }
            }
        }
        let mut command = self.command()?;
        command
            .args([
                "--dump-single-json",
                "--skip-download",
                "--no-playlist",
                "-f",
                AUDIO_FORMAT,
            ])
            .arg(format!("https://www.youtube.com/watch?v={}", id));
        let info = self.run_json(command, 90).await?;
        let result = stream_from_info(&info)?;
        if let Ok(mut cache) = self.cache.write() {
            cache.retain(|_, item| item.created.elapsed() < Duration::from_secs(300));
            cache.insert(
                id,
                CacheItem {
                    result: result.clone(),
                    created: Instant::now(),
                },
            );
        }
        Ok(result)
    }
}

fn track_from_info(info: &Value) -> Option<Track> {
    let id = normalize_video_id(info.get("id")?.as_str()?).ok()?;
    let title = info
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or("YouTube")
        .to_string();
    let artist = info
        .get("channel")
        .or_else(|| info.get("uploader"))
        .and_then(Value::as_str)
        .unwrap_or("YouTube")
        .to_string();
    let duration = info
        .get("duration")
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
        .max(0.0) as u64;
    let cover = info
        .get("thumbnail")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .or_else(|| {
            info.get("thumbnails")
                .and_then(Value::as_array)
                .and_then(|a| a.last())
                .and_then(|t| t.get("url"))
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .unwrap_or_else(|| format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id));
    Some(Track {
        url: format!("https://www.youtube.com/watch?v={}", id),
        id,
        source: "youtube".into(),
        original_title: Some(title.clone()),
        original_artist: Some(artist.clone()),
        original_cover: Some(cover.clone()),
        artist_id: None,
        artist_picture: None,
        genre_tags: Vec::new(),
        catalog_provider: None,
        title,
        artist,
        cover,
        album: None,
        duration,
        duration_formatted: Some(format_duration(duration)),
        views: info.get("view_count").and_then(Value::as_u64),
        views_formatted: None,
        uploaded_at: info
            .get("upload_date")
            .and_then(Value::as_str)
            .map(str::to_owned),
        local_cover_path: None,
        discord_cover_url: None,
        added_at: None,
        updated_at: None,
    })
}

fn stream_from_info(info: &Value) -> Result<StreamResult, String> {
    let stream_url = info
        .get("url")
        .and_then(Value::as_str)
        .filter(|s| s.starts_with("https://"))
        .ok_or_else(|| "yt-dlp không trả về URL âm thanh HTTPS trực tiếp.".to_string())?;
    let content_type = match info.get("ext").and_then(Value::as_str).unwrap_or("") {
        "m4a" => "audio/mp4",
        "mp4" => "video/mp4",
        "mp3" => "audio/mpeg",
        "ogg" | "opus" => "audio/ogg",
        "webm" => "audio/webm",
        _ => "application/octet-stream",
    };
    let http_headers = info
        .get("http_headers")
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
        .filter_map(|(key, value)| {
            let allowed = matches!(
                key.to_ascii_lowercase().as_str(),
                "user-agent" | "referer" | "origin" | "accept" | "accept-language" | "cookie"
            );
            allowed
                .then(|| value.as_str().map(|v| (key.clone(), v.to_string())))
                .flatten()
        })
        .collect();
    Ok(StreamResult {
        stream_url: stream_url.to_string(),
        content_type: content_type.into(),
        http_headers,
    })
}

fn normalize_video_id(input: &str) -> Result<String, String> {
    let input = input.trim();
    let id = if input.starts_with("http://") || input.starts_with("https://") {
        let url = url::Url::parse(input).map_err(|_| "URL YouTube không hợp lệ.".to_string())?;
        match url.host_str().unwrap_or("") {
            "youtu.be" => url.path().trim_matches('/').to_string(),
            "youtube.com" | "www.youtube.com" | "m.youtube.com" | "music.youtube.com" => url
                .query_pairs()
                .find(|(key, _)| key == "v")
                .map(|(_, value)| value.into_owned())
                .or_else(|| {
                    url.path_segments().and_then(|mut parts| {
                        matches!(parts.next(), Some("shorts" | "embed" | "live"))
                            .then(|| parts.next().map(str::to_owned))
                            .flatten()
                    })
                })
                .ok_or_else(|| "URL không chứa mã video YouTube.".to_string())?,
            _ => return Err("URL không thuộc YouTube.".into()),
        }
    } else {
        input.to_string()
    };
    if id.len() != 11
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
    {
        return Err("Mã video YouTube không hợp lệ.".into());
    }
    Ok(id)
}

fn url_expires_soon(input: &str) -> bool {
    let expiry = url::Url::parse(input).ok().and_then(|url| {
        url.query_pairs()
            .find(|(key, _)| key == "expire")
            .and_then(|(_, value)| value.parse::<u64>().ok())
    });
    expiry
        .map(|expiry| {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            expiry <= now + 60
        })
        .unwrap_or(false)
}

fn format_duration(seconds: u64) -> String {
    if seconds >= 3600 {
        format!(
            "{}:{:02}:{:02}",
            seconds / 3600,
            seconds / 60 % 60,
            seconds % 60
        )
    } else {
        format!("{}:{:02}", seconds / 60, seconds % 60)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn handles_watch_short_and_shorts_links() {
        for input in [
            "BaW_jenozKc",
            "https://www.youtube.com/watch?v=BaW_jenozKc&list=abc",
            "https://youtu.be/BaW_jenozKc?t=2",
            "https://www.youtube.com/shorts/BaW_jenozKc",
        ] {
            assert_eq!(normalize_video_id(input).unwrap(), "BaW_jenozKc");
        }
        assert!(normalize_video_id("https://example.com/watch?v=BaW_jenozKc").is_err());
        assert!(normalize_video_id("--version").is_err());
    }

    #[test]
    fn preserves_mp4_audio_type_and_request_headers() {
        let result = stream_from_info(&json!({"url":"https://cdn.example/audio", "ext":"m4a",
            "http_headers":{"User-Agent":"test-agent", "Referer":"https://www.youtube.com/", "Host":"bad"}})).unwrap();
        assert_eq!(result.content_type, "audio/mp4");
        assert_eq!(result.http_headers["User-Agent"], "test-agent");
        assert!(!result.http_headers.contains_key("Host"));
    }

    #[test]
    fn skips_null_search_entries_and_expired_urls() {
        assert!(track_from_info(&Value::Null).is_none());
        assert_eq!(
            track_from_info(&json!({"id":"BaW_jenozKc", "title":"Test", "duration":61.0}))
                .unwrap()
                .duration,
            61
        );
        assert!(url_expires_soon("https://cdn.example/audio?expire=1"));
    }
}
