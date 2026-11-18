//! Telegram alerts (same bot as the web app's admin alerts) and the Uptime
//! Kuma push heartbeat. Both are optional; nothing fails if they're unset.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde_json::json;

use crate::config::Config;

/// The same kind of alert is sent at most once per this window.
const ALERT_COOLDOWN: Duration = Duration::from_secs(30 * 60);

pub struct Alerts {
    http: reqwest::Client,
    bot_token: Option<String>,
    chat_id: Option<String>,
    topic_id: Option<String>,
    kuma_url: Option<String>,
    last_sent: Mutex<HashMap<&'static str, Instant>>,
}

impl Alerts {
    pub fn new(http: reqwest::Client, cfg: &Config) -> Self {
        Self {
            http,
            bot_token: cfg.telegram_bot_token.clone(),
            chat_id: cfg.telegram_chat_id.clone(),
            topic_id: cfg.telegram_topic_id.clone(),
            // Kuma push URLs are often copied with "?status=up&msg=OK&ping="; keep only the base.
            kuma_url: cfg.kuma_push_url.as_ref().map(|u| u.split('?').next().unwrap_or(u).to_string()),
            last_sent: Mutex::new(HashMap::new()),
        }
    }

    fn should_send(&self, key: &'static str) -> bool {
        let mut map = self.last_sent.lock().expect("alert map");
        let now = Instant::now();
        match map.get(key) {
            Some(t) if now.duration_since(*t) < ALERT_COOLDOWN => false,
            _ => {
                map.insert(key, now);
                true
            }
        }
    }

    /// Sends `text` to Telegram unless the same `key` alerted recently. Never fails the caller.
    pub async fn send(&self, key: &'static str, text: &str) {
        tracing::warn!(alert = key, "{text}");
        let (Some(token), Some(chat)) = (&self.bot_token, &self.chat_id) else { return };
        if !self.should_send(key) {
            return;
        }
        let mut body = json!({ "chat_id": chat, "text": format!("price-feed: {text}") });
        if let Some(topic) = &self.topic_id {
            body["message_thread_id"] = json!(topic);
        }
        let url = format!("https://api.telegram.org/bot{token}/sendMessage");
        if let Err(e) = self.http.post(url).json(&body).timeout(Duration::from_secs(10)).send().await {
            // The URL contains the bot token: log the error kind only.
            tracing::error!("telegram alert failed: {}", e.without_url());
        }
    }

    /// One push to Uptime Kuma. `up = false` makes Kuma raise its own alarm.
    pub async fn push(&self, up: bool, msg: &str) {
        let Some(url) = &self.kuma_url else { return };
        let res = self
            .http
            .get(url)
            .query(&[("status", if up { "up" } else { "down" }), ("msg", msg), ("ping", "")])
            .timeout(Duration::from_secs(10))
            .send()
            .await;
        if let Err(e) = res {
            tracing::warn!("kuma push failed: {}", e.without_url());
        }
    }
}
