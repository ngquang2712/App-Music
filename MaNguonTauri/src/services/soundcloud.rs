use crate::models::{StreamResult, Track};
use regex::Regex;
use reqwest::Client;
use serde_json::Value;
use std::sync::RwLock;
use std::time::Duration;

pub struct SoundCloudService {
    client: Client,
    client_id: RwLock<Option<String>>,
}

impl SoundCloudService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(8))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            client_id: RwLock::new(Some("tNiXK56A9yLDayzQ5DsBvqwiyhRLZZNv".to_string())),
        }
    }

    pub async fn get_client_id(&self) -> String {
        if let Ok(guard) = self.client_id.read() {
            if let Some(ref id) = *guard {
                return id.clone();
            }
        }
        self.refresh_client_id().await
    }

    pub async fn refresh_client_id(&self) -> String {
        let fallback = "tNiXK56A9yLDayzQ5DsBvqwiyhRLZZNv".to_string();

        if let Ok(resp) = self.client.get("https://soundcloud.com").send().await {
            if let Ok(html) = resp.text().await {
                let re = Regex::new(r#"<script[^>]+src="([^"]+\.js)""#).unwrap();
                let mut scripts: Vec<String> = Vec::new();
                for cap in re.captures_iter(&html) {
                    if let Some(m) = cap.get(1) {
                        let url = m.as_str().to_string();
                        if url.contains("sndcdn.com/assets/") {
                            scripts.push(url);
                        }
                    }
                }

                let id_re = Regex::new(r#"client_id[:=]\s*["']([a-zA-Z0-9]{32})["']"#).unwrap();
                for script_url in scripts.into_iter().rev().take(8) {
                    if let Ok(s_resp) = self.client.get(&script_url).send().await {
                        if let Ok(text) = s_resp.text().await {
                            if let Some(cap) = id_re.captures(&text) {
                                if let Some(m) = cap.get(1) {
                                    let found_id = m.as_str().to_string();
                                    if let Ok(mut guard) = self.client_id.write() {
                                        *guard = Some(found_id.clone());
                                    }
                                    return found_id;
                                }
                            }
                        }
                    }
                }
            }
        }

        if let Ok(mut guard) = self.client_id.write() {
            *guard = Some(fallback.clone());
        }
        fallback
    }

    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<Track>, String> {
        let mut client_id = self.get_client_id().await;
        let query_encoded =
            url::form_urlencoded::byte_serialize(query.as_bytes()).collect::<String>();

        let mut url = format!(
            "https://api-v2.soundcloud.com/search/tracks?q={}&client_id={}&limit={}",
            query_encoded, client_id, limit
        );

        let mut resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("SoundCloud search network error: {}", e))?;

        if resp.status() == reqwest::StatusCode::UNAUTHORIZED
            || resp.status() == reqwest::StatusCode::FORBIDDEN
        {
            client_id = self.refresh_client_id().await;
            url = format!(
                "https://api-v2.soundcloud.com/search/tracks?q={}&client_id={}&limit={}",
                query_encoded, client_id, limit
            );
            resp = self
                .client
                .get(&url)
                .send()
                .await
                .map_err(|e| format!("SoundCloud search retry network error: {}", e))?;
        }

        if !resp.status().is_success() {
            return Err(format!("SoundCloud API returned error: {}", resp.status()));
        }

        let body: Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse SoundCloud search JSON: {}", e))?;

        let mut tracks = Vec::new();

        if let Some(collection) = body.get("collection").and_then(|v| v.as_array()) {
            for item in collection {
                let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                if id == 0 {
                    continue;
                }

                let title = item
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Untitled")
                    .to_string();

                let artist = item
                    .pointer("/user/username")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown Artist")
                    .to_string();

                let duration_ms = item.get("duration").and_then(|v| v.as_u64()).unwrap_or(0);
                let duration = duration_ms / 1000;
                let duration_formatted = format_duration(duration);

                let cover = item
                    .get("artwork_url")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .or_else(|| {
                        item.pointer("/user/avatar_url")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.trim().is_empty())
                    })
                    .unwrap_or("")
                    .replace("-large.", "-t500x500.");

                let permalink_url = item
                    .get("permalink_url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let playback_count = item.get("playback_count").and_then(|v| v.as_u64());
                let views_formatted = playback_count.map(|cnt| {
                    if cnt >= 1_000_000 {
                        format!("{:.1}M", cnt as f64 / 1_000_000.0)
                    } else if cnt >= 1_000 {
                        format!("{:.1}K", cnt as f64 / 1_000.0)
                    } else {
                        format!("{}", cnt)
                    }
                });

                let raw_date = item
                    .get("created_at")
                    .or_else(|| item.get("release_date"))
                    .and_then(|v| v.as_str());
                let uploaded_at = raw_date.map(|d| {
                    if d.len() >= 10 {
                        let y = &d[0..4];
                        let m = &d[5..7];
                        let day = &d[8..10];
                        format!("{}/{}/{}", day, m, y)
                    } else {
                        d.to_string()
                    }
                });

                tracks.push(Track {
                    id: format!("sc_{}", id),
                    source: "soundcloud".to_string(),
                    title: title.clone(),
                    artist: artist.clone(),
                    album: None,
                    duration,
                    duration_formatted: Some(duration_formatted),
                    cover: cover.clone(),
                    url: permalink_url,
                    views: playback_count,
                    views_formatted,
                    uploaded_at,
                    original_title: Some(title),
                    original_artist: Some(artist),
                    original_cover: Some(cover),
                    artist_id: None,
                    artist_picture: None,
                    genre_tags: item.get("genre").and_then(Value::as_str).filter(|s| !s.trim().is_empty()).map(|s| vec![s.chars().take(80).collect()]).unwrap_or_default(),
                    catalog_provider: None,
                    local_cover_path: None,
                    discord_cover_url: None,
                    added_at: None,
                    updated_at: None,
                });
            }
        }

        Ok(tracks)
    }

    pub async fn get_stream_url(&self, track_url: &str) -> Result<StreamResult, String> {
        let mut client_id = self.get_client_id().await;
        let track_encoded =
            url::form_urlencoded::byte_serialize(track_url.as_bytes()).collect::<String>();
        let mut resolve_url = format!(
            "https://api-v2.soundcloud.com/resolve?url={}&client_id={}",
            track_encoded, client_id
        );

        let mut resp = self
            .client
            .get(&resolve_url)
            .send()
            .await
            .map_err(|e| format!("SoundCloud resolve request failed: {}", e))?;

        if resp.status() == reqwest::StatusCode::UNAUTHORIZED
            || resp.status() == reqwest::StatusCode::FORBIDDEN
        {
            client_id = self.refresh_client_id().await;
            resolve_url = format!(
                "https://api-v2.soundcloud.com/resolve?url={}&client_id={}",
                track_encoded, client_id
            );
            resp = self
                .client
                .get(&resolve_url)
                .send()
                .await
                .map_err(|e| format!("SoundCloud resolve retry request failed: {}", e))?;
        }

        if !resp.status().is_success() {
            return Err(format!(
                "SoundCloud resolve returned error: {}",
                resp.status()
            ));
        }

        let body: Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse SoundCloud resolve JSON: {}", e))?;

        let transcodings = body
            .pointer("/media/transcodings")
            .and_then(|v| v.as_array())
            .ok_or_else(|| "No media transcodings found for SoundCloud track".to_string())?;

        let mut target_url: Option<String> = None;
        let mut target_mime = "audio/mpeg".to_string();

        for t in transcodings {
            let protocol = t
                .pointer("/format/protocol")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let mime = t
                .pointer("/format/mime_type")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            if protocol == "progressive" {
                if let Some(u) = t.get("url").and_then(|v| v.as_str()) {
                    target_url = Some(u.to_string());
                    if mime.contains("ogg") {
                        target_mime = "audio/ogg".to_string();
                    }
                    break;
                }
            }
        }

        let trans_url = target_url.ok_or_else(|| "No progressive stream available".to_string())?;
        let stream_req_url = format!("{}?client_id={}", trans_url, client_id);

        let stream_resp = self
            .client
            .get(&stream_req_url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch stream location: {}", e))?;

        let stream_json: Value = stream_resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse stream URL JSON: {}", e))?;

        let direct_url = stream_json
            .get("url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "SoundCloud direct stream URL not found".to_string())?;

        Ok(StreamResult {
            stream_url: direct_url.to_string(),
            content_type: target_mime,
            http_headers: Default::default(),
        })
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_soundcloud_search() {
        let sc = SoundCloudService::new();
        let query = "yang remix";
        let tracks = sc.search(query, 10).await.expect("Search should succeed");
        println!("\n=== SOUNDCLOUD SEARCH RESULTS FOR '{}' ===", query);
        for (i, t) in tracks.iter().enumerate() {
            println!(
                "{}. [{}] {} - Cover: '{}'",
                i + 1,
                t.artist,
                t.title,
                t.cover
            );
        }
        assert!(!tracks.is_empty(), "Should return tracks from SoundCloud");
        let empty_covers = tracks.iter().filter(|t| t.cover.is_empty()).count();
        println!(
            "Tracks with empty cover: {} / {}",
            empty_covers,
            tracks.len()
        );
        assert_eq!(
            empty_covers, 0,
            "No tracks should have empty cover for 'yang remix'"
        );
    }
}
