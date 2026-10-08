use crate::models::Track;
use base64::{engine::general_purpose::STANDARD, Engine};
use ring::{digest, rand::{SecureRandom, SystemRandom}};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs::{self, File}, io::Write, path::{Path, PathBuf}, sync::Mutex, time::{Duration, Instant, SystemTime, UNIX_EPOCH}};

pub const MAX_FILE_BYTES: u64 = 512 * 1024 * 1024;
pub const MAX_CHUNK_BYTES: usize = 1024 * 1024;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalTrack {
    pub track: Track,
    pub file_name: String,
    pub size_bytes: u64,
    pub content_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalMetadata {
    pub title: String,
    pub artist: String,
    #[serde(default)] pub cover: String,
    pub duration: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub entry: PersonalTrack,
    pub duplicate: bool,
}

struct Upload {
    file: File,
    path: PathBuf,
    file_name: String,
    size: u64,
    written: u64,
    hash: digest::Context,
    header: Vec<u8>,
    touched: Instant,
}

// Personal files never share the evictable cache used for online audio.
pub struct PersonalMusicService {
    directory: PathBuf,
    uploads: Mutex<HashMap<String, Upload>>,
    records: Mutex<HashMap<String, PersonalTrack>>,
}

impl PersonalMusicService {
    pub fn new(root: &Path) -> Result<Self, String> {
        let directory = root.join("personal_music");
        fs::create_dir_all(directory.join("uploads")).map_err(io_error)?;
        // Interrupted imports are not songs and can be discarded on startup.
        for entry in fs::read_dir(directory.join("uploads")).map_err(io_error)?.flatten() {
            if entry.path().is_file() { let _ = fs::remove_file(entry.path()); }
        }
        let mut records = HashMap::new();
        for entry in fs::read_dir(&directory).map_err(io_error)?.flatten() {
            let path = entry.path();
            if path.extension().and_then(|v| v.to_str()) != Some("json") { continue; }
            if let Ok(bytes) = fs::read(&path) {
                if let Ok(record) = serde_json::from_slice::<PersonalTrack>(&bytes) {
                    if valid_id(&record.track.id) && record.track.source == "local"
                        && path.file_stem().and_then(|s| s.to_str()) == Some(&record.track.id)
                        && directory.join(format!("{}.audio", record.track.id)).is_file() {
                        records.insert(record.track.id.clone(), record);
                    }
                }
            }
        }
        Ok(Self { directory, uploads: Mutex::new(HashMap::new()), records: Mutex::new(records) })
    }

    pub fn list(&self) -> Result<Vec<PersonalTrack>, String> {
        let records = self.records.lock().map_err(|_| busy())?;
        let mut items: Vec<_> = records.values().cloned().collect();
        items.sort_by(|a, b| b.track.added_at.cmp(&a.track.added_at).then_with(|| a.track.title.cmp(&b.track.title)));
        Ok(items)
    }

    pub fn search(&self, query: &str) -> Result<Vec<Track>, String> {
        let q = search_text(query.trim());
        Ok(self.list()?.into_iter().filter(|r| search_text(&format!("{} {} {}", r.track.title, r.track.artist, r.file_name)).contains(&q)).map(|r| r.track).collect())
    }

    pub fn file(&self, id: &str) -> Result<(PathBuf, PersonalTrack), String> {
        if !valid_id(id) { return Err("Mã bài nhạc cá nhân không hợp lệ.".into()); }
        let record = self.records.lock().map_err(|_| busy())?.get(id).cloned().ok_or("Không tìm thấy nhạc cá nhân.")?;
        let path = self.directory.join(format!("{id}.audio"));
        if !path.is_file() { return Err("File nhạc cá nhân đã bị di chuyển hoặc xóa.".into()); }
        Ok((path, record))
    }

    pub fn begin(&self, file_name: String, size: u64) -> Result<String, String> {
        if size == 0 || size > MAX_FILE_BYTES { return Err("Chọn file nhạc từ 1 byte đến 512 MB.".into()); }
        let name = file_name.rsplit(['/', '\\']).next().unwrap_or("").chars().take(240).collect::<String>();
        if content_type(&name).is_none() { return Err("Chọn file nhạc MP3.".into()); }
        let mut uploads = self.uploads.lock().map_err(|_| busy())?;
        let expired: Vec<_> = uploads.iter().filter(|(_, u)| u.touched.elapsed() > Duration::from_secs(600)).map(|(k, _)| k.clone()).collect();
        for id in expired { if let Some(u) = uploads.remove(&id) { let path = u.path.clone(); drop(u); let _ = fs::remove_file(path); } }
        if uploads.len() >= 4 { return Err("Có quá nhiều file đang nhập. Hãy đợi hoặc hủy lượt nhập hiện tại.".into()); }
        let mut random = [0u8; 24];
        SystemRandom::new().fill(&mut random).map_err(|_| "Không tạo được lượt nhập nhạc.")?;
        let id = hex(&random);
        let path = self.directory.join("uploads").join(format!("{id}.part"));
        let file = File::options().write(true).create_new(true).open(&path).map_err(io_error)?;
        uploads.insert(id.clone(), Upload { file, path, file_name: name, size, written: 0, hash: digest::Context::new(&digest::SHA256), header: Vec::new(), touched: Instant::now() });
        Ok(id)
    }

    pub fn append(&self, id: &str, offset: u64, bytes: &[u8]) -> Result<u64, String> {
        let mut uploads = self.uploads.lock().map_err(|_| busy())?;
        let u = uploads.get_mut(id).ok_or("Lượt nhập nhạc đã kết thúc. Hãy chọn lại file.")?;
        if bytes.is_empty() || bytes.len() > MAX_CHUNK_BYTES || offset != u.written || u.written + bytes.len() as u64 > u.size {
            return Err("Dữ liệu file nhạc bị thiếu hoặc sai thứ tự.".into());
        }
        u.file.write_all(bytes).map_err(io_error)?;
        let count = (64usize.saturating_sub(u.header.len())).min(bytes.len());
        u.header.extend_from_slice(&bytes[..count]);
        u.hash.update(bytes);
        u.written += bytes.len() as u64;
        u.touched = Instant::now();
        Ok(u.written)
    }

    pub fn abort(&self, id: &str) -> Result<(), String> {
        if let Some(u) = self.uploads.lock().map_err(|_| busy())?.remove(id) {
            let path = u.path.clone(); drop(u);
            fs::remove_file(path).map_err(io_error)?;
        }
        Ok(())
    }

    pub fn commit(&self, id: &str, meta: PersonalMetadata) -> Result<ImportResult, String> {
        let meta = validate_metadata(meta)?;
        let u = self.uploads.lock().map_err(|_| busy())?.remove(id).ok_or("Không tìm thấy lượt nhập nhạc.")?;
        let temporary = u.path.clone();
        let result = (|| {
            if u.written != u.size { return Err("File nhạc chưa được nhập đầy đủ.".into()); }
            let ctype = content_type(&u.file_name).ok_or("Định dạng nhạc không được hỗ trợ.")?;
            if !valid_audio_header(&u.header, ctype) { return Err("Nội dung file không khớp với định dạng nhạc đã chọn.".into()); }
            u.file.sync_all().map_err(io_error)?;
            let hash = hex(u.hash.finish().as_ref());
            drop(u.file); // Windows cannot rename an open upload file.
            let mut records = self.records.lock().map_err(|_| busy())?;
            if let Some(entry) = records.get(&hash) {
                return Ok(ImportResult { entry: entry.clone(), duplicate: true });
            }
            let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis().to_string();
            let duration = meta.duration.round().max(1.0) as u64;
            let track = Track {
                id: hash.clone(), source: "local".into(), title: meta.title.clone(), artist: meta.artist.clone(),
                artist_id: None, artist_picture: None, genre_tags: Vec::new(), catalog_provider: None,
                album: None, duration, duration_formatted: Some(format!("{}:{:02}", duration / 60, duration % 60)),
                cover: meta.cover.clone(), url: String::new(), views: None, views_formatted: None, uploaded_at: None,
                original_title: Some(meta.title), original_artist: Some(meta.artist), original_cover: Some(meta.cover),
                local_cover_path: None, discord_cover_url: None, added_at: Some(timestamp.clone()), updated_at: Some(timestamp),
            };
            let entry = PersonalTrack { track, file_name: u.file_name, size_bytes: u.size, content_type: ctype.into() };
            let audio = self.directory.join(format!("{hash}.audio"));
            // An orphaned audio file can remain if the app stopped before saving metadata.
            let existed = audio.is_file();
            if !existed { fs::rename(&temporary, &audio).map_err(io_error)?; }
            if let Err(e) = write_record(&self.directory, &entry) {
                if !existed { let _ = fs::remove_file(audio); }
                return Err(e);
            }
            records.insert(hash, entry.clone());
            Ok(ImportResult { entry, duplicate: false })
        })();
        let _ = fs::remove_file(temporary);
        result
    }

    pub fn edit(&self, id: &str, title: Option<String>, artist: Option<String>, cover: Option<String>, reset: bool) -> Result<Track, String> {
        let mut records = self.records.lock().map_err(|_| busy())?;
        let mut entry = records.get(id).cloned().ok_or("Không tìm thấy nhạc cá nhân.")?;
        let t = &mut entry.track;
        let meta = validate_metadata(PersonalMetadata {
            title: if reset { t.original_title.clone().unwrap_or_else(|| t.title.clone()) } else { title.unwrap_or_else(|| t.title.clone()) },
            artist: if reset { t.original_artist.clone().unwrap_or_else(|| t.artist.clone()) } else { artist.unwrap_or_else(|| t.artist.clone()) },
            cover: if reset { t.original_cover.clone().unwrap_or_default() } else { cover.unwrap_or_else(|| t.cover.clone()) },
            duration: t.duration as f64,
        })?;
        t.title = meta.title; t.artist = meta.artist; t.cover = meta.cover;
        t.updated_at = Some(SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis().to_string());
        write_record(&self.directory, &entry)?;
        records.insert(id.into(), entry.clone());
        Ok(entry.track)
    }

    pub fn remove(&self, id: &str) -> Result<(), String> {
        if !valid_id(id) { return Err("Mã bài hát không hợp lệ.".into()); }
        let mut records = self.records.lock().map_err(|_| busy())?;
        if !records.contains_key(id) { return Err("Bài nhạc đã được xóa.".into()); }
        let audio = self.directory.join(format!("{id}.audio"));
        // Keep metadata until the audio is gone, so a failed deletion remains visible.
        if audio.exists() { fs::remove_file(&audio).map_err(io_error)?; }
        records.remove(id);
        fs::remove_file(self.directory.join(format!("{id}.json"))).map_err(io_error)
    }
}

fn io_error(e: std::io::Error) -> String { format!("Không lưu được nhạc cá nhân: {e}") }
fn busy() -> String { "Bộ sưu tập nhạc cá nhân đang bận.".into() }
fn hex(bytes: &[u8]) -> String { bytes.iter().map(|b| format!("{b:02x}")).collect() }
fn valid_id(id: &str) -> bool { id.len() == 64 && id.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) }
fn search_text(value: &str) -> String {
    value.to_lowercase().chars().filter_map(|c| Some(match c {
        'à' | 'á' | 'ạ' | 'ả' | 'ã' | 'â' | 'ầ' | 'ấ' | 'ậ' | 'ẩ' | 'ẫ' | 'ă' | 'ằ' | 'ắ' | 'ặ' | 'ẳ' | 'ẵ' => 'a',
        'è' | 'é' | 'ẹ' | 'ẻ' | 'ẽ' | 'ê' | 'ề' | 'ế' | 'ệ' | 'ể' | 'ễ' => 'e',
        'ì' | 'í' | 'ị' | 'ỉ' | 'ĩ' => 'i',
        'ò' | 'ó' | 'ọ' | 'ỏ' | 'õ' | 'ô' | 'ồ' | 'ố' | 'ộ' | 'ổ' | 'ỗ' | 'ơ' | 'ờ' | 'ớ' | 'ợ' | 'ở' | 'ỡ' => 'o',
        'ù' | 'ú' | 'ụ' | 'ủ' | 'ũ' | 'ư' | 'ừ' | 'ứ' | 'ự' | 'ử' | 'ữ' => 'u',
        'ỳ' | 'ý' | 'ỵ' | 'ỷ' | 'ỹ' => 'y', 'đ' => 'd',
        '\u{0300}'..='\u{036f}' => return None, _ => c,
    })).collect()
}
fn content_type(name: &str) -> Option<&'static str> {
    if name.rsplit('.').next()?.eq_ignore_ascii_case("mp3") { Some("audio/mpeg") } else { None }
}
fn valid_audio_header(b: &[u8], ctype: &str) -> bool {
    match ctype {
        "audio/mpeg" => b.starts_with(b"ID3") || (b.len() >= 2 && b[0] == 255 && b[1] & 0xe0 == 0xe0 && b[1] & 6 != 0),
        "audio/wav" => b.starts_with(b"RIFF") && b.get(8..12) == Some(b"WAVE"),
        "audio/flac" => b.starts_with(b"fLaC"), "audio/ogg" => b.starts_with(b"OggS"),
        "audio/mp4" => b.get(4..8) == Some(b"ftyp"),
        "audio/aac" => b.len() >= 2 && b[0] == 255 && b[1] & 0xf6 == 0xf0, _ => false,
    }
}
fn validate_metadata(mut meta: PersonalMetadata) -> Result<PersonalMetadata, String> {
    meta.title = meta.title.trim().chars().take(240).collect();
    meta.artist = meta.artist.trim().chars().take(240).collect();
    if meta.title.is_empty() || meta.artist.is_empty() { return Err("Nhập tên bài hát và nghệ sĩ.".into()); }
    if !meta.duration.is_finite() || meta.duration <= 0.0 || meta.duration > 86400.0 { return Err("Không đọc được thời lượng file nhạc (tối đa 24 giờ).".into()); }
    if !meta.cover.is_empty() {
        if meta.cover.len() > 3 * 1024 * 1024 { return Err("Ảnh bìa quá lớn. Chọn ảnh dưới 2 MB.".into()); }
        let (prefix, value) = meta.cover.split_once(',').ok_or("Ảnh bìa không hợp lệ.")?;
        let bytes = STANDARD.decode(value).map_err(|_| "Ảnh bìa không hợp lệ.")?;
        let valid = match prefix {
            "data:image/jpeg;base64" => bytes.starts_with(&[255, 216, 255]),
            "data:image/png;base64" => bytes.starts_with(b"\x89PNG\r\n\x1a\n"),
            "data:image/webp;base64" => bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP"), _ => false,
        };
        if !valid { return Err("Chọn ảnh bìa PNG, JPEG hoặc WebP.".into()); }
    }
    Ok(meta)
}
fn write_record(dir: &Path, entry: &PersonalTrack) -> Result<(), String> {
    let temporary = dir.join(format!("{}.json.tmp", entry.track.id));
    let bytes = serde_json::to_vec(entry).map_err(|e| e.to_string())?;
    let mut file = File::create(&temporary).map_err(io_error)?;
    file.write_all(&bytes).and_then(|_| file.sync_all()).map_err(io_error)?;
    drop(file);
    fs::rename(&temporary, dir.join(format!("{}.json", entry.track.id))).map_err(io_error)
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
            Self(std::env::temp_dir().join(format!("personal-test-{}-{stamp}", std::process::id())))
        }
        fn service(&self) -> PersonalMusicService { PersonalMusicService::new(&self.0).unwrap() }
    }
    impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); } }
    fn metadata() -> PersonalMetadata { PersonalMetadata { title: "Bản demo".into(), artist: "Tôi".into(), duration: 80.0, cover: String::new() } }
    fn import(service: &PersonalMusicService, bytes: &[u8]) -> ImportResult {
        let id = service.begin("demo.mp3".into(), bytes.len() as u64).unwrap();
        service.append(&id, 0, bytes).unwrap(); service.commit(&id, metadata()).unwrap()
    }
    const AUDIO: &[u8] = b"ID3\x04\0\0\0\0\0\0fixture audio";
    #[test]
    fn import_persists_bytes_and_metadata_after_restart() {
        let fixture = Fixture::new(); let service = fixture.service();
        let result = import(&service, AUDIO);
        assert!(!result.duplicate); assert_eq!(result.entry.track.source, "local");
        assert_eq!(fs::read(service.file(&result.entry.track.id).unwrap().0).unwrap(), AUDIO);
        drop(service); let service = fixture.service();
        assert_eq!(service.list().unwrap()[0].track.title, "Bản demo");
        assert_eq!(service.search("demo").unwrap().len(), 1);
        assert_eq!(service.search("BAN DEMO").unwrap().len(), 1);
    }
    #[test]
    fn duplicate_content_keeps_custom_metadata_without_another_file() {
        let fixture = Fixture::new(); let service = fixture.service();
        let first = import(&service, AUDIO);
        service.edit(&first.entry.track.id, Some("Tên mới".into()), None, None, false).unwrap();
        let second = import(&service, AUDIO);
        assert!(second.duplicate); assert_eq!(second.entry.track.title, "Tên mới");
        assert_eq!(service.list().unwrap().len(), 1);
        assert_eq!(fs::read_dir(service.directory.join("uploads")).unwrap().count(), 0);
    }
    #[test]
    fn accepts_sequential_chunks_and_rejects_wrong_offset_and_overflow() {
        let fixture = Fixture::new(); let service = fixture.service();
        let id = service.begin("x.MP3".into(), AUDIO.len() as u64).unwrap();
        assert!(service.append(&id, 1, &AUDIO[..4]).is_err());
        assert_eq!(service.append(&id, 0, &AUDIO[..4]).unwrap(), 4);
        assert!(service.append(&id, 4, AUDIO).is_err());
        service.append(&id, 4, &AUDIO[4..]).unwrap();
        assert!(service.commit(&id, metadata()).is_ok());
    }
    #[test]
    fn rejects_invalid_format_size_incomplete_audio_and_metadata() {
        let fixture = Fixture::new(); let service = fixture.service();
        assert!(service.begin("test.wav".into(), 100).is_err());
        assert!(service.begin("test.mp3".into(), 0).is_err());
        assert!(service.begin("test.mp3".into(), MAX_FILE_BYTES + 1).is_err());
        let id = service.begin("x.mp3".into(), AUDIO.len() as u64).unwrap();
        service.append(&id, 0, &AUDIO[..4]).unwrap();
        assert!(service.commit(&id, metadata()).is_err());
        let id = service.begin("x.mp3".into(), 11).unwrap();
        service.append(&id, 0, b"just a text").unwrap(); assert!(service.commit(&id, metadata()).is_err());
        let mut meta = metadata(); meta.duration = f64::NAN; assert!(validate_metadata(meta).is_err());
        let mut meta = metadata(); meta.title = "  ".into(); assert!(validate_metadata(meta).is_err());
        let mut meta = metadata(); meta.cover = "data:image/svg+xml;base64,PHN2Zz4=".into(); assert!(validate_metadata(meta).is_err());
        assert!(service.list().unwrap().is_empty());
        assert_eq!(fs::read_dir(service.directory.join("uploads")).unwrap().count(), 0);
    }
    #[test]
    fn cancel_and_restart_discard_unfinished_files_only() {
        let fixture = Fixture::new(); let service = fixture.service();
        let saved = import(&service, AUDIO);
        let id = service.begin("x.mp3".into(), 100).unwrap(); service.append(&id, 0, AUDIO).unwrap();
        service.abort(&id).unwrap(); assert!(service.append(&id, 0, AUDIO).is_err());
        let id = service.begin("x.mp3".into(), 100).unwrap(); service.append(&id, 0, AUDIO).unwrap();
        drop(service); let service = fixture.service();
        assert!(service.file(&saved.entry.track.id).is_ok());
        assert_eq!(fs::read_dir(service.directory.join("uploads")).unwrap().count(), 0);
    }
    #[test]
    fn paths_cannot_escape_and_deleting_keeps_other_tracks() {
        let fixture = Fixture::new(); let service = fixture.service();
        let first = import(&service, AUDIO); let second = import(&service, b"ID3another song");
        assert!(service.file("../../secret").is_err()); assert!(service.remove("../../secret").is_err());
        service.remove(&first.entry.track.id).unwrap();
        assert!(service.file(&first.entry.track.id).is_err()); assert!(service.file(&second.entry.track.id).is_ok());
        drop(service); assert_eq!(fixture.service().list().unwrap().len(), 1);
    }
    #[test]
    fn resetting_metadata_restores_import_values() {
        let fixture = Fixture::new(); let service = fixture.service(); let track = import(&service, AUDIO).entry.track;
        service.edit(&track.id, Some("Khác".into()), Some("Người khác".into()), None, false).unwrap();
        let reset = service.edit(&track.id, None, None, None, true).unwrap();
        assert_eq!(reset.title, track.title); assert_eq!(reset.artist, track.artist);
    }
}
