mod commands;
mod models;
mod services;

use commands::*;
use services::discord::DiscordService;
use services::image_uploader::ImageUploader;
use services::library::LibraryService;
use services::listening::ListeningService;
use services::discovery::DiscoveryService;
use services::spotify_api::SpotifyApi;
use services::artists::ArtistService;
use services::soundcloud::SoundCloudService;
use services::spotify::SpotifyService;
use services::stream_server::StreamServer;
use services::personal::PersonalMusicService;
use services::youtube::YouTubeService;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;

fn resolve_data_dir<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> PathBuf {
    #[cfg(debug_assertions)]
    if let Some(root) = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent() {
        let old_data = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("data");
        let data = if old_data.is_dir() { old_data } else { root.join("data") };
        if std::fs::create_dir_all(&data).is_ok() { return data; }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let data = parent.join("data");
            if std::fs::create_dir_all(&data).is_ok() { return data; }
        }
    }
    let data = app.path().app_local_data_dir().unwrap_or_else(|_| PathBuf::from("data"));
    let _ = std::fs::create_dir_all(&data);
    data
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let data_dir = resolve_data_dir(app_handle);

            let yt_service = Arc::new(YouTubeService::new(app_handle.path().resource_dir().ok()));
            let sp_service = Arc::new(SpotifyService::new(yt_service.clone()));
            let sc_service = Arc::new(SoundCloudService::new());
            let lib_service = Arc::new(LibraryService::new(&data_dir));
            let personal_service = Arc::new(PersonalMusicService::new(&data_dir).map_err(std::io::Error::other)?);
            let listening_service = Arc::new(ListeningService::new(&data_dir));
            let discovery_service = Arc::new(DiscoveryService::new());
            let spotify_api = Arc::new(SpotifyApi::new());
            let artists_service = Arc::new(ArtistService::new(spotify_api.clone()));
            let discord_service = Arc::new(DiscordService::new());
            let image_uploader = Arc::new(ImageUploader::new());

            let cfg = lib_service.get_config();
            discord_service.configure(&cfg);

            let stream_server = tauri::async_runtime::block_on(async {
                StreamServer::start(&data_dir, personal_service.clone())
                    .await
                    .expect("Failed to start local stream server")
            });

            let state = AppState {
                youtube: yt_service,
                spotify: sp_service,
                soundcloud: sc_service,
                stream_server,
                library: lib_service,
                personal: personal_service,
                listening: listening_service,
                discovery: discovery_service,
                spotify_api,
                artists: artists_service,
                discord: discord_service,
                image_uploader,
            };

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_listening_profile,
            save_listening_session,
            hide_recommended_track,
            clear_listening_profile,
            get_music_discovery,
            search_artists,
            get_artist_profile,
            get_spotify_status,
            connect_spotify,
            disconnect_spotify,
            open_catalog_link,
            search_all,
            search_source,
            get_stream_url,
            prepare_stream_url,
            get_offline_library,
            cache_track_offline,
            remove_offline_track,
            clear_offline_cache,
            get_library,
            get_personal_music,
            begin_personal_music_upload,
            append_personal_music_upload,
            commit_personal_music_upload,
            abort_personal_music_upload,
            delete_personal_music,
            save_track,
            edit_track,
            delete_track,
            get_playlists,
            create_playlist,
            update_playlist,
            delete_playlist,
            add_to_playlist,
            remove_from_playlist,
            reorder_playlist_tracks,
            save_playlist,
            get_config,
            save_config,
            get_playback_state,
            save_playback_state,
            update_discord_activity,
            clear_discord_activity,
            minimize_window,
            toggle_maximize_window,
            is_window_maximized,
            close_window,
            save_image_to_disk,
            download_track,
            open_downloads_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
