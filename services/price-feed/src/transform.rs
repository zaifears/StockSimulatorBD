//! DSE feed → `market_info/latest` rows.
//!
//! A line-for-line port of `parse_new_dse_payload()` in
//! `scripts/vps/scrapers/market_sync.py` plus `carryForwardMissing()` in
//! `app/api/stock-sync/route.ts`. Keep all three in step: the golden tests in
//! `tests/transform_golden.rs` compare this module's output to what the Python
//! parser produces for the same fixture.

use std::collections::HashSet;

use serde_json::{Map, Value};

pub type Row = Map<String, Value>;

/// Column order DSE has used since the JSON feed launched; used only when the
/// payload omits `cols`.
pub const DEFAULT_COLS: [&str; 15] = [
    "code", "ltp", "ycp", "open", "high", "low", "close", "volume", "value", "trades", "percent",
    "category", "board", "sector", "assetType",
];

/// Same floor as the Python scraper's "unusually low count" guard.
pub const MIN_STOCKS: usize = 50;

/// How long a symbol missing from the feed is carried forward (7 days, as in stock-sync).
pub const CARRY_FORWARD_MAX_MS: i64 = 7 * 24 * 60 * 60 * 1000;

/// What the feed's `session` object says, as far as the scheduler cares.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct SessionInfo {
    /// `session.isOpen`, `None` when the key is absent.
    pub is_open: Option<bool>,
    /// `session.tradingDay`, `None` when absent.
    pub trading_day: Option<bool>,
    /// `session.today.closing` (falls back to `session.closing`), as minutes after midnight.
    pub closing_minute: Option<u32>,
    /// `session.phase`, e.g. "open", "closed", "pre-open".
    pub phase: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedFeed {
    pub stocks: Vec<Row>,
    /// `"Open"` / `"Closed"` exactly as market_sync.py reports it, `None` without a session.
    pub market_status: Option<&'static str>,
    pub session: SessionInfo,
}

/// Python's `round(x, 2)`. Rust's `{:.2}` formatting rounds the exact binary
/// value the same way CPython does (ties to even), so format-then-parse
/// reproduces it bit for bit, including `-0.0`.
pub fn py_round2(x: f64) -> f64 {
    format!("{x:.2}").parse().unwrap_or(x)
}

/// Python's `float(v)`. `Err` where Python would raise, which makes the
/// caller skip the whole row (market_sync.py's `except (ValueError, TypeError)`).
fn py_float(v: &Value) -> Result<f64, ()> {
    match v {
        Value::Number(n) => n.as_f64().ok_or(()),
        Value::String(s) => s.trim().parse::<f64>().map_err(|_| ()),
        Value::Bool(b) => Ok(if *b { 1.0 } else { 0.0 }),
        _ => Err(()),
    }
}

/// `float(row[i]) if len(row) > i and row[i] not in (<blank values>) else 0.0`
fn cell(row: &[Value], idx: usize, zero_string_is_blank: bool) -> Result<f64, ()> {
    let Some(v) = row.get(idx) else { return Ok(0.0) };
    let blank = match v {
        Value::Null => true,
        Value::String(s) => s == "--" || s.is_empty() || (zero_string_is_blank && s == "0"),
        _ => false,
    };
    if blank { Ok(0.0) } else { py_float(v) }
}

/// Python's `str(v)` for the values DSE actually sends.
fn py_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Null => "None".to_string(),
        Value::Bool(true) => "True".to_string(),
        Value::Bool(false) => "False".to_string(),
        other => other.to_string(),
    }
}

fn text_cell(row: &[Value], idx: usize) -> String {
    row.get(idx).map(|v| py_str(v).trim().to_string()).unwrap_or_default()
}

/// Python truthiness, for `session.get("isOpen")`.
fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
        Value::String(s) => !s.is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Object(o) => !o.is_empty(),
    }
}

