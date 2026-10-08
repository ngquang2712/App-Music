use crate::models::{AppConfig, LibraryData, PlaybackState, Playlist, PlaylistsData, Track};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

#[allow(dead_code)]
pub struct LibraryService {
    data_dir: PathBuf,
    covers_dir: PathBuf,
    config_dir: PathBuf,
    library_dir: PathBuf,
    cache_dir: PathBuf,
    downloads_dir: PathBuf,
    config_file: PathBuf,
    playback_file: PathBuf,
    library_file: PathBuf,
    playlists_file: PathBuf,
    tracks_cache: RwLock<Vec<Track>>,
    playlists_cache: RwLock<Vec<Playlist>>,
    config_cache: RwLock<AppConfig>,
    playback_cache: RwLock<PlaybackState>,
}

impl LibraryService {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Self {
        let data_dir = data_dir.as_ref().to_path_buf();
        let covers_dir = data_dir.join("covers");
        let config_dir = data_dir.join("config");
        let library_dir = data_dir.join("library");
        let cache_dir = data_dir.join("cache");
        let downloads_dir = data_dir.join("downloads");

        let _ = fs::create_dir_all(&data_dir);
        let _ = fs::create_dir_all(&covers_dir);
        let _ = fs::create_dir_all(&config_dir);
        let _ = fs::create_dir_all(&library_dir);
        let _ = fs::create_dir_all(&cache_dir);
        let _ = fs::create_dir_all(&downloads_dir);

        let config_file = config_dir.join("config.json");
        let playback_file = config_dir.join("playback.json");
        let library_file = library_dir.join("library.json");
        let playlists_file = library_dir.join("playlists.json");

        Self::migrate_if_needed(&data_dir, &covers_dir, &config_file, &library_file);

        let initial_tracks = if library_file.exists() {
            fs::read_to_string(&library_file)
                .ok()
                .and_then(|content| serde_json::from_str::<LibraryData>(&content).ok())
                .map(|d| d.tracks)
                .unwrap_or_default()
        } else {
            let empty = LibraryData { tracks: Vec::new() };
            if let Ok(json) = serde_json::to_string_pretty(&empty) {
                let _ = fs::write(&library_file, json);
            }
            Vec::new()
        };

        let initial_playlists = if playlists_file.exists() {
            fs::read_to_string(&playlists_file)
                .ok()
                .and_then(|content| serde_json::from_str::<PlaylistsData>(&content).ok())
                .map(|d| d.playlists)
                .unwrap_or_default()
        } else {
            let empty = PlaylistsData {
                playlists: Vec::new(),
            };
            if let Ok(json) = serde_json::to_string_pretty(&empty) {
                let _ = fs::write(&playlists_file, json);
            }
            Vec::new()
        };

        let initial_config = if config_file.exists() {
            fs::read_to_string(&config_file)
                .ok()
                .and_then(|content| serde_json::from_str::<AppConfig>(&content).ok())
                .unwrap_or_default()
        } else {
            let default_cfg = AppConfig::default();
            if let Ok(json) = serde_json::to_string_pretty(&default_cfg) {
                let _ = fs::write(&config_file, json);
            }
            default_cfg
        };

        let initial_playback = if playback_file.exists() {
            fs::read_to_string(&playback_file)
                .ok()
                .and_then(|content| serde_json::from_str::<PlaybackState>(&content).ok())
                .unwrap_or_default()
        } else {
            let default_pb = PlaybackState::default();
            if let Ok(json) = serde_json::to_string_pretty(&default_pb) {
                let _ = fs::write(&playback_file, json);
            }
            default_pb
        };

        Self {
            data_dir,
            covers_dir,
            config_dir,
            library_dir,
            cache_dir,
            downloads_dir,
            config_file,
            playback_file,
            library_file,
            playlists_file,
            tracks_cache: RwLock::new(initial_tracks),
            playlists_cache: RwLock::new(initial_playlists),
            config_cache: RwLock::new(initial_config),
            playback_cache: RwLock::new(initial_playback),
        }
    }

