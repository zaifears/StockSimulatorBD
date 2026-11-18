//! Minimal Firestore REST client: read and replace one document.
//!
//! Only two calls are needed, so this avoids a community Firestore crate and
//! talks to the official REST API with a service-account OAuth token.
//! Values are encoded the way the Node Admin SDK encodes them (safe integers
//! as `integerValue`, everything else as `doubleValue`), so documents written
//! here read back identically to the ones `/api/stock-sync` writes.

use std::sync::Arc;

use gcp_auth::TokenProvider;
use serde_json::{json, Map, Value};

const SCOPES: &[&str] = &["https://www.googleapis.com/auth/datastore"];
/// Largest integer JS can hold exactly (`Number.MAX_SAFE_INTEGER`).
const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

#[derive(Debug)]
pub enum FirestoreError {
    /// Daily quota exhausted (`RESOURCE_EXHAUSTED` / HTTP 429). Writes must stop until it resets.
    Quota(String),
    NotFound,
    Other(String),
}

impl std::fmt::Display for FirestoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FirestoreError::Quota(m) => write!(f, "quota exhausted: {m}"),
            FirestoreError::NotFound => write!(f, "document not found"),
            FirestoreError::Other(m) => write!(f, "{m}"),
        }
    }
}

pub fn encode(v: &Value) -> Value {
    match v {
        Value::Null => json!({ "nullValue": null }),
        Value::Bool(b) => json!({ "booleanValue": b }),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                return json!({ "integerValue": i.to_string() });
            }
            let f = n.as_f64().unwrap_or(0.0);
            if f.fract() == 0.0 && f.abs() <= MAX_SAFE_INTEGER {
                json!({ "integerValue": (f as i64).to_string() })
            } else {
                json!({ "doubleValue": f })
            }
        }
        Value::String(s) => json!({ "stringValue": s }),
        Value::Array(a) => {
            if a.is_empty() {
                json!({ "arrayValue": {} })
            } else {
                json!({ "arrayValue": { "values": a.iter().map(encode).collect::<Vec<_>>() } })
            }
        }
        Value::Object(o) => json!({ "mapValue": { "fields": encode_fields(o) } }),
    }
}

pub fn encode_fields(o: &Map<String, Value>) -> Map<String, Value> {
    o.iter().map(|(k, v)| (k.clone(), encode(v))).collect()
}

pub fn decode(v: &Value) -> Value {
    let Some(obj) = v.as_object() else { return Value::Null };
    let Some((kind, inner)) = obj.iter().next() else { return Value::Null };
    match kind.as_str() {
        "nullValue" => Value::Null,
        "booleanValue" => inner.clone(),
        "integerValue" => inner
            .as_str()
            .and_then(|s| s.parse::<i64>().ok())
            .map(Value::from)
            .unwrap_or(Value::Null),
        "doubleValue" => match inner {
            Value::Number(_) => inner.clone(),
            // NaN / Infinity arrive as strings; JSON can't hold them.
            _ => Value::Null,
        },
        "stringValue" | "timestampValue" | "referenceValue" | "bytesValue" => inner.clone(),
        "arrayValue" => Value::Array(
            inner.get("values").and_then(Value::as_array).map(|a| a.iter().map(decode).collect()).unwrap_or_default(),
        ),
        "mapValue" => Value::Object(decode_fields(inner.get("fields"))),
        _ => Value::Null,
    }
}

pub fn decode_fields(fields: Option<&Value>) -> Map<String, Value> {
    fields
        .and_then(Value::as_object)
        .map(|f| f.iter().map(|(k, v)| (k.clone(), decode(v))).collect())
        .unwrap_or_default()
}

pub struct Firestore {
    http: reqwest::Client,
    auth: Arc<dyn TokenProvider>,
    doc_url: String,
}

