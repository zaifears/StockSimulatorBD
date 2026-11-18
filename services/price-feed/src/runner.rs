//! The poll → transform → write → publish loop.
//!
//! The one rule that matters most: **a snapshot is published only after the
//! same document has been written to Firestore.** Browsers can therefore be
//! behind Firestore, never ahead of it, and the trade route (which fills at
//! the Firestore price) never sees a price the trader hasn't been shown.

use std::collections::{BTreeMap, HashMap};
use std::future::Future;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::sync::{Arc, Mutex, RwLock};

use axum::body::Bytes;
use chrono::{Duration, NaiveDateTime, Timelike};
use serde::Serialize;
use serde_json::{Map, Value};
use tokio::sync::watch;

use crate::alerts::Alerts;
use crate::dse::{self, FetchError, Fetched};
use crate::firestore::{Firestore, FirestoreError};
use crate::schedule::{self, DayState, Mode};
use crate::transform::{iso_millis, merge_with_previous, Row, SessionInfo};

/// While DSE is Open, write at least this often even if nothing changed, so the
/// trade route's 20-minute status check and the failsafe's 15-minute staleness
/// alarm keep seeing a live feed.
pub const HEARTBEAT_MS: i64 = 5 * 60 * 1000;
/// After a transient failure, wait at least this long before the next try.
pub const TRANSIENT_RETRY_SECS: i64 = 30;
/// While Live, a feed with no successful fetch for this long is unhealthy.
pub const LIVE_STALE_MS: i64 = 120_000;
pub const SOURCE: &str = "price-feed";

pub trait DocStore: Send + Sync + 'static {
    fn set(&self, fields: &Map<String, Value>) -> impl Future<Output = Result<(), FirestoreError>> + Send;
}

impl DocStore for Firestore {
    fn set(&self, fields: &Map<String, Value>) -> impl Future<Output = Result<(), FirestoreError>> + Send {
        Firestore::set(self, fields)
    }
}

pub struct Snapshot {
    pub body: Bytes,
    pub etag: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub mode: &'static str,
    pub dry_run: bool,
    pub next_poll_at: Option<String>,
    pub last_fetch_at: Option<String>,
    pub last_fetch_result: String,
    pub last_write_at: Option<String>,
    pub writes_today: u32,
    pub max_writes_per_day: u32,
    pub fetch_failures: u32,
    pub write_failures: u32,
    pub refusals: u32,
    pub dse_market_status: Option<&'static str>,
    pub seq: Option<i64>,
    pub budget_exhausted: bool,
    pub writes_paused_until: Option<String>,
    /// A document is loaded (from Firestore at startup, or written since).
    pub ready: bool,
    pub version: &'static str,
    #[serde(skip)]
    pub last_fetch_ok_ms: Option<i64>,
    #[serde(skip)]
    pub paused_until_ms: Option<i64>,
}

impl Health {
    /// `healthy` tells `/api/stock-sync` it may skip its run. Anything else
    /// makes the cron do its normal job, so the site never depends on this
    /// service being right about itself.
    pub fn status(&self, now_ms: i64) -> &'static str {
        if self.dry_run {
            return "dry-run";
        }
        let paused = self.paused_until_ms.is_some_and(|t| t > now_ms);
        if self.budget_exhausted || paused || self.write_failures >= 3 || self.fetch_failures >= 3 {
            return "degraded";
        }
        if !self.ready {
            return "starting";
        }
        if self.mode == Mode::Live.as_str()
            && self.last_fetch_ok_ms.is_none_or(|t| now_ms - t > LIVE_STALE_MS)
        {
            return "degraded";
        }
        "healthy"
    }
}

pub struct Shared {
    pub snapshot: RwLock<Option<Arc<Snapshot>>>,
    pub health: Mutex<Health>,
}

impl Shared {
    pub fn new(dry_run: bool, max_writes_per_day: u32) -> Arc<Self> {
        Arc::new(Self {
            snapshot: RwLock::new(None),
            health: Mutex::new(Health {
                mode: Mode::Sleep.as_str(),
                dry_run,
                max_writes_per_day,
                version: env!("CARGO_PKG_VERSION"),
                ..Default::default()
            }),
        })
    }

