//! When to ask DSE for prices. Pure functions over Dhaka local time, so every
//! rule is unit-tested without a clock or a network.
//!
//! The day, in Dhaka time (UTC+6, no DST), any day of the week:
//!
//! * before 09:45 and after the close: no requests at all (`Sleep`)
//! * 09:45: one request. It tells us `session.tradingDay` and `isOpen`.
//! * expected trading day (DSE says `tradingDay`, or Sun–Thu when it hasn't
//!   said yet): every 60 s until DSE reports Open, at most until 10:30 (`Warmup`)
//! * otherwise (Fri/Sat, holidays, a weekday DSE didn't open by 10:30): a few
//!   conditional requests between 10:00 and 14:00 so a special working day or
//!   a late opening is still caught (`Probe`)
//! * DSE reports Open (`Live`), adaptive: DSE's data changes about every 2 min
//!   (measured 2026-11-19: median 119 s), so after a change we wait a random
//!   80–90 s, then poll every 12–18 s (random) until the next change. That's
//!   about 3–4 requests per DSE update instead of ~6, with ~8 s detection lag.
//! * expected trading day that DSE hasn't opened by 10:30 (unlisted holiday,
//!   emergency closure): a conditional request every 10 min until 14:15, so the
//!   document's `lastUpdated` stays fresh for the 15-minute staleness checks
//! * after being Open: every 60 s until DSE's closing time (a halt), then for
//!   15 more minutes to capture closing prices and the Closed status (`Closing`)
//! * hard stop at 14:45 whatever DSE says, so a stuck "Open" can't keep us polling

use chrono::{Datelike, Duration, FixedOffset, NaiveDate, NaiveDateTime, NaiveTime, Weekday};

pub const DHAKA_OFFSET_SECS: i32 = 6 * 3600;

pub fn dhaka() -> FixedOffset {
    FixedOffset::east_opt(DHAKA_OFFSET_SECS).expect("valid offset")
}

/// Current Dhaka wall-clock time.
pub fn dhaka_now() -> NaiveDateTime {
    chrono::Utc::now().with_timezone(&dhaka()).naive_local()
}

const fn hm(h: u32, m: u32) -> u32 {
    h * 60 + m
}

pub const WINDOW_START: u32 = hm(9, 45);
pub const WARMUP_END: u32 = hm(10, 30);
pub const HARD_STOP: u32 = hm(14, 45);
/// Used until DSE tells us its closing time for the day.
pub const DEFAULT_CLOSE: u32 = hm(14, 30);
pub const CLOSING_TAIL_MIN: u32 = 15;
pub const PROBE_TIMES: [u32; 11] = [
    hm(10, 0),
    hm(10, 5),
    hm(10, 15),
    hm(10, 30),
    hm(11, 0),
    hm(11, 30),
    hm(12, 0),
    hm(12, 30),
    hm(13, 0),
    hm(13, 30),
    hm(14, 0),
];
pub const WARMUP_INTERVAL_SECS: i64 = 60;
pub const CLOSING_INTERVAL_SECS: i64 = 60;
pub const FAST_MIN_SECS: u64 = 12;
pub const FAST_MAX_SECS: u64 = 18;
pub const QUIET_MIN_SECS: u64 = 80;
pub const QUIET_MAX_SECS: u64 = 90;
/// Expected trading day, not open by 10:30: poll this often until 14:15.
pub const CLOSED_WEEKDAY_PROBE_SECS: i64 = 600;
/// The trade route's own session clock (lib/utils/marketHours.ts): 10:00–14:15.
/// Inside it, price-failsafe-sync and /api/health treat a `lastUpdated` older
/// than 15 min as a dead feed, so we keep it fresh with heartbeats.
pub const MARKET_CLOCK_START: u32 = hm(10, 0);
pub const MARKET_CLOCK_END: u32 = hm(14, 15);

/// Random picks for one scheduling decision, chosen by the caller so the
/// schedule itself stays deterministic and testable.
#[derive(Debug, Clone, Copy)]
pub struct Jitter {
    /// Gap between polls while waiting for a change, `FAST_MIN_SECS..=FAST_MAX_SECS`.
    pub fast_secs: u64,
    /// Quiet time after a change before polling again, `QUIET_MIN_SECS..=QUIET_MAX_SECS`.
    pub quiet_secs: u64,
}

impl Jitter {
    pub fn random() -> Self {
        Self {
            fast_secs: rand::random_range(FAST_MIN_SECS..=FAST_MAX_SECS),
            quiet_secs: rand::random_range(QUIET_MIN_SECS..=QUIET_MAX_SECS),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Sleep,
    Warmup,
    Probe,
    Live,
    Closing,
}

impl Mode {
    pub fn as_str(self) -> &'static str {
        match self {
            Mode::Sleep => "sleep",
            Mode::Warmup => "warmup",
            Mode::Probe => "probe",
            Mode::Live => "live",
            Mode::Closing => "closing",
        }
    }
}

/// What we've learned about today from DSE. Reset at Dhaka midnight.
#[derive(Debug, Clone, PartialEq)]
pub struct DayState {
    pub date: NaiveDate,
    /// `session.tradingDay` from a fetch made today.
    pub trading_day: Option<bool>,
    /// Latest `session.isOpen` seen today.
    pub dse_open: Option<bool>,
    /// DSE reported Open at least once today.
    pub went_live: bool,
    /// DSE's closing time for today, minutes after midnight.
    pub close_minute: u32,
    /// When a poll last brought changed data (a fresh 200, not a 304).
    pub last_change: Option<NaiveDateTime>,
}

impl DayState {
    pub fn new(date: NaiveDate) -> Self {
        Self { date, trading_day: None, dse_open: None, went_live: false, close_minute: DEFAULT_CLOSE, last_change: None }
    }

    /// Records what a successful fetch said about the session.
    pub fn observe(&mut self, is_open: Option<bool>, trading_day: Option<bool>, closing_minute: Option<u32>) {
        if let Some(open) = is_open {
            self.dse_open = Some(open);
            self.went_live |= open;
        }
        if trading_day.is_some() {
            self.trading_day = trading_day;
        }
        if let Some(c) = closing_minute {
            self.close_minute = c;
        }
    }

    /// Must `lastUpdated` be kept fresh right now? Inside the trade route's
    /// session clock on a day that is (or turned into) a trading day.
    pub fn needs_heartbeat(&self, now: NaiveDateTime) -> bool {
        let m = minute_of(now);
        (MARKET_CLOCK_START..MARKET_CLOCK_END).contains(&m) && (self.expected_trading_day() || self.went_live)
    }

