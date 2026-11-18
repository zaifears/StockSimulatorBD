//! DSE live prices fetcher. One conditional request per poll, a second
//! hostname only for transient failures, and never a retry after DSE has
//! refused us (403/429).

use std::time::Duration;

use reqwest::{header, StatusCode};
use serde_json::Value;

use crate::transform::{parse_feed, ParsedFeed, MIN_STOCKS};

pub const PRIMARY_URL: &str = "https://www.dsebd.org/api/live/prices";
/// Second attempt: apex host plus a cache-busting query string, because
/// CloudFront occasionally caches a transient empty response (see AGENTS.md).
pub const SECONDARY_URL: &str = "https://dsebd.org/api/live/prices";
const REFERER: &str = "https://www.dsebd.org/markets/latest-share-price";
/// Same browser user agent the Python scrapers send; DSE's WAF rejects curl-style agents.
pub const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
    (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug)]
pub enum Fetched {
    /// New data. `etag` is DSE's validator for the next conditional request;
    /// `raw` is the payload as received (kept for fixture capture).
    Fresh { feed: ParsedFeed, etag: Option<String>, raw: Value },
    /// `304 Not Modified`: nothing changed since the last fresh response.
    NotModified,
}

#[derive(Debug, PartialEq)]
pub enum FetchError {
    /// DSE refused the request (403 / 429). Back off; don't try the other host.
    Refused(u16),
    /// Timeout, network error, 5xx, bad JSON or too few rows on every host.
    Transient(String),
}

impl std::fmt::Display for FetchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FetchError::Refused(code) => write!(f, "DSE refused the request (HTTP {code})"),
            FetchError::Transient(m) => write!(f, "{m}"),
        }
    }
}

enum Attempt {
    Done(Fetched),
    Refused(u16),
    Retry(String),
}

async fn attempt(client: &reqwest::Client, url: &str, etag: Option<&str>) -> Attempt {
    let mut req = client
        .get(url)
        .timeout(TIMEOUT)
        .header(header::USER_AGENT, USER_AGENT)
        .header(header::ACCEPT, "application/json")
        .header(header::REFERER, REFERER);
    if let Some(tag) = etag {
        req = req.header(header::IF_NONE_MATCH, tag);
    }
    let res = match req.send().await {
        Ok(r) => r,
        Err(e) => return Attempt::Retry(format!("{url}: {e}")),
    };
    let status = res.status();
    if status == StatusCode::NOT_MODIFIED {
        return Attempt::Done(Fetched::NotModified);
    }
    if status == StatusCode::FORBIDDEN || status == StatusCode::TOO_MANY_REQUESTS {
        return Attempt::Refused(status.as_u16());
    }
    if !status.is_success() {
        return Attempt::Retry(format!("{url}: HTTP {status}"));
    }
    let new_etag = res.headers().get(header::ETAG).and_then(|v| v.to_str().ok()).map(str::to_string);
    let body: Value = match res.json().await {
        Ok(v) => v,
        Err(e) => return Attempt::Retry(format!("{url}: bad JSON: {e}")),
    };
    let feed = parse_feed(&body);
    if feed.stocks.len() < MIN_STOCKS {
        return Attempt::Retry(format!("{url}: unusually low count ({})", feed.stocks.len()));
    }
    Attempt::Done(Fetched::Fresh { feed, etag: new_etag, raw: body })
}

/// Fetches DSE live prices. `etag` is the validator from the last fresh response.
pub async fn fetch(client: &reqwest::Client, etag: Option<&str>) -> Result<Fetched, FetchError> {
    let first_error = match attempt(client, PRIMARY_URL, etag).await {
        Attempt::Done(f) => return Ok(f),
        Attempt::Refused(code) => return Err(FetchError::Refused(code)),
        Attempt::Retry(e) => e,
    };
    let busted = format!("{SECONDARY_URL}?_={}", chrono::Utc::now().timestamp_millis());
    match attempt(client, &busted, None).await {
        Attempt::Done(f) => Ok(f),
        Attempt::Refused(code) => Err(FetchError::Refused(code)),
        Attempt::Retry(e) => Err(FetchError::Transient(format!("{first_error}; {e}"))),
    }
}

/// Wait after the n-th consecutive refusal: 1, 2, 5, then 10 minutes.
pub fn refusal_backoff(consecutive_refusals: u32) -> Duration {
    let mins = match consecutive_refusals {
        0 | 1 => 1,
        2 => 2,
        3 => 5,
        _ => 10,
    };
    Duration::from_secs(mins * 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backoff_schedule() {
        let mins: Vec<u64> = (1..=6).map(|n| refusal_backoff(n).as_secs() / 60).collect();
        assert_eq!(mins, [1, 2, 5, 10, 10, 10]);
    }
}