    fn health(&self) -> std::sync::MutexGuard<'_, Health> {
        self.health.lock().expect("health lock")
    }
}

pub struct RunnerConfig {
    pub dry_run: bool,
    pub max_writes_per_day: u32,
    pub compare_url: Option<String>,
}

pub struct Runner<S: DocStore> {
    cfg: RunnerConfig,
    store: S,
    http: reqwest::Client,
    alerts: Arc<Alerts>,
    shared: Arc<Shared>,
    pub day: DayState,
    etag: Option<String>,
    /// Latest merged rows and DSE status, written or not.
    current: Option<(Vec<Row>, Option<&'static str>)>,
    last_written_hash: Option<u64>,
    last_write_ms: Option<i64>,
    last_seq: i64,
    writes_today: u32,
    writes_date: chrono::NaiveDate,
    paused_until_ms: Option<i64>,
    fetch_failures: u32,
    write_failures: u32,
    refusals: u32,
}

fn content_hash(stocks: &[Row], status: Option<&str>) -> u64 {
    let mut h = DefaultHasher::new();
    serde_json::to_string(stocks).unwrap_or_default().hash(&mut h);
    status.hash(&mut h);
    h.finish()
}

/// Spark quotas reset at midnight Pacific: 08:00 UTC in winter, 07:00 in
/// summer. Resuming at the next 08:05 UTC is safe in both.
pub fn next_quota_reset_ms(now_ms: i64) -> i64 {
    let now = chrono::DateTime::from_timestamp_millis(now_ms).unwrap_or_default();
    let today = now.date_naive().and_hms_opt(8, 5, 0).expect("valid time").and_utc();
    let reset = if now < today { today } else { today + Duration::days(1) };
    reset.timestamp_millis()
}

fn dhaka_date_of(ms: i64) -> chrono::NaiveDate {
    chrono::DateTime::from_timestamp_millis(ms)
        .unwrap_or_default()
        .with_timezone(&schedule::dhaka())
        .date_naive()
}

fn as_market_status(v: Option<&Value>) -> Option<&'static str> {
    match v.and_then(Value::as_str) {
        Some("Open") => Some("Open"),
        Some("Closed") => Some("Closed"),
        _ => None,
    }
}

impl<S: DocStore> Runner<S> {
    pub fn new(
        cfg: RunnerConfig,
        store: S,
        http: reqwest::Client,
        alerts: Arc<Alerts>,
        shared: Arc<Shared>,
        now_ms: i64,
    ) -> Self {
        let today = dhaka_date_of(now_ms);
        Self {
            cfg,
            store,
            http,
            alerts,
            shared,
            day: DayState::new(today),
            etag: None,
            current: None,
            last_written_hash: None,
            last_write_ms: None,
            last_seq: 0,
            writes_today: 0,
            writes_date: today,
            paused_until_ms: None,
            fetch_failures: 0,
            write_failures: 0,
            refusals: 0,
        }
    }

    /// Loads the document already in Firestore (written by stock-sync or by us
    /// before a restart). It is the carry-forward baseline, and, outside
    /// dry-run, it is served as the snapshot straight away: it is in Firestore,
    /// so serving it can't put a browser ahead of the trade route.
    pub fn seed(&mut self, doc: Map<String, Value>) {
        let stocks: Vec<Row> = doc
            .get("stocks")
            .and_then(Value::as_array)
            .map(|a| a.iter().filter_map(|v| v.as_object().cloned()).collect())
            .unwrap_or_default();
        let status = as_market_status(doc.get("marketStatus"));
        self.last_seq = doc.get("seq").and_then(Value::as_i64).unwrap_or(0);
        self.current = Some((stocks, status));
        if !self.cfg.dry_run {
            let etag = match doc.get("seq").and_then(Value::as_i64) {
                Some(seq) => seq.to_string(),
                None => format!("seed-{}", content_hash(&self.current.as_ref().unwrap().0, status)),
            };
            self.publish(&doc, etag);
        }
        let mut h = self.shared.health();
        h.ready = true;
        h.dse_market_status = status;
    }

    fn publish(&self, doc: &Map<String, Value>, tag: String) {
        let body = Bytes::from(serde_json::to_vec(doc).unwrap_or_default());
        let snap = Arc::new(Snapshot { body, etag: format!("\"{tag}\"") });
        *self.shared.snapshot.write().expect("snapshot lock") = Some(snap);
    }

