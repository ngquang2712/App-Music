use crate::models::{ArtistProfile, ArtistSearch, ArtistSummary, Track};
use crate::services::spotify_api::{https_url, SpotifyApi};
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub struct ArtistService {
    client: Client,
    spotify: Arc<SpotifyApi>,
    searches: Mutex<HashMap<String, (Instant, ArtistSearch)>>,
    profiles: Mutex<HashMap<String, (Instant, ArtistProfile)>>,
}

impl ArtistService {
    pub fn new(spotify: Arc<SpotifyApi>) -> Self {
        Self {
            client: Client::builder().timeout(Duration::from_secs(7)).user_agent("NgQuangMusicApp/2.0").build().unwrap_or_default(),
            spotify, searches: Mutex::new(HashMap::new()), profiles: Mutex::new(HashMap::new()),
        }
    }

    async fn fetch(&self, endpoint: &str, params: &[(&str, &str)]) -> Result<Value, String> {
        let response = self.client.get(endpoint).query(params).send().await.map_err(|_| "Chưa kết nối được danh mục nghệ sĩ.".to_string())?;
        if !response.status().is_success() { return Err("Danh mục nghệ sĩ đang bận. Thử lại sau.".into()); }
        let json: Value = response.json().await.map_err(|_| "Nguồn nghệ sĩ chưa trả dữ liệu hợp lệ.".to_string())?;
        if json.get("error").is_some() { return Err("Không tìm được dữ liệu nghệ sĩ từ nguồn này.".into()); }
        Ok(json)
    }

    pub async fn search(&self, query: &str) -> ArtistSearch {
        let query = query.trim().chars().take(160).collect::<String>();
        if query.is_empty() { return ArtistSearch::default(); }
        let cache_key = format!("{}:{}:{}", self.spotify.cache_epoch(), self.spotify.status().connected, query.to_lowercase());
        if let Some((at, result)) = self.searches.lock().unwrap().get(&cache_key) {
            if at.elapsed() < Duration::from_secs(1800) { return result.clone(); }
        }
        let mut result = ArtistSearch::default();
        if self.spotify.status().connected {
            match self.spotify.search_artists(&query).await { Ok(items) => result.artists = items, Err(e) => result.warning = Some(e) }
        }
        if result.artists.is_empty() {
            let deezer_params = [("q", query.as_str()), ("limit", "8")];
            let apple_params = [("term", query.as_str()), ("media", "music"), ("entity", "musicArtist"), ("country", "vn"), ("limit", "8")];
            let (deezer, apple) = tokio::join!(self.fetch("https://api.deezer.com/search/artist", &deezer_params), self.fetch("https://itunes.apple.com/search", &apple_params));
            result.artists = deezer.ok().and_then(|v| v.get("data").and_then(Value::as_array).map(|a| a.iter().filter_map(parse_deezer_artist).collect::<Vec<_>>())).unwrap_or_default();
            if let Ok(json) = apple {
                let mut seen: HashSet<String> = result.artists.iter().map(|a| a.name.to_lowercase()).collect();
                if let Some(items) = json.get("results").and_then(Value::as_array) {
                    for artist in items.iter().filter_map(parse_apple_artist) {
                        if seen.insert(artist.name.to_lowercase()) { result.artists.push(artist); }
                    }
                }
            } else if result.artists.is_empty() {
                result.warning = Some(result.warning.unwrap_or_else(|| "Chưa tải được danh mục nghệ sĩ. Bạn vẫn có thể mở hồ sơ từ các bài đã có.".into()));
            }
        }
        result.artists.truncate(8);
        if !result.artists.is_empty() && result.warning.is_none() {
            let mut cache = self.searches.lock().unwrap(); if cache.len() >= 48 { cache.clear(); }
            cache.insert(cache_key, (Instant::now(), result.clone()));
        }
        result
    }

