'use client';
import { useState } from "react";

const DSETradingHoursPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  const sessions = [
    {
      id: "pre-opening",
      label: "Pre-Opening Session",
      time: "9:45 AM – 10:00 AM",
      color: "#F59E0B",
      bg: "#FFFBEB",
      border: "#FDE68A",
      desc: "অর্ডার দেওয়া যায়, কিন্তু কোনো ট্রেড সম্পন্ন হয় না। সিস্টেম সর্বোচ্চ অর্ডার ম্যাচ করার জন্য একটি Opening Price নির্ধারণ করে।",
    },
    {
      id: "continuous-trading",
      label: "Continuous Trading",
      time: "10:00 AM – 2:20 PM",
      color: "#10B981",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      desc: "মূল ট্রেডিং সেশন। Price-Time Priority অনুযায়ী অর্ডার ম্যাচ হয় এবং লেনদেন তাৎক্ষণিকভাবে সম্পন্ন হয়।",
    },
    {
      id: "post-closing",
      label: "Post-Closing Session",
      time: "2:20 PM – 2:30 PM",
      color: "#6366F1",
      bg: "#EEF2FF",
      border: "#C7D2FE",
      desc: "Closing price নির্ধারিত হয়। শেষ ৩০ মিনিটের weighted average price-এর ভিত্তিতে Closing Price গণনা করা হয়।",
    },
  ];

  const holidays = [
    { name: "Shab-e-Barat", type: "ধর্মীয়" },
    { name: "International Mother Language Day (21 February)", type: "জাতীয়" },
    { name: "Independence Day (26 March)", type: "জাতীয়" },
    { name: "Bangla New Year / Pahela Baishakh (14 April)", type: "সাংস্কৃতিক" },
    { name: "Eid-ul-Fitr (৩–৫ দিন)", type: "ধর্মীয়" },
    { name: "May Day (1 May)", type: "জাতীয়" },
    { name: "Buddha Purnima", type: "ধর্মীয়" },
    { name: "Eid-ul-Adha (৩–৫ দিন)", type: "ধর্মীয়" },
    { name: "Janmashtami", type: "ধর্মীয়" },
    { name: "National Mourning Day (15 August)", type: "জাতীয়" },
    { name: "Eid-e-Milad-un-Nabi (Pbuh)", type: "ধর্মীয়" },
    { name: "Durga Puja", type: "ধর্মীয়" },
    { name: "Victory Day (16 December)", type: "জাতীয়" },
    { name: "Christmas Day (25 December)", type: "ধর্মীয়" },
  ];

  const faqs = [
    {
      q: "DSE-এর ট্রেডিং সময় কখন?",
      a: "DSE রবিবার থেকে বৃহস্পতিবার সকাল ১০:০০ AM থেকে বিকাল ২:২০ PM (BST) পর্যন্ত খোলা থাকে। Pre-opening শুরু হয় ৯:৪৫ AM থেকে এবং Post-closing সেশন চলে ২:৩০ PM পর্যন্ত।",
    },
    {
      q: "DSE কি শুক্রবার ও শনিবার ট্রেড হয়?",
      a: "না। বাংলাদেশের সরকারি সাপ্তাহিক ছুটির সাথে সামঞ্জস্য রেখে DSE শুক্রবার ও শনিবার বন্ধ থাকে। ট্রেডিং হয় শুধুমাত্র রবিবার থেকে বৃহস্পতিবার।",
    },
    {
      q: "T+2 Settlement মানে কী?",
      a: "T+2 মানে হলো Trade Date + 2 Working Days। অর্থাৎ রবিবার কেনা শেয়ার মঙ্গলবার আপনার BO Account-এ জমা হবে এবং বিক্রেতা মঙ্গলবার অর্থ পাবেন।",
    },
    {
      q: "Settlement সম্পন্ন হতে কত সময় লাগে?",
      a: "A ও B ক্যাটাগরি শেয়ারের জন্য T+2 (২ কার্যদিবস)। Z ক্যাটাগরি শেয়ারের জন্য T+4 (৪ কার্যদিবস) সময় লাগে।",
    },
    {
      q: "আমি কি শেয়ার কেনার পরদিনই বিক্রি করতে পারব?",
      a: "না। বর্তমান T+2 নিয়মে শেয়ার কেনার পর ২ কার্যদিবস অপেক্ষা করতে হবে। শেয়ার BO Account-এ জমা হওয়ার পরই কেবল বিক্রি করা সম্ভব।",
    },
    {
      q: "Pre-opening Session-এ কী হয়?",
      a: "Pre-opening Session (৯:৪৫–১০:০০ AM)-এ বিনিয়োগকারীরা Buy/Sell অর্ডার দিতে পারেন, কিন্তু কোনো ট্রেড এক্সিকিউট হয় না। এই সময়ের সর্বোচ্চ পরিমাণ ম্যাচ করা যায় এমন মূল্যই Opening Price হিসেবে নির্ধারিত হয়।",
    },
  ];

  return (
    <article
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: "#1E293B", lineHeight: 1.75, paddingTop: "96px" }}
    >
      {/* Back button */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px 32px" }}>
        <a href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#3B82F6", textDecoration: "none" }}>
          {"← Back to Blog"}
        </a>
      </div>
      {/* ── Schema-like meta block (rendered as hidden) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "DSE Trading Hours, Holidays & Settlement (T+2) Explained",
            description:
              "ঢাকা স্টক এক্সচেঞ্জ (DSE)-এর ট্রেডিং সময়, প্রি-ওপেনিং, ক্লোজিং, T+2 Settlement, সরকারি ছুটি এবং শেয়ার লেনদেনের সম্পূর্ণ নিয়ম।",
            dateModified: new Date().toISOString().split("T")[0],
            mainEntityOfPage: "/blog/dse-trading-hours-bangladesh",
            author: { "@type": "Organization", name: "StockSimulatorBD" },
          }),
        }}
      />

      {/* ── HERO ── */}
      <header
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
          color: "#fff",
          padding: "64px 40px 48px",
          borderRadius: "16px",
          marginBottom: "48px",
        }}
      >
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#38BDF8",
              marginBottom: "16px",
            }}
          >
            বাংলাদেশ ক্যাপিটাল মার্কেট গাইড
          </p>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: "20px",
              color: "#F1F5F9",
            }}
          >
            DSE Trading Hours, Holidays &amp; Settlement (T+2) Explained
          </h1>
          <p style={{ fontSize: "17px", color: "#94A3B8", maxWidth: "600px" }}>
            ঢাকা স্টক এক্সচেঞ্জের ট্রেডিং সময়, প্রতিটি সেশনের কাজ, T+2
            Settlement কীভাবে কাজ করে এবং সরকারি ছুটির তালিকা — সব কিছু
            সহজ ভাষায়।
          </p>
          <p
            style={{
              marginTop: "24px",
              fontSize: "13px",
              color: "#64748B",
            }}
          >
            সর্বশেষ আপডেট:{" "}
            <strong style={{ color: "#94A3B8" }}>
              {new Date().toLocaleDateString("bn-BD", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </strong>{" "}
            · তথ্যসূত্র:{" "}
            <a
              href="https://www.dsebd.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#38BDF8" }}
            >
              DSE (Official)
            </a>
            ,{" "}
            <a
              href="https://www.sec.gov.bd"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#38BDF8" }}
            >
              BSEC (Official)
            </a>
          </p>
        </div>
      </header>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px" }}>

        {/* ── TOC ── */}
        <nav
          aria-label="Table of contents"
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "28px 32px",
            marginBottom: "56px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#94A3B8",
              marginBottom: "16px",
            }}
          >
            সূচিপত্র
          </p>
          {[
            ["#dse-open", "DSE কখন খোলে?"],
            ["#trading-sessions", "ট্রেডিং সেশন"],
            ["#pre-opening", "Pre-Opening Session"],
            ["#continuous", "Continuous Trading"],
            ["#closing", "Closing Session"],
            ["#holidays", "DSE Holidays"],
            ["#settlement", "Settlement (T+2)"],
            ["#t2-explained", "T+2 বলতে কী বোঝায়?"],
            ["#settlement-example", "Settlement উদাহরণ"],
            ["#faq", "Frequently Asked Questions"],
          ].map(([href, label]) => (
            <div key={href} style={{ marginBottom: "8px" }}>
              <a
                href={href}
                style={{
                  color: "#3B82F6",
                  textDecoration: "none",
                  fontSize: "15px",
                }}
              >
                → {label}
              </a>
            </div>
          ))}
        </nav>

        {/* ── INTRO ── */}
        <section style={{ marginBottom: "56px" }}>
          <p style={{ fontSize: "17px" }}>
            শেয়ার বাজারে বিনিয়োগ করতে হলে প্রথমেই জানতে হবে — বাজার কখন
            খোলে, কখন বন্ধ হয়, এবং শেয়ার কেনার পর সেটা আপনার অ্যাকাউন্টে
            আসতে কতক্ষণ সময় লাগে। ঢাকা স্টক এক্সচেঞ্জ (DSE) বাংলাদেশের
            প্রধান এবং বৃহত্তম শেয়ার বাজার, যেখানে ৬০০-এরও বেশি কোম্পানির
            শেয়ার লেনদেন হয়।
          </p>
          <p style={{ fontSize: "17px", marginTop: "16px" }}>
            এই নিবন্ধে আমরা DSE-এর প্রতিটি ট্রেডিং সেশন, সরকারি ছুটির
            তালিকা এবং T+2 Settlement প্রক্রিয়া বিস্তারিতভাবে ব্যাখ্যা
            করব।
          </p>
        </section>

        {/* ── DSE OPEN ── */}
        <section id="dse-open" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #3B82F6",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            DSE কখন খোলে?
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "24px" }}>
            DSE <strong>রবিবার থেকে বৃহস্পতিবার</strong> প্রতি কার্যদিবস
            খোলা থাকে। শুক্রবার ও শনিবার সাপ্তাহিক ছুটি। বাংলাদেশ স্ট্যান্ডার্ড
            টাইম (BST / UTC+6) অনুযায়ী সময়সূচি নিচে দেওয়া হলো:
          </p>

          {/* Visual timeline */}
          <div
            style={{
              background: "#0F172A",
              borderRadius: "14px",
              padding: "32px",
              marginBottom: "32px",
              overflowX: "auto",
            }}
            aria-label="DSE Trading Hours Timeline"
          >
            <p
              style={{
                color: "#94A3B8",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "24px",
              }}
            >
              DSE ট্রেডিং সময়সূচি — রবিবার থেকে বৃহস্পতিবার (BST)
            </p>

            {/* Timeline bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0", minWidth: "480px" }}>
              {[
                { label: "9:45", width: "8%", color: "#F59E0B", title: "Pre-Opening" },
                { label: "10:00", width: "62%", color: "#10B981", title: "Continuous" },
                { label: "2:20", width: "8%", color: "#6366F1", title: "Post-Closing" },
                { label: "2:30", width: "22%", color: "#1E293B", title: "Closed" },
              ].map((seg) => (
                <div
                  key={seg.title}
                  style={{
                    width: seg.width,
                    background: seg.color,
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: seg.color === "#1E293B" ? "#475569" : "#fff",
                    borderRadius:
                      seg.title === "Pre-Opening"
                        ? "8px 0 0 8px"
                        : seg.title === "Closed"
                        ? "0 8px 8px 0"
                        : "0",
                  }}
                >
                  {seg.title}
                </div>
              ))}
            </div>

            {/* Time labels */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px",
                minWidth: "480px",
              }}
            >
              {["9:45 AM", "10:00 AM", "2:20 PM", "2:30 PM"].map((t) => (
                <span key={t} style={{ color: "#64748B", fontSize: "12px" }}>
                  {t}
                </span>
              ))}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                marginTop: "24px",
                flexWrap: "wrap",
              }}
            >
              {[
                { color: "#F59E0B", label: "Pre-Opening (15 min)" },
                { color: "#10B981", label: "Continuous Trading (4h 20m)" },
                { color: "#6366F1", label: "Post-Closing (10 min)" },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "3px",
                      background: l.color,
                    }}
                  />
                  <span style={{ color: "#94A3B8", fontSize: "13px" }}>
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick reference table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "15px",
              }}
            >
              <thead>
                <tr style={{ background: "#F1F5F9" }}>
                  {["সেশন", "সময় (BST)", "কী ঘটে"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 18px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#334155",
                        borderBottom: "2px solid #E2E8F0",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Pre-Opening Session", "9:45 AM – 10:00 AM", "অর্ডার গ্রহণ, কোনো ট্রেড নয়"],
                  ["Continuous Trading", "10:00 AM – 2:20 PM", "সাধারণ কেনা-বেচা"],
                  ["Post-Closing Session", "2:20 PM – 2:30 PM", "Closing Price নির্ধারণ"],
                  ["রমজান মাসে Continuous", "10:00 AM – 2:00 PM", "সংক্ষিপ্ত সময়সূচি"],
                  ["সাপ্তাহিক ছুটি", "শুক্রবার – শনিবার", "সম্পূর্ণ বন্ধ"],
                ].map((row, i) => (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC" }}
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        style={{
                          padding: "14px 18px",
                          borderBottom: "1px solid #E2E8F0",
                          color: j === 0 ? "#1E293B" : "#475569",
                          fontWeight: j === 0 ? 600 : 400,
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SESSIONS ── */}
        <section id="trading-sessions" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #3B82F6",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            DSE-এর Trading Session
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "28px" }}>
            DSE-এর প্রতিটি ট্রেডিং দিন তিনটি আলাদা সেশনে বিভক্ত। প্রতিটি
            সেশনের আলাদা উদ্দেশ্য এবং নিয়ম রয়েছে।
          </p>
          {sessions.map((s) => (
            <div
              key={s.id}
              id={s.id}
              style={{
                border: `1px solid ${s.border}`,
                background: s.bg,
                borderRadius: "12px",
                padding: "24px 28px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "10px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: s.color,
                    margin: 0,
                  }}
                >
                  {s.label}
                </h3>
                <span
                  style={{
                    background: s.color,
                    color: "#fff",
                    borderRadius: "20px",
                    padding: "4px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.time}
                </span>
              </div>
              <p style={{ margin: 0, color: "#334155", fontSize: "15px" }}>
                {s.desc}
              </p>
            </div>
          ))}
          <p
            id="closing"
            style={{
              fontSize: "15px",
              color: "#475569",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "16px 20px",
            }}
          >
            📌 <strong>Closing Price নির্ধারণ পদ্ধতি (DSE Official):</strong>{" "}
            ট্রেডিং শেষের আগের ৩০ মিনিটের সমস্ত ট্রেডের Weighted Average
            Price-ই Closing Price হিসেবে গণনা হয়। যদি সেই সময়ে কোনো ট্রেড না
            হয়, তাহলে সর্বশেষ ২০টি ট্রেডের গড় ব্যবহার করা হয়।
          </p>
        </section>

        {/* ── HOLIDAYS ── */}
        <section id="holidays" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #3B82F6",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            DSE Holidays — সরকারি ছুটির তালিকা
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "24px" }}>
            নিচের সরকারি ও ধর্মীয় ছুটির দিনগুলোতে DSE সম্পূর্ণ বন্ধ থাকে।
            সঠিক তারিখের জন্য সর্বদা{" "}
            <a
              href="https://www.dsebd.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#3B82F6" }}
            >
              DSE-এর অফিসিয়াল ওয়েবসাইট (dsebd.org)
            </a>{" "}
            দেখুন, কারণ চাঁদের হিসাবে ধর্মীয় ছুটির তারিখ পরিবর্তন হতে পারে।
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            {holidays.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >
                <span style={{ fontSize: "18px" }}>
                  {h.type === "জাতীয়" ? "🇧🇩" : h.type === "ধর্মীয়" ? "🕌" : "🎊"}
                </span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "#1E293B",
                    }}
                  >
                    {h.name}
                  </p>
                  <p
                    style={{ margin: 0, fontSize: "12px", color: "#94A3B8" }}
                  >
                    {h.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p
            style={{
              marginTop: "20px",
              fontSize: "14px",
              color: "#64748B",
              fontStyle: "italic",
            }}
          >
            * এই তালিকা প্রতিনিধিত্বমূলক। প্রতি বছর BSEC ও DSE কর্তৃপক্ষ
            চূড়ান্ত ছুটির তালিকা প্রকাশ করে।
          </p>
        </section>

        {/* ── SETTLEMENT ── */}
        <section id="settlement" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #3B82F6",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Settlement (সেটেলমেন্ট)
          </h2>

          <h3
            id="t2-explained"
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#1E293B",
              marginBottom: "16px",
            }}
          >
            T+2 বলতে কী বোঝায়?
          </h3>
          <p style={{ fontSize: "16px", marginBottom: "16px" }}>
            Settlement মানে হলো শেয়ার কেনা-বেচার পর সেই লেনদেন সম্পূর্ণ
            হওয়ার প্রক্রিয়া — অর্থাৎ ক্রেতার BO Account-এ শেয়ার জমা হওয়া
            এবং বিক্রেতার অ্যাকাউন্টে টাকা পৌঁছানো।
          </p>
          <p style={{ fontSize: "16px", marginBottom: "24px" }}>
            <strong>T</strong> = Trade Date (ট্রেডের দিন) এবং{" "}
            <strong>+2</strong> = ২টি কার্যদিবস। DSE বর্তমানে{" "}
            <strong>T+2</strong> সেটেলমেন্ট সাইকেলে পরিচালিত হয়। এই
            প্রক্রিয়ায় অংশ নেয় ব্রোকার, DSE, ব্যাংক এবং{" "}
            <a
              href="https://www.cdbl.com.bd"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#3B82F6" }}
            >
              CDBL (Central Depository Bangladesh Ltd)
            </a>
            ।
          </p>

          {/* Settlement flowchart */}
          <div
            id="settlement-example"
            style={{
              background: "#0F172A",
              borderRadius: "14px",
              padding: "32px",
              marginBottom: "32px",
            }}
            aria-label="Bangladesh Stock Settlement T+2 Flowchart"
          >
            <p
              style={{
                color: "#94A3B8",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "28px",
              }}
            >
              Settlement উদাহরণ — A ক্যাটাগরি শেয়ার
            </p>

            {[
              {
                day: "রবিবার",
                label: "T (Trade Day)",
                desc: 'আপনি ব্রোকারের মাধ্যমে শেয়ার কিনলেন। Trade সম্পন্ন হলো। এই মুহূর্তে শেয়ার এখনও আপনার BO Account-এ আসেনি।',
                color: "#3B82F6",
              },
              {
                day: "সোমবার",
                label: "T+1",
                desc: "DSE ব্রোকারের কাছ থেকে অর্থ গ্রহণ করে। CDBL শেয়ার হস্তান্তরের প্রক্রিয়া শুরু করে।",
                color: "#F59E0B",
              },
              {
                day: "মঙ্গলবার",
                label: "T+2 (Settlement সম্পন্ন)",
                desc: "শেয়ার আপনার BO Account-এ জমা হয়। বিক্রেতার অ্যাকাউন্টে টাকা পৌঁছায়। এখন থেকে আপনি শেয়ারটি বিক্রি করতে পারবেন।",
                color: "#10B981",
              },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "20px",
                  marginBottom: i < 2 ? "28px" : "0",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background: step.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#fff",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      style={{
                        width: "2px",
                        flex: 1,
                        background: "#1E3A5F",
                        marginTop: "6px",
                      }}
                    />
                  )}
                </div>
                <div style={{ paddingTop: "8px" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={{ color: "#F1F5F9", fontWeight: 700, fontSize: "16px" }}>
                      {step.day}
                    </span>
                    <span
                      style={{
                        background: step.color + "22",
                        color: step.color,
                        borderRadius: "6px",
                        padding: "2px 10px",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  <p style={{ color: "#94A3B8", fontSize: "14px", margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Category table */}
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 700,
              marginBottom: "16px",
              color: "#1E293B",
            }}
          >
            ক্যাটাগরি অনুযায়ী Settlement সময়
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "15px",
              }}
            >
              <thead>
                <tr style={{ background: "#EFF6FF" }}>
                  {["ক্যাটাগরি", "Settlement Cycle", "বিক্রির সুযোগ"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 18px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#1E40AF",
                        borderBottom: "2px solid #BFDBFE",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["A ও B ক্যাটাগরি", "T+2", "কেনার ২ কার্যদিবস পর"],
                  ["G ক্যাটাগরি (Govt Bond)", "T+1", "পরের কার্যদিবসে"],
                  ["N ক্যাটাগরি (নতুন তালিকা)", "T+2", "কেনার ২ কার্যদিবস পর"],
                  ["Z ক্যাটাগরি", "T+4", "কেনার ৪ কার্যদিবস পর"],
                ].map((row, i) => (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC" }}
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        style={{
                          padding: "13px 18px",
                          borderBottom: "1px solid #E2E8F0",
                          fontWeight: j === 0 ? 600 : 400,
                          color: j === 1 ? "#1D4ED8" : "#475569",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FDE68A",
              borderRadius: "10px",
              padding: "16px 20px",
              marginTop: "20px",
              fontSize: "14px",
              color: "#92400E",
            }}
          >
            ⚠️ <strong>গুরুত্বপূর্ণ:</strong> DSE T+2 থেকে T+1-এ যাওয়ার পরিকল্পনা করছে
            (সম্ভাব্য ডিসেম্বর ২০২৬)। সর্বশেষ আপডেটের জন্য{" "}
            <a
              href="https://www.dsebd.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#B45309" }}
            >
              dsebd.org
            </a>{" "}
            দেখুন।
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #3B82F6",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Frequently Asked Questions
          </h2>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                marginBottom: "12px",
                overflow: "hidden",
              }}
              itemScope
              itemType="https://schema.org/Question"
            >
              <button
                onClick={() => toggleFaq(i)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "18px 20px",
                  background: openFaq === i ? "#EFF6FF" : "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#1E293B",
                }}
                aria-expanded={openFaq === i}
              >
                <span itemProp="name">{faq.q}</span>
                <span
                  style={{
                    fontSize: "20px",
                    color: "#3B82F6",
                    flexShrink: 0,
                    transform: openFaq === i ? "rotate(45deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                >
                  +
                </span>
              </button>
              {openFaq === i && (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#F8FAFC",
                    borderTop: "1px solid #E2E8F0",
                    fontSize: "15px",
                    color: "#475569",
                    lineHeight: 1.7,
                  }}
                  itemScope
                  itemType="https://schema.org/Answer"
                  itemProp="acceptedAnswer"
                >
                  <span itemProp="text">{faq.a}</span>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* ── CTA ── */}
        <section
          style={{
            background: "linear-gradient(135deg, #1E3A5F 0%, #1E293B 100%)",
            borderRadius: "16px",
            padding: "36px 32px",
            marginBottom: "48px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#38BDF8",
              marginBottom: "12px",
            }}
          >
            💡 অনুশীলন করুন ঝুঁকিমুক্তভাবে
          </p>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#F1F5F9",
              marginBottom: "14px",
            }}
          >
            DSE ট্রেডিং বাস্তবে বুঝুন — কোনো আর্থিক ঝুঁকি ছাড়াই
          </h3>
          <p
            style={{
              color: "#94A3B8",
              fontSize: "15px",
              maxWidth: "520px",
              margin: "0 auto 24px",
            }}
          >
            DSE-এর ট্রেডিং সময়, Settlement বা অর্ডার কীভাবে কাজ করে তা
            বাস্তবে বোঝার সবচেয়ে ভালো উপায় হলো ভার্চুয়াল টাকায় অনুশীলন
            করা। StockSimulatorBD-তে বাস্তব DSE ডেটার ভিত্তিতে Paper Trading
            করুন।
          </p>
          <a
            href="/simulator"
            style={{
              display: "inline-block",
              background: "#3B82F6",
              color: "#fff",
              padding: "14px 32px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            বিনামূল্যে শুরু করুন →
          </a>
        </section>

        {/* ── OFFICIAL SOURCES ── */}
        <section
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "28px 32px",
            marginBottom: "48px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#334155",
              marginBottom: "16px",
            }}
          >
            📋 অফিসিয়াল তথ্যসূত্র
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#64748B",
              marginBottom: "16px",
            }}
          >
            এই নিবন্ধের সকল তথ্য নিচের অফিসিয়াল সরকারি ও নিয়ন্ত্রক উৎস
            থেকে যাচাই করা হয়েছে:
          </p>
          {[
            {
              name: "Dhaka Stock Exchange (DSE)",
              url: "https://www.dsebd.org",
              desc: "DSE-এর অফিসিয়াল ওয়েবসাইট — ট্রেডিং সময়, ছুটির তালিকা ও নিয়মকানুনের প্রাথমিক উৎস",
            },
            {
              name: "Bangladesh Securities and Exchange Commission (BSEC)",
              url: "https://www.sec.gov.bd",
              desc: "বাংলাদেশ সিকিউরিটিজ ও বিনিময় কমিশন — শেয়ার বাজারের নিয়ন্ত্রক সংস্থার অফিসিয়াল উৎস",
            },
            {
              name: "Central Depository Bangladesh Ltd (CDBL)",
              url: "https://www.cdbl.com.bd",
              desc: "বাংলাদেশের একমাত্র সিকিউরিটিজ ডিপোজিটরি — BO Account ও Settlement-এর অফিসিয়াল কর্তৃপক্ষ",
            },
          ].map((src) => (
            <div
              key={src.url}
              style={{
                display: "flex",
                gap: "14px",
                marginBottom: "14px",
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: "#3B82F6", fontSize: "18px", marginTop: "2px" }}>🔗</span>
              <div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#1D4ED8",
                    fontWeight: 600,
                    fontSize: "14px",
                    textDecoration: "none",
                  }}
                >
                  {src.name}
                </a>
                <p style={{ margin: "2px 0 0", color: "#64748B", fontSize: "13px" }}>
                  {src.desc}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </article>
  );
};

export default DSETradingHoursPage;