    /// Applies a fetch result. Returns the minimum wait before the next poll
    /// (backoff), if any.
    pub async fn handle_fetch(&mut self, result: Result<Fetched, FetchError>, now_ms: i64) -> Option<Duration> {
        let now_iso = iso_millis(now_ms);
        let mut fresh_rows: Option<Vec<Row>> = None;
        let backoff = match result {
            Ok(Fetched::Fresh { feed, etag }) => {
                self.etag = etag;
                let SessionInfo { is_open, trading_day, closing_minute, .. } = feed.session.clone();
                self.day.observe(is_open, trading_day, closing_minute);
                let previous: Vec<Value> = self
                    .current
                    .as_ref()
                    .map(|(rows, _)| rows.iter().cloned().map(Value::Object).collect())
                    .unwrap_or_default();
                if self.cfg.compare_url.is_some() {
                    fresh_rows = Some(feed.stocks.clone());
                }
                let merged = merge_with_previous(feed.stocks, &previous, now_ms);
                self.current = Some((merged, feed.market_status));
                self.on_fetch_ok(now_ms, &now_iso, "fresh");
                None
            }
            Ok(Fetched::NotModified) => {
                // Unchanged feed: isOpen is still what we last parsed. tradingDay is
                // NOT re-applied: a Saturday 304 still carries Thursday's value.
                let open = self.current.as_ref().and_then(|(_, s)| s.map(|s| s == "Open"));
                self.day.observe(open, None, None);
                self.on_fetch_ok(now_ms, &now_iso, "not-modified");
                None
            }
            Err(FetchError::Refused(code)) => {
                self.refusals += 1;
                self.fetch_failures += 1;
                self.note_fetch_error(&now_iso, &format!("refused {code}"));
                if self.refusals >= 2 {
                    let msg = format!(
                        "DSE refused {} requests in a row (HTTP {code}). Backing off; stock-sync covers.",
                        self.refusals
                    );
                    self.alerts.send("dse-refused", &msg).await;
                }
                let wait = dse::refusal_backoff(self.refusals);
                Some(Duration::from_std(wait).unwrap_or(Duration::minutes(10)))
            }
            Err(FetchError::Transient(e)) => {
                self.fetch_failures += 1;
                self.note_fetch_error(&now_iso, &e);
                if self.fetch_failures >= 5 {
                    let msg = format!("{} DSE fetches failed in a row: {e}", self.fetch_failures);
                    self.alerts.send("dse-failing", &msg).await;
                }
                Some(Duration::seconds(TRANSIENT_RETRY_SECS))
            }
        };

        if let (Some(rows), Some(url)) = (fresh_rows, self.cfg.compare_url.clone()) {
            self.compare_with_python(&rows, &url).await;
        }
        self.maybe_write(now_ms).await;
        backoff
    }

    fn on_fetch_ok(&mut self, now_ms: i64, now_iso: &str, what: &str) {
        self.fetch_failures = 0;
        self.refusals = 0;
        let status = self.current.as_ref().and_then(|(_, s)| *s);
        let mut h = self.shared.health();
        h.last_fetch_at = Some(now_iso.to_string());
        h.last_fetch_ok_ms = Some(now_ms);
        h.last_fetch_result = what.to_string();
        h.fetch_failures = 0;
        h.refusals = 0;
        h.dse_market_status = status;
    }

    fn note_fetch_error(&self, now_iso: &str, error: &str) {
        let mut h = self.shared.health();
        h.last_fetch_at = Some(now_iso.to_string());
        h.last_fetch_result = format!("error: {error}");
        h.fetch_failures = self.fetch_failures;
        h.refusals = self.refusals;
    }

