use crate::models::Track;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimilarArtist {
    pub name: String,
    pub seed_artist: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimilarTrack {
    pub title: String,
    pub artist: String,
    pub seed_artist: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverySuggestions {
    pub artists: Vec<SimilarArtist>,
    pub tracks: Vec<SimilarTrack>,
    pub available: bool,
    pub warning: Option<String>,
}

pub struct DiscoveryService {
    client: Client,
    cache: Mutex<HashMap<u64, (Instant, DiscoverySuggestions)>>,
}

impl DiscoveryService {
    pub fn new() -> Self {
        Self {
            client: Client::builder().timeout(Duration::from_secs(7))
                .user_agent("NgQuangMusicApp/2.0").build().unwrap_or_default(),
            cache: Mutex::new(HashMap::new()),
        }
    }

    async fn fetch(&self, key: &str, method: &str, args: &[(&str, &str)]) -> Result<Value, String> {
        let mut params = vec![("method", method), ("api_key", key), ("format", "json"), ("autocorrect", "1"), ("limit", "8")];
        params.extend_from_slice(args);
        // Request errors can contain the URL and API key. Return a neutral
        // message rather than serializing the reqwest error into the UI.
        let response = self.client.get("https://ws.audioscrobbler.com/2.0/").query(&params).send().await
            .map_err(|_| "Chưa kết nối được Last.fm. App vẫn gợi ý bằng dữ liệu nghe trên máy.".to_string())?;
        if !response.status().is_success() {
            return Err("Last.fm tạm thời không trả dữ liệu. App vẫn gợi ý bằng dữ liệu nghe trên máy.".into());
        }
        let json: Value = response.json().await.map_err(|_| "Dữ liệu Last.fm không hợp lệ.".to_string())?;
        if let Some(code) = json.get("error").and_then(Value::as_u64) {
            return Err(if code == 10 || code == 26 { "Khóa Last.fm không hợp lệ hoặc đã bị khóa." } else { "Last.fm chưa trả được dữ liệu tương tự." }.into());
        }
        Ok(json)
    }

    pub async fn get(&self, key: &str, artists: Vec<String>, tracks: Vec<Track>) -> DiscoverySuggestions {
        let key = key.trim();
        if key.is_empty() { return DiscoverySuggestions::default(); }
        if key.len() != 32 || !key.bytes().all(|b| b.is_ascii_hexdigit()) {
            return DiscoverySuggestions { available: true, warning: Some("Khóa Last.fm cần có 32 ký tự hexadecimal.".into()), ..Default::default() };
        }
        let artists: Vec<_> = artists.into_iter().filter(|a| !a.trim().is_empty() && a.len() <= 512).take(2).collect();
        let tracks: Vec<_> = tracks.into_iter().filter(|t| !t.title.trim().is_empty() && !t.artist.trim().is_empty()).take(2).collect();
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        key.hash(&mut hasher);
        artists.hash(&mut hasher);
        for t in &tracks { t.title.hash(&mut hasher); t.artist.hash(&mut hasher); }
        let cache_key = hasher.finish();
        if let Ok(cache) = self.cache.lock() {
            if let Some((time, value)) = cache.get(&cache_key) {
                if time.elapsed() < Duration::from_secs(21600) { return value.clone(); }
            }
        }
        let mut result = DiscoverySuggestions { available: true, ..Default::default() };
        // At most four requests, with two in parallel. No crawling or login.
        let a = artists.first().map(String::as_str).unwrap_or("");
        let b = artists.get(1).map(String::as_str).unwrap_or("");
        let request_artist = |name| async move {
            if name == "" { return Ok(Value::Null); }
            self.fetch(key, "artist.getSimilar", &[("artist", name)]).await
        };
        let (first, second) = tokio::join!(request_artist(a), request_artist(b));
        for (seed, response) in [(a, first), (b, second)] {
            match response {
                Ok(json) => {
                    if let Some(items) = json.pointer("/similarartists/artist").and_then(Value::as_array) {
                        for item in items.iter().take(8) {
                            if let Some(name) = item.get("name").and_then(Value::as_str).filter(|name| !name.trim().is_empty()) {
                                result.artists.push(SimilarArtist { name: name.to_string(), seed_artist: seed.to_string() });
                            }
                        }
                    }
                }
                Err(message) => result.warning = Some(message),
            }
        }
        for track in tracks {
            match self.fetch(key, "track.getSimilar", &[("artist", &track.artist), ("track", &track.title)]).await {
                Ok(json) => {
                    if let Some(items) = json.pointer("/similartracks/track").and_then(Value::as_array) {
                        for item in items.iter().take(6) {
                            if let (Some(title), Some(artist)) = (item.get("name").and_then(Value::as_str), item.pointer("/artist/name").and_then(Value::as_str)) {
                                result.tracks.push(SimilarTrack { title: title.to_string(), artist: artist.to_string(), seed_artist: track.artist.clone() });
                            }
                        }
                    }
                }
                Err(message) => result.warning = Some(message),
            }
        }
        let mut seen = HashSet::new();
        result.artists.retain(|a| seen.insert(a.name.to_lowercase()));
        let mut seen_tracks = HashSet::new();
        result.tracks.retain(|t| seen_tracks.insert(format!("{}|{}", t.artist.to_lowercase(), t.title.to_lowercase())));
        if let Ok(mut cache) = self.cache.lock() {
            if cache.len() >= 32 { cache.clear(); }
            if result.warning.is_none() { cache.insert(cache_key, (Instant::now(), result.clone())); }
        }
        result
    }
}
