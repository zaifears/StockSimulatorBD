//! price-feed: the single writer of `market_info/latest`.
//!
//! Polls DSE while the market is live, writes the result to Firestore, and only
//! then serves the same document as `/v1/snapshot.json`. See
//! `docs/live-prices-plan.md` for the design and rollout.

pub mod alerts;
pub mod config;
pub mod dse;
pub mod firestore;
pub mod runner;
pub mod schedule;
pub mod server;
pub mod transform;
