//! Bit-exact parity on a folder of captured DSE payloads (from CAPTURE_DIR on
//! the VPS) against the Python parser's output for the same files.
//!
//! Skipped unless both env vars are set:
//!   PARITY_CAPTURES=<dir of dse-*.json>  PARITY_EXPECTED=<dir of *.expected.json>
//! Expected files come from `tests/tools/gen_expected.py`.

use price_feed::transform::parse_feed;
use serde_json::Value;

fn assert_same(actual: &Value, expected: &Value, path: &str) {
    match (actual, expected) {
        (Value::Number(a), Value::Number(e)) => {
            let (a, e) = (a.as_f64().unwrap(), e.as_f64().unwrap());
            assert_eq!(a.to_bits(), e.to_bits(), "{path}: {a} != {e}");
        }
        (Value::Object(a), Value::Object(e)) => {
            assert_eq!(a.keys().collect::<Vec<_>>(), e.keys().collect::<Vec<_>>(), "{path}: keys differ");
            for (k, ev) in e {
                assert_same(&a[k], ev, &format!("{path}.{k}"));
            }
        }
        (Value::Array(a), Value::Array(e)) => {
            assert_eq!(a.len(), e.len(), "{path}: length differs");
            for (i, (av, ev)) in a.iter().zip(e).enumerate() {
                assert_same(av, ev, &format!("{path}[{i}]"));
            }
        }
        _ => assert_eq!(actual, expected, "{path}"),
    }
}

#[test]
fn captured_payloads_match_python() {
    let (Ok(captures), Ok(expected)) = (std::env::var("PARITY_CAPTURES"), std::env::var("PARITY_EXPECTED")) else {
        eprintln!("skipped: set PARITY_CAPTURES and PARITY_EXPECTED");
        return;
    };
    let mut files: Vec<_> = std::fs::read_dir(&captures)
        .unwrap()
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    files.sort();
    assert!(!files.is_empty(), "no captures in {captures}");
    let mut rows = 0;
    for file in &files {
        let stem = file.file_stem().unwrap().to_string_lossy();
        let raw: Value = serde_json::from_slice(&std::fs::read(file).unwrap()).unwrap();
        let exp_path = format!("{expected}/{stem}.expected.json");
        let exp: Value = serde_json::from_slice(&std::fs::read(&exp_path).expect(&exp_path)).unwrap();
        let feed = parse_feed(&raw);
        rows += feed.stocks.len();
        let stocks = Value::Array(feed.stocks.into_iter().map(Value::Object).collect());
        assert_same(&stocks, &exp["stocks"], &stem);
        assert_eq!(feed.market_status.map(Value::from).unwrap_or(Value::Null), exp["marketStatus"], "{stem}");
    }
    eprintln!("{} captures, {rows} rows: bit-identical to Python", files.len());
}