    async fn maybe_write(&mut self, now_ms: i64) {
        let Some((stocks, status)) = self.current.as_ref() else { return };
        let hash = content_hash(stocks, *status);
        let changed = self.last_written_hash != Some(hash);
        let heartbeat_due = self.day.dse_open == Some(true)
            && self.last_write_ms.is_none_or(|t| now_ms - t >= HEARTBEAT_MS);
        if !changed && !heartbeat_due {
            return;
        }

        if self.cfg.dry_run {
            // Track what we *would* have written so the log isn't flooded.
            self.last_written_hash = Some(hash);
            self.last_write_ms = Some(now_ms);
            tracing::info!(stocks = stocks.len(), ?status, changed, "dry-run: would write");
            return;
        }

        let today = dhaka_date_of(now_ms);
        if today != self.writes_date {
            self.writes_date = today;
            self.writes_today = 0;
            self.shared.health().budget_exhausted = false;
        }
        if self.writes_today >= self.cfg.max_writes_per_day {
            let first = !self.shared.health().budget_exhausted;
            self.shared.health().budget_exhausted = true;
            if first {
                let msg = format!(
                    "daily write budget of {} reached; writes stop until tomorrow, stock-sync covers.",
                    self.cfg.max_writes_per_day
                );
                self.alerts.send("budget", &msg).await;
            }
            return;
        }
        if self.paused_until_ms.is_some_and(|t| t > now_ms) {
            return;
        }

        let seq = now_ms.max(self.last_seq + 1);
        let mut doc = Map::new();
        doc.insert("stocks".into(), Value::Array(stocks.iter().cloned().map(Value::Object).collect()));
        doc.insert("lastUpdated".into(), Value::from(iso_millis(now_ms)));
        doc.insert("totalStocks".into(), Value::from(stocks.len()));
        doc.insert("marketStatus".into(), status.map(Value::from).unwrap_or(Value::Null));
        doc.insert("source".into(), Value::from(SOURCE));
        doc.insert("seq".into(), Value::from(seq));
        if let Some(tag) = &self.etag {
            doc.insert("dseEtag".into(), Value::from(tag.clone()));
        }

        match self.store.set(&doc).await {
            Ok(()) => {
                // Firestore has it: only now may browsers see it.
                self.publish(&doc, seq.to_string());
                self.last_seq = seq;
                self.last_written_hash = Some(hash);
                self.last_write_ms = Some(now_ms);
                self.writes_today += 1;
                self.write_failures = 0;
                let mut h = self.shared.health();
                h.last_write_at = Some(iso_millis(now_ms));
                h.writes_today = self.writes_today;
                h.write_failures = 0;
                h.seq = Some(seq);
                h.ready = true;
            }
            Err(FirestoreError::Quota(m)) => {
                let until = next_quota_reset_ms(now_ms);
                self.paused_until_ms = Some(until);
                {
                    let mut h = self.shared.health();
                    h.paused_until_ms = Some(until);
                    h.writes_paused_until = Some(iso_millis(until));
                }
                let msg = format!("Firestore quota exhausted ({m}); writes paused until {}.", iso_millis(until));
                self.alerts.send("quota", &msg).await;
            }
            Err(e) => {
                self.write_failures += 1;
                self.shared.health().write_failures = self.write_failures;
                tracing::error!("firestore write failed: {e}");
                if self.write_failures >= 5 {
                    let msg = format!("{} Firestore writes failed in a row: {e}", self.write_failures);
                    self.alerts.send("write-failing", &msg).await;
                }
            }
        }
    }

    /// Dry-run parity check against the Python daemon's `/api/market_sync`.
    /// That endpoint caches for 15 s, so a few price differences during the
    /// session are timing, not bugs; symbol-set or field-shape differences are bugs.
    async fn compare_with_python(&self, ours: &[Row], url: &str) {
        let theirs: Value = match self.http.get(url).timeout(std::time::Duration::from_secs(10)).send().await {
            Ok(r) => match r.json().await {
                Ok(v) => v,
                Err(e) => return tracing::warn!("compare: bad JSON: {e}"),
            },
            Err(e) => return tracing::warn!("compare: {}", e.without_url()),
        };
        let theirs: HashMap<String, &Map<String, Value>> = theirs
            .get("stocks")
            .and_then(Value::as_array)
            .map(|a| {
                a.iter()
                    .filter_map(Value::as_object)
                    .filter_map(|o| Some((o.get("symbol")?.as_str()?.to_string(), o)))
                    .collect()
            })
            .unwrap_or_default();
        let mut field_diffs: BTreeMap<String, usize> = BTreeMap::new();
        let mut missing = Vec::new();
        for row in ours {
            let Some(sym) = row.get("symbol").and_then(Value::as_str) else { continue };
            let Some(other) = theirs.get(sym) else {
                missing.push(sym.to_string());
                continue;
            };
            for (k, v) in row {
                let same = match (v.as_f64(), other.get(k).and_then(Value::as_f64)) {
                    (Some(a), Some(b)) => a == b,
                    _ => other.get(k) == Some(v),
                };
                if !same {
                    *field_diffs.entry(k.clone()).or_default() += 1;
                }
            }
        }
        let extra = theirs.len().saturating_sub(ours.len() - missing.len());
        tracing::info!(
            ours = ours.len(),
            theirs = theirs.len(),
            only_ours = missing.len(),
            only_theirs = extra,
            ?field_diffs,
            sample_only_ours = ?missing.iter().take(5).collect::<Vec<_>>(),
            "dry-run parity vs python"
        );
    }

