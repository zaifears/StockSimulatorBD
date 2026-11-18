//! HTTP contract of `/v1/snapshot.json` and `/health`, over a real socket.

use std::sync::Arc;

use axum::body::Bytes;
use price_feed::runner::{Shared, Snapshot};
use price_feed::server::router;

async fn start(shared: Arc<Shared>) -> String {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, router(shared)).await.unwrap() });
    format!("http://{addr}")
}

fn client() -> reqwest::Client {
    let _ = rustls::crypto::ring::default_provider().install_default();
    reqwest::Client::new()
}

#[tokio::test]
async fn snapshot_is_503_until_a_document_exists() {
    let base = start(Shared::new(false, 10)).await;
    let res = client().get(format!("{base}/v1/snapshot.json")).send().await.unwrap();
    assert_eq!(res.status(), 503);
    assert_eq!(res.headers()["cache-control"], "no-store", "Cloudflare must not cache the error");
}

#[tokio::test]
async fn snapshot_serves_cacheable_json_and_honours_if_none_match() {
    let shared = Shared::new(false, 10);
    *shared.snapshot.write().unwrap() = Some(Arc::new(Snapshot {
        body: Bytes::from_static(br#"{"seq":42,"stocks":[]}"#),
        etag: "\"42\"".into(),
    }));
    let base = start(shared).await;
    let http = client();

    let res = http.get(format!("{base}/v1/snapshot.json")).send().await.unwrap();
    assert_eq!(res.status(), 200);
    let h = res.headers().clone();
    assert_eq!(h["content-type"], "application/json");
    assert_eq!(h["cache-control"], "public, max-age=5, s-maxage=10");
    assert_eq!(h["access-control-allow-origin"], "*");
    assert_eq!(h["etag"], "\"42\"");
    assert_eq!(res.text().await.unwrap(), r#"{"seq":42,"stocks":[]}"#);

    // Cloudflare revalidates with a weak validator; both forms must match.
    for tag in ["\"42\"", "W/\"42\""] {
        let res = http
            .get(format!("{base}/v1/snapshot.json"))
            .header("if-none-match", tag)
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), 304, "If-None-Match: {tag}");
    }
    let res = http
        .get(format!("{base}/v1/snapshot.json"))
        .header("if-none-match", "\"41\"")
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
}

#[tokio::test]
async fn health_reports_status_and_is_never_cached() {
    let base = start(Shared::new(true, 10)).await;
    let res = client().get(format!("{base}/health")).send().await.unwrap();
    assert_eq!(res.status(), 200);
    assert_eq!(res.headers()["cache-control"], "no-store");
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "dry-run");
    assert_eq!(body["dryRun"], true);
    assert_eq!(body["maxWritesPerDay"], 10);
}