    fn migrate_if_needed(
        data_dir: &Path,
        covers_dir: &Path,
        config_file: &Path,
        library_file: &Path,
    ) {
        let legacy_config = data_dir.join("config.json");
        if legacy_config.exists() && !config_file.exists() {
            let _ = fs::copy(&legacy_config, config_file);
        }
        let legacy_library = data_dir.join("library.json");
        if legacy_library.exists()
            && (!library_file.exists()
                || fs::metadata(library_file).map(|m| m.len()).unwrap_or(0) < 10)
        {
            let _ = fs::copy(&legacy_library, library_file);
        }

        if let Ok(app_data_env) = std::env::var("APPDATA") {
            let appdata_dir = PathBuf::from(app_data_env)
                .join("com.omnimusic.player")
                .join("data");
            if appdata_dir.exists() {
                let appdata_lib = appdata_dir.join("library.json");
                if appdata_lib.exists()
                    && (!library_file.exists()
                        || fs::metadata(library_file).map(|m| m.len()).unwrap_or(0) < 10)
                {
                    let _ = fs::copy(&appdata_lib, library_file);
                }

                let appdata_cfg = appdata_dir.join("config.json");
                if appdata_cfg.exists() && !config_file.exists() {
                    let _ = fs::copy(&appdata_cfg, config_file);
                }

                let appdata_covers = appdata_dir.join("covers");
                if appdata_covers.exists() {
                    if let Ok(entries) = fs::read_dir(appdata_covers) {
                        for entry in entries.flatten() {
                            let target = covers_dir.join(entry.file_name());
                            if !target.exists() {
                                let _ = fs::copy(entry.path(), target);
                            }
                        }
                    }
                }

                let appdata_audio_cache = appdata_dir.join("cache").join("audio");
                let local_audio_cache = data_dir.join("cache").join("audio");
                let _ = fs::create_dir_all(&local_audio_cache);
                if appdata_audio_cache.exists() {
                    if let Ok(entries) = fs::read_dir(appdata_audio_cache) {
                        for entry in entries.flatten() {
                            let target = local_audio_cache.join(entry.file_name());
                            if !target.exists() {
                                let _ = fs::copy(entry.path(), target);
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn get_tracks(&self) -> Vec<Track> {
        self.tracks_cache.read().unwrap().clone()
    }

    pub fn save_track(&self, mut track: Track) -> Track {
        let mut guard = self.tracks_cache.write().unwrap();
        if track.original_title.is_none() {
            track.original_title = Some(track.title.clone());
        }
        if track.original_artist.is_none() {
            track.original_artist = Some(track.artist.clone());
        }
        if track.original_cover.is_none() {
            track.original_cover = Some(track.cover.clone());
        }

        if let Some(pos) = guard
            .iter()
            .position(|t| t.id == track.id && t.source == track.source)
        {
            guard[pos] = track.clone();
        } else {
            guard.insert(0, track.clone());
        }

        self.persist_tracks(&guard);
        track
    }

    pub fn edit_track_with_discord_url(
        &self,
        track_id: &str,
        source: &str,
        title: Option<String>,
        artist: Option<String>,
        cover: Option<String>,
        discord_cover_url: Option<String>,
        reset: bool,
    ) -> Result<Track, String> {
        let mut guard = self.tracks_cache.write().unwrap();
        let track_index = guard
            .iter()
            .position(|t| t.id == track_id && t.source == source);

        let idx = match track_index {
            Some(i) => i,
            None => {
                let new_t = Track {
                    id: track_id.to_string(),
                    source: source.to_string(),
                    title: title.clone().unwrap_or_else(|| "Unknown Title".to_string()),
                    artist: artist
                        .clone()
                        .unwrap_or_else(|| "Unknown Artist".to_string()),
                    album: None,
                    duration: 0,
                    duration_formatted: None,
                    cover: cover.clone().unwrap_or_default(),
                    url: String::new(),
                    views: None,
                    views_formatted: None,
                    uploaded_at: None,
                    original_title: title.clone(),
                    original_artist: artist.clone(),
                    original_cover: cover.clone(),
                    artist_id: None,
                    artist_picture: None,
                    genre_tags: Vec::new(),
                    catalog_provider: None,
                    local_cover_path: None,
                    discord_cover_url: discord_cover_url.clone(),
                    added_at: None,
                    updated_at: None,
                };
                guard.insert(0, new_t);
                0
            }
        };

        let track = &mut guard[idx];

        if reset {
            if let Some(ref orig_t) = track.original_title {
                track.title = orig_t.clone();
            }
            if let Some(ref orig_a) = track.original_artist {
                track.artist = orig_a.clone();
            }
            if let Some(ref orig_c) = track.original_cover {
                track.cover = orig_c.clone();
            }
            track.local_cover_path = None;
            track.discord_cover_url = None;
        } else {
            if track.original_title.is_none() {
                track.original_title = Some(track.title.clone());
            }
            if track.original_artist.is_none() {
                track.original_artist = Some(track.artist.clone());
            }
            if track.original_cover.is_none() {
                track.original_cover = Some(track.cover.clone());
            }

            if let Some(ref t) = title {
                if !t.trim().is_empty() {
                    track.title = t.trim().to_string();
                }
            }
            if let Some(ref a) = artist {
                if !a.trim().is_empty() {
                    track.artist = a.trim().to_string();
                }
            }
            if let Some(ref c) = cover {
                if !c.trim().is_empty() {
                    track.cover = c.trim().to_string();
                }
            }
            if let Some(ref dc) = discord_cover_url {
                track.discord_cover_url = Some(dc.clone());
            }
        }

        let updated = track.clone();
        self.persist_tracks(&guard);

        {
            let mut pl_guard = self.playlists_cache.write().unwrap();
            let mut pl_changed = false;
            for pl in pl_guard.iter_mut() {
                for pt in pl.tracks.iter_mut() {
                    if pt.id == track_id && pt.source == source {
                        if reset {
                            if let Some(ref orig_t) = pt.original_title {
                                pt.title = orig_t.clone();
                            }
                            if let Some(ref orig_a) = pt.original_artist {
                                pt.artist = orig_a.clone();
                            }
                            if let Some(ref orig_c) = pt.original_cover {
                                pt.cover = orig_c.clone();
                            }
                            pt.local_cover_path = None;
                            pt.discord_cover_url = None;
                        } else {
                            if pt.original_title.is_none() {
                                pt.original_title = Some(pt.title.clone());
                            }
                            if pt.original_artist.is_none() {
                                pt.original_artist = Some(pt.artist.clone());
                            }
                            if pt.original_cover.is_none() {
                                pt.original_cover = Some(pt.cover.clone());
                            }

                            if let Some(ref t) = title {
                                if !t.trim().is_empty() {
                                    pt.title = t.trim().to_string();
                                }
                            }
                            if let Some(ref a) = artist {
                                if !a.trim().is_empty() {
                                    pt.artist = a.trim().to_string();
                                }
                            }
                            if let Some(ref c) = cover {
                                if !c.trim().is_empty() {
                                    pt.cover = c.trim().to_string();
                                }
                            }
                            if let Some(ref dc) = discord_cover_url {
                                pt.discord_cover_url = Some(dc.clone());
                            }
                        }
                        pl_changed = true;
                    }
                }
            }
            if pl_changed {
                self.persist_playlists(&pl_guard);
            }
        }

        Ok(updated)
    }

    pub fn update_track_discord_cover_url(&self, track_id: &str, source: &str, url: &str) {
        {
            let mut guard = self.tracks_cache.write().unwrap();
            if let Some(track) = guard
                .iter_mut()
                .find(|t| t.id == track_id && t.source == source)
            {
                track.discord_cover_url = Some(url.to_string());
                self.persist_tracks(&guard);
            }
        }
        {
            let mut pl_guard = self.playlists_cache.write().unwrap();
            let mut pl_changed = false;
            for pl in pl_guard.iter_mut() {
                for pt in pl.tracks.iter_mut() {
                    if pt.id == track_id && pt.source == source {
                        pt.discord_cover_url = Some(url.to_string());
                        pl_changed = true;
                    }
                }
            }
            if pl_changed {
                self.persist_playlists(&pl_guard);
            }
        }
    }

    pub fn delete_track(&self, track_id: &str, source: &str) -> bool {
        let mut guard = self.tracks_cache.write().unwrap();
        let initial_len = guard.len();
        guard.retain(|t| !(t.id == track_id && t.source == source));
        let changed = guard.len() != initial_len;
        if changed {
            self.persist_tracks(&guard);
        }
        changed
    }

    pub fn get_config(&self) -> AppConfig {
        self.config_cache.read().unwrap().clone()
    }

    pub fn save_config(&self, mut new_config: AppConfig) -> Result<AppConfig, String> {
        fn color(value: &str) -> bool {
            value.len() == 7 && value.starts_with('#') && value.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)
        }
        if !["dark", "light"].contains(&new_config.theme.as_str()) || !color(&new_config.accent_color) {
            return Err("Giao diện hoặc màu chủ đạo không hợp lệ.".into());
        }
        let appearance = &mut new_config.appearance;
        if !["default", "solid", "gradient"].contains(&appearance.background_mode.as_str())
            || !color(&appearance.background_color) || !color(&appearance.background_color_2) {
            return Err("Nền ứng dụng không hợp lệ. Màu cần có dạng #RRGGBB.".into());
        }
        appearance.cover_blur_px = appearance.cover_blur_px.clamp(10, 60);
        new_config.discord_client_id = new_config.discord_client_id.trim().to_string();
        if !new_config.discord_client_id.is_empty() && !(17..=20).contains(&new_config.discord_client_id.len()) {
            return Err("Application ID Discord cần có 17–20 chữ số.".into());
        }
        if !new_config.discord_client_id.bytes().all(|c| c.is_ascii_digit()) {
            return Err("Application ID Discord chỉ gồm chữ số.".into());
        }
        new_config.discord_large_image = new_config.discord_large_image.trim().to_string();
        if !crate::services::discord::valid_image(&new_config.discord_large_image) {
            return Err("large_image cần là {cover}, URL ảnh HTTPS hoặc tên asset; tối đa 256 byte.".into());
        }
        if !crate::services::discord::valid_template(&new_config.discord_state)
            || !crate::services::discord::valid_template(&new_config.discord_details) {
            return Err("state/details dùng tối đa 128 ký tự và các biến {title}, {artist}, {album}, {source}, {status}.".into());
        }
        new_config.offline_cache_limit_mb = new_config.offline_cache_limit_mb.clamp(256, 16384);
        new_config.playback_speed = if new_config.playback_speed.is_finite() { new_config.playback_speed.clamp(0.5, 2.0) } else { 1.0 };
        new_config.track_equalizers.retain(|key, setting| {
            for gain in &mut setting.gains_db {
                *gain = if gain.is_finite() { gain.clamp(-12.0, 12.0) } else { 0.0 };
            }
            key.len() <= 2048 && serde_json::from_str::<[String; 2]>(key)
                .map_or(false, |parts| !parts[0].is_empty() && !parts[1].is_empty())
        });
        let mut artists = std::collections::HashSet::new();
        new_config.favorite_artists = new_config.favorite_artists.into_iter().map(|name| {
            name.split_whitespace().collect::<Vec<_>>().join(" ").chars().take(80).collect::<String>()
        }).filter(|name| !name.is_empty() && artists.insert(name.to_lowercase())).take(20).collect();
        let allowed = ["remix", "electronic", "lofi", "acoustic", "ballad", "rap", "rock", "indie", "bolero", "classical", "pop", "rnb", "jazz", "country"];
        let mut genres = std::collections::HashSet::new();
        new_config.favorite_genres.retain(|genre| allowed.contains(&genre.as_str()) && genres.insert(genre.clone()));
        new_config.favorite_genres.truncate(6);
        let favorite_names: std::collections::HashSet<_> = new_config.favorite_artists.iter().map(|s| s.to_lowercase()).collect();
        let mut profile_names = std::collections::HashSet::new();
        new_config.favorite_artist_profiles.retain_mut(|profile| {
            profile.name = profile.name.split_whitespace().collect::<Vec<_>>().join(" ").chars().take(80).collect();
            profile.picture = crate::services::spotify_api::https_url(Some(&profile.picture));
            profile.url = crate::services::spotify_api::https_url(Some(&profile.url));
            profile.genres.truncate(8);
            for genre in &mut profile.genres { *genre = genre.chars().take(80).collect(); }
            profile.id = profile.id.chars().take(240).collect();
            ["spotify", "deezer", "itunes", "local"].contains(&profile.provider.as_str()) &&
                favorite_names.contains(&profile.name.to_lowercase()) && profile_names.insert(profile.name.to_lowercase())
        });
        new_config.favorite_artist_profiles.truncate(20);
        new_config.spotify_client_id = new_config.spotify_client_id.trim().to_string();
        if !new_config.spotify_client_id.is_empty() && !crate::services::spotify_api::valid_client_id(&new_config.spotify_client_id) {
            return Err("Client ID Spotify cần có 32 ký tự hexadecimal.".into());
        }
        let mut guard = self.config_cache.write().map_err(|_| "Cấu hình đang bận.".to_string())?;
        Self::write_json(&self.config_file, &new_config)?;
        *guard = new_config.clone();
        Ok(new_config)
    }

    pub fn get_playback_state(&self) -> PlaybackState {
        self.playback_cache.read().unwrap().clone()
    }

    pub fn save_playback_state(&self, new_state: PlaybackState) -> PlaybackState {
        let mut guard = self.playback_cache.write().unwrap();
        *guard = new_state.clone();
        if let Ok(json) = serde_json::to_string_pretty(&new_state) {
            let _ = fs::write(&self.playback_file, json);
        }
        new_state
    }

    pub fn get_playlists(&self) -> Vec<Playlist> {
        self.playlists_cache.read().unwrap().clone()
    }

    pub fn create_playlist(&self, name: String, description: Option<String>) -> Playlist {
        let mut guard = self.playlists_cache.write().unwrap();
        let now = current_iso_timestamp();
        let id = format!(
            "pl_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0)
        );

        let playlist = Playlist {
            id,
            name: if name.trim().is_empty() {
                "Playlist mới".to_string()
            } else {
                name.trim().to_string()
            },
            description,
            cover: None,
            tracks: Vec::new(),
            created_at: Some(now.clone()),
            updated_at: Some(now),
        };

        guard.push(playlist.clone());
        self.persist_playlists(&guard);
        playlist
    }

    pub fn update_playlist(
        &self,
        id: &str,
        name: Option<String>,
        description: Option<String>,
        cover: Option<String>,
    ) -> Result<Playlist, String> {
        let mut guard = self.playlists_cache.write().unwrap();
        let playlist = guard
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| "Playlist not found".to_string())?;

        if let Some(n) = name {
            if !n.trim().is_empty() {
                playlist.name = n.trim().to_string();
            }
        }
        if let Some(d) = description {
            playlist.description = Some(d.trim().to_string());
        }
        if let Some(c) = cover {
            let trimmed = c.trim();
            if trimmed.is_empty() || trimmed == "__REMOVE__" || trimmed == "RESET" {
                playlist.cover = None;
            } else {
                playlist.cover = Some(trimmed.to_string());
            }
        }
        playlist.updated_at = Some(current_iso_timestamp());

        let updated = playlist.clone();
        self.persist_playlists(&guard);
        Ok(updated)
    }

    pub fn delete_playlist(&self, id: &str) -> Result<bool, String> {
        let mut guard = self.playlists_cache.write().map_err(|_| "Playlist đang bận.".to_string())?;
        let mut next = guard.clone();
        next.retain(|p| p.id != id);
        let changed = next.len() != guard.len();
        if changed {
            Self::write_json(&self.playlists_file, &PlaylistsData { playlists: next.clone() })?;
            *guard = next;
        }
        Ok(changed)
    }

    pub fn add_to_playlist(&self, playlist_id: &str, track: Track) -> Result<Playlist, String> {
        let mut guard = self.playlists_cache.write().unwrap();
        let playlist = guard
            .iter_mut()
            .find(|p| p.id == playlist_id)
            .ok_or_else(|| "Playlist not found".to_string())?;

        if !playlist
            .tracks
            .iter()
            .any(|t| t.id == track.id && t.source == track.source)
        {
            playlist.tracks.push(track);
            playlist.updated_at = Some(current_iso_timestamp());
        }

        let updated = playlist.clone();
        self.persist_playlists(&guard);
        Ok(updated)
    }

    pub fn remove_from_playlist(
        &self,
        playlist_id: &str,
        track_id: &str,
        source: &str,
    ) -> Result<Playlist, String> {
        let mut guard = self.playlists_cache.write().unwrap();
        let playlist = guard
            .iter_mut()
            .find(|p| p.id == playlist_id)
            .ok_or_else(|| "Playlist not found".to_string())?;

        let initial_len = playlist.tracks.len();
        playlist
            .tracks
            .retain(|t| !(t.id == track_id && t.source == source));
        if playlist.tracks.len() != initial_len {
            playlist.updated_at = Some(current_iso_timestamp());
        }

        let updated = playlist.clone();
        self.persist_playlists(&guard);
        Ok(updated)
    }

    pub fn reorder_playlist_tracks(
        &self,
        playlist_id: &str,
        tracks: Vec<Track>,
    ) -> Result<Playlist, String> {
        let mut guard = self.playlists_cache.write().unwrap();
        let playlist = guard
            .iter_mut()
            .find(|p| p.id == playlist_id)
            .ok_or_else(|| "Playlist not found".to_string())?;

        playlist.tracks = tracks;
        playlist.updated_at = Some(current_iso_timestamp());

        let updated = playlist.clone();
        self.persist_playlists(&guard);
        Ok(updated)
    }

    pub fn save_playlist(&self, mut playlist: Playlist) -> Result<Playlist, String> {
        let mut guard = self.playlists_cache.write().map_err(|_| "Playlist đang bận.".to_string())?;
        let mut next = guard.clone();
        if let Some(index) = next.iter().position(|p| p.id == playlist.id) {
            playlist.created_at = next[index].created_at.clone();
            next[index] = playlist.clone();
        } else {
            next.push(playlist.clone());
        }
        Self::write_json(&self.playlists_file, &PlaylistsData { playlists: next.clone() })?;
        *guard = next;
        Ok(playlist)
    }

    // Change existing copies only; editing a personal song must not add a like.
    pub fn update_personal_references(&self, id: &str, updated: Option<&Track>) -> Result<(), String> {
        fn change(tracks: &mut Vec<Track>, id: &str, updated: Option<&Track>) {
            if let Some(track) = updated {
                for item in tracks.iter_mut().filter(|t| t.id == id && t.source == "local") { *item = track.clone(); }
            } else { tracks.retain(|t| !(t.id == id && t.source == "local")); }
        }
        let mut liked = self.tracks_cache.write().map_err(|_| "Thư viện đang bận.")?;
        let mut next = liked.clone(); change(&mut next, id, updated);
        Self::write_json(&self.library_file, &LibraryData { tracks: next.clone() })?; *liked = next;
        let mut playlists = self.playlists_cache.write().map_err(|_| "Playlist đang bận.")?;
        let mut next = playlists.clone();
        for playlist in &mut next { change(&mut playlist.tracks, id, updated); }
        Self::write_json(&self.playlists_file, &PlaylistsData { playlists: next.clone() })?; *playlists = next;
        let mut playback = self.playback_cache.write().map_err(|_| "Trình phát đang bận.")?;
        let mut next = playback.clone();
        let current = next.current_track.clone();
        change(&mut next.queue, id, updated);
        if current.as_ref().is_some_and(|t| t.id == id && t.source == "local") {
            next.current_track = updated.cloned();
            if updated.is_none() { next.current_time = 0.0; next.is_playing = false; }
        }
        next.queue_index = next.current_track.as_ref().and_then(|t| next.queue.iter().position(|q| q.id == t.id && q.source == t.source)).map(|n| n as i32).unwrap_or(-1);
        if updated.is_none() { next.ab_segments.remove(&format!("local:{id}")); }
        Self::write_json(&self.playback_file, &next)?; *playback = next;
        Ok(())
    }

    fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
        let parent = path.parent().ok_or("Đường dẫn dữ liệu không hợp lệ.")?;
        fs::create_dir_all(parent).map_err(|e| format!("Không tạo được thư mục dữ liệu: {e}"))?;
        let bytes = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
        let temporary = path.with_extension("json.tmp");
        let mut writer = fs::OpenOptions::new().write(true).create(true).truncate(true).open(&temporary)
            .map_err(|e| format!("Không lưu được dữ liệu: {e}"))?;
        writer.write_all(&bytes).and_then(|_| writer.sync_all()).map_err(|e| format!("Không lưu được dữ liệu: {e}"))?;
        drop(writer);
        fs::rename(&temporary, path).map_err(|e| format!("Không cập nhật được dữ liệu: {e}"))
    }

    fn persist_playlists(&self, playlists: &[Playlist]) {
        let data = PlaylistsData {
            playlists: playlists.to_vec(),
        };
        if let Ok(json) = serde_json::to_string_pretty(&data) {
            let _ = fs::write(&self.playlists_file, json);
        }
    }

    #[allow(dead_code)]
    pub fn covers_dir(&self) -> &PathBuf {
        &self.covers_dir
    }

    #[allow(dead_code)]
    pub fn downloads_dir(&self) -> &PathBuf {
        &self.downloads_dir
    }

    fn persist_tracks(&self, tracks: &[Track]) {
        let data = LibraryData {
            tracks: tracks.to_vec(),
        };
        if let Ok(json) = serde_json::to_string_pretty(&data) {
            let _ = fs::write(&self.library_file, json);
        }
    }
}

fn current_iso_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}", now)
}
