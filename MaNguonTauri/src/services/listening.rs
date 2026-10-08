use crate::models::Track;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListeningSession {
    pub id: String,
    pub track: Track,
    pub listened_seconds: f64,
    pub duration: f64,
    #[serde(default)]
    pub coverage_seconds: f64,
    pub started_at: u64,
    pub updated_at: u64,
    #[serde(default)]
    pub ended: bool,
    #[serde(default)]
    pub skipped: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ListeningProfile {
    pub epoch: u64,
    pub sessions: Vec<ListeningSession>,
    pub hidden_tracks: Vec<Track>,
}

pub struct ListeningService {
    file: PathBuf,
    profile: Mutex<ListeningProfile>,
    load_error: Mutex<Option<String>>,
}

impl ListeningService {
    pub fn new(data_dir: &Path) -> Self {
        let file = data_dir.join("library").join("listening.json");
        let (profile, load_error) = if !file.exists() {
            (ListeningProfile::default(), None)
        } else {
            match Self::read(&file) {
                Ok(profile) => (profile, None),
                Err(_) => match Self::read(&file.with_extension("json.bak")) {
                    Ok(profile) => (profile, None),
                    Err(_) => (ListeningProfile::default(), Some(
                        "Không đọc được hồ sơ nghe. Dữ liệu cũ được giữ nguyên; dùng Đặt lại gu nhạc trong Cài đặt để tạo lại.".into()
                    )),
                },
            }
        };
        Self { file, profile: Mutex::new(profile), load_error: Mutex::new(load_error) }
    }

    fn read(file: &Path) -> Result<ListeningProfile, String> {
        let data = fs::read(file).map_err(|e| e.to_string())?;
        let mut profile: ListeningProfile = serde_json::from_slice(&data).map_err(|e| e.to_string())?;
        profile.sessions.retain(|s| s.listened_seconds.is_finite() && s.listened_seconds >= 0.0);
        if profile.sessions.len() > 5000 {
            let excess = profile.sessions.len() - 5000;
            profile.sessions.drain(..excess);
        }
        profile.hidden_tracks.truncate(1000);
        Ok(profile)
    }

    fn check_readable(&self) -> Result<(), String> {
        let error = self.load_error.lock().map_err(|_| "Hồ sơ nghe đang bận.".to_string())?;
        match error.as_ref() { Some(message) => Err(message.clone()), None => Ok(()) }
    }

    pub fn get(&self) -> Result<ListeningProfile, String> {
        self.check_readable()?;
        Ok(self.profile.lock().map_err(|_| "Hồ sơ nghe đang bận.".to_string())?.clone())
    }

    fn clean_track(mut track: Track) -> Result<Track, String> {
        if track.id.is_empty() || track.id.len() > 512 || !["youtube", "spotify", "soundcloud", "local"].contains(&track.source.as_str()) {
            return Err("Bài hát không hợp lệ.".into());
        }
        fn trim(value: &str, limit: usize) -> String { value.chars().take(limit).collect() }
        track.title = trim(&track.title, 512);
        track.artist = trim(&track.artist, 512);
        track.url = trim(&track.url, 4096);
        if track.cover.starts_with("data:") || track.cover.len() > 4096 { track.cover.clear(); }
        track.original_title = track.original_title.map(|s| trim(&s, 512));
        track.original_artist = track.original_artist.map(|s| trim(&s, 512));
        track.original_cover = None;
        track.local_cover_path = None;
        track.discord_cover_url = None;
        track.duration = track.duration.min(86400);
        Ok(track)
    }

    // Write to a temporary file before replacing the current profile. A failed
    // write must not change the in-memory state or discard a listening session.
    fn persist(&self, profile: &ListeningProfile) -> Result<(), String> {
        let parent = self.file.parent().ok_or("Đường dẫn hồ sơ nghe không hợp lệ.")?;
        fs::create_dir_all(parent).map_err(|e| format!("Không tạo được thư mục hồ sơ nghe: {e}"))?;
        let data = serde_json::to_vec(profile).map_err(|e| e.to_string())?;
        let temporary = self.file.with_extension("json.tmp");
        let mut writer = OpenOptions::new().write(true).create(true).truncate(true).open(&temporary)
            .map_err(|e| format!("Không lưu được hồ sơ nghe: {e}"))?;
        writer.write_all(&data).and_then(|_| writer.sync_all()).map_err(|e| format!("Không lưu được hồ sơ nghe: {e}"))?;
        drop(writer);
        if self.file.exists() {
            // Never replace a valid backup with corrupt bytes recovered at startup.
            if Self::read(&self.file).is_ok() {
                fs::copy(&self.file, self.file.with_extension("json.bak"))
                    .map_err(|e| format!("Không sao lưu được hồ sơ nghe: {e}"))?;
            }
        }
        fs::rename(&temporary, &self.file).map_err(|e| format!("Không cập nhật được hồ sơ nghe: {e}"))?;
        Ok(())
    }

    pub fn save(&self, epoch: u64, mut session: ListeningSession) -> Result<(), String> {
        self.check_readable()?;
        if session.id.is_empty() || session.id.len() > 128 || !session.listened_seconds.is_finite()
            || session.listened_seconds < 0.0 || !session.duration.is_finite() || session.duration < 0.0
            || !session.coverage_seconds.is_finite() || session.coverage_seconds < 0.0 {
            return Err("Lượt nghe không hợp lệ.".into());
        }
        session.track = Self::clean_track(session.track)?;
        session.listened_seconds = session.listened_seconds.min(86400.0);
        session.duration = session.duration.min(86400.0);
        session.coverage_seconds = session.coverage_seconds.min(session.listened_seconds).min(if session.duration > 0.0 { session.duration } else { 86400.0 });
        let mut guard = self.profile.lock().map_err(|_| "Hồ sơ nghe đang bận.".to_string())?;
        if guard.epoch != epoch { return Err("Hồ sơ nghe đã được đặt lại.".into()); }
        let mut next = guard.clone();
        if let Some(old) = next.sessions.iter_mut().find(|s| s.id == session.id) {
            if old.track.id != session.track.id || old.track.source != session.track.source {
                return Err("Mã lượt nghe đã được sử dụng.".into());
            }
            session.listened_seconds = session.listened_seconds.max(old.listened_seconds);
            session.coverage_seconds = session.coverage_seconds.max(old.coverage_seconds);
            session.ended |= old.ended;
            session.skipped |= old.skipped;
            session.started_at = old.started_at;
            session.updated_at = session.updated_at.max(old.updated_at);
            *old = session;
        } else {
            next.sessions.push(session);
        }
        if next.sessions.len() > 5000 { let excess = next.sessions.len() - 5000; next.sessions.drain(..excess); }
        self.persist(&next)?;
        *guard = next;
        Ok(())
    }

    pub fn hide(&self, epoch: u64, track: Track) -> Result<(), String> {
        self.check_readable()?;
        let track = Self::clean_track(track)?;
        let mut guard = self.profile.lock().map_err(|_| "Hồ sơ nghe đang bận.".to_string())?;
        if guard.epoch != epoch { return Err("Hồ sơ nghe đã được đặt lại.".into()); }
        let mut next = guard.clone();
        next.hidden_tracks.retain(|t| t.id != track.id || t.source != track.source);
        next.hidden_tracks.push(track);
        if next.hidden_tracks.len() > 1000 { next.hidden_tracks.remove(0); }
        self.persist(&next)?;
        *guard = next;
        Ok(())
    }

    pub fn clear(&self) -> Result<ListeningProfile, String> {
        let mut guard = self.profile.lock().map_err(|_| "Hồ sơ nghe đang bận.".to_string())?;
        let next = ListeningProfile { epoch: guard.epoch.saturating_add(1), ..Default::default() };
        self.persist(&next)?;
        *guard = next.clone();
        *self.load_error.lock().map_err(|_| "Hồ sơ nghe đang bận.".to_string())? = None;
        Ok(next)
    }
}
