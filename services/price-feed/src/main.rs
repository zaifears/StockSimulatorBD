use std::sync::Arc;
use std::time::Duration;

use price_feed::alerts::Alerts;
use price_feed::config::Config;
use price_feed::firestore::{Firestore, FirestoreError};
use price_feed::runner::{Runner, RunnerConfig, Shared};
use price_feed::server;
use tokio::sync::watch;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with_target(false)
        // journald stores raw bytes: colour codes only belong on a terminal.
        .with_ansi(std::io::IsTerminal::is_terminal(&std::io::stdout()))
        .init();

    if let Err(e) = run().await {
        tracing::error!("fatal: {e}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), String> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .map_err(|_| "could not install the TLS crypto provider".to_string())?;

    let http = reqwest::Client::builder()
        .gzip(true)
        .connect_timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("http client: {e}"))?;

    if std::env::args().any(|a| a == "--check-dse") {
        return check_dse(&http).await;
    }

    let cfg = Config::from_env()?;

    if std::env::args().any(|a| a == "--self-test-write") {
        return self_test_write(&http, &cfg).await;
    }

    let doc_path = format!("artifacts/{}/public/data/market_info/latest", cfg.app_id);
    let store = Firestore::new(http.clone(), cfg.project_id.clone(), &doc_path).await?;
    let shared = Shared::new(cfg.dry_run, cfg.max_writes_per_day);
    let alerts = Arc::new(Alerts::new(http.clone(), &cfg));

    let now_ms = chrono::Utc::now().timestamp_millis();
    let rc = RunnerConfig {
        dry_run: cfg.dry_run,
        rehearsal: cfg.rehearsal,
        max_writes_per_day: cfg.max_writes_per_day,
        compare_url: cfg.compare_url.clone(),
        compare_every_ms: cfg.compare_every_secs as i64 * 1000,
        capture_dir: cfg.capture_dir.clone().map(std::path::PathBuf::from),
        capture_every_ms: cfg.capture_every_secs as i64 * 1000,
    };
    let mut runner = Runner::new(rc, store, http.clone(), alerts.clone(), shared.clone(), now_ms);

    // One Firestore read at startup: the carry-forward baseline and first snapshot.
    let seed = Firestore::new(http.clone(), cfg.project_id.clone(), &doc_path).await?;
    match seed.get().await {
        Ok(doc) => {
            tracing::info!(stocks = doc.get("stocks").and_then(|s| s.as_array()).map_or(0, Vec::len), "seeded from Firestore");
            runner.seed(doc);
        }
        Err(FirestoreError::NotFound) => {
            tracing::warn!("market_info/latest does not exist yet; starting empty");
            runner.seed(Default::default());
        }
        // Not fatal: the first successful fetch makes us ready. Until then
        // /health says "starting" and stock-sync keeps doing its job.
        Err(e) => tracing::error!("could not read market_info/latest at startup: {e}"),
    }

    let (stop_tx, stop_rx) = watch::channel(false);

    // Uptime Kuma heartbeat: one push a minute with the current health.
    let kuma_shared = shared.clone();
    let kuma_alerts = alerts.clone();
    let mut kuma_stop = stop_rx.clone();
    tokio::spawn(async move {
        loop {
            let (up, msg) = {
                let h = kuma_shared.health.lock().expect("health lock");
                let status = h.status(chrono::Utc::now().timestamp_millis());
                (matches!(status, "healthy" | "dry-run"), format!("{status} ({})", h.mode))
            };
            kuma_alerts.push(up, &msg).await;
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(60)) => {}
                _ = kuma_stop.changed() => return,
            }
        }
    });

    let runner_task = tokio::spawn(runner.run(stop_rx.clone()));

    let listener = tokio::net::TcpListener::bind(cfg.bind).await.map_err(|e| format!("bind {}: {e}", cfg.bind))?;
    tracing::info!(bind = %cfg.bind, dry_run = cfg.dry_run, rehearsal = cfg.rehearsal, max_writes = cfg.max_writes_per_day, "price-feed started");

    let mut server_stop = stop_rx.clone();
    let serve = axum::serve(listener, server::router(shared)).with_graceful_shutdown(async move {
        let _ = server_stop.changed().await;
    });
    let server_task = tokio::spawn(async move { serve.await });

    shutdown_signal().await;
    tracing::info!("shutting down");
    let _ = stop_tx.send(true);
    let _ = tokio::time::timeout(Duration::from_secs(10), async {
        let _ = runner_task.await;
        let _ = server_task.await;
    })
    .await;
    Ok(())
}

