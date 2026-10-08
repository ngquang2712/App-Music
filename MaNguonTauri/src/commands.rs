use crate::models::{AppConfig, ArtistProfile, ArtistSearch, ArtistSummary, PlaybackState, Playlist, StreamResult, Track};
use crate::services::discord::DiscordService;
use crate::services::image_uploader::ImageUploader;
use crate::services::library::LibraryService;
use crate::services::soundcloud::SoundCloudService;
use crate::services::spotify::SpotifyService;
use crate::services::stream_server::StreamServer;
use crate::services::youtube::YouTubeService;
use crate::services::listening::{ListeningProfile, ListeningService, ListeningSession};
use crate::services::discovery::{DiscoveryService, DiscoverySuggestions};
use crate::services::artists::ArtistService;
use crate::services::spotify_api::{SpotifyApi, SpotifyStatus};
use std::sync::Arc;
use crate::services::offline::OfflineLibrary;
use crate::services::personal::{PersonalMusicService, PersonalTrack, PersonalMetadata, ImportResult};
use tauri::{State, Window};

pub struct AppState {
    pub youtube: Arc<YouTubeService>,
    pub spotify: Arc<SpotifyService>,
    pub soundcloud: Arc<SoundCloudService>,
    pub stream_server: Arc<StreamServer>,
    pub library: Arc<LibraryService>,
    pub personal: Arc<PersonalMusicService>,
    pub discord: Arc<DiscordService>,
    pub image_uploader: Arc<ImageUploader>,
    pub listening: Arc<ListeningService>,
    pub discovery: Arc<DiscoveryService>,
    pub spotify_api: Arc<SpotifyApi>,
    pub artists: Arc<ArtistService>,
}

#[tauri::command]
pub async fn search_artists(query: String, state: State<'_, AppState>) -> Result<ArtistSearch, String> {
    Ok(state.artists.search(&query).await)
}

#[tauri::command]
pub async fn get_artist_profile(artist: ArtistSummary, state: State<'_, AppState>) -> Result<ArtistProfile, String> {
    state.artists.profile(artist).await
}