    fn set_schedule_health(&self, mode: Mode, next: NaiveDateTime) {
        let mut h = self.shared.health();
        h.mode = mode.as_str();
        h.next_poll_at = Some(format!("{}+06:00", next.format("%Y-%m-%dT%H:%M:%S")));
    }

    /// Runs until `shutdown` flips to true.
    pub async fn run(mut self, mut shutdown: watch::Receiver<bool>) {
        let now = schedule::dhaka_now();
        let (mut mode, mut next) = schedule::next_poll(now, &self.day, 20);
        if schedule::in_active_window(now) {
            // Started mid-session (deploy, crash): look straight away rather
            // than waiting for the next probe slot.
            next = now;
        }
        loop {
            self.set_schedule_health(mode, next);
            // Sleep in slices so clock jumps can't strand us for hours.
            loop {
                let wait = (next - schedule::dhaka_now()).num_milliseconds();
                if wait <= 0 {
                    break;
                }
                let slice = std::time::Duration::from_millis(wait.min(300_000) as u64);
                tokio::select! {
                    _ = tokio::time::sleep(slice) => {}
                    _ = shutdown.changed() => return,
                }
            }
            if *shutdown.borrow() {
                return;
            }

            let now = schedule::dhaka_now();
            if now.date() != self.day.date {
                self.day = DayState::new(now.date());
            }
            let result = dse::fetch(&self.http, self.etag.as_deref()).await;
            let backoff = self.handle_fetch(result, chrono::Utc::now().timestamp_millis()).await;

            let now = schedule::dhaka_now();
            let jitter = rand::random_range(schedule::LIVE_MIN_SECS..=schedule::LIVE_MAX_SECS);
            (mode, next) = schedule::next_poll(now, &self.day, jitter);
            if let Some(b) = backoff {
                next = next.max(now + b);
            }
            tracing::info!(
                mode = mode.as_str(),
                next = %next.format("%H:%M:%S"),
                status = ?self.day.dse_open,
                minute = now.minute(),
                "scheduled"
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use crate::transform::ParsedFeed;
    use serde_json::json;
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

    #[derive(Default)]
    struct FakeStore {
        fail: AtomicBool,
        quota: AtomicBool,
        writes: AtomicU32,
        last: Mutex<Option<Map<String, Value>>>,
    }

    impl DocStore for Arc<FakeStore> {
        fn set(&self, fields: &Map<String, Value>) -> impl Future<Output = Result<(), FirestoreError>> + Send {
            let res = if self.quota.load(Ordering::SeqCst) {
                Err(FirestoreError::Quota("test".into()))
            } else if self.fail.load(Ordering::SeqCst) {
                Err(FirestoreError::Other("test".into()))
            } else {
                self.writes.fetch_add(1, Ordering::SeqCst);
                *self.last.lock().unwrap() = Some(fields.clone());
                Ok(())
            };
            async move { res }
        }
    }

    fn cfg() -> Config {
        Config {
            app_id: "t".into(),
            project_id: None,
            bind: "127.0.0.1:0".parse().unwrap(),
            dry_run: false,
            compare_url: None,
            max_writes_per_day: 3,
            telegram_bot_token: None,
            telegram_chat_id: None,
            telegram_topic_id: None,
            kuma_push_url: None,
        }
    }

    const T0: i64 = 1_795_060_800_000; // 2026-11-19T04:00:00Z = 10:00 Dhaka

    fn runner(dry_run: bool, max: u32) -> (Runner<Arc<FakeStore>>, Arc<FakeStore>, Arc<Shared>) {
        // reqwest needs a TLS provider even though these tests never touch the network.
        let _ = rustls::crypto::ring::default_provider().install_default();
        let store = Arc::new(FakeStore::default());
        let shared = Shared::new(dry_run, max);
        let http = reqwest::Client::new();
        let alerts = Arc::new(Alerts::new(http.clone(), &cfg()));
        let rc = RunnerConfig { dry_run, max_writes_per_day: max, compare_url: None };
        (Runner::new(rc, store.clone(), http, alerts, shared.clone(), T0), store, shared)
    }

    fn fresh(ltp: f64, open: bool) -> Result<Fetched, FetchError> {
        let mut row = Row::new();
        row.insert("symbol".into(), json!("GP"));
        row.insert("ltp".into(), json!(ltp));
        Ok(Fetched::Fresh {
            feed: ParsedFeed {
                stocks: vec![row],
                market_status: Some(if open { "Open" } else { "Closed" }),
                session: SessionInfo { is_open: Some(open), ..Default::default() },
            },
            etag: Some("W/\"x\"".into()),
        })
    }

    fn snapshot_ltp(shared: &Shared) -> Option<f64> {
        let snap = shared.snapshot.read().unwrap().clone()?;
        let doc: Value = serde_json::from_slice(&snap.body).unwrap();
        doc["stocks"][0]["ltp"].as_f64()
    }

    #[tokio::test]
    async fn writes_then_publishes_the_same_document() {
        let (mut r, store, shared) = runner(false, 100);
        r.handle_fetch(fresh(300.0, true), T0).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 1);
        assert_eq!(snapshot_ltp(&shared), Some(300.0));
        let written = store.last.lock().unwrap().clone().unwrap();
        let served: Value = serde_json::from_slice(&shared.snapshot.read().unwrap().as_ref().unwrap().body).unwrap();
        assert_eq!(Value::Object(written.clone()), served, "snapshot must be byte-for-byte the written doc");
        assert_eq!(written["source"], json!("price-feed"));
        assert_eq!(written["marketStatus"], json!("Open"));
    }

    #[tokio::test]
    async fn failed_write_never_reaches_browsers() {
        let (mut r, store, shared) = runner(false, 100);
        r.handle_fetch(fresh(300.0, true), T0).await;
        store.fail.store(true, Ordering::SeqCst);
        r.handle_fetch(fresh(305.0, true), T0 + 20_000).await;
        assert_eq!(snapshot_ltp(&shared), Some(300.0), "browsers keep the last written price");
        assert_eq!(shared.health().write_failures, 1);
        // Write recovers: the new price goes out.
        store.fail.store(false, Ordering::SeqCst);
        r.handle_fetch(Ok(Fetched::NotModified), T0 + 40_000).await;
        assert_eq!(snapshot_ltp(&shared), Some(305.0));
    }

    #[tokio::test]
    async fn unchanged_data_is_not_rewritten_until_the_heartbeat() {
        let (mut r, store, _) = runner(false, 100);
        r.handle_fetch(fresh(300.0, true), T0).await;
        r.handle_fetch(Ok(Fetched::NotModified), T0 + 20_000).await;
        r.handle_fetch(fresh(300.0, true), T0 + 40_000).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 1);
        r.handle_fetch(Ok(Fetched::NotModified), T0 + HEARTBEAT_MS).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 2, "heartbeat while Open");
    }

