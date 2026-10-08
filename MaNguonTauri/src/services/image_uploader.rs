use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use reqwest::multipart::{Form, Part};
use reqwest::Client;
use std::collections::HashMap;
use std::sync::RwLock;
use std::time::Duration;

pub struct ImageUploader {
    client: Client,
    cache: RwLock<HashMap<String, String>>,
}

impl ImageUploader {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0")
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            cache: RwLock::new(HashMap::new()),
        }
    }

    pub async fn upload_base64(&self, base64_data: &str) -> Option<String> {
        let raw_data = if let Some(idx) = base64_data.find(";base64,") {
            &base64_data[idx + 8..]
        } else {
            base64_data.trim()
        };

        let clean_base64: String = raw_data.chars().filter(|c| !c.is_whitespace()).collect();

        if clean_base64.is_empty() {
            return None;
        }

        let cache_key = if clean_base64.len() > 64 {
            format!("{}_{}", clean_base64.len(), &clean_base64[..64])
        } else {
            clean_base64.clone()
        };

        {
            let guard = self.cache.read().unwrap();
            if let Some(url) = guard.get(&cache_key) {
                return Some(url.clone());
            }
        }

        if let Ok(bytes) = BASE64.decode(&clean_base64) {
            let mime = if clean_base64.starts_with("/9j/") {
                "image/jpeg"
            } else if clean_base64.starts_with("iVBORw0KGgo") {
                "image/png"
            } else if clean_base64.starts_with("UklGR") {
                "image/webp"
            } else {
                "image/jpeg"
            };

            let ext = if mime == "image/jpeg" { "jpg" } else if mime == "image/webp" { "webp" } else { "png" };
            let filename = format!("cover.{ext}");

            let form_sxcu = Form::new()
                .part("file", Part::bytes(bytes.clone()).file_name(filename.clone()).mime_str(mime).unwrap());

            if let Ok(resp) = self.client.post("https://sxcu.net/api/files/create")
                .header("User-Agent", "OmniMusicPlayer/2.0")
                .multipart(form_sxcu)
                .send()
                .await
            {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<serde_json::Value>().await {
                        if let Some(url) = json.get("url").and_then(|v| v.as_str()) {
                            let direct_url = format!("{url}.{ext}");
                            let mut guard = self.cache.write().unwrap();
                            guard.insert(cache_key.clone(), direct_url.clone());
                            return Some(direct_url);
                        }
                    }
                }
            }

            let form_uguu = Form::new()
                .part("files[]", Part::bytes(bytes.clone()).file_name(filename.clone()).mime_str(mime).unwrap());

            if let Ok(resp) = self.client.post("https://uguu.se/upload.php")
                .header("User-Agent", "OmniMusicPlayer/2.0")
                .multipart(form_uguu)
                .send()
                .await
            {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<serde_json::Value>().await {
                        if let Some(url) = json.pointer("/files/0/url").and_then(|v| v.as_str()) {
                            let url_str = url.to_string();
                            let mut guard = self.cache.write().unwrap();
                            guard.insert(cache_key.clone(), url_str.clone());
                            return Some(url_str);
                        }
                    }
                }
            }

            let form_catbox = Form::new()
                .text("reqtype", "fileupload")
                .part("fileToUpload", Part::bytes(bytes).file_name(filename).mime_str(mime).unwrap());

            if let Ok(resp) = self.client.post("https://catbox.moe/user/api.php")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                .multipart(form_catbox)
                .send()
                .await
            {
                if resp.status().is_success() {
                    if let Ok(text) = resp.text().await {
                        let trimmed = text.trim();
                        if (trimmed.starts_with("http://") || trimmed.starts_with("https://")) && !trimmed.contains("kn3fi8") {
                            let mut guard = self.cache.write().unwrap();
                            guard.insert(cache_key, trimmed.to_string());
                            return Some(trimmed.to_string());
                        }
                    }
                }
            }
        }

        None
    }
}