#[tauri::command]
pub fn get_spotify_status(state: State<'_, AppState>) -> SpotifyStatus { state.spotify_api.status() }

#[tauri::command]
pub async fn connect_spotify(state: State<'_, AppState>) -> Result<SpotifyStatus, String> {
    let id = state.library.get_config().spotify_client_id;
    let url = state.spotify_api.begin(&id).await?;
    if let Err(e) = open_link(&url, true) { state.spotify_api.disconnect().await; return Err(e); }
    Ok(state.spotify_api.status())
}

#[tauri::command]
pub async fn disconnect_spotify(state: State<'_, AppState>) -> Result<(), String> {
    state.spotify_api.disconnect().await;
    Ok(())
}

#[tauri::command]
pub fn open_catalog_link(url: String) -> Result<(), String> { open_link(&url, false) }

fn open_link(value: &str, authorization: bool) -> Result<(), String> {
    let parsed = url::Url::parse(value).map_err(|_| "Liên kết không hợp lệ.".to_string())?;
    let allowed = if authorization { &["accounts.spotify.com"][..] } else { &["open.spotify.com", "music.apple.com", "itunes.apple.com", "www.deezer.com"][..] };
    if value.len() > 4096 || parsed.scheme() != "https" || !allowed.contains(&parsed.host_str().unwrap_or("")) || !parsed.username().is_empty() || parsed.password().is_some() || parsed.port().is_some() {
        return Err("Chỉ mở liên kết từ danh mục nhạc được hỗ trợ.".into());
    }
    #[cfg(windows)]
    let mut command = { let mut c = std::process::Command::new("rundll32.exe"); c.arg("url.dll,FileProtocolHandler"); c };
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(all(not(windows), not(target_os = "macos")))]
    let mut command = std::process::Command::new("xdg-open");
    command.arg(parsed.as_str());
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
    command.spawn().map_err(|_| "Không mở được trình duyệt mặc định.".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_listening_profile(state: State<'_, AppState>) -> Result<ListeningProfile, String> {
    state.listening.get()
}

#[tauri::command]
pub fn save_listening_session(epoch: u64, session: ListeningSession, state: State<'_, AppState>) -> Result<(), String> {
    state.listening.save(epoch, session)
}

#[tauri::command]
pub fn hide_recommended_track(epoch: u64, track: Track, state: State<'_, AppState>) -> Result<(), String> {
    state.listening.hide(epoch, track)
}

#[tauri::command]
pub fn clear_listening_profile(state: State<'_, AppState>) -> Result<ListeningProfile, String> {
    state.listening.clear()
}

#[tauri::command]
pub async fn get_music_discovery(artists: Vec<String>, tracks: Vec<Track>, state: State<'_, AppState>) -> Result<DiscoverySuggestions, String> {
    let key = state.library.get_config().lastfm_api_key;
    Ok(state.discovery.get(&key, artists, tracks).await)
}

#[tauri::command]
pub async fn search_all(query: String, purpose: Option<String>, state: State<'_, AppState>) -> Result<Vec<Track>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }

    let yt_fut = state.youtube.search(q, 30);
    let sc_fut = state.soundcloud.search(q, 30);
    let sp_fut = state.spotify.search(q, 30);

    let catalog = async {
        if purpose.as_deref() == Some("recommendation") || !state.spotify_api.status().connected { return Ok(Vec::new()); }
        state.spotify_api.search_tracks(q).await
    };
    let (yt_res, sc_res, sp_res, catalog_res) = tokio::join!(yt_fut, sc_fut, sp_fut, catalog);

    let personal_tracks = state.personal.search(q)?;
    if personal_tracks.is_empty() && yt_res.is_err() && sc_res.is_err() && sp_res.is_err() && catalog_res.as_ref().map_or(true, |items| items.is_empty()) {
        return Err(format!(
            "Không kết nối được các nguồn nhạc. YouTube: {}",
            yt_res.err().unwrap_or_default()
        ));
    }

    let yt_tracks = yt_res.unwrap_or_default();
    let sc_tracks = sc_res.unwrap_or_default();
    let sp_tracks = sp_res.unwrap_or_default();

    let mut merged = personal_tracks;
    merged.extend(catalog_res.unwrap_or_default());
    let max_len = yt_tracks.len().max(sc_tracks.len()).max(sp_tracks.len());

    for i in 0..max_len {
        if let Some(t) = sp_tracks.get(i) {
            merged.push(t.clone());
        }
        if let Some(t) = yt_tracks.get(i) {
            merged.push(t.clone());
        }
        if let Some(t) = sc_tracks.get(i) {
            merged.push(t.clone());
        }
    }

    Ok(merged)
}

#[tauri::command]
pub async fn search_source(
    source: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<Track>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }

    match source.as_str() {
        "youtube" => state.youtube.search(q, 50).await,
        "spotify" => state.spotify_api.search_tracks(q).await,
        "deezer" => state.spotify.search(q, 50).await,
        "soundcloud" => state.soundcloud.search(q, 50).await,
        "local" => state.personal.search(q),
        _ => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn get_stream_url(
    track: Track,
    state: State<'_, AppState>,
) -> Result<StreamResult, String> {
    if track.source == "local" { return personal_stream(&track.id, &state); }
    if matches!(track.catalog_provider.as_deref(), Some("spotify" | "itunes")) {
        return Err("Bài từ danh mục này được mở bằng nút Nghe trên Spotify / Apple Music.".into());
    }
    state.stream_server.offline.import_legacy(&track);
    let config = state.library.get_config();
    state.stream_server.offline.set_limit(config.offline_cache_limit_mb);
    if state.stream_server.is_cached(&track.source, &track.id) {
        let content_type = state
            .stream_server
            .get_cached_content_type(&track.source, &track.id);
        let proxy_url =
            state
                .stream_server
                .get_cached_stream_url(&track.id, &track.source, &content_type);
        return Ok(StreamResult {
            stream_url: proxy_url,
            content_type,
            http_headers: Default::default(),
        });
    }

    let direct_result = resolve_direct_stream(&track, &state).await?;

    if config.auto_cache_audio {
        let _ = state.stream_server.offline.start(track.clone(), direct_result.clone());
    }

    let proxy_url = state.stream_server.get_stream_url_with_meta(
        &track.id,
        &track.source,
        &direct_result.stream_url,
        &direct_result.content_type,
        &direct_result.http_headers,
    );

    Ok(StreamResult {
        stream_url: proxy_url,
        content_type: direct_result.content_type,
        http_headers: Default::default(),
    })
}

async fn resolve_direct_stream(track: &Track, state: &AppState) -> Result<StreamResult, String> {
    // Preparation and a foreground click share one provider lookup per track.
    let lock = state.stream_server.preparation_lock(&track.source, &track.id);
    let _guard = lock.lock().await;
    if let Some(stream) = state.stream_server.prepared_stream(&track.source, &track.id) { return Ok(stream); }
    let stream = match track.source.as_str() {
        "youtube" => state.youtube.get_stream_url(&track.id).await?,
        "spotify" => state.spotify.resolve_playback(track).await?,
        "soundcloud" => state.soundcloud.get_stream_url(&track.url).await?,
        _ => return Err("Unsupported track source".into()),
    };
    state.stream_server.remember_stream(&track.source, &track.id, &stream);
    Ok(stream)
}

#[tauri::command]
pub async fn prepare_stream_url(track: Track, state: State<'_, AppState>) -> Result<StreamResult, String> {
    if track.source == "local" { return personal_stream(&track.id, &state); }
    if matches!(track.catalog_provider.as_deref(), Some("spotify" | "itunes")) {
        return Err("Bài trong danh mục được mở ở dịch vụ gốc.".into());
    }
    state.stream_server.offline.import_legacy(&track);
    if state.stream_server.is_cached(&track.source, &track.id) {
        let content_type = state.stream_server.get_cached_content_type(&track.source, &track.id);
        return Ok(StreamResult { stream_url: state.stream_server.get_cached_stream_url(&track.id, &track.source, &content_type), content_type, http_headers: Default::default() });
    }
    let stream = resolve_direct_stream(&track, &state).await?;
    // Warm playback only. Unplayed songs are not added to the offline library.
    Ok(StreamResult {
        stream_url: state.stream_server.get_stream_url_with_meta(&track.id, &track.source, &stream.stream_url, &stream.content_type, &stream.http_headers),
        content_type: stream.content_type,
        http_headers: Default::default(),
    })
}

#[tauri::command]
pub fn get_offline_library(state: State<'_, AppState>) -> Result<OfflineLibrary, String> {
    let mut known = state.library.get_tracks();
    known.extend(state.library.get_playback_state().queue);
    for playlist in state.library.get_playlists() { known.extend(playlist.tracks); }
    if let Ok(profile) = state.listening.get() { known.extend(profile.sessions.into_iter().map(|s| s.track)); }
    for track in known { state.stream_server.offline.import_legacy(&track); }
    let config = state.library.get_config();
    state.stream_server.offline.set_limit(config.offline_cache_limit_mb);
    Ok(state.stream_server.offline.library(config.auto_cache_audio))
}

#[tauri::command]
pub async fn cache_track_offline(track: Track, state: State<'_, AppState>) -> Result<OfflineLibrary, String> {
    if track.source == "local" { return Err("Nhạc cá nhân đã được lưu trên máy, không cần tải offline.".into()); }
    if matches!(track.catalog_provider.as_deref(), Some("spotify" | "itunes")) {
        return Err("Bài từ danh mục Spotify / Apple Music chỉ được mở ở dịch vụ gốc.".into());
    }
    let config = state.library.get_config();
    state.stream_server.offline.set_limit(config.offline_cache_limit_mb);
    state.stream_server.offline.import_legacy(&track);
    if !state.stream_server.is_cached(&track.source, &track.id) {
        let stream = resolve_direct_stream(&track, &state).await?;
        state.stream_server.offline.start(track, stream)?;
    }
    Ok(state.stream_server.offline.library(config.auto_cache_audio))
}

#[tauri::command]
pub fn remove_offline_track(track_id: String, source: String, state: State<'_, AppState>) -> Result<OfflineLibrary, String> {
    state.stream_server.offline.remove(&source, &track_id)?;
    Ok(state.stream_server.offline.library(state.library.get_config().auto_cache_audio))
}

#[tauri::command]
pub fn clear_offline_cache(state: State<'_, AppState>) -> Result<OfflineLibrary, String> {
    state.stream_server.offline.clear()?;
    Ok(state.stream_server.offline.library(state.library.get_config().auto_cache_audio))
}

#[tauri::command]
pub fn get_library(state: State<'_, AppState>) -> Vec<Track> {
    state.library.get_tracks()
}

fn personal_stream(id: &str, state: &AppState) -> Result<StreamResult, String> {
    let (_, entry) = state.personal.file(id)?;
    Ok(StreamResult { stream_url: state.stream_server.get_cached_stream_url(id, "local", &entry.content_type), content_type: entry.content_type, http_headers: Default::default() })
}

#[tauri::command]
pub fn get_personal_music(state: State<'_, AppState>) -> Result<Vec<PersonalTrack>, String> { state.personal.list() }

#[tauri::command]
pub fn begin_personal_music_upload(file_name: String, size_bytes: u64, state: State<'_, AppState>) -> Result<String, String> {
    state.personal.begin(file_name, size_bytes)
}

#[tauri::command]
pub fn append_personal_music_upload(request: tauri::ipc::Request<'_>, state: State<'_, AppState>) -> Result<u64, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else { return Err("File nhạc phải được gửi dưới dạng dữ liệu nhị phân.".into()); };
    let id = request.headers().get("x-upload-id").and_then(|v| v.to_str().ok()).ok_or("Thiếu mã lượt nhập nhạc.")?;
    let offset = request.headers().get("x-upload-offset").and_then(|v| v.to_str().ok()).and_then(|v| v.parse::<u64>().ok()).ok_or("Thiếu vị trí dữ liệu file.")?;
    state.personal.append(id, offset, bytes)
}

#[tauri::command]
pub fn commit_personal_music_upload(upload_id: String, metadata: PersonalMetadata, state: State<'_, AppState>) -> Result<ImportResult, String> {
    state.personal.commit(&upload_id, metadata)
}

#[tauri::command]
pub fn abort_personal_music_upload(upload_id: String, state: State<'_, AppState>) -> Result<(), String> { state.personal.abort(&upload_id) }

#[tauri::command]
pub fn delete_personal_music(track_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.personal.file(&track_id)?;
    state.library.update_personal_references(&track_id, None)?;
    state.personal.remove(&track_id)
}

#[tauri::command]
pub fn save_track(track: Track, state: State<'_, AppState>) -> Track {
    state.library.save_track(track)
}

#[tauri::command]
pub async fn edit_track(
    track_id: String,
    source: String,
    title: Option<String>,
    artist: Option<String>,
    cover: Option<String>,
    reset: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Track, String> {
    if source == "local" {
        let updated = state.personal.edit(&track_id, title, artist, cover, reset.unwrap_or(false))?;
        state.library.update_personal_references(&track_id, Some(&updated))?;
        return Ok(updated);
    }
    let mut discord_cover_url = None;
    if let Some(ref c) = cover {
        if c.starts_with("data:image/") || (!c.starts_with("http://") && !c.starts_with("https://"))
        {
            if let Some(public_url) = state.image_uploader.upload_base64(c).await {
                discord_cover_url = Some(public_url);
            }
        } else if c.starts_with("http://") || c.starts_with("https://") {
            discord_cover_url = Some(c.clone());
        }
    }

    state.library.edit_track_with_discord_url(
        &track_id,
        &source,
        title,
        artist,
        cover,
        discord_cover_url,
        reset.unwrap_or(false),
    )
}

#[tauri::command]
pub fn delete_track(track_id: String, source: String, state: State<'_, AppState>) -> bool {
    state.library.delete_track(&track_id, &source)
}

#[tauri::command]
pub fn get_playlists(state: State<'_, AppState>) -> Vec<Playlist> {
    state.library.get_playlists()
}

#[tauri::command]
pub fn create_playlist(
    name: String,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Playlist {
    state.library.create_playlist(name, description)
}

#[tauri::command]
pub fn update_playlist(
    id: String,
    name: Option<String>,
    description: Option<String>,
    cover: Option<String>,
    state: State<'_, AppState>,
) -> Result<Playlist, String> {
    state.library.update_playlist(&id, name, description, cover)
}

#[tauri::command]
pub fn delete_playlist(id: String, state: State<'_, AppState>) -> Result<bool, String> {
    state.library.delete_playlist(&id)
}

#[tauri::command]
pub fn add_to_playlist(
    playlist_id: String,
    track: Track,
    state: State<'_, AppState>,
) -> Result<Playlist, String> {
    state.library.add_to_playlist(&playlist_id, track)
}

#[tauri::command]
pub fn remove_from_playlist(
    playlist_id: String,
    track_id: String,
    source: String,
    state: State<'_, AppState>,
) -> Result<Playlist, String> {
    state
        .library
        .remove_from_playlist(&playlist_id, &track_id, &source)
}

#[tauri::command]
pub fn reorder_playlist_tracks(
    playlist_id: String,
    tracks: Vec<Track>,
    state: State<'_, AppState>,
) -> Result<Playlist, String> {
    state.library.reorder_playlist_tracks(&playlist_id, tracks)
}

#[tauri::command]
pub fn save_playlist(playlist: Playlist, state: State<'_, AppState>) -> Result<Playlist, String> {
    state.library.save_playlist(playlist)
}

#[tauri::command]
pub async fn download_track(track: Track, state: State<'_, AppState>) -> Result<String, String> {
    if track.source == "local" {
        let (source, _) = state.personal.file(&track.id)?;
        let dir = state.library.downloads_dir();
        tokio::fs::create_dir_all(dir).await.map_err(|e| e.to_string())?;
        let name: String = track.title.chars().map(|c| if c.is_alphanumeric() || matches!(c, ' ' | '-' | '_') { c } else { '_' }).take(100).collect();
        let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos();
        let destination = dir.join(format!("{name}-{stamp}.mp3"));
        tokio::fs::copy(source, &destination).await.map_err(|e| e.to_string())?;
        return Ok(destination.to_string_lossy().into_owned());
    }
    if matches!(track.catalog_provider.as_deref(), Some("spotify" | "itunes")) {
        return Err("Mở bài từ danh mục trên Spotify / Apple Music để nghe.".into());
    }
    use tokio::io::AsyncWriteExt;
    let stream = match track.source.as_str() {
        "youtube" => state.youtube.get_stream_url(&track.id).await?,
        "spotify" => state.spotify.resolve_playback(&track).await?,
        "soundcloud" => state.soundcloud.get_stream_url(&track.url).await?,
        _ => return Err("Nguồn bài hát không được hỗ trợ.".into()),
    };
    let dir = state.library.downloads_dir();
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())?;
    let clean_name: String = format!("{} - {}", track.artist, track.title)
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || matches!(c, ' ' | '-' | '_') {
                c
            } else {
                '_'
            }
        })
        .take(100)
        .collect();
    let ext = match stream.content_type.as_str() {
        "audio/mp4" => "m4a",
        "video/mp4" => "mp4",
        "audio/mpeg" => "mp3",
        "audio/ogg" => "ogg",
        _ => "webm",
    };
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let path = dir.join(format!("{}-{}.{}", clean_name, unique, ext));
    let part = path.with_extension(format!("{}.part", ext));
    let result: Result<(), String> = async {
        let mut request = reqwest::Client::new().get(&stream.stream_url);
        for (name, value) in &stream.http_headers {
            request = request.header(name.as_str(), value.as_str());
        }
        let mut response = request
            .send()
            .await
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?;
        let mut file = tokio::fs::File::create(&part)
            .await
            .map_err(|e| e.to_string())?;
        while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
            file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        }
        file.flush().await.map_err(|e| e.to_string())?;
        drop(file);
        tokio::fs::rename(&part, &path)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    .await;
    if let Err(error) = result {
        let _ = tokio::fs::remove_file(&part).await;
        return Err(error);
    }
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn open_downloads_folder(state: State<'_, AppState>) -> Result<(), String> {
    let dir = state.library.downloads_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let program = if cfg!(windows) {
        "explorer.exe"
    } else if cfg!(target_os = "macos") {
        "open"
    } else {
        "xdg-open"
    };
    let mut command = std::process::Command::new(program);
    command.arg(dir);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> AppConfig {
    state.library.get_config()
}

#[tauri::command]
pub fn save_config(config: AppConfig, state: State<'_, AppState>) -> Result<AppConfig, String> {
    let previous = state.library.get_config();
    let saved = state.library.save_config(config)?;
    if previous.discord_rpc_enabled != saved.discord_rpc_enabled
        || previous.discord_client_id != saved.discord_client_id
        || previous.discord_large_image != saved.discord_large_image
        || previous.discord_state != saved.discord_state
        || previous.discord_details != saved.discord_details {
        state.discord.configure(&saved);
    }
    Ok(saved)
}

#[tauri::command]
pub fn get_playback_state(state: State<'_, AppState>) -> PlaybackState {
    state.library.get_playback_state()
}

#[tauri::command]
pub fn save_playback_state(
    playback_state: PlaybackState,
    state: State<'_, AppState>,
) -> PlaybackState {
    state.library.save_playback_state(playback_state)
}

#[tauri::command]
pub async fn update_discord_activity(
    title: String,
    artist: String,
    cover_url: Option<String>,
    current_time: u64,
    duration: u64,
    is_playing: bool,
    album: Option<String>,
    track_id: Option<String>,
    source: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let revision = state.discord.begin_update();
    let config = state.library.get_config();
    if !config.discord_rpc_enabled { return Ok(()); }
    let mut resolved_cover = if source.as_deref() == Some("local") { None } else { cover_url };

    let needs_upload = if let Some(ref c) = resolved_cover {
        c.contains("kn3fi8")
            || c.starts_with("data:image/")
            || (!c.starts_with("http://") && !c.starts_with("https://"))
    } else {
        true
    };

    if source.as_deref() != Some("local") && config.discord_large_image == "{cover}" && needs_upload {
        let base64_opt = if let Some(ref c) = resolved_cover {
            if c.starts_with("data:image/") {
                Some(c.clone())
            } else {
                None
            }
        } else {
            None
        };

        let base64_data = if base64_opt.is_some() {
            base64_opt
        } else {
            let tracks = state.library.get_tracks();
            let found = if let (Some(ref tid), Some(ref src)) = (&track_id, &source) {
                tracks.iter().find(|t| &t.id == tid && &t.source == src)
            } else {
                tracks
                    .iter()
                    .find(|t| t.title.trim().eq_ignore_ascii_case(title.trim()))
            };
            found.and_then(|t| {
                if t.cover.starts_with("data:image/") {
                    Some(t.cover.clone())
                } else {
                    None
                }
            })
        };

        if let Some(b64) = base64_data {
            if let Some(public_url) = state.image_uploader.upload_base64(&b64).await {
                let tid = track_id.as_deref();
                let src = source.as_deref();
                if let (Some(t), Some(s)) = (tid, src) {
                    state
                        .library
                        .update_track_discord_cover_url(t, s, &public_url);
                } else {
                    let tracks = state.library.get_tracks();
                    if let Some(t) = tracks
                        .iter()
                        .find(|t| t.title.trim().eq_ignore_ascii_case(title.trim()))
                    {
                        state
                            .library
                            .update_track_discord_cover_url(&t.id, &t.source, &public_url);
                    }
                }
                resolved_cover = Some(public_url);
            }
        }
    }

    state.discord.set_activity(
        revision,
        &config,
        &title,
        &artist,
        resolved_cover.as_deref(),
        current_time,
        duration,
        is_playing,
        album.as_deref(),
        source.as_deref(),
    );

    Ok(())
}

#[tauri::command]
pub fn clear_discord_activity(state: State<'_, AppState>) {
    state.discord.clear_activity();
}

#[tauri::command]
pub fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_maximize_window(window: Window) -> Result<bool, String> {
    let is_max = window.is_maximized().unwrap_or(false);
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
pub fn is_window_maximized(window: Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
pub fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_image_to_disk(image_url: String, default_name: String) -> Result<String, String> {
    let clean_name = default_name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string());
    let downloads = std::path::PathBuf::from(user_profile).join("Downloads");
    let target_dir = if downloads.exists() {
        downloads
    } else {
        std::path::PathBuf::from(".")
    };

    let mut bytes_data = Vec::new();
    let mut ext = "png".to_string();

    if image_url.starts_with("data:image/") {
        if let Some(comma_pos) = image_url.find(',') {
            let meta = &image_url[..comma_pos];
            let b64 = &image_url[comma_pos + 1..];
            if meta.contains("jpeg") || meta.contains("jpg") {
                ext = "jpg".to_string();
            } else if meta.contains("webp") {
                ext = "webp".to_string();
            }
            use base64::Engine;
            bytes_data = base64::engine::general_purpose::STANDARD
                .decode(b64)
                .map_err(|e| e.to_string())?;
        }
    } else if image_url.starts_with("http://") || image_url.starts_with("https://") {
        if image_url.contains(".jpg") || image_url.contains(".jpeg") {
            ext = "jpg".to_string();
        } else if image_url.contains(".webp") {
            ext = "webp".to_string();
        }
        let resp = reqwest::get(&image_url).await.map_err(|e| e.to_string())?;
        let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
        bytes_data = bytes.to_vec();
    } else {
        let mut path_candidate = std::path::PathBuf::from(&image_url);
        if image_url.starts_with("local-cover://") {
            let clean = image_url.trim_start_matches("local-cover://");
            path_candidate = std::path::PathBuf::from("data").join("covers").join(clean);
        }
        if let Ok(data) = std::fs::read(&path_candidate) {
            if let Some(e) = path_candidate.extension() {
                ext = e.to_string_lossy().to_string();
            }
            bytes_data = data;
        }
    }

    if bytes_data.is_empty() {
        return Err("Không có dữ liệu ảnh".to_string());
    }

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let file_path = target_dir.join(format!("{}_{}.{}", clean_name, timestamp, ext));
    std::fs::write(&file_path, bytes_data).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg(format!("/select,\"{}\"", file_path.to_string_lossy()))
            .spawn();
    }

    Ok(file_path.to_string_lossy().to_string())
}
