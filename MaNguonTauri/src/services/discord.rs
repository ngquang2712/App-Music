use crate::models::AppConfig;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::{atomic::{AtomicU64, Ordering}, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_CLIENT_ID: &str = "1363540875749228716";

struct Connection {
    client: Option<DiscordIpcClient>,
    client_id: String,
    enabled: bool,
}

pub struct DiscordService {
    connection: Mutex<Connection>,
    revision: AtomicU64,
}

pub fn valid_image(value: &str) -> bool {
    if value.len() > 256 { return false; }
    if value.is_empty() || value == "{cover}" { return true; }
    if value.starts_with("https://") {
        return url::Url::parse(value).map_or(false, |url| url.host_str().is_some()
            && url.username().is_empty() && url.password().is_none() && !value.chars().any(char::is_whitespace));
    }
    value.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
}

pub fn valid_template(value: &str) -> bool {
    if value.chars().count() > 128 || value.chars().any(char::is_control) { return false; }
    let mut remaining = value.to_string();
    for token in ["title", "artist", "album", "source", "status"] {
        remaining = remaining.replace(&format!("{{{token}}}"), "");
    }
    !remaining.contains('{') && !remaining.contains('}')
}

// Bound expanded UTF-8 text without splitting Vietnamese characters or emoji.
fn short_text(value: &str) -> String {
    let clean: String = value.chars().filter(|c| !c.is_control()).collect();
    let mut end = clean.len().min(128);
    while !clean.is_char_boundary(end) { end -= 1; }
    clean[..end].trim().to_string()
}

fn render_template(template: &str, title: &str, artist: &str, album: Option<&str>, source: Option<&str>, playing: bool) -> String {
    let source_name = match source.unwrap_or("") {
        "youtube" => "YouTube", "soundcloud" => "SoundCloud", "spotify" => "Spotify", value => value,
    };
    let tokens = regex::Regex::new(r"\{(title|artist|album|source|status)\}").unwrap();
    let rendered = tokens.replace_all(template, |capture: &regex::Captures<'_>| {
        match &capture[1] {
            "title" => title,
            "artist" => if artist.is_empty() { "Không rõ nghệ sĩ" } else { artist },
            "album" => album.unwrap_or(title),
            "source" => source_name,
            "status" => if playing { "Đang phát" } else { "Tạm dừng" },
            _ => "",
        }.to_string()
    });
    short_text(&rendered)
}

impl DiscordService {
    pub fn new() -> Self {
        Self {
            connection: Mutex::new(Connection { client: None, client_id: DEFAULT_CLIENT_ID.into(), enabled: false }),
            revision: AtomicU64::new(0),
        }
    }

    pub fn configure(&self, config: &AppConfig) {
        let mut connection = self.connection.lock().unwrap();
        self.revision.fetch_add(1, Ordering::SeqCst);
        let client_id = if config.discord_client_id.trim().is_empty() { DEFAULT_CLIENT_ID } else { config.discord_client_id.trim() };
        if !config.discord_rpc_enabled || connection.client_id != client_id {
            if let Some(mut client) = connection.client.take() {
                let _ = client.clear_activity();
                let _ = client.close();
            }
        }
        connection.enabled = config.discord_rpc_enabled;
        connection.client_id = client_id.into();
    }

    pub fn begin_update(&self) -> u64 { self.revision.fetch_add(1, Ordering::SeqCst) + 1 }

    pub fn set_activity(
        &self, revision: u64, config: &AppConfig,
        title: &str, artist: &str, cover_url: Option<&str>,
        current_time: u64, duration: u64, is_playing: bool,
        album: Option<&str>, source: Option<&str>,
    ) {
        let mut connection = self.connection.lock().unwrap();
        if !connection.enabled || self.revision.load(Ordering::SeqCst) != revision { return; }
        if connection.client.is_none() {
            if let Ok(mut client) = DiscordIpcClient::new(&connection.client_id) {
                if client.connect().is_ok() { connection.client = Some(client); }
            }
        }
        if self.revision.load(Ordering::SeqCst) != revision { return; }
        let state = render_template(&config.discord_state, title, artist, album, source, is_playing);
        let mut details = render_template(&config.discord_details, title, artist, album, source, is_playing);
        if !is_playing && config.discord_details == "{title}" { details = short_text(&format!("⏸ {details}")); }
        let image = if config.discord_large_image == "{cover}" {
            cover_url.filter(|value| valid_image(value) && value.starts_with("https://"))
        } else if config.discord_large_image.is_empty() { None }
        else { Some(config.discord_large_image.as_str()) };
        let hover = short_text(album.filter(|value| !value.trim().is_empty()).unwrap_or(title));
        let mut activity = activity::Activity::new().activity_type(activity::ActivityType::Listening);
        if !state.is_empty() { activity = activity.state(&state); }
        if !details.is_empty() { activity = activity.details(&details); }
        if let Some(image) = image {
            activity = activity.assets(activity::Assets::new().large_image(image).large_text(&hover));
        }
        if is_playing {
            let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
            let start = now.saturating_sub(current_time);
            let mut timestamps = activity::Timestamps::new().start(start as i64);
            if duration > current_time { timestamps = timestamps.end(start.saturating_add(duration) as i64); }
            activity = activity.timestamps(timestamps);
        }
        if let Some(client) = connection.client.as_mut() {
            if client.set_activity(activity).is_err() { let _ = client.close(); connection.client = None; }
        }
    }

    pub fn clear_activity(&self) {
        let mut connection = self.connection.lock().unwrap();
        self.revision.fetch_add(1, Ordering::SeqCst);
        if let Some(client) = connection.client.as_mut() { let _ = client.clear_activity(); }
    }
}
