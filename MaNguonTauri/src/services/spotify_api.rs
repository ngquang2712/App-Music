use crate::models::{ArtistAlbum, ArtistProfile, ArtistSummary, Track};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use reqwest::Client;
use ring::{digest, rand::{SecureRandom, SystemRandom}};
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::{Arc, RwLock, Mutex as StdMutex, atomic::{AtomicU64, Ordering}};
use std::time::{Duration, Instant};
use tokio::{io::{AsyncReadExt, AsyncWriteExt}, net::TcpListener, sync::Mutex};

pub const REDIRECT_URI: &str = "http://127.0.0.1:43821/callback";

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyStatus {
    pub connected: bool,
    pub connecting: bool,
    pub error: Option<String>,
}

struct Session {
    client_id: String,
    access: String,
    refresh: String,
    expires: Instant,
}

pub struct SpotifyApi {
    client: Client,
    session: Mutex<Option<Session>>,
    status: RwLock<SpotifyStatus>,
    generation: AtomicU64,
    blocked_until: RwLock<Option<Instant>>,
    login_task: StdMutex<Option<tokio::task::JoinHandle<()>>>,
}

pub fn valid_client_id(value: &str) -> bool {
    value.len() == 32 && value.bytes().all(|b| b.is_ascii_hexdigit())
}

pub fn valid_spotify_id(value: &str) -> bool {
    value.len() == 22 && value.bytes().all(|b| b.is_ascii_alphanumeric())
}

pub fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(digest::digest(&digest::SHA256, verifier.as_bytes()).as_ref())
}

// Callback values are never exposed to the frontend, logs or files.
pub fn callback_code(target: &str, expected_state: &str) -> Result<Option<String>, String> {
    let url = url::Url::parse(&format!("http://127.0.0.1{}", target)).map_err(|_| "Callback không hợp lệ.".to_string())?;
    if url.path() != "/callback" { return Err("Đường dẫn callback không hợp lệ.".into()); }
    let pairs: Vec<_> = url.query_pairs().collect();
    let values = |key: &str| pairs.iter().filter(|(k, _)| k == key).map(|(_, v)| v.as_ref()).collect::<Vec<_>>();
    let states = values("state");
    if states.len() != 1 || states[0] != expected_state { return Err("Không khớp phiên đăng nhập.".into()); }
    let errors = values("error");
    if !errors.is_empty() { return Ok(None); }
    let codes = values("code");
    if codes.len() != 1 || codes[0].is_empty() || codes[0].len() > 4096 { return Err("Thiếu mã đăng nhập.".into()); }
    Ok(Some(codes[0].to_string()))
}

impl SpotifyApi {
    pub fn new() -> Self {
        Self {
            client: Client::builder().timeout(Duration::from_secs(10)).user_agent("NgQuangMusicApp/2.0").build().unwrap_or_default(),
            session: Mutex::new(None), status: RwLock::new(SpotifyStatus::default()),
            generation: AtomicU64::new(0), blocked_until: RwLock::new(None),
            login_task: StdMutex::new(None),
        }
    }

    pub fn status(&self) -> SpotifyStatus { self.status.read().unwrap().clone() }
    pub fn cache_epoch(&self) -> u64 { self.generation.load(Ordering::SeqCst) }

    pub async fn disconnect(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        let task = self.login_task.lock().unwrap().take();
        if let Some(task) = task { task.abort(); let _ = task.await; }
        *self.session.lock().await = None;
        *self.status.write().unwrap() = SpotifyStatus::default();
        *self.blocked_until.write().unwrap() = None;
    }

    pub async fn begin(self: &Arc<Self>, client_id: &str) -> Result<String, String> {
        let client_id = client_id.trim();
        if !valid_client_id(client_id) { return Err("Client ID Spotify cần có 32 ký tự hexadecimal.".into()); }
        let listener = TcpListener::bind("127.0.0.1:43821").await
            .map_err(|_| "Cổng đăng nhập 43821 đang bận. Đợi phiên trước kết thúc hoặc đóng app khác đang dùng cổng này.".to_string())?;
        let random = SystemRandom::new();
        let mut bytes = [0u8; 64]; random.fill(&mut bytes).map_err(|_| "Không tạo được phiên đăng nhập an toàn.".to_string())?;
        let verifier = URL_SAFE_NO_PAD.encode(bytes);
        let mut state_bytes = [0u8; 32]; random.fill(&mut state_bytes).map_err(|_| "Không tạo được phiên đăng nhập an toàn.".to_string())?;
        let state = URL_SAFE_NO_PAD.encode(state_bytes);
        let mut auth = url::Url::parse("https://accounts.spotify.com/authorize").unwrap();
        auth.query_pairs_mut().extend_pairs([
            ("response_type", "code"), ("client_id", client_id), ("redirect_uri", REDIRECT_URI),
            ("state", &state), ("code_challenge_method", "S256"), ("code_challenge", &challenge(&verifier)),
        ]);
        let run = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        *self.session.lock().await = None;
        *self.status.write().unwrap() = SpotifyStatus { connecting: true, ..Default::default() };
        let service = self.clone(); let client_id = client_id.to_string();
        let task = tokio::spawn(async move {
            let outcome = tokio::time::timeout(Duration::from_secs(180), async {
                loop {
                    if service.cache_epoch() != run { return Err("Đã hủy kết nối Spotify.".to_string()); }
                    let (mut socket, _) = match tokio::time::timeout(Duration::from_secs(1), listener.accept()).await {
                        Err(_) => continue,
                        Ok(result) => result.map_err(|_| "Không nhận được callback Spotify.".to_string())?,
                    };
                    let mut data = Vec::new();
                    let received = tokio::time::timeout(Duration::from_secs(4), async {
                        let mut chunk = [0u8; 2048];
                        while data.len() < 8192 && !data.windows(4).any(|w| w == b"\r\n\r\n") {
                            let n = socket.read(&mut chunk).await?; if n == 0 { break; } data.extend_from_slice(&chunk[..n]);
                        }
                        Ok::<_, std::io::Error>(())
                    }).await;
                    if !matches!(received, Ok(Ok(()))) { continue; }
                    let request = String::from_utf8_lossy(&data);
                    let mut parts = request.lines().next().unwrap_or("").split_whitespace();
                    let method = parts.next().unwrap_or(""); let target = parts.next().unwrap_or("");
                    let code = if method == "GET" { callback_code(target, &state) } else { Err("Yêu cầu không hợp lệ.".into()) };
                    if code.is_err() {
                        let _ = socket.write_all(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").await;
                        continue;
                    }
                    let body = "<!doctype html><meta charset=utf-8><title>NgQuang Music App</title><p>Đã nhận phản hồi Spotify. Bạn có thể đóng tab và quay lại NgQuang Music App để xem kết quả.</p>";
                    let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body);
                    let _ = socket.write_all(response.as_bytes()).await; let _ = socket.shutdown().await;
                    let code = code?.ok_or_else(|| "Bạn đã hủy cấp quyền Spotify.".to_string())?;
                    let json = service.token(&[("grant_type", "authorization_code"), ("code", &code), ("client_id", &client_id), ("redirect_uri", REDIRECT_URI), ("code_verifier", &verifier)]).await?;
                    let session = parse_session(&json, client_id.clone(), String::new())?;
                    let mut guard = service.session.lock().await;
                    if service.cache_epoch() != run { return Err("Đã hủy kết nối Spotify.".to_string()); }
                    *guard = Some(session);
                    return Ok(());
                }
            }).await;
            if service.cache_epoch() == run {
                let result = outcome.unwrap_or_else(|_| Err("Hết thời gian đăng nhập. Bấm Kết nối Spotify để thử lại.".into()));
                *service.status.write().unwrap() = SpotifyStatus { connected: result.is_ok(), connecting: false, error: result.err() };
            }
        });
        *self.login_task.lock().unwrap() = Some(task);
        Ok(auth.into())
    }

    async fn token(&self, form: &[(&str, &str)]) -> Result<Value, String> {
        let response = self.client.post("https://accounts.spotify.com/api/token").form(form).send().await
            .map_err(|_| "Chưa kết nối được máy chủ đăng nhập Spotify.".to_string())?;
        if !response.status().is_success() { return Err("Spotify chưa cấp token. Kiểm tra Client ID, Redirect URI và quyền truy cập ứng dụng.".into()); }
        response.json().await.map_err(|_| "Spotify trả token không hợp lệ.".into())
    }

    async fn access_token(&self) -> Result<String, String> {
        let mut guard = self.session.lock().await;
        let session = guard.as_mut().ok_or_else(|| "Kết nối Spotify trong Cài đặt để dùng API chính thức.".to_string())?;
        if session.expires > Instant::now() + Duration::from_secs(30) { return Ok(session.access.clone()); }
        let json = self.token(&[("grant_type", "refresh_token"), ("refresh_token", &session.refresh), ("client_id", &session.client_id)]).await?;
        *session = parse_session(&json, session.client_id.clone(), session.refresh.clone())?;
        Ok(session.access.clone())
    }

    pub async fn fetch(&self, path: &str, params: &[(&str, &str)]) -> Result<Value, String> {
        if self.blocked_until.read().unwrap().is_some_and(|time| time > Instant::now()) {
            return Err("Spotify đang giới hạn lượt gọi. Vui lòng thử lại sau.".into());
        }
        let token = self.access_token().await?;
        let response = self.client.get(format!("https://api.spotify.com/v1/{}", path)).query(params).bearer_auth(token).send().await
            .map_err(|_| "Chưa kết nối được Spotify API.".to_string())?;
        let status = response.status().as_u16();
        if status == 429 {
            let seconds = response.headers().get("retry-after").and_then(|h| h.to_str().ok()).and_then(|s| s.parse::<u64>().ok()).unwrap_or(60).clamp(1, 3600);
            *self.blocked_until.write().unwrap() = Some(Instant::now() + Duration::from_secs(seconds));
        }
        if !response.status().is_success() { return Err(api_error(status)); }
        response.json().await.map_err(|_| "Dữ liệu Spotify không hợp lệ.".into())
    }

    pub async fn search_artists(&self, query: &str) -> Result<Vec<ArtistSummary>, String> {
        let json = self.fetch("search", &[("q", query), ("type", "artist"), ("limit", "8")]).await?;
        Ok(json.pointer("/artists/items").and_then(Value::as_array).map(|items| items.iter().filter_map(parse_artist).collect()).unwrap_or_default())
    }

    pub async fn search_tracks(&self, query: &str) -> Result<Vec<Track>, String> {
        let json = self.fetch("search", &[("q", query), ("type", "track"), ("limit", "10"), ("market", "VN")]).await?;
        Ok(json.pointer("/tracks/items").and_then(Value::as_array).map(|items| items.iter().filter_map(parse_track).collect()).unwrap_or_default())
    }

    pub async fn profile(&self, id: &str) -> Result<ArtistProfile, String> {
        if !valid_spotify_id(id) { return Err("Mã nghệ sĩ Spotify không hợp lệ.".into()); }
        let json = self.fetch(&format!("artists/{}", id), &[]).await?;
        let artist = parse_artist(&json).ok_or_else(|| "Không tìm được hồ sơ Spotify.".to_string())?;
        let query = format!("artist:\"{}\"", artist.name.replace('"', " "));
        // Search and artist albums remain supported in the 2026 Development API.
        // Do not depend on removed top-tracks, related-artists or recommendations.
        let albums_path = format!("artists/{}/albums", id);
        let albums_params = [("limit", "10"), ("market", "VN"), ("include_groups", "album,single")];
        let (tracks, albums) = tokio::join!(self.search_tracks(&query), self.fetch(&albums_path, &albums_params));
        let mut warning = None;
        let tracks = match tracks { Ok(items) => items.into_iter().filter(|t| t.artist_id.as_deref() == Some(artist.id.as_str())).collect(), Err(e) => { warning = Some(e); Vec::new() } };
        let albums = match albums {
            Ok(json) => json.get("items").and_then(Value::as_array).map(|items| items.iter().filter_map(parse_album).collect()).unwrap_or_default(),
            Err(e) => { warning = Some(e); Vec::new() }
        };
        Ok(ArtistProfile { artist, tracks, albums, warning })
    }
}

fn parse_session(json: &Value, client_id: String, previous_refresh: String) -> Result<Session, String> {
    let access = json.get("access_token").and_then(Value::as_str).filter(|s| !s.is_empty() && s.len() <= 8192).ok_or_else(|| "Thiếu token Spotify.".to_string())?;
    let refresh = json.get("refresh_token").and_then(Value::as_str).unwrap_or(&previous_refresh).to_string();
    if refresh.is_empty() || refresh.len() > 8192 { return Err("Thiếu refresh token Spotify.".into()); }
    let seconds = json.get("expires_in").and_then(Value::as_u64).unwrap_or(3600).clamp(60, 86400);
    Ok(Session { client_id, access: access.into(), refresh, expires: Instant::now() + Duration::from_secs(seconds) })
}

pub fn api_error(status: u16) -> String {
    match status {
        401 => "Phiên Spotify không còn hợp lệ. Ngắt rồi kết nối lại trong Cài đặt.",
        403 => "Spotify từ chối quyền truy cập. Kiểm tra Premium của chủ app và danh sách người dùng được phép trong Dashboard.",
        404 => "Spotify không tìm thấy dữ liệu hoặc endpoint này không được cấp quyền.",
        429 => "Spotify đang giới hạn lượt gọi. Vui lòng thử lại sau.",
        _ => "Spotify tạm thời không trả dữ liệu. Vui lòng thử lại sau.",
    }.into()
}

pub fn https_url(value: Option<&str>) -> String {
    value.filter(|s| s.len() <= 4096 && url::Url::parse(s).is_ok_and(|u| u.scheme() == "https" && u.host_str().is_some() && u.username().is_empty() && u.password().is_none())).unwrap_or("").into()
}

pub fn parse_artist(item: &Value) -> Option<ArtistSummary> {
    let id = item.get("id")?.as_str()?;
    let name = item.get("name")?.as_str()?.trim();
    if !valid_spotify_id(id) || name.is_empty() { return None; }
    Some(ArtistSummary {
        id: format!("spotify:{}", id), name: name.chars().take(160).collect(), provider: "spotify".into(),
        picture: https_url(item.pointer("/images/0/url").and_then(Value::as_str)),
        url: format!("https://open.spotify.com/artist/{}", id),
        genres: item.get("genres").and_then(Value::as_array).map(|a| a.iter().filter_map(Value::as_str).take(8).map(|s| s.chars().take(80).collect()).collect()).unwrap_or_default(),
    })
}

pub fn parse_track(item: &Value) -> Option<Track> {
    let id = item.get("id")?.as_str()?;
    if !valid_spotify_id(id) { return None; }
    let artist = item.pointer("/artists/0")?;
    let artist_id = artist.get("id").and_then(Value::as_str).filter(|s| valid_spotify_id(s)).map(|s| format!("spotify:{}", s));
    serde_json::from_value(json!({
        "id": format!("spotify_{}", id), "source": "spotify", "catalogProvider": "spotify",
        "title": item.get("name")?.as_str()?, "artist": artist.get("name")?.as_str()?, "artistId": artist_id,
        "album": item.pointer("/album/name"), "duration": item.get("duration_ms").and_then(Value::as_u64).unwrap_or(0) / 1000,
        "cover": https_url(item.pointer("/album/images/0/url").and_then(Value::as_str)),
        "url": format!("https://open.spotify.com/track/{}", id), "uploadedAt": item.pointer("/album/release_date")
    })).ok()
}

pub fn parse_album(item: &Value) -> Option<ArtistAlbum> {
    let id = item.get("id")?.as_str()?;
    if !valid_spotify_id(id) { return None; }
    Some(ArtistAlbum { id: id.into(), name: item.get("name")?.as_str()?.into(),
        cover: https_url(item.pointer("/images/0/url").and_then(Value::as_str)), url: format!("https://open.spotify.com/album/{}", id),
        release_date: item.get("release_date").and_then(Value::as_str).unwrap_or("").into() })
}
