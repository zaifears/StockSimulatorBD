//! HTTP surface, bound to localhost and published by Caddy + Cloudflare:
//!
//! * `GET /v1/snapshot.json`: the document last written to Firestore. Cached by
//!   Cloudflare for 10 s, so origin load doesn't grow with users.
//! * `GET /health`: for Uptime Kuma and for `/api/stock-sync`'s standby rule.

use std::sync::Arc;

use axum::extract::State;
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;

use crate::runner::{Health, Shared};

const SNAPSHOT_CACHE: &str = "public, max-age=5, s-maxage=10";

pub fn router(shared: Arc<Shared>) -> Router {
    Router::new()
        .route("/v1/snapshot.json", get(snapshot))
        .route("/health", get(health))
        .with_state(shared)
}

async fn snapshot(State(shared): State<Arc<Shared>>, headers: HeaderMap) -> Response {
    let snap = shared.snapshot.read().expect("snapshot lock").clone();
    let Some(snap) = snap else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            [
                (header::CACHE_CONTROL, "no-store"),
                (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
            ],
            Json(serde_json::json!({ "error": "snapshot not available" })),
        )
            .into_response();
    };
    let etag = HeaderValue::from_str(&snap.etag).unwrap_or(HeaderValue::from_static("\"0\""));
    let common = [
        (header::CACHE_CONTROL, HeaderValue::from_static(SNAPSHOT_CACHE)),
        // Public, read-only, no credentials. Cloudflare doesn't vary its cache
        // on Origin, so a per-origin allow-list would serve the wrong header.
        (header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*")),
        (header::ETAG, etag),
        (header::HeaderName::from_static("x-content-type-options"), HeaderValue::from_static("nosniff")),
    ];
    let matches = headers
        .get(header::IF_NONE_MATCH)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.split(',').any(|t| t.trim().trim_start_matches("W/") == snap.etag));
    if matches {
        return (StatusCode::NOT_MODIFIED, common).into_response();
    }
    (
        StatusCode::OK,
        common,
        [(header::CONTENT_TYPE, HeaderValue::from_static("application/json"))],
        snap.body.clone(),
    )
        .into_response()
}

#[derive(Serialize)]
struct HealthBody<'a> {
    status: &'static str,
    #[serde(flatten)]
    health: &'a Health,
}

async fn health(State(shared): State<Arc<Shared>>) -> Response {
    let h = shared.health.lock().expect("health lock").clone();
    let status = h.status(chrono::Utc::now().timestamp_millis());
    (
        StatusCode::OK,
        [(header::CACHE_CONTROL, "no-store")],
        Json(HealthBody { status, health: &h }),
    )
        .into_response()
}