    #[tokio::test]
    async fn no_heartbeat_while_closed() {
        let (mut r, store, _) = runner(false, 100);
        r.handle_fetch(fresh(300.0, false), T0).await;
        r.handle_fetch(Ok(Fetched::NotModified), T0 + HEARTBEAT_MS * 3).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn daily_budget_stops_writes_and_degrades_health() {
        let (mut r, store, shared) = runner(false, 2);
        for i in 0..5 {
            r.handle_fetch(fresh(300.0 + i as f64, true), T0 + i * 20_000).await;
        }
        assert_eq!(store.writes.load(Ordering::SeqCst), 2);
        assert_eq!(shared.health().status(T0 + 100_000), "degraded");
        // Next Dhaka day: budget resets.
        r.handle_fetch(fresh(400.0, true), T0 + 86_400_000).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn quota_exhaustion_pauses_writes_until_the_reset() {
        let (mut r, store, shared) = runner(false, 100);
        store.quota.store(true, Ordering::SeqCst);
        r.handle_fetch(fresh(300.0, true), T0).await;
        store.quota.store(false, Ordering::SeqCst);
        r.handle_fetch(fresh(301.0, true), T0 + 20_000).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 0, "paused");
        assert_eq!(shared.health().status(T0 + 20_000), "degraded");
        let reset = next_quota_reset_ms(T0);
        r.handle_fetch(fresh(302.0, true), reset + 1).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn dry_run_never_writes_or_serves() {
        let (mut r, store, shared) = runner(true, 100);
        r.handle_fetch(fresh(300.0, true), T0).await;
        assert_eq!(store.writes.load(Ordering::SeqCst), 0);
        assert!(shared.snapshot.read().unwrap().is_none());
        assert_eq!(shared.health().status(T0), "dry-run");
    }

    #[tokio::test]
    async fn seq_only_goes_up() {
        let (mut r, store, _) = runner(false, 100);
        r.seed(json!({"stocks": [], "seq": T0 + 999_999}).as_object().unwrap().clone());
        r.handle_fetch(fresh(300.0, true), T0).await;
        let seq = store.last.lock().unwrap().as_ref().unwrap()["seq"].as_i64().unwrap();
        assert_eq!(seq, T0 + 1_000_000);
    }

    #[tokio::test]
    async fn refusals_back_off_and_degrade_health() {
        let (mut r, _, shared) = runner(false, 100);
        r.seed(Map::new());
        assert_eq!(r.handle_fetch(Err(FetchError::Refused(403)), T0).await, Some(Duration::minutes(1)));
        assert_eq!(r.handle_fetch(Err(FetchError::Refused(403)), T0).await, Some(Duration::minutes(2)));
        assert_eq!(r.handle_fetch(Err(FetchError::Refused(429)), T0).await, Some(Duration::minutes(5)));
        assert_eq!(shared.health().status(T0), "degraded");
        r.handle_fetch(fresh(300.0, true), T0).await;
        assert_eq!(shared.health().status(T0), "healthy");
    }

    #[tokio::test]
    async fn live_without_a_recent_fetch_is_degraded() {
        let (mut r, _, shared) = runner(false, 100);
        r.handle_fetch(fresh(300.0, true), T0).await;
        shared.health().mode = Mode::Live.as_str();
        assert_eq!(shared.health().status(T0 + 60_000), "healthy");
        assert_eq!(shared.health().status(T0 + LIVE_STALE_MS + 1), "degraded");
        shared.health().mode = Mode::Sleep.as_str();
        assert_eq!(shared.health().status(T0 + 3_600_000), "healthy", "idle overnight is fine");
    }

    #[tokio::test]
    async fn saturday_304_does_not_reuse_thursdays_trading_day() {
        let (mut r, _, _) = runner(false, 100);
        r.handle_fetch(
            Ok(Fetched::Fresh {
                feed: ParsedFeed {
                    stocks: vec![],
                    market_status: Some("Closed"),
                    session: SessionInfo { is_open: Some(false), trading_day: Some(true), ..Default::default() },
                },
                etag: None,
            }),
            T0,
        )
        .await;
        r.day = DayState::new(chrono::NaiveDate::from_ymd_opt(2026, 11, 21).unwrap());
        r.handle_fetch(Ok(Fetched::NotModified), T0).await;
        assert_eq!(r.day.trading_day, None);
        assert_eq!(r.day.dse_open, Some(false));
    }

    #[test]
    fn quota_reset_is_the_next_0805_utc() {
        // 2026-11-19 04:00Z -> same day 08:05Z
        assert_eq!(next_quota_reset_ms(T0), T0 + (4 * 60 + 5) * 60_000);
        // 2026-11-19 09:00Z -> next day 08:05Z
        assert_eq!(next_quota_reset_ms(T0 + 5 * 3_600_000), T0 + (28 * 60 + 5) * 60_000);
    }
}
