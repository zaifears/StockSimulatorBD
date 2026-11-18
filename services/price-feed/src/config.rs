//! Environment configuration. Everything has a safe default except credentials.

use std::net::SocketAddr;

#[derive(Debug, Clone)]
pub struct Config {
    pub app_id: String,
    /// Overrides the project id read from the service-account file.
    pub project_id: Option<String>,
    pub bind: SocketAddr,
    /// Fetch and compare, never write Firestore and never serve a snapshot.
    pub dry_run: bool,
    /// Python daemon's `/api/market_sync`, compared against in dry-run mode.
    pub compare_url: Option<String>,
    pub max_writes_per_day: u32,
    pub telegram_bot_token: Option<String>,
    pub telegram_chat_id: Option<String>,
    pub telegram_topic_id: Option<String>,
    pub kuma_push_url: Option<String>,
}

fn var(name: &str) -> Option<String> {
    std::env::var(name).ok().map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

fn flag(name: &str) -> bool {
    var(name).is_some_and(|v| matches!(v.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let bind = var("BIND").unwrap_or_else(|| "127.0.0.1:8010".into());
        let bind = bind.parse().map_err(|e| format!("BIND={bind:?}: {e}"))?;
        let max_writes_per_day = match var("MAX_WRITES_PER_DAY") {
            Some(v) => v.parse().map_err(|e| format!("MAX_WRITES_PER_DAY={v:?}: {e}"))?,
            None => 1500,
        };
        if var("GOOGLE_APPLICATION_CREDENTIALS").is_none() {
            return Err("GOOGLE_APPLICATION_CREDENTIALS must point at the service-account JSON".into());
        }
        Ok(Self {
            app_id: var("APP_ID").unwrap_or_else(|| "stocksimulatorbd-dse-v1".into()),
            project_id: var("FIREBASE_PROJECT_ID"),
            bind,
            dry_run: flag("DRY_RUN"),
            compare_url: var("COMPARE_URL"),
            max_writes_per_day,
            telegram_bot_token: var("TELEGRAM_BOT_TOKEN"),
            telegram_chat_id: var("TELEGRAM_CHAT_ID"),
            telegram_topic_id: var("TELEGRAM_TOPIC_ID"),
            kuma_push_url: var("PRICE_FEED_KUMA_PUSH_URL"),
        })
    }
}
