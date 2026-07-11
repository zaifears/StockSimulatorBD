'use client';
import { useState } from "react";

const DSECircuitBreakerPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoPrice, setDemoPrice] = useState(100);
  const [limit, setLimit] = useState(10);

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  const upper = +(demoPrice * (1 + limit / 100)).toFixed(2);
  const lower = +(demoPrice * (1 - limit / 100)).toFixed(2);

  const faqs = [
    {
      q: "DSE-তে Circuit Breaker কী?",
      a: "Circuit Breaker হলো একটি মূল্য সীমানির্ধারণী ব্যবস্থা, যা কোনো শেয়ারের দাম একটি নির্দিষ্ট সীমার বাইরে যেতে বাধা দেয়। DSE-তে সাধারণত প্রতিদিন একটি শেয়ারের দাম আগের দিনের Closing Price-এর ভিত্তিতে সর্বোচ্চ ±১০% পর্যন্ত পরিবর্তন হতে পারে।",
    },
    {
      q: "Upper Circuit মানে কী?",
      a: "Upper Circuit হলো শেয়ারের সর্বোচ্চ মূল্যসীমা — যে পর্যন্ত দাম বাড়তে পারে। DSE-তে এটি সাধারণত আগের দিনের Closing Price-এর +১০%। Upper Circuit Hit করলে শেয়ার আর কিনতে পারবেন না, কারণ কেউ সেই সর্বোচ্চ দামের বেশিতে বিক্রি করতে পারবেন না।",
    },
    {
      q: "Lower Circuit মানে কী?",
      a: "Lower Circuit হলো শেয়ারের সর্বনিম্ন মূল্যসীমা। DSE-তে এটি সাধারণত আগের দিনের Closing Price-এর -১০%। Lower Circuit Hit করলে শেয়ার আর বেচতে পারবেন না, কারণ কেউ সেই সর্বনিম্ন দামের কমে কিনতে রাজি হয় না।",
    },
    {
      q: "Circuit Breaker-এর সীমা কি সবসময় ১০%?",
      a: "সাধারণ পরিস্থিতিতে হ্যাঁ। তবে BSEC বিশেষ পরিস্থিতিতে (যেমন বাজারের ধারাবাহিক পতন বা বৈশ্বিক সংকট) সাময়িকভাবে এই সীমা পরিবর্তন করতে পারে। ২০২২ সালে রাশিয়া-ইউক্রেন যুদ্ধের সময় BSEC Lower Limit সাময়িকভাবে ২% পর্যন্ত নামিয়ে এনেছিল।",
    },
    {
      q: "Circuit Breaker কি নতুন তালিকাভুক্ত কোম্পানির জন্য আলাদা?",
      a: "হ্যাঁ। নতুন তালিকাভুক্ত কোম্পানির জন্য প্রথম ২ কার্যদিবস Circuit Breaker খোলা (Open) থাকে — অর্থাৎ দাম যতটা ইচ্ছে উঠতে বা নামতে পারে। এই নিয়ম BSEC কর্তৃক অনুমোদিত।",
    },
    {
      q: "Z ক্যাটাগরি শেয়ারে Circuit Breaker কীভাবে কাজ করে?",
      a: "Z ক্যাটাগরির শেয়ারেও একই Circuit Breaker নিয়ম প্রযোজ্য। তবে এই ক্যাটাগরির শেয়ারের Settlement সময় T+4, ফলে ক্রেতার BO Account-এ শেয়ার আসতে বেশি সময় লাগে।",
    },
  ];

  const misconceptions = [
    {
      myth: "Circuit Breaker মানে বাজার বন্ধ হয়ে যায়",
      fact:
        "না। একটি শেয়ারের Circuit Hit মানে শুধু সেই নির্দিষ্ট শেয়ারটির দাম সেই দিনের জন্য সীমিত হয়ে যায়। বাকি সব শেয়ারের ট্রেড স্বাভাবিকভাবেই চলতে থাকে।",
    },
    {
      myth: "Upper Circuit-এ কেনা যায়, শুধু বেচা যায় না",
      fact:
        "বিপরীত। Upper Circuit-এ শেয়ার বেচতে পারবেন (সেই সর্বোচ্চ দামে), কিন্তু নতুন কেউ সেই দামে কিনতে আগ্রহী না হলে শেয়ার বিক্রি হবে না। ক্রেতার অভাবে অর্ডার পেন্ডিং থাকে।",
    },
    {
      myth: "Circuit Breaker শুধু ছোট কোম্পানির জন্য",
      fact:
        "DSE-তে সব তালিকাভুক্ত কোম্পানির জন্যই Circuit Breaker প্রযোজ্য, ছোট বা বড় নির্বিশেষে। Blue-chip থেকে শুরু করে Z ক্যাটাগরি — সবার জন্য।",
    },
    {
      myth: "Circuit Hit করলে আগের দিনের দামে ফেরত যায়",
      fact:
        "না। Circuit Hit মানে দাম সীমিত হয়েছে, আগের দিনের দামে ফেরত যায়নি। পরের দিন নতুন করে সেই দিনের Closing Price-এর ভিত্তিতে নতুন Circuit সীমা নির্ধারণ হয়।",
    },
  ];

  return (
    <article
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: "#1E293B", lineHeight: 1.75, paddingTop: "96px" }}
    >
      {/* Back button */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px 32px" }}>
        <a href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#E11D48", textDecoration: "none" }}>
          {"← Back to Blog"}
        </a>
      </div>
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "What is a Circuit Breaker in DSE? Upper & Lower Circuit Explained",
            description:
              "DSE-এর Circuit Breaker কী, Upper Circuit ও Lower Circuit কীভাবে কাজ করে, কেন শেয়ারের দাম নির্দিষ্ট সীমার বাইরে যেতে পারে না — সহজ ভাষায় জানুন।",
            dateModified: new Date().toISOString().split("T")[0],
            mainEntityOfPage: "/blog/dse-circuit-breaker",
            author: { "@type": "Organization", name: "StockSimulatorBD" },
          }),
        }}
      />

      {/* ── HERO ── */}
      <header
        style={{
          background: "linear-gradient(135deg, #1A0505 0%, #4C0519 50%, #1A0505 100%)",
          color: "#fff",
          padding: "64px 40px 48px",
          borderRadius: "16px",
          marginBottom: "48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* decorative circuit lines */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "280px",
            height: "280px",
            background:
              "radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#FCA5A5",
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
              color: "#FEF2F2",
            }}
          >
            What is a Circuit Breaker in DSE?
            <br />
            <span style={{ color: "#FCA5A5", fontSize: "80%" }}>
              Upper &amp; Lower Circuit Explained
            </span>
          </h1>
          <p style={{ fontSize: "17px", color: "#FCA5A5", maxWidth: "600px", opacity: 0.85 }}>
            DSE-তে কেন শেয়ারের দাম হঠাৎ থেমে যায়? সার্কিট ব্রেকার কীভাবে
            বিনিয়োগকারীকে রক্ষা করে — সহজ ভাষায় বুঝুন।
          </p>
          <p
            style={{
              marginTop: "24px",
              fontSize: "13px",
              color: "#FDA4AF",
              opacity: 0.7,
            }}
          >
            সর্বশেষ আপডেট:{" "}
            <strong style={{ opacity: 1 }}>
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
              style={{ color: "#FCA5A5" }}
            >
              DSE (Official)
            </a>
            ,{" "}
            <a
              href="https://www.sec.gov.bd"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#FCA5A5" }}
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
            background: "#FFF1F2",
            border: "1px solid #FECDD3",
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
              color: "#F43F5E",
              marginBottom: "16px",
            }}
          >
            সূচিপত্র
          </p>
          {[
            ["#what-is", "Circuit Breaker কী?"],
            ["#why-used", "কেন ব্যবহার করা হয়?"],
            ["#upper-circuit", "Upper Circuit"],
            ["#lower-circuit", "Lower Circuit"],
            ["#how-calculated", "Price Limit কীভাবে নির্ধারণ হয়?"],
            ["#real-example", "বাস্তব উদাহরণ"],
            ["#what-happens", "Circuit Hit করলে কী হয়?"],
            ["#misconceptions", "Common Misconceptions"],
            ["#faq", "FAQs"],
            ["#practice", "Practice Risk-Free"],
          ].map(([href, label]) => (
            <div key={href} style={{ marginBottom: "8px" }}>
              <a
                href={href}
                style={{
                  color: "#E11D48",
                  textDecoration: "none",
                  fontSize: "15px",
                }}
              >
                → {label}
              </a>
            </div>
          ))}
        </nav>

        {/* ── WHAT IS ── */}
        <section id="what-is" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #E11D48",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Circuit Breaker কী?
          </h2>
          <p style={{ fontSize: "17px", marginBottom: "16px" }}>
            <strong>Circuit Breaker (সার্কিট ব্রেকার)</strong> হলো ঢাকা স্টক
            এক্সচেঞ্জের (DSE) একটি স্বয়ংক্রিয় মূল্য-নিয়ন্ত্রণ ব্যবস্থা,
            যা কোনো শেয়ারের দামকে একটি নির্দিষ্ট সীমার বাইরে যেতে দেয় না।
          </p>
          <p style={{ fontSize: "17px", marginBottom: "16px" }}>
            সহজ ভাষায়: বৈদ্যুতিক সার্কিট ব্রেকার যেমন অতিরিক্ত ভোল্টেজে
            বিদ্যুৎ সংযোগ বিচ্ছিন্ন করে দেয়, শেয়ার বাজারের Circuit
            Breaker-ও তেমনি অস্বাভাবিক দাম-পরিবর্তনে একটি "সীমা" টেনে দেয়।
          </p>

          {/* Visual diagram */}
          <div
            style={{
              background: "#0F172A",
              borderRadius: "14px",
              padding: "32px",
              marginBottom: "24px",
            }}
            aria-label="DSE Circuit Breaker Diagram"
          >
            <p
              style={{
                color: "#94A3B8",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "28px",
                textAlign: "center",
              }}
            >
              Circuit Breaker — দামের সীমানা
            </p>

            {[
              { label: "Upper Circuit (+10%)", color: "#10B981", icon: "▲", side: "উপরে" },
              { label: "Closing Price (গতকাল)", color: "#94A3B8", icon: "●", side: "Base Price" },
              { label: "Lower Circuit (−10%)", color: "#EF4444", icon: "▼", side: "নিচে" },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "16px 20px",
                  background: i === 1 ? "#1E293B" : "transparent",
                  borderRadius: i === 1 ? "8px" : "0",
                  marginBottom: "8px",
                  borderLeft: `4px solid ${row.color}`,
                }}
              >
                <span style={{ fontSize: "20px", color: row.color }}>{row.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: "#F1F5F9", fontWeight: 700, fontSize: "15px" }}>
                    {row.label}
                  </p>
                  <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
                    {row.side}
                  </p>
                </div>
                <span
                  style={{
                    background: row.color + "22",
                    color: row.color,
                    borderRadius: "6px",
                    padding: "4px 12px",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {i === 0 ? "সর্বোচ্চ সীমা" : i === 1 ? "শুরুর দাম" : "সর্বনিম্ন সীমা"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHY USED ── */}
        <section id="why-used" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #E11D48",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            কেন Circuit Breaker ব্যবহার করা হয়?
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "24px" }}>
            শেয়ার বাজারে কখনো কখনো Panic Selling বা অতি-উৎসাহী কেনাকাটার
            কারণে দাম অস্বাভাবিকভাবে ওঠানামা করে। Circuit Breaker এই
            অস্থিরতা নিয়ন্ত্রণ করে:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              { icon: "🛡️", title: "বিনিয়োগকারী সুরক্ষা", desc: "হঠাৎ বড় ক্ষতি থেকে সাধারণ বিনিয়োগকারীদের রক্ষা করে।" },
              { icon: "⚖️", title: "বাজারের স্থিতিশীলতা", desc: "Panic-driven লেনদেন কমিয়ে বাজারকে স্থিতিশীল রাখে।" },
              { icon: "⏸️", title: "চিন্তার সময়", desc: 'দাম "Freeze" হলে বিনিয়োগকারীরা ঠান্ডা মাথায় সিদ্ধান্ত নেওয়ার সুযোগ পান।' },
              { icon: "🤖", title: "ম্যানিপুলেশন রোধ", desc: "কৃত্রিমভাবে দাম বাড়ানো বা নামানোর চেষ্টা কঠিন হয়ে পড়ে।" },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  background: "#FFF1F2",
                  border: "1px solid #FECDD3",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <p style={{ fontSize: "24px", margin: "0 0 10px" }}>{card.icon}</p>
                <p style={{ fontWeight: 700, fontSize: "15px", color: "#9F1239", margin: "0 0 6px" }}>
                  {card.title}
                </p>
                <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── UPPER CIRCUIT ── */}
        <section id="upper-circuit" style={{ marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #10B981",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Upper Circuit (উচ্চ সীমা)
          </h2>
          <div
            style={{
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: "12px",
              padding: "24px 28px",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ color: "#059669", fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>
              ▲ Upper Circuit কী?
            </h3>
            <p style={{ fontSize: "16px", color: "#065F46", margin: 0 }}>
              Upper Circuit হলো কোনো শেয়ারের দাম একটি ট্রেডিং দিনে{" "}
              <strong>সর্বোচ্চ যতটুকু বাড়তে পারে</strong> তার সীমা। DSE-তে
              এটি সাধারণত আগের দিনের Closing Price-এর{" "}
              <strong>+১০%</strong>। দাম এই সীমায় পৌঁছানোর পর আর বাড়তে
              পারে না।
            </p>
          </div>
          <p style={{ fontSize: "16px" }}>
            উদাহরণ: আগের দিন একটি শেয়ারের Closing Price ছিল ১০০ টাকা।
            পরদিন সর্বোচ্চ ১১০ টাকা পর্যন্ত দাম উঠতে পারবে (১০% বৃদ্ধি)। ১১০
            টাকায় Upper Circuit Hit করলে ওই দিন আর কোনো ক্রেতা বেশি দামে
            কিনতে পারবেন না।
          </p>
        </section>

        {/* ── LOWER CIRCUIT ── */}
        <section id="lower-circuit" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #EF4444",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Lower Circuit (নিম্ন সীমা)
          </h2>
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "12px",
              padding: "24px 28px",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ color: "#DC2626", fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>
              ▼ Lower Circuit কী?
            </h3>
            <p style={{ fontSize: "16px", color: "#7F1D1D", margin: 0 }}>
              Lower Circuit হলো কোনো শেয়ারের দাম একটি ট্রেডিং দিনে{" "}
              <strong>সর্বনিম্ন যতটুকু কমতে পারে</strong> তার সীমা। DSE-তে
              এটি সাধারণত আগের দিনের Closing Price-এর{" "}
              <strong>−১০%</strong>। দাম এই সীমায় নামার পর আর কমতে পারে না।
            </p>
          </div>
          <p style={{ fontSize: "16px" }}>
            উদাহরণ: আগের দিন Closing Price ছিল ১০০ টাকা। পরদিন সর্বনিম্ন
            ৯০ টাকা পর্যন্ত দাম নামতে পারবে (১০% হ্রাস)। ৯০ টাকায় Lower
            Circuit Hit করলে ওই দিন আর কোনো বিক্রেতা কম দামে বেচতে পারবেন না।
          </p>
        </section>

        {/* ── HOW CALCULATED ── */}
        <section id="how-calculated" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #E11D48",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Price Limit কীভাবে নির্ধারণ হয়?
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "24px" }}>
            DSE-তে Circuit Breaker নির্ধারণের ভিত্তি হলো{" "}
            <strong>আগের দিনের Closing Price</strong> (Base Price)।
            সাধারণ নিয়মে:
          </p>
          <div
            style={{
              background: "#1E293B",
              borderRadius: "12px",
              padding: "28px 32px",
              marginBottom: "24px",
              fontFamily: "monospace",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#94A3B8", fontSize: "13px" }}>Upper Circuit</span>
              <p style={{ color: "#34D399", fontSize: "18px", fontWeight: 700, margin: "4px 0 0" }}>
                = Closing Price × 1.10 (অর্থাৎ +১০%)
              </p>
            </div>
            <div>
              <span style={{ color: "#94A3B8", fontSize: "13px" }}>Lower Circuit</span>
              <p style={{ color: "#F87171", fontSize: "18px", fontWeight: 700, margin: "4px 0 0" }}>
                = Closing Price × 0.90 (অর্থাৎ −১০%)
              </p>
            </div>
          </div>

          {/* Interactive Calculator */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "28px 32px",
            }}
          >
            <h3
              style={{
                fontSize: "17px",
                fontWeight: 700,
                marginBottom: "20px",
                color: "#1E293B",
              }}
            >
              🧮 Circuit Breaker ক্যালকুলেটর
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#64748B",
                    marginBottom: "8px",
                  }}
                >
                  আগের দিনের Closing Price (৳)
                </label>
                <input
                  type="number"
                  value={demoPrice}
                  min={1}
                  onChange={(e) => setDemoPrice(+e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1E293B",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#64748B",
                    marginBottom: "8px",
                  }}
                >
                  Circuit Limit (%)
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(+e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1E293B",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value={10}>±10% (সাধারণ)</option>
                  <option value={5}>±5% (বিশেষ পরিস্থিতি)</option>
                  <option value={2}>±2% (জরুরি পরিস্থিতি)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div
                style={{
                  background: "#ECFDF5",
                  border: "2px solid #10B981",
                  borderRadius: "10px",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#059669", fontSize: "13px", fontWeight: 700, margin: "0 0 4px" }}>
                  ▲ UPPER CIRCUIT
                </p>
                <p style={{ color: "#065F46", fontSize: "28px", fontWeight: 800, margin: 0 }}>
                  ৳{upper.toLocaleString()}
                </p>
                <p style={{ color: "#6EE7B7", fontSize: "13px", margin: "4px 0 0" }}>
                  +{limit}% বৃদ্ধি
                </p>
              </div>
              <div
                style={{
                  background: "#FEF2F2",
                  border: "2px solid #EF4444",
                  borderRadius: "10px",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#DC2626", fontSize: "13px", fontWeight: 700, margin: "0 0 4px" }}>
                  ▼ LOWER CIRCUIT
                </p>
                <p style={{ color: "#7F1D1D", fontSize: "28px", fontWeight: 800, margin: 0 }}>
                  ৳{lower.toLocaleString()}
                </p>
                <p style={{ color: "#FCA5A5", fontSize: "13px", margin: "4px 0 0" }}>
                  -{limit}% হ্রাস
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── REAL EXAMPLE ── */}
        <section id="real-example" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #E11D48",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            বাস্তব উদাহরণ
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "24px" }}>
            ধরুন, একটি কোম্পানি বড় মুনাফার ঘোষণা দিল। পরদিন সকালে বাজার
            খুলতেই ওই শেয়ারে ব্যাপক কেনার চাপ পড়ল:
          </p>

          <div
            style={{
              background: "#0F172A",
              borderRadius: "14px",
              padding: "28px",
            }}
            aria-label="DSE Upper Circuit Example"
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
                <thead>
                  <tr>
                    {["সময়", "পরিস্থিতি", "দাম", "অবস্থা"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          color: "#64748B",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          borderBottom: "1px solid #1E3A5F",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["গতকাল", "Closing", "৳১০০", { label: "Base Price", color: "#94A3B8" }],
                    ["আজ সকাল ১০:০০", "বাজার খুলল", "৳১০০", { label: "Normal", color: "#94A3B8" }],
                    ["১০:১৫ AM", "ব্যাপক কেনার চাপ", "৳১০৮", { label: "Rising", color: "#34D399" }],
                    ["১০:৩০ AM", "দাম সীমায় পৌঁছাল", "৳১১০", { label: "Upper Circuit ▲", color: "#10B981" }],
                    ["বাকি দিন", "Circuit Active", "৳১১০", { label: "Frozen", color: "#F59E0B" }],
                  ].map(([time, status, price, badge]: any, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1E293B" }}>
                      <td style={{ padding: "14px 16px", color: "#94A3B8", fontSize: "14px" }}>{time}</td>
                      <td style={{ padding: "14px 16px", color: "#CBD5E1", fontSize: "14px" }}>{status}</td>
                      <td style={{ padding: "14px 16px", color: "#F1F5F9", fontWeight: 700, fontSize: "15px" }}>{price}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            background: badge.color + "22",
                            color: badge.color,
                            borderRadius: "6px",
                            padding: "3px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "#64748B", fontSize: "13px", marginTop: "16px", margin: "16px 0 0" }}>
              * Upper Circuit-এ Sell Orders থাকতে পারে কিন্তু নতুন Buy Orders সর্বোচ্চ দামে সীমিত।
            </p>
          </div>
        </section>

        {/* ── WHAT HAPPENS ── */}
        <section id="what-happens" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #E11D48",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Circuit Hit করলে কী হয়?
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {[
              {
                title: "Upper Circuit Hit করলে",
                color: "#10B981",
                bg: "#ECFDF5",
                border: "#A7F3D0",
                points: [
                  "শেয়ারের দাম সেদিনের জন্য সেই সীমায় আটকে যায়",
                  "নতুন Buy Order শুধুমাত্র ওই সর্বোচ্চ দামে দেওয়া যায়",
                  "Sell Order থাকলে কেনা-বেচা চলতে পারে",
                  "পরদিন নতুন Closing Price থেকে নতুন Circuit গণনা হয়",
                ],
              },
              {
                title: "Lower Circuit Hit করলে",
                color: "#EF4444",
                bg: "#FEF2F2",
                border: "#FECACA",
                points: [
                  "শেয়ারের দাম সেদিনের জন্য সেই সীমায় আটকে যায়",
                  "নতুন Sell Order শুধুমাত্র ওই সর্বনিম্ন দামে দেওয়া যায়",
                  "Buy Order থাকলে কেনা-বেচা চলতে পারে",
                  "Panic Selling থামিয়ে বাজারকে স্থিতিশীল করে",
                ],
              },
            ].map((block) => (
              <div
                key={block.title}
                style={{
                  background: block.bg,
                  border: `1px solid ${block.border}`,
                  borderRadius: "12px",
                  padding: "22px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: block.color,
                    marginBottom: "16px",
                  }}
                >
                  {block.title}
                </h3>
                {block.points.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: block.color, fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}.
                    </span>
                    <p style={{ margin: 0, fontSize: "14px", color: "#334155" }}>{p}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── MISCONCEPTIONS ── */}
        <section id="misconceptions" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #E11D48",
              paddingBottom: "10px",
              marginBottom: "24px",
            }}
          >
            Common Misconceptions — প্রচলিত ভুল ধারণা
          </h2>
          {misconceptions.map((item, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  background: "#FEF2F2",
                  padding: "16px 20px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "18px", flexShrink: 0 }}>❌</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "#991B1B",
                    }}
                  >
                    ভুল ধারণা:
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "15px", color: "#7F1D1D" }}>
                    {item.myth}
                  </p>
                </div>
              </div>
              <div
                style={{
                  background: "#F0FDF4",
                  padding: "16px 20px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "18px", flexShrink: 0 }}>✅</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "#166534",
                    }}
                  >
                    সঠিক তথ্য:
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "15px", color: "#15803D" }}>
                    {item.fact}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ── FAQ ── */}
        <section id="faq" style={{ marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 700,
              borderBottom: "3px solid #E11D48",
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
                  background: openFaq === i ? "#FFF1F2" : "#fff",
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
                    color: "#E11D48",
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
                    background: "#FFF1F2",
                    borderTop: "1px solid #FECDD3",
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
          id="practice"
          style={{
            background: "linear-gradient(135deg, #4C0519 0%, #1E293B 100%)",
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
              color: "#FCA5A5",
              marginBottom: "12px",
            }}
          >
            💡 অনুশীলন করুন ঝুঁকিমুক্তভাবে
          </p>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#FEF2F2",
              marginBottom: "14px",
            }}
          >
            Circuit Breaker বাস্তবে দেখুন — কোনো ঝুঁকি ছাড়াই
          </h3>
          <p
            style={{
              color: "#FDA4AF",
              fontSize: "15px",
              maxWidth: "520px",
              margin: "0 auto 24px",
            }}
          >
            Upper ও Lower Circuit, Settlement এবং অর্ডার কীভাবে কাজ করে তা
            বাস্তব DSE ডেটার ভিত্তিতে StockSimulatorBD-তে ভার্চুয়াল টাকায়
            অনুশীলন করুন। কোনো আর্থিক ঝুঁকি নেই।
          </p>
          <a
            href="/simulator"
            style={{
              display: "inline-block",
              background: "#E11D48",
              color: "#fff",
              padding: "14px 32px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            বিনামূল্যে Paper Trading শুরু করুন →
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
            এই নিবন্ধের Circuit Breaker সংক্রান্ত সকল তথ্য নিচের অফিসিয়াল
            নিয়ন্ত্রক উৎস থেকে যাচাই করা হয়েছে:
          </p>
          {[
            {
              name: "Bangladesh Securities and Exchange Commission (BSEC)",
              url: "https://www.sec.gov.bd",
              desc: "বাংলাদেশের শেয়ার বাজারের প্রধান নিয়ন্ত্রক সংস্থা — Circuit Breaker নীতি ও সীমা নির্ধারণের একমাত্র অফিসিয়াল কর্তৃপক্ষ",
            },
            {
              name: "Dhaka Stock Exchange (DSE)",
              url: "https://www.dsebd.org",
              desc: "DSE-এর অফিসিয়াল ওয়েবসাইট — প্রতিটি শেয়ারের বর্তমান Circuit Limit ও Base Price দেখার প্রাথমিক উৎস",
            },
            {
              name: "Central Depository Bangladesh Ltd (CDBL)",
              url: "https://www.cdbl.com.bd",
              desc: "বাংলাদেশের একমাত্র সিকিউরিটিজ ডিপোজিটরি — Settlement ও BO Account-এর অফিসিয়াল কর্তৃপক্ষ",
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
              <span style={{ color: "#E11D48", fontSize: "18px", marginTop: "2px" }}>🔗</span>
              <div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#9F1239",
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

export default DSECircuitBreakerPage;