/// Bangladesh government securities (Treasury bonds, G-SEC). Same guards as
/// `is_government_security()` in market_sync.py.
pub fn is_government_security(code: &str, asset_type: &str, sector: &str, board: &str) -> bool {
    let code = code.trim().to_uppercase();
    let asset = asset_type.trim().to_uppercase();
    let sector = sector.trim().to_uppercase();
    let board = board.trim().to_uppercase();

    if matches!(asset.as_str(), "GOVDBT" | "GSEC" | "TBOND") {
        return true;
    }
    if matches!(sector.as_str(), "TBOND" | "G-SEC" | "TREASURY")
        || sector.contains("G-SEC")
        || sector.contains("T.BOND")
        || sector.contains("TREASURY")
    {
        return true;
    }
    if board == "YIELDDBT" {
        return true;
    }
    code.starts_with("TB") || code.starts_with("GSEC") || code.starts_with("BGT")
}

fn hhmm_to_minute(s: &str) -> Option<u32> {
    let (h, m) = s.trim().split_once(':')?;
    let (h, m): (u32, u32) = (h.parse().ok()?, m.parse().ok()?);
    (h < 24 && m < 60).then_some(h * 60 + m)
}

fn parse_session(data: &Value) -> (Option<&'static str>, SessionInfo) {
    let Some(session) = data.get("session").and_then(Value::as_object) else {
        return (None, SessionInfo::default());
    };
    let is_open = session.get("isOpen").map(truthy);
    let closing = session
        .get("today")
        .and_then(|t| t.get("closing"))
        .or_else(|| session.get("closing"))
        .and_then(Value::as_str)
        .and_then(hhmm_to_minute);
    let info = SessionInfo {
        is_open,
        trading_day: session.get("tradingDay").and_then(Value::as_bool),
        closing_minute: closing,
        phase: session.get("phase").and_then(Value::as_str).map(str::to_string),
    };
    let status = is_open.map(|open| if open { "Open" } else { "Closed" });
    (status, info)
}

/// Parses `https://www.dsebd.org/api/live/prices` with government securities excluded.
pub fn parse_feed(data: &Value) -> ParsedFeed {
    let default_cols: Vec<Value> = DEFAULT_COLS.iter().map(|c| Value::from(*c)).collect();
    let cols = match data.get("cols").and_then(Value::as_array) {
        Some(c) if !c.is_empty() => c.clone(),
        _ => default_cols,
    };
    let idx = |name: &str, fallback: usize| -> usize {
        cols.iter().position(|c| c.as_str() == Some(name)).unwrap_or(fallback)
    };
    let (code_i, ltp_i, ycp_i) = (idx("code", 0), idx("ltp", 1), idx("ycp", 2));
    let (high_i, low_i, close_i) = (idx("high", 4), idx("low", 5), idx("close", 6));
    let (volume_i, value_i, trades_i) = (idx("volume", 7), idx("value", 8), idx("trades", 9));
    let percent_i = idx("percent", 10);
    let (board_i, sector_i, asset_i) = (idx("board", 12), idx("sector", 13), idx("assetType", 14));

    let empty = Vec::new();
    let rows = data.get("rows").and_then(Value::as_array).unwrap_or(&empty);

    let mut stocks = Vec::with_capacity(rows.len());
    for row in rows {
        let Some(row) = row.as_array() else { continue };
        let Some(code) = row.get(code_i) else { continue };
        let symbol = py_str(code).trim().to_uppercase();
        if symbol.is_empty() || symbol == "TRADING CODE" {
            continue;
        }
        let board = text_cell(row, board_i);
        let sector = text_cell(row, sector_i);
        let asset_type = text_cell(row, asset_i);
        if is_government_security(&symbol, &asset_type, &sector, &board) {
            continue;
        }

        let parsed = (|| -> Result<Row, ()> {
            let ltp = cell(row, ltp_i, true)?;
            let high = cell(row, high_i, false)?;
            let low = cell(row, low_i, false)?;
            let close = cell(row, close_i, false)?;
            let ycp = cell(row, ycp_i, false)?;
            let trade = cell(row, trades_i, false)?;
            let value_mn = cell(row, value_i, false)?;
            // DSE reports turnover in millions of BDT; the app stores raw BDT.
            let value = py_round2(value_mn * 1_000_000.0);
            let volume = cell(row, volume_i, false)?;
            let raw_pct = cell(row, percent_i, false)?;

            let (change, change_percent) = if trade > 0.0 || ltp > 0.0 {
                let change = if ltp > 0.0 { py_round2(ltp - ycp) } else { py_round2(close - ycp) };
                (change, py_round2(raw_pct))
            } else {
                (0.0, 0.0)
            };

            let mut m = Row::new();
            m.insert("symbol".into(), Value::from(symbol.clone()));
            m.insert("ltp".into(), Value::from(ltp));
            m.insert("high".into(), Value::from(high));
            m.insert("low".into(), Value::from(low));
            m.insert("close".into(), Value::from(close));
            m.insert("ycp".into(), Value::from(ycp));
            m.insert("change".into(), Value::from(change));
            m.insert("changePercent".into(), Value::from(change_percent));
            m.insert("trade".into(), Value::from(trade));
            m.insert("value".into(), Value::from(value));
            m.insert("volume".into(), Value::from(volume));
            m.insert("traded".into(), Value::from(trade > 0.0));
            Ok(m)
        })();
        if let Ok(m) = parsed {
            stocks.push(m);
        }
    }

    let (market_status, session) = parse_session(data);
    ParsedFeed { stocks, market_status, session }
}

/// JavaScript's `Date.prototype.toISOString()` for a millisecond timestamp.
pub fn iso_millis(ms: i64) -> String {
    chrono::DateTime::from_timestamp_millis(ms)
        .unwrap_or_default()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string()
}

fn parse_iso_ms(s: &str) -> Option<i64> {
    chrono::DateTime::parse_from_rfc3339(s).ok().map(|d| d.timestamp_millis())
}

fn positive_number(v: Option<&Value>) -> Option<f64> {
    v.and_then(Value::as_f64).filter(|f| *f > 0.0)
}

/// Symbols that were in the last document but are missing from this snapshot,
/// kept as "not traded today" rows. Port of `carryForwardMissing()` in stock-sync.
pub fn carry_forward_missing(fresh: &[Row], previous: &[Value], now_ms: i64) -> Vec<Row> {
    let present: HashSet<&str> =
        fresh.iter().filter_map(|r| r.get("symbol").and_then(Value::as_str)).collect();
    let mut carried = Vec::new();
    for prev in previous {
        let Some(prev) = prev.as_object() else { continue };
        let Some(symbol) = prev.get("symbol").and_then(Value::as_str) else { continue };
        if present.contains(symbol) {
            continue;
        }
        if let Some(since) = prev.get("missingSince").and_then(Value::as_str) {
            // An unparseable date drops the row, as NaN does in the JS original.
            if parse_iso_ms(since).is_some_and(|t| now_ms - t <= CARRY_FORWARD_MAX_MS) {
                carried.push(prev.clone());
            }
            continue;
        }
        let traded = prev.get("traded") != Some(&Value::Bool(false));
        let last_price = match (traded, positive_number(prev.get("ltp"))) {
            (true, Some(ltp)) => Value::from(ltp),
            _ => match prev.get("ycp") {
                Some(v) if truthy(v) => v.clone(),
                _ => Value::from(0),
            },
        };
        let mut row = prev.clone();
        row.insert("ltp".into(), Value::from(0));
        row.insert("ycp".into(), last_price);
        for key in ["change", "changePercent", "trade", "value", "volume"] {
            row.insert(key.into(), Value::from(0));
        }
        row.insert("traded".into(), Value::Bool(false));
        row.insert("missingSince".into(), Value::from(iso_millis(now_ms)));
        carried.push(row);
    }
    carried
}

