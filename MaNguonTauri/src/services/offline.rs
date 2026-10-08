use crate::models::{StreamResult, Track};
use base64::Engine;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tokio::io::AsyncWriteExt;
use tokio::sync::{Notify, Semaphore};

const MIN_AUDIO_BYTES: u64 = 10240;
const MAX_TRACK_BYTES: u64 = 512 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReadyTrack { track: Track, content_type: String, size_bytes: u64, cached_at: u64 }

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OfflineEntry {
    pub track: Track,
    pub status: String,
    pub downloaded_bytes: u64,
    pub size_bytes: u64,
    pub cached_at: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OfflineLibrary {
    pub entries: Vec<OfflineEntry>,
    pub used_bytes: u64,
    pub limit_bytes: u64,
    pub auto_cache: bool,
}

struct Download { token: u64, entry: OfflineEntry, cancel: Arc<Notify> }

pub struct OfflineCache {
    dir: PathBuf,
    client: Client,
    ready: Mutex<HashMap<String, ReadyTrack>>,
    legacy_checked: Mutex<HashSet<String>>,
    tasks: Mutex<HashMap<String, Download>>,
    // No network operation or async wait runs while this commit guard is held.
    commit: Mutex<()>,
    slots: Semaphore,
    next_token: AtomicU64,
    limit: AtomicU64,
}

impl OfflineCache {
    pub fn new(dir: PathBuf) -> Arc<Self> {
        let _ = fs::create_dir_all(&dir);
        let mut ready = HashMap::new();
        if let Ok(files) = fs::read_dir(&dir) {
            for file in files.flatten() {
                let path = file.path();
                let name = file.file_name().to_string_lossy().into_owned();
                if name.ends_with(".part") || name.ends_with(".tmp") { let _ = fs::remove_file(path); continue; }
                if !name.ends_with(".offline.json") { continue; }
                if let Ok(bytes) = fs::read(path) {
                    if let Ok(record) = serde_json::from_slice::<ReadyTrack>(&bytes) {
                        let key = Self::key(&record.track.source, &record.track.id);
                        if name == format!("{key}.offline.json") && fs::metadata(dir.join(format!("{key}.cache")))
                            .map_or(false, |m| m.len() == record.size_bytes && m.len() >= MIN_AUDIO_BYTES) { ready.insert(key, record); }
                    }
                }
            }
        }
        Arc::new(Self {
            dir,
            client: Client::builder().user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36")
                .connect_timeout(std::time::Duration::from_secs(12)).timeout(std::time::Duration::from_secs(600)).build().unwrap_or_default(),
            ready: Mutex::new(ready), legacy_checked: Mutex::new(HashSet::new()), tasks: Mutex::new(HashMap::new()),
            commit: Mutex::new(()), slots: Semaphore::new(2), next_token: AtomicU64::new(1), limit: AtomicU64::new(2 * 1024 * 1024 * 1024),
        })
    }

    pub fn key(source: &str, id: &str) -> String {
        let input = format!("{}:{source}{id}", source.len());
        ring::digest::digest(&ring::digest::SHA256, input.as_bytes()).as_ref().iter().map(|b| format!("{b:02x}")).collect()
    }
    pub fn directory(&self) -> &Path { &self.dir }
    fn audio_path(&self, key: &str) -> PathBuf { self.dir.join(format!("{key}.cache")) }
    fn record_path(&self, key: &str) -> PathBuf { self.dir.join(format!("{key}.offline.json")) }
    pub fn set_limit(&self, megabytes: u64) { self.limit.store(megabytes.clamp(256, 16384) * 1024 * 1024, Ordering::Relaxed); }
    fn valid(record: &ReadyTrack, path: &Path) -> bool { fs::metadata(path).map_or(false, |m| m.len() >= MIN_AUDIO_BYTES && m.len() == record.size_bytes) }
    pub fn cached_file(&self, source: &str, id: &str) -> Option<(PathBuf, String)> {
        let key = Self::key(source, id);
        let ready = self.ready.lock().ok()?;
        let record = ready.get(&key)?;
        let path = self.audio_path(&key);
        Self::valid(record, &path).then(|| (path, record.content_type.clone()))
    }
    fn write_record(&self, key: &str, record: &ReadyTrack) -> Result<(), String> {
        let path = self.record_path(key); let tmp = path.with_extension("json.tmp");
        let bytes = serde_json::to_vec(record).map_err(|e| e.to_string())?;
        fs::write(&tmp, bytes).map_err(|e| format!("Không lưu được thông tin bài offline: {e}"))?;
        fs::rename(tmp, path).map_err(|e| format!("Không cập nhật được thông tin bài offline: {e}"))
    }
    pub fn import_legacy(&self, track: &Track) {
        if !supported(track) || self.cached_file(&track.source, &track.id).is_some() { return; }
        if !self.legacy_checked.lock().unwrap().insert(Self::key(&track.source, &track.id)) { return; }
        let _commit = match self.commit.lock() { Ok(g) => g, Err(_) => return };
        let clean_id: String = track.id.chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' }).collect();
        let legacy_key = format!("{}_{clean_id}", track.source);
        let old = self.dir.join(format!("{legacy_key}.cache"));
        let ctype = fs::read_to_string(self.dir.join(format!("{legacy_key}.meta"))).unwrap_or_default().trim().to_string();
        if !is_audio_type(&ctype) { return; }
        let size = fs::metadata(&old).map(|m| m.len()).unwrap_or(0);
        if size < MIN_AUDIO_BYTES { return; }
        let key = Self::key(&track.source, &track.id); let target = self.audio_path(&key);
        if fs::rename(&old, &target).is_err() { return; }
        let record = ReadyTrack { track: track.clone(), content_type: ctype, size_bytes: size, cached_at: now() };
        if self.write_record(&key, &record).is_ok() {
            self.ready.lock().unwrap().insert(key, record);
            let _ = fs::remove_file(self.dir.join(format!("{legacy_key}.meta")));
        } else { let _ = fs::rename(target, old); }
    }
    fn used_bytes(&self) -> u64 {
        fs::read_dir(&self.dir).map(|items| items.flatten().filter(|item| item.path().extension().is_some_and(|ext| ext == "cache"))
            .filter_map(|item| item.metadata().ok()).map(|m| m.len()).sum()).unwrap_or(0)
    }
    pub fn library(&self, auto_cache: bool) -> OfflineLibrary {
        let _commit = self.commit.lock().unwrap();
        let mut entries: Vec<_> = self.ready.lock().unwrap().iter().filter(|(key, record)| Self::valid(record, &self.audio_path(key)))
            .map(|(_, record)| OfflineEntry { track: record.track.clone(), status: "ready".into(), downloaded_bytes: record.size_bytes,
                size_bytes: record.size_bytes, cached_at: record.cached_at, error: None }).collect();
        entries.extend(self.tasks.lock().unwrap().values().map(|download| download.entry.clone()));
        entries.sort_by(|a,b| b.cached_at.cmp(&a.cached_at).then_with(|| a.track.title.cmp(&b.track.title)));
        OfflineLibrary { entries, used_bytes: self.used_bytes(), limit_bytes: self.limit.load(Ordering::Relaxed), auto_cache }
    }
    fn live(&self, key: &str, token: u64) -> bool { self.tasks.lock().unwrap().get(key).is_some_and(|d| d.token == token) }
    pub fn start(self: &Arc<Self>, track: Track, stream: StreamResult) -> Result<(), String> {
        if !supported(&track) { return Err("Bài trong danh mục Spotify / Apple Music không có âm thanh để lưu offline trong app.".into()); }
        if !is_audio_type(&stream.content_type) { return Err("Luồng này chưa hỗ trợ lưu offline. Chọn bài có luồng âm thanh trực tiếp.".into()); }
        self.import_legacy(&track);
        if self.cached_file(&track.source, &track.id).is_some() { return Ok(()); }
        let key = Self::key(&track.source, &track.id); let token = self.next_token.fetch_add(1, Ordering::Relaxed); let cancel = Arc::new(Notify::new());
        {
            let _commit = self.commit.lock().map_err(|_| "Bộ nhớ offline đang bận.")?;
            if self.cached_file(&track.source, &track.id).is_some() { return Ok(()); }
            let mut tasks = self.tasks.lock().unwrap();
            if tasks.get(&key).is_some_and(|d| d.entry.status != "error") { return Ok(()); }
            fs::create_dir_all(&self.dir).map_err(|e| format!("Không tạo được thư mục nhạc offline: {e}"))?;
            tasks.insert(key.clone(), Download { token, entry: OfflineEntry { track: track.clone(), status: "queued".into(),
                downloaded_bytes: 0, size_bytes: 0, cached_at: now(), error: None }, cancel: cancel.clone() });
        }
        let cache = self.clone();
        tokio::spawn(async move {
            let part = cache.dir.join(format!("{key}_{token}.part"));
            let result = tokio::select! { result = cache.download(&key, token, track, stream, &part) => result,
                _ = cancel.notified() => Err("Đã hủy lưu offline.".to_string()), };
            let _ = tokio::fs::remove_file(&part).await;
            let mut tasks = cache.tasks.lock().unwrap();
            if let Some(task) = tasks.get_mut(&key).filter(|d| d.token == token) {
                match result { Ok(()) => { tasks.remove(&key); }, Err(error) => { task.entry.status = "error".into(); task.entry.error = Some(error); } }
            }
        });
        Ok(())
    }
    async fn download(&self, key: &str, token: u64, mut track: Track, stream: StreamResult, part: &Path) -> Result<(), String> {
        let _slot = self.slots.acquire().await.map_err(|_| "Không tải được nhạc offline.")?;
        if !self.live(key, token) { return Err("Đã hủy lưu offline.".into()); }
        if self.used_bytes() >= self.limit.load(Ordering::Relaxed) { return Err("Bộ nhớ offline đã đầy. Xóa vài bài hoặc tăng giới hạn trong Cài đặt.".into()); }
        let mut request = self.client.get(&stream.stream_url);
        for (name, value) in &stream.http_headers {
            if matches!(name.to_ascii_lowercase().as_str(), "user-agent" | "referer" | "origin" | "accept" | "accept-language" | "cookie") { request = request.header(name, value); }
        }
        let mut response = request.send().await.map_err(|_| "Mất kết nối khi tải bài. Kết nối mạng rồi bấm Thử lại.".to_string())?;
        let full_partial = response.status() == reqwest::StatusCode::PARTIAL_CONTENT && response.headers().get("content-range")
            .and_then(|v| v.to_str().ok()).and_then(|v| v.strip_prefix("bytes 0-")).and_then(|v| v.split_once('/'))
            .and_then(|(end,total)| Some((end.parse::<u64>().ok()?,total.parse::<u64>().ok()?)))
            .is_some_and(|(end,total)| end.checked_add(1) == Some(total) && response.content_length() == Some(total));
        if response.status() != reqwest::StatusCode::OK && !full_partial { return Err(format!("Nguồn nhạc không trả về toàn bộ bài ({}).", response.status())); }
        let response_type = response.headers().get("content-type").and_then(|v| v.to_str().ok()).unwrap_or("").to_ascii_lowercase();
        if response_type.contains("mpegurl") || response_type.contains("text/") || response_type.contains("json") { return Err("Nguồn trả về danh sách luồng hoặc trang lỗi, chưa thể lưu bài offline.".into()); }
        let expected = response.content_length(); let limit = self.limit.load(Ordering::Relaxed).min(MAX_TRACK_BYTES);
        if expected.is_some_and(|n| n > limit) { return Err("Bài quá lớn so với giới hạn lưu offline.".into()); }
        {
            let mut tasks = self.tasks.lock().unwrap(); let task = tasks.get_mut(key).filter(|d| d.token == token).ok_or("Đã hủy lưu offline.")?;
            task.entry.status = "downloading".into(); task.entry.size_bytes = expected.unwrap_or(0);
        }
        let mut file = tokio::fs::File::create(part).await.map_err(|e| format!("Không ghi được nhạc offline: {e}"))?;
        let mut written = 0;
        while let Some(chunk) = response.chunk().await.map_err(|_| "Tải bài bị gián đoạn. Kết nối mạng rồi bấm Thử lại.".to_string())? {
            if !self.live(key, token) { return Err("Đã hủy lưu offline.".into()); }
            if written == 0 && (chunk.starts_with(b"#EXTM3U") || chunk.starts_with(b"<!DOCTYPE") || chunk.starts_with(b"<html") || chunk.starts_with(b"{\"")) { return Err("Nguồn không trả về tệp âm thanh đầy đủ.".into()); }
            written += chunk.len() as u64;
            if written > limit { return Err("Bài quá lớn so với giới hạn lưu offline.".into()); }
            file.write_all(&chunk).await.map_err(|e| format!("Không ghi được nhạc offline: {e}"))?;
            if let Some(task) = self.tasks.lock().unwrap().get_mut(key).filter(|d| d.token == token) { task.entry.downloaded_bytes = written; }
        }
        if written < MIN_AUDIO_BYTES || expected.is_some_and(|n| n != written) { return Err("Bài chưa được tải đầy đủ. Hãy bấm Thử lại khi có mạng.".into()); }
        file.flush().await.map_err(|e| e.to_string())?; file.sync_all().await.map_err(|e| e.to_string())?; drop(file);
        if let Some(cover) = self.cover(&track.cover).await { track.cover = cover; track.local_cover_path = None; }
        let _commit = self.commit.lock().map_err(|_| "Bộ nhớ offline đang bận.")?;
        if !self.live(key, token) { return Err("Đã hủy lưu offline.".into()); }
        if self.used_bytes().saturating_add(written) > self.limit.load(Ordering::Relaxed) { return Err("Bộ nhớ offline đã đầy. Xóa vài bài hoặc tăng giới hạn trong Cài đặt.".into()); }
        let destination = self.audio_path(key);
        fs::rename(part, &destination).map_err(|e| format!("Không hoàn tất lưu bài offline: {e}"))?;
        let record = ReadyTrack { track, content_type: stream.content_type, size_bytes: written, cached_at: now() };
        if let Err(error) = self.write_record(key, &record) { let _ = fs::remove_file(destination); return Err(error); }
        self.ready.lock().unwrap().insert(key.to_string(), record); self.tasks.lock().unwrap().remove(key); Ok(())
    }
    async fn cover(&self, value: &str) -> Option<String> {
        if value.starts_with("data:image/") { return (value.len() <= 2 * 1024 * 1024).then(|| value.to_string()); }
        let parsed = url::Url::parse(value).ok()?;
        if !matches!(parsed.scheme(), "http" | "https") { return None; }
        let mut response = self.client.get(parsed).timeout(std::time::Duration::from_secs(4)).send().await.ok()?;
        if !response.status().is_success() || response.content_length().is_some_and(|n| n > 1024 * 1024) { return None; }
        let ctype = response.headers().get("content-type")?.to_str().ok()?.split(';').next()?.to_string();
        if !matches!(ctype.as_str(), "image/jpeg" | "image/png" | "image/webp" | "image/gif") { return None; }
        let mut bytes = Vec::new();
        while let Some(chunk) = response.chunk().await.ok()? { bytes.extend_from_slice(&chunk); if bytes.len() > 1024 * 1024 { return None; } }
        Some(format!("data:{ctype};base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes)))
    }
    pub fn remove(&self, source: &str, id: &str) -> Result<(), String> {
        let _commit = self.commit.lock().map_err(|_| "Bộ nhớ offline đang bận.")?; let key = Self::key(source, id);
        if let Some(task) = self.tasks.lock().unwrap().remove(&key) { task.cancel.notify_one(); }
        let file = self.audio_path(&key);
        if file.exists() { fs::remove_file(file).map_err(|e| format!("Không xóa được bài offline. Thử dừng phát bài rồi xóa lại: {e}"))?; }
        let record = self.record_path(&key);
        if record.exists() { fs::remove_file(record).map_err(|e| format!("Không xóa được thông tin bài offline: {e}"))?; }
        self.ready.lock().unwrap().remove(&key); Ok(())
    }
    pub fn clear(&self) -> Result<(), String> {
        let _commit = self.commit.lock().map_err(|_| "Bộ nhớ offline đang bận.")?;
        for (_, task) in self.tasks.lock().unwrap().drain() { task.cancel.notify_one(); }
        let files = fs::read_dir(&self.dir).map_err(|e| format!("Không đọc được bộ nhớ offline: {e}"))?;
        for file in files.flatten() { let path = file.path(); let name = file.file_name().to_string_lossy().into_owned();
            if name.ends_with(".cache") || name.ends_with(".meta") || name.ends_with(".offline.json") { fs::remove_file(path).map_err(|e| format!("Không xóa được một số bài offline. Dừng phát nhạc rồi thử lại: {e}"))?; }
        }
        self.ready.lock().unwrap().clear(); Ok(())
    }
}
fn supported(track: &Track) -> bool {
    !track.id.is_empty() && track.id.len() <= 512 && ["youtube", "spotify", "soundcloud"].contains(&track.source.as_str()) && !matches!(track.catalog_provider.as_deref(), Some("spotify" | "itunes"))
}
fn is_audio_type(value: &str) -> bool {
    matches!(value.split(';').next().unwrap_or("").trim(), "audio/mpeg" | "audio/mp3" | "audio/mp4" | "video/mp4" | "audio/webm" | "video/webm" | "audio/ogg" | "audio/wav" | "audio/x-wav" | "audio/aac" | "audio/flac")
}
fn now() -> u64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0) }
