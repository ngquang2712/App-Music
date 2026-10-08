use crate::models::{StreamResult, Track};
use crate::services::youtube::YouTubeService;
use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use std::time::Duration;

pub struct SpotifyService {
    client: Client,
    yt_service: Arc<YouTubeService>,
}

impl SpotifyService {
    pub fn new(yt_service: Arc<YouTubeService>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(8))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { client, yt_service }
    }

    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<Track>, String> {
        let url = format!(
            "https://api.deezer.com/search?q={}&limit={}",
            url::form_urlencoded::byte_serialize(query.as_bytes()).collect::<String>(),
            limit
        );

        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Spotify/Deezer search network error: {}", e))?;

        let body: Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse Deezer search JSON: {}", e))?;

        let mut tracks = Vec::new();

        if let Some(items) = body.get("data").and_then(|v| v.as_array()) {
            for item in items {
                let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                if id == 0 {
                    continue;
                }

                let title = item
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown Title")
                    .to_string();

                let artist = item
                    .pointer("/artist/name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown Artist")
                    .to_string();

                let album = item
                    .pointer("/album/title")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let duration = item.get("duration").and_then(|v| v.as_u64()).unwrap_or(0);
                let duration_formatted = format_duration(duration);

                let cover = item
                    .pointer("/album/cover_big")
                    .or_else(|| item.pointer("/album/cover_medium"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let link = item
                    .get("link")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let uploaded_at = item
                    .get("release_date")
                    .and_then(|v| v.as_str())
                    .map(|d| d.to_string());

                tracks.push(Track {
                    id: format!("sp_{}", id),
                    source: "spotify".to_string(),
                    title: title.clone(),
                    artist: artist.clone(),
                    album,
                    duration,
                    duration_formatted: Some(duration_formatted),
                    cover: cover.clone(),
                    url: link,
                    views: None,
                    views_formatted: None,
                    uploaded_at,
                    original_title: Some(title),
                    original_artist: Some(artist),
                    original_cover: Some(cover),
                    artist_id: item.pointer("/artist/id").and_then(Value::as_u64).map(|n| format!("deezer:{}", n)),
                    artist_picture: item.pointer("/artist/picture_big").and_then(Value::as_str).map(str::to_owned),
                    genre_tags: Vec::new(),
                    catalog_provider: Some("deezer".into()),
                    local_cover_path: None,
                    discord_cover_url: None,
                    added_at: None,
                    updated_at: None,
                });
            }
        }

        Ok(tracks)
    }

    pub async fn resolve_playback(&self, track: &Track) -> Result<StreamResult, String> {
        let query = format!("{} - {} audio", track.artist, track.title);
        let yt_results = self.yt_service.search(&query, 5).await?;

        if yt_results.is_empty() {
            return Err(format!("No YouTube stream found for {}", track.title));
        }

        let mut best = &yt_results[0];
        if track.duration > 0 {
            for v in &yt_results {
                let diff = (v.duration as i64 - track.duration as i64).abs();
                if diff <= 15 {
                    best = v;
                    break;
                }
            }
        }

        self.yt_service.get_stream_url(&best.id).await
    }
}

fn format_duration(seconds: u64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let secs = seconds % 60;
    if hours > 0 {
        format!("{}:{:02}:{:02}", hours, minutes, secs)
    } else {
        format!("{}:{:02}", minutes, secs)
    }
}