    pub fn expected_trading_day(&self) -> bool {
        self.trading_day.unwrap_or_else(|| {
            !matches!(self.date.weekday(), Weekday::Fri | Weekday::Sat)
        })
    }
}

fn at(date: NaiveDate, minute: u32) -> NaiveDateTime {
    date.and_time(NaiveTime::from_hms_opt(minute / 60, minute % 60, 0).expect("valid minute"))
}

fn minute_of(t: NaiveDateTime) -> u32 {
    use chrono::Timelike;
    t.hour() * 60 + t.minute()
}

fn next_day_start(now: NaiveDateTime) -> NaiveDateTime {
    at(now.date() + Duration::days(1), WINDOW_START)
}

/// Is `now` inside the window where a poll on startup is worthwhile?
pub fn in_active_window(now: NaiveDateTime) -> bool {
    let m = minute_of(now);
    (WINDOW_START..HARD_STOP).contains(&m)
}

/// The mode we're in and when the next request should go out.
pub fn next_poll(now: NaiveDateTime, day: &DayState, jitter: Jitter) -> (Mode, NaiveDateTime) {
    let m = minute_of(now);
    let sleep = (Mode::Sleep, next_day_start(now));

    if m >= HARD_STOP {
        return sleep;
    }
    if m < WINDOW_START {
        return (Mode::Sleep, at(now.date(), WINDOW_START));
    }
    if day.dse_open == Some(true) {
        let fast = Duration::seconds(jitter.fast_secs.clamp(FAST_MIN_SECS, FAST_MAX_SECS) as i64);
        let quiet = Duration::seconds(jitter.quiet_secs.clamp(QUIET_MIN_SECS, QUIET_MAX_SECS) as i64);
        let next = match day.last_change {
            // Still inside the quiet window after a change: DSE won't have new data yet.
            Some(changed) if changed + quiet > now + fast => changed + quiet,
            _ => now + fast,
        };
        return (Mode::Live, next);
    }
    if day.went_live {
        let tail_end = (day.close_minute + CLOSING_TAIL_MIN).min(HARD_STOP);
        if m < tail_end {
            return (Mode::Closing, now + Duration::seconds(CLOSING_INTERVAL_SECS));
        }
        return sleep;
    }
    if day.expected_trading_day() {
        if m < WARMUP_END {
            return (Mode::Warmup, now + Duration::seconds(WARMUP_INTERVAL_SECS));
        }
        // Should be trading but isn't: keep checking, and keep lastUpdated fresh.
        if m < MARKET_CLOCK_END {
            return (Mode::Probe, now + Duration::seconds(CLOSED_WEEKDAY_PROBE_SECS));
        }
        return sleep;
    }
    match PROBE_TIMES.iter().find(|&&p| p > m) {
        Some(&p) => (Mode::Probe, at(now.date(), p)),
        None => sleep,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // 2026-11-21 is a Saturday, 2026-11-22 a Sunday.
    fn t(date: (i32, u32, u32), h: u32, mi: u32) -> NaiveDateTime {
        NaiveDate::from_ymd_opt(date.0, date.1, date.2).unwrap().and_hms_opt(h, mi, 0).unwrap()
    }
    const SUN: (i32, u32, u32) = (2026, 11, 22);
    const SAT: (i32, u32, u32) = (2026, 11, 21);
    const J: Jitter = Jitter { fast_secs: 15, quiet_secs: 85 };

    fn day(d: (i32, u32, u32)) -> DayState {
        DayState::new(NaiveDate::from_ymd_opt(d.0, d.1, d.2).unwrap())
    }

    #[test]
    fn nothing_before_the_window_or_after_the_hard_stop() {
        let d = day(SUN);
        assert_eq!(next_poll(t(SUN, 3, 0), &d, J), (Mode::Sleep, t(SUN, 9, 45)));
        assert_eq!(next_poll(t(SUN, 14, 45), &d, J), (Mode::Sleep, t((2026, 11, 23), 9, 45)));
    }

    #[test]
    fn weekday_warms_up_every_minute_then_goes_live() {
        let mut d = day(SUN);
        assert_eq!(next_poll(t(SUN, 9, 45), &d, J), (Mode::Warmup, t(SUN, 9, 46)));
        d.observe(Some(true), Some(true), Some(hm(14, 0)));
        let (mode, next) = next_poll(t(SUN, 10, 0), &d, J);
        assert_eq!(mode, Mode::Live);
        assert_eq!(next, t(SUN, 10, 0) + Duration::seconds(15));
    }

    #[test]
    fn live_waits_out_the_quiet_window_after_a_change() {
        let mut d = day(SUN);
        d.observe(Some(true), None, None);
        let changed = t(SUN, 11, 0);
        d.last_change = Some(changed);
        // Right after the change: next poll at change + 85 s, not in 15 s.
        assert_eq!(next_poll(changed, &d, J).1, changed + Duration::seconds(85));
        // Quiet window nearly over: the fast gap (never closer than 15 s).
        let late = changed + Duration::seconds(80);
        assert_eq!(next_poll(late, &d, J).1, late + Duration::seconds(15));
        // Past the window with no new data yet: keep polling every 15 s.
        let after = changed + Duration::seconds(100);
        assert_eq!(next_poll(after, &d, J).1, after + Duration::seconds(15));
    }

    #[test]
    fn jitter_is_clamped() {
        let mut d = day(SUN);
        d.observe(Some(true), None, None);
        let now = t(SUN, 11, 0);
        let lo = Jitter { fast_secs: 1, quiet_secs: 1 };
        let hi = Jitter { fast_secs: 99, quiet_secs: 999 };
        assert_eq!(next_poll(now, &d, lo).1, now + Duration::seconds(12));
        assert_eq!(next_poll(now, &d, hi).1, now + Duration::seconds(18));
        d.last_change = Some(now);
        assert_eq!(next_poll(now, &d, lo).1, now + Duration::seconds(80));
        assert_eq!(next_poll(now, &d, hi).1, now + Duration::seconds(90));
        for _ in 0..200 {
            let j = Jitter::random();
            assert!((FAST_MIN_SECS..=FAST_MAX_SECS).contains(&j.fast_secs));
            assert!((QUIET_MIN_SECS..=QUIET_MAX_SECS).contains(&j.quiet_secs));
        }
    }

    #[test]
    fn saturday_probes_and_catches_a_special_working_day() {
        let mut d = day(SAT);
        d.observe(Some(false), Some(false), None);
        assert_eq!(next_poll(t(SAT, 9, 45), &d, J), (Mode::Probe, t(SAT, 10, 0)));
        assert_eq!(next_poll(t(SAT, 10, 0), &d, J), (Mode::Probe, t(SAT, 10, 5)));
        assert_eq!(next_poll(t(SAT, 10, 30), &d, J), (Mode::Probe, t(SAT, 11, 0)));
        d.observe(Some(true), Some(true), None);
        assert_eq!(next_poll(t(SAT, 10, 5), &d, J).0, Mode::Live);
    }

    #[test]
    fn saturday_declared_trading_day_warms_up_like_a_weekday() {
        let mut d = day(SAT);
        d.observe(Some(false), Some(true), None);
        assert_eq!(next_poll(t(SAT, 9, 46), &d, J), (Mode::Warmup, t(SAT, 9, 47)));
    }

    #[test]
    fn closed_saturday_makes_about_a_dozen_requests() {
        let mut d = day(SAT);
        d.observe(Some(false), Some(false), None);
        let (mut now, mut polls) = (t(SAT, 9, 45), 1);
        loop {
            let (mode, next) = next_poll(now, &d, J);
            if mode == Mode::Sleep {
                break;
            }
            polls += 1;
            now = next;
        }
        assert_eq!(polls, 12, "09:45 + 11 probes");
    }

    #[test]
    fn weekday_dse_never_opens_probes_every_ten_minutes_until_1415() {
        // DSE says it is not a trading day (a listed holiday): sparse probes.
        let mut d = day(SUN);
        d.observe(Some(false), Some(false), None);
        assert_eq!(next_poll(t(SUN, 9, 45), &d, J), (Mode::Probe, t(SUN, 10, 0)));
        // Silent about tradingDay and never opens (unlisted closure): warmup to
        // 10:30, then every 10 min to 14:15 so lastUpdated never ages past 15 min.
        let mut d = day(SUN);
        d.observe(Some(false), None, None);
        assert_eq!(next_poll(t(SUN, 10, 29), &d, J).0, Mode::Warmup);
        assert_eq!(next_poll(t(SUN, 10, 30), &d, J), (Mode::Probe, t(SUN, 10, 40)));
        assert_eq!(next_poll(t(SUN, 14, 10), &d, J), (Mode::Probe, t(SUN, 14, 20)));
        assert_eq!(next_poll(t(SUN, 14, 15), &d, J), (Mode::Sleep, t((2026, 11, 23), 9, 45)));
    }

    #[test]
    fn halt_keeps_polling_until_close_then_tail_then_sleep() {
        let mut d = day(SUN);
        d.observe(Some(true), Some(true), Some(hm(14, 0)));
        d.observe(Some(false), None, None);
        assert_eq!(next_poll(t(SUN, 11, 0), &d, J), (Mode::Closing, t(SUN, 11, 1)));
        assert_eq!(next_poll(t(SUN, 14, 14), &d, J).0, Mode::Closing);
        assert_eq!(next_poll(t(SUN, 14, 15), &d, J).0, Mode::Sleep);
    }

    #[test]
    fn stuck_open_stops_at_the_hard_stop() {
        let mut d = day(SUN);
        d.observe(Some(true), None, None);
        assert_eq!(next_poll(t(SUN, 14, 44), &d, J).0, Mode::Live);
        assert_eq!(next_poll(t(SUN, 14, 45), &d, J).0, Mode::Sleep);
    }

    #[test]
    fn heartbeat_window_matches_the_trade_route_clock() {
        let d = day(SUN);
        assert!(!d.needs_heartbeat(t(SUN, 9, 59)));
        assert!(d.needs_heartbeat(t(SUN, 10, 0)));
        assert!(d.needs_heartbeat(t(SUN, 14, 14)));
        assert!(!d.needs_heartbeat(t(SUN, 14, 15)));
        // Weekend: no heartbeat unless DSE actually opened.
        let mut sat = day(SAT);
        assert!(!sat.needs_heartbeat(t(SAT, 11, 0)));
        sat.observe(Some(true), None, None);
        assert!(sat.needs_heartbeat(t(SAT, 11, 0)));
    }

    #[test]
    fn active_window_bounds() {
        assert!(!in_active_window(t(SUN, 9, 44)));
        assert!(in_active_window(t(SUN, 9, 45)));
        assert!(in_active_window(t(SUN, 14, 44)));
        assert!(!in_active_window(t(SUN, 14, 45)));
    }
}
