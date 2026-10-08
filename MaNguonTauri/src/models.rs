use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: String,
    pub source: String,
    pub title: String,
    pub artist: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artist_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artist_picture: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub genre_tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_provider: Option<String>,
    pub album: Option<String>,
    pub duration: u64,
    pub duration_formatted: Option<String>,
    pub cover: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub views: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub views_formatted: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uploaded_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_artist: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_cover: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_cover_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub discord_cover_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub added_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamResult {
    pub stream_url: String,
    pub content_type: String,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub http_headers: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackEqualizer {
    pub enabled: bool,
    pub gains_db: [f64; 10],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub discord_rpc_enabled: bool,
    pub discord_client_id: String,
    #[serde(default = "default_discord_image")]
    pub discord_large_image: String,
    #[serde(default = "default_discord_state")]
    pub discord_state: String,
    #[serde(default = "default_discord_details")]
    pub discord_details: String,
    #[serde(default)]
    pub appearance: AppearanceConfig,
    pub volume: f32,
    pub repeat_mode: String,
    pub shuffle: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_accent")]
    pub accent_color: String,
    #[serde(default = "default_sidebar")]
    pub sidebar_expanded: bool,
    #[serde(default = "default_show_source_badges")]
    pub show_source_badges: bool,
    #[serde(default = "default_crossfade_enabled")]
    pub crossfade_enabled: bool,
    #[serde(default = "default_crossfade_duration")]
    pub crossfade_duration: f32,
    #[serde(default = "default_crossfade_curve")]
    pub crossfade_curve_a: f32,
    #[serde(default = "default_crossfade_curve")]
    pub crossfade_curve_b: f32,
    #[serde(default = "default_discovery_percent")]
    pub recommendation_discovery_percent: u8,
    #[serde(default)]
    pub lastfm_api_key: String,
    #[serde(default)]
    pub favorite_artists: Vec<String>,
    #[serde(default)]
    pub favorite_genres: Vec<String>,
    #[serde(default)]
    pub favorite_artist_profiles: Vec<ArtistSummary>,
    #[serde(default)]
    pub spotify_client_id: String,
    #[serde(default = "default_auto_cache")]
    pub auto_cache_audio: bool,
    #[serde(default = "default_cache_limit")]
    pub offline_cache_limit_mb: u64,
    #[serde(default = "default_playback_speed")]
    pub playback_speed: f64,
    #[serde(default = "default_preserve_pitch")]
    pub preserve_pitch: bool,
    #[serde(default)]
    pub track_equalizers: HashMap<String, TrackEqualizer>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppearanceConfig {
    pub background_mode: String,
    pub background_color: String,
    pub background_color_2: String,
    pub cover_blur_enabled: bool,
    pub cover_blur_px: u8,
}

impl Default for AppearanceConfig {
    fn default() -> Self {
        Self {
            background_mode: "default".into(),
            background_color: "#182332".into(),
            background_color_2: "#39244a".into(),
            cover_blur_enabled: true,
            cover_blur_px: 24,
        }
    }
}

fn default_discord_image() -> String { "{cover}".into() }
fn default_discord_state() -> String { "{artist}".into() }
fn default_discord_details() -> String { "{title}".into() }

fn default_auto_cache() -> bool { true }
fn default_cache_limit() -> u64 { 2048 }
fn default_playback_speed() -> f64 { 1.0 }
fn default_preserve_pitch() -> bool { true }

fn default_discovery_percent() -> u8 { 30 }

fn default_theme() -> String {
    "dark".to_string()
}

fn default_accent() -> String {
    "#1db954".to_string()
}

fn default_sidebar() -> bool {
    true
}

fn default_show_source_badges() -> bool {
    true
}

fn default_crossfade_enabled() -> bool {
    false
}

fn default_crossfade_duration() -> f32 {
    5.0
}

fn default_crossfade_curve() -> f32 {
    0.0
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            discord_rpc_enabled: true,
            discord_client_id: String::new(),
            discord_large_image: default_discord_image(),
            discord_state: default_discord_state(),
            discord_details: default_discord_details(),
            appearance: AppearanceConfig::default(),
            volume: 0.8,
            repeat_mode: "off".to_string(),
            shuffle: false,
            theme: "dark".to_string(),
            accent_color: "#1db954".to_string(),
            sidebar_expanded: true,
            show_source_badges: true,
            crossfade_enabled: false,
            crossfade_duration: 5.0,
            crossfade_curve_a: 0.0,
            crossfade_curve_b: 0.0,
            recommendation_discovery_percent: 30,
            lastfm_api_key: String::new(),
            favorite_artists: Vec::new(),
            favorite_genres: Vec::new(),
            favorite_artist_profiles: Vec::new(),
            spotify_client_id: String::new(),
            auto_cache_audio: true,
            offline_cache_limit_mb: 2048,
            playback_speed: 1.0,
            preserve_pitch: true,
            track_equalizers: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ArtistSummary {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub picture: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub genres: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtistAlbum {
    pub id: String,
    pub name: String,
    pub cover: String,
    pub url: String,
    pub release_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ArtistProfile {
    pub artist: ArtistSummary,
    pub tracks: Vec<Track>,
    pub albums: Vec<ArtistAlbum>,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ArtistSearch {
    pub artists: Vec<ArtistSummary>,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AbSegment {
    pub start: Option<f64>,
    pub end: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackState {
    pub current_track: Option<Track>,
    pub current_time: f64,
    pub is_playing: bool,
    pub queue: Vec<Track>,
    pub queue_index: i32,
    pub ab_segments: HashMap<String, AbSegment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover: Option<String>,
    pub tracks: Vec<Track>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PlaylistsData {
    pub playlists: Vec<Playlist>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryData {
    pub tracks: Vec<Track>,
}