/// Fresh rows plus carried-forward rows. Sorted by symbol only when something
/// was carried, exactly like stock-sync, so DSE's own order is otherwise kept.
pub fn merge_with_previous(fresh: Vec<Row>, previous: &[Value], now_ms: i64) -> Vec<Row> {
    let carried = carry_forward_missing(&fresh, previous, now_ms);
    if carried.is_empty() {
        return fresh;
    }
    let mut all = fresh;
    all.extend(carried);
    all.sort_by(|a, b| {
        let sa = a.get("symbol").and_then(Value::as_str).unwrap_or("");
        let sb = b.get("symbol").and_then(Value::as_str).unwrap_or("");
        sa.cmp(sb)
    });
    all
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn row(v: Value) -> Row {
        v.as_object().unwrap().clone()
    }

    #[test]
    fn rounding_matches_python() {
        // Values checked against CPython's round(x, 2).
        assert_eq!(py_round2(0.125), 0.12);
        assert_eq!(py_round2(-0.125), -0.12);
        assert_eq!(py_round2(0.375), 0.38);
        assert_eq!(py_round2(2.675), 2.67);
        assert_eq!(py_round2(1234.565), 1234.57);
        assert!(py_round2(-0.001).is_sign_negative());
    }

    #[test]
    fn government_securities_are_filtered() {
        assert!(is_government_security("TB5Y0728", "", "", ""));
        assert!(is_government_security("X", "GOVDBT", "", ""));
        assert!(is_government_security("X", "", "Treasury Bills", ""));
        assert!(is_government_security("X", "", "", "YIELDDBT"));
        assert!(!is_government_security("GP", "EQ", "Telecom", "PUBLIC"));
    }

    #[test]
    fn carry_forward_marks_missing_symbol_untraded() {
        let now = 1_795_000_000_000;
        let fresh = vec![row(json!({"symbol": "GP", "ltp": 300.0}))];
        let previous = vec![
            json!({"symbol": "GP", "ltp": 299.0}),
            json!({"symbol": "BOND1", "ltp": 101.5, "ycp": 101.0, "traded": true, "change": 0.5, "volume": 10}),
        ];
        let carried = carry_forward_missing(&fresh, &previous, now);
        assert_eq!(carried.len(), 1);
        let c = &carried[0];
        assert_eq!(c["ltp"], json!(0));
        assert_eq!(c["ycp"], json!(101.5));
        assert_eq!(c["traded"], json!(false));
        assert_eq!(c["volume"], json!(0));
        assert_eq!(c["missingSince"], json!(iso_millis(now)));
    }

    #[test]
    fn carry_forward_uses_ycp_when_not_traded() {
        let previous = vec![json!({"symbol": "B", "ltp": 0, "ycp": 55.5, "traded": false})];
        let carried = carry_forward_missing(&[], &previous, 0);
        assert_eq!(carried[0]["ycp"], json!(55.5));
    }

    #[test]
    fn carry_forward_expires_after_seven_days() {
        let now = 1_795_000_000_000;
        let fresh_since = iso_millis(now - CARRY_FORWARD_MAX_MS);
        let stale_since = iso_millis(now - CARRY_FORWARD_MAX_MS - 1);
        let previous = vec![
            json!({"symbol": "KEEP", "missingSince": fresh_since}),
            json!({"symbol": "DROP", "missingSince": stale_since}),
            json!({"symbol": "BAD", "missingSince": "not a date"}),
        ];
        let carried = carry_forward_missing(&[], &previous, now);
        let symbols: Vec<_> = carried.iter().map(|r| r["symbol"].as_str().unwrap()).collect();
        assert_eq!(symbols, ["KEEP"]);
        // An already-carried row is kept untouched, original timestamp included.
        assert_eq!(carried[0]["missingSince"], json!(fresh_since));
    }

    #[test]
    fn merge_keeps_dse_order_unless_something_was_carried() {
        let fresh = vec![row(json!({"symbol": "Z"})), row(json!({"symbol": "A"}))];
        let same = merge_with_previous(fresh.clone(), &[json!({"symbol": "A"})], 0);
        assert_eq!(same, fresh);
        let merged = merge_with_previous(fresh, &[json!({"symbol": "M", "ltp": 1})], 0);
        let order: Vec<_> = merged.iter().map(|r| r["symbol"].as_str().unwrap()).collect();
        assert_eq!(order, ["A", "M", "Z"]);
    }

    #[test]
    fn session_fields_are_read() {
        let feed = parse_feed(&json!({
            "rows": [],
            "session": {"isOpen": false, "tradingDay": true, "phase": "closed",
                        "closing": "14:30", "today": {"closing": "14:00"}}
        }));
        assert_eq!(feed.market_status, Some("Closed"));
        assert_eq!(feed.session.trading_day, Some(true));
        assert_eq!(feed.session.closing_minute, Some(14 * 60));
        let none = parse_feed(&json!({"rows": []}));
        assert_eq!(none.market_status, None);
    }
}
