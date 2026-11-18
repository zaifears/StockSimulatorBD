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

    let doc_path = format!("artifacts/{}/public/data/market_info/latest", cfg.app_id);
    let store = Firestore::new(http.clone(), cfg.project_id.clone(), &doc_path).await?;
    let shared = Shared::new(cfg.dry_run, cfg.max_writes_per_day);
    let alerts = Arc::new(Alerts::new(http.clone(), &cfg));

    let now_ms = chrono::Utc::now().timestamp_millis();
    let rc = RunnerConfig {
        dry_run: cfg.dry_run,
        max_writes_per_day: cfg.max_writes_per_day,
        compare_url: cfg.compare_url.clone(),
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
    tracing::info!(bind = %cfg.bind, dry_run = cfg.dry_run, max_writes = cfg.max_writes_per_day, "price-feed started");

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

/// `price-feed --check-dse`: two requests to DSE (a full one, then a conditional
/// one), no credentials, no writes. For checking a new host can reach DSE.
async fn check_dse(http: &reqwest::Client) -> Result<(), String> {
    use price_feed::dse::{fetch, Fetched};
    let etag = match fetch(http, None).await.map_err(|e| e.to_string())? {
        Fetched::Fresh { feed, etag } => {
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