impl Firestore {
    /// `doc_path` is relative to `documents/`, e.g. `artifacts/x/public/data/market_info/latest`.
    pub async fn new(http: reqwest::Client, project_override: Option<String>, doc_path: &str) -> Result<Self, String> {
        let auth = gcp_auth::provider().await.map_err(|e| format!("credentials: {e}"))?;
        let project = match project_override {
            Some(p) => p,
            None => auth.project_id().await.map_err(|e| format!("project id: {e}"))?.to_string(),
        };
        let doc_url = format!(
            "https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents/{doc_path}"
        );
        Ok(Self { http, auth, doc_url })
    }

    async fn bearer(&self) -> Result<String, FirestoreError> {
        let token = self.auth.token(SCOPES).await.map_err(|e| FirestoreError::Other(format!("token: {e}")))?;
        Ok(format!("Bearer {}", token.as_str()))
    }

    fn classify(status: reqwest::StatusCode, body: &str) -> FirestoreError {
        if status == reqwest::StatusCode::NOT_FOUND {
            FirestoreError::NotFound
        } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS || body.contains("RESOURCE_EXHAUSTED") {
            FirestoreError::Quota(body.chars().take(300).collect())
        } else {
            FirestoreError::Other(format!("HTTP {status}: {}", body.chars().take(300).collect::<String>()))
        }
    }

    /// Reads the document as plain JSON. One Firestore read.
    pub async fn get(&self) -> Result<Map<String, Value>, FirestoreError> {
        let res = self
            .http
            .get(&self.doc_url)
            .header("Authorization", self.bearer().await?)
            .send()
            .await
            .map_err(|e| FirestoreError::Other(e.to_string()))?;
        let status = res.status();
        let body = res.text().await.map_err(|e| FirestoreError::Other(e.to_string()))?;
        if !status.is_success() {
            return Err(Self::classify(status, &body));
        }
        let doc: Value = serde_json::from_str(&body).map_err(|e| FirestoreError::Other(e.to_string()))?;
        Ok(decode_fields(doc.get("fields")))
    }

    /// Replaces the whole document, like the Admin SDK's `set()`. One Firestore write.
    pub async fn set(&self, fields: &Map<String, Value>) -> Result<(), FirestoreError> {
        let body = json!({ "fields": encode_fields(fields) });
        let res = self
            .http
            .patch(&self.doc_url)
            .header("Authorization", self.bearer().await?)
            .json(&body)
            .send()
            .await
            .map_err(|e| FirestoreError::Other(e.to_string()))?;
        let status = res.status();
        if status.is_success() {
            return Ok(());
        }
        let text = res.text().await.unwrap_or_default();
        Err(Self::classify(status, &text))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers_encode_like_the_node_admin_sdk() {
        assert_eq!(encode(&json!(885356.0)), json!({"integerValue": "885356"}));
        assert_eq!(encode(&json!(12)), json!({"integerValue": "12"}));
        assert_eq!(encode(&json!(3.2)), json!({"doubleValue": 3.2}));
        assert_eq!(encode(&json!(1e300)), json!({"doubleValue": 1e300}));
    }

    #[test]
    fn round_trip_preserves_a_market_document() {
        let doc = json!({
            "stocks": [{"symbol": "GP", "ltp": 312.4, "volume": 120000, "traded": true}],
            "empty": [],
            "lastUpdated": "2026-11-18T08:00:00.000Z",
            "marketStatus": null,
            "nested": {"a": {"b": 1.5}}
        });
        let encoded = encode_fields(doc.as_object().unwrap());
        let back = decode_fields(Some(&Value::Object(encoded)));
        assert_eq!(Value::Object(back), doc);
    }

    #[test]
    fn quota_errors_are_recognised() {
        let e = Firestore::classify(reqwest::StatusCode::TOO_MANY_REQUESTS, "{}");
        assert!(matches!(e, FirestoreError::Quota(_)));
        let e = Firestore::classify(reqwest::StatusCode::BAD_REQUEST, r#"{"status":"RESOURCE_EXHAUSTED"}"#);
        assert!(matches!(e, FirestoreError::Quota(_)));
        let e = Firestore::classify(reqwest::StatusCode::INTERNAL_SERVER_ERROR, "boom");
        assert!(matches!(e, FirestoreError::Other(_)));
    }
}