    pub async fn profile(&self, artist: ArtistSummary) -> Result<ArtistProfile, String> {
        let cache_key = format!("{}:{}", self.spotify.cache_epoch(), artist.id);
        if let Some((at, result)) = self.profiles.lock().unwrap().get(&cache_key) {
            if at.elapsed() < Duration::from_secs(1800) { return Ok(result.clone()); }
        }
        let result = match artist.provider.as_str() {
            "spotify" => {
                let id = artist.id.strip_prefix("spotify:").ok_or_else(|| "Mã hồ sơ không hợp lệ.".to_string())?;
                self.spotify.profile(id).await?
            }
            "deezer" => {
                let id = numeric_id(&artist.id, "deezer:")?;
                let json = self.fetch(&format!("https://api.deezer.com/artist/{}", id), &[]).await?;
                let artist = parse_deezer_artist(&json).ok_or_else(|| "Không tìm được hồ sơ Deezer.".to_string())?;
                let response = self.fetch(&format!("https://api.deezer.com/artist/{}/top", id), &[("limit", "20")]).await;
                let mut warning = None;
                let tracks = match response {
                    Ok(json) => json.get("data").and_then(Value::as_array).map(|a| a.iter().filter_map(parse_deezer_track).collect()).unwrap_or_default(),
                    Err(e) => { warning = Some(e); Vec::new() }
                };
                ArtistProfile { artist, tracks, albums: Vec::new(), warning }
            }
            "itunes" => {
                let id = numeric_id(&artist.id, "itunes:")?;
                let json = self.fetch("https://itunes.apple.com/lookup", &[("id", id), ("entity", "song"), ("limit", "20"), ("country", "vn")]).await?;
                let items = json.get("results").and_then(Value::as_array).ok_or_else(|| "Hồ sơ Apple Music chưa có dữ liệu.".to_string())?;
                let artist = items.iter().find_map(parse_apple_artist).ok_or_else(|| "Không tìm được hồ sơ Apple Music.".to_string())?;
                let tracks = items.iter().filter(|v| v.get("artistId").and_then(Value::as_u64).map(|n| format!("itunes:{}", n)) == Some(artist.id.clone())).filter_map(parse_apple_track).collect();
                ArtistProfile { artist, tracks, albums: Vec::new(), warning: None }
            }
            _ => return Err("Hồ sơ này được tạo từ các bài đã có trong app.".into()),
        };
        if result.warning.is_none() {
            let mut cache = self.profiles.lock().unwrap(); if cache.len() >= 48 { cache.clear(); }
            cache.insert(cache_key, (Instant::now(), result.clone()));
        }
        Ok(result)
    }
}

pub fn numeric_id<'a>(value: &'a str, prefix: &str) -> Result<&'a str, String> {
    value.strip_prefix(prefix).filter(|id| !id.is_empty() && id.len() <= 20 && id.bytes().all(|b| b.is_ascii_digit())).ok_or_else(|| "Mã nghệ sĩ không hợp lệ.".into())
}

pub fn parse_deezer_artist(item: &Value) -> Option<ArtistSummary> {
    let id = item.get("id")?.as_u64()?; if id == 0 { return None; }
    let name = item.get("name")?.as_str()?.trim(); if name.is_empty() { return None; }
    Some(ArtistSummary { id: format!("deezer:{}", id), name: name.chars().take(160).collect(), provider: "deezer".into(),
        picture: https_url(item.get("picture_big").or_else(|| item.get("picture_medium")).and_then(Value::as_str)),
        url: format!("https://www.deezer.com/artist/{}", id), genres: Vec::new() })
}

pub fn parse_apple_artist(item: &Value) -> Option<ArtistSummary> {
    if item.get("wrapperType").and_then(Value::as_str) != Some("artist") { return None; }
    let id = item.get("artistId")?.as_u64()?; if id == 0 { return None; }
    let name = item.get("artistName")?.as_str()?.trim(); if name.is_empty() { return None; }
    Some(ArtistSummary { id: format!("itunes:{}", id), name: name.chars().take(160).collect(), provider: "itunes".into(),
        picture: String::new(), url: https_url(item.get("artistLinkUrl").and_then(Value::as_str)),
        genres: item.get("primaryGenreName").and_then(Value::as_str).map(|g| vec![g.chars().take(80).collect()]).unwrap_or_default() })
}

pub fn parse_deezer_track(item: &Value) -> Option<Track> {
    let id = item.get("id")?.as_u64()?; if id == 0 { return None; }
    let artist = item.get("artist")?;
    serde_json::from_value(json!({
        "id": format!("sp_{}", id), "source": "spotify", "catalogProvider": "deezer",
        "title": item.get("title")?.as_str()?, "artist": artist.get("name")?.as_str()?,
        "artistId": artist.get("id").and_then(Value::as_u64).map(|n| format!("deezer:{}", n)),
        "artistPicture": https_url(artist.get("picture_big").and_then(Value::as_str)),
        "album": item.pointer("/album/title"), "duration": item.get("duration").and_then(Value::as_u64).unwrap_or(0),
        "cover": https_url(item.pointer("/album/cover_big").or_else(|| item.pointer("/album/cover_medium")).and_then(Value::as_str)),
        "url": format!("https://www.deezer.com/track/{}", id)
    })).ok()
}

pub fn parse_apple_track(item: &Value) -> Option<Track> {
    if item.get("kind").and_then(Value::as_str) != Some("song") { return None; }
    let id = item.get("trackId")?.as_u64()?;
    serde_json::from_value(json!({
        "id": format!("itunes_{}", id), "source": "spotify", "catalogProvider": "itunes",
        "title": item.get("trackName")?.as_str()?, "artist": item.get("artistName")?.as_str()?,
        "artistId": item.get("artistId").and_then(Value::as_u64).map(|n| format!("itunes:{}", n)),
        "genreTags": item.get("primaryGenreName").and_then(Value::as_str).map(|s| vec![s]).unwrap_or_default(),
        "album": item.get("collectionName"), "duration": item.get("trackTimeMillis").and_then(Value::as_u64).unwrap_or(0) / 1000,
        // Use textual catalog metadata only; no promotional artwork or previews.
        "cover": "", "url": https_url(item.get("trackViewUrl").and_then(Value::as_str))
    })).ok()
}