/// `price-feed --self-test-write`: proves the Firestore write path without
/// touching `market_info/latest`. 2 reads, 1 write, 1 delete.
///
/// 1. Reads the production document raw and checks that decode → encode gives
///    back exactly the same typed values, so documents we write are
///    indistinguishable from the ones `/api/stock-sync` writes.
/// 2. Writes a full copy to `price_feed_selftest/latest`, reads it back,
///    compares, and deletes it.
async fn self_test_write(http: &reqwest::Client, cfg: &Config) -> Result<(), String> {
    use price_feed::firestore::{decode_fields, encode_fields};
    use serde_json::Value;

    let prod_path = format!("artifacts/{}/public/data/market_info/latest", cfg.app_id);
    let prod = Firestore::new(http.clone(), cfg.project_id.clone(), &prod_path).await?;
    let raw = prod.get_raw().await.map_err(|e| format!("read production doc: {e}"))?;
    let decoded = decode_fields(Some(&raw));
    let reencoded = Value::Object(encode_fields(&decoded));
    let stocks = decoded.get("stocks").and_then(Value::as_array).map_or(0, Vec::len);
    if reencoded != raw {
        let diffs = raw
            .as_object()
            .map(|o| o.iter().filter(|(k, v)| reencoded.get(*k) != Some(*v)).map(|(k, _)| k.clone()).collect::<Vec<_>>())
            .unwrap_or_default();
        return Err(format!("encoding differs from production for fields {diffs:?}"));
    }
    println!("1/3 production doc ({stocks} stocks): decode -> encode is identical to what stock-sync wrote");

    let test = Firestore::new(http.clone(), cfg.project_id.clone(), "price_feed_selftest/latest").await?;
    let mut doc = decoded.clone();
    doc.insert("source".into(), Value::from("price-feed-selftest"));
    doc.insert("lastUpdated".into(), Value::from(price_feed::transform::iso_millis(chrono::Utc::now().timestamp_millis())));
    let size = serde_json::to_vec(&encode_fields(&doc)).map_or(0, |b| b.len());
    let started = std::time::Instant::now();
    test.set(&doc).await.map_err(|e| format!("write: {e}"))?;
    println!("2/3 wrote price_feed_selftest/latest ({size} bytes encoded) in {} ms", started.elapsed().as_millis());

    let back = test.get().await.map_err(|e| format!("read back: {e}"))?;
    let same = back == doc;
    test.delete().await.map_err(|e| format!("delete: {e}"))?;
    if !same {
        return Err("read-back differs from what was written".into());
    }
    println!("3/3 read back identical, throwaway document deleted");
    Ok(())
}

/// `price-feed --check-dse`: two requests to DSE (a full one, then a conditional
/// one), no credentials, no writes. For checking a new host can reach DSE.
async fn check_dse(http: &reqwest::Client) -> Result<(), String> {
    use price_feed::dse::{fetch, Fetched};
    let etag = match fetch(http, None).await.map_err(|e| e.to_string())? {
        Fetched::Fresh { feed, etag, .. } => {
            println!(
                "fresh: {} stocks, marketStatus={:?}, tradingDay={:?}, closing={:?}, etag={:?}",
                feed.stocks.len(),
                feed.market_status,
                feed.session.trading_day,
                feed.session.closing_minute.map(|m| format!("{:02}:{:02}", m / 60, m % 60)),
                etag
            );
            etag
        }
        Fetched::NotModified => return Err("unexpected 304 without a validator".into()),
    };
    match fetch(http, etag.as_deref()).await.map_err(|e| e.to_string())? {
        Fetched::NotModified => println!("conditional request: 304 Not Modified (ETag works)"),
        Fetched::Fresh { .. } => println!("conditional request: 200 (feed changed, or DSE ignored the ETag)"),
    }
    Ok(())
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let mut term = signal(SignalKind::terminate()).expect("SIGTERM handler");
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {}
            _ = term.recv() => {}
        }
    }
    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
}
