import { useState, useRef, useEffect } from "react";

// ─── STRIPE CONFIG ────────────────────────────────────────────────────────────
// Replace with your real Stripe publishable key when deploying
const STRIPE_PUBLISHABLE_KEY = "pk_test_YOUR_STRIPE_KEY_HERE";

// Stripe Payment Links — create these in your Stripe dashboard
// Dashboard → Payment Links → Create link for each price
const STRIPE_LINKS = {
  essential: "https://buy.stripe.com/YOUR_ESSENTIAL_LINK",
  premium:   "https://buy.stripe.com/YOUR_PREMIUM_LINK",
  legacy:    "https://buy.stripe.com/YOUR_LEGACY_LINK",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const OCCASIONS = [
  { id: "apology",       emoji: "🤍", label: "Apology to someone I hurt",         hint: "Something left unresolved for too long" },
  { id: "love",          emoji: "🌹", label: "Love letter or wedding speech",      hint: "The words that change everything" },
  { id: "child",         emoji: "🌱", label: "Letter to my child",                 hint: "What you want them to carry forward" },
  { id: "reconcile",     emoji: "🕊️", label: "Reconciliation after falling out",   hint: "Rebuilding what was broken" },
  { id: "gratitude",     emoji: "✨", label: "Thank you to a mentor or parent",    hint: "Gratitude that deserves more than words" },
  { id: "farewell",      emoji: "🖊️", label: "Farewell or retirement message",     hint: "A chapter ending with grace" },
  { id: "legacy",        emoji: "⏳", label: "Letter to be read after I'm gone",   hint: "Your voice, preserved" },
];

const TONES = [
  { id: "warm",          emoji: "🌿", label: "Warm & tender",       desc: "Gentle, caring, quietly loving" },
  { id: "raw",           emoji: "💧", label: "Raw & vulnerable",    desc: "Honest to the point of discomfort" },
  { id: "formal",        emoji: "🖊️", label: "Formal & dignified",  desc: "Measured, respectful, composed" },
  { id: "joyful",        emoji: "☀️", label: "Joyful & celebratory",desc: "Bright, life-affirming, full of hope" },
  { id: "apologetic",    emoji: "🤍", label: "Deeply apologetic",   desc: "Accountable, without defence" },
];

const PACKAGES = [
  {
    id: "essential",
    label: "Essential",
    price: "£15",
    pricePence: 1500,
    features: ["One beautifully crafted letter", "Instant PDF download", "Print-ready formatting"],
    accent: "#8a9e7a",
  },
  {
    id: "premium",
    label: "Premium",
    price: "£35",
    pricePence: 3500,
    features: ["Letter + two revision rounds", "Choice of 3 tone variants", "Email delivery to recipient"],
    accent: "#c9a96e",
    popular: true,
  },
  {
    id: "legacy",
    label: "Legacy Vault",
    price: "£49",
    pricePence: 4900,
    features: ["Letter + secure cloud storage", "Scheduled future delivery", "Annual renewal reminder"],
    accent: "#9b8eb5",
  },
];

// ─── EMOTIONAL INTAKE QUESTIONS ───────────────────────────────────────────────
// These are the questions that make the letter truly human
function getEmotionalQuestions(occasionId) {
  const shared = [
    {
      id: "memory",
      label: "Share one specific memory of them.",
      placeholder: "e.g. The Sunday we got lost driving to Brighton, and you laughed until you cried at my terrible sense of direction…",
      hint: "A single vivid moment says more than years of summary.",
    },
    {
      id: "unsaid",
      label: "What do you wish you'd said the last time you saw them?",
      placeholder: "e.g. That I was proud of them. That I was sorry. That I never stopped caring…",
      hint: "This is often the heart of the whole letter.",
    },
    {
      id: "surprise",
      label: "What would they be surprised to hear you admit?",
      placeholder: "e.g. That I was jealous of how easily they made friends. That losing them broke something in me I haven't fixed…",
      hint: "Vulnerability is what separates a letter from a message.",
    },
  ];

  const byOccasion = {
    apology: [
      { id: "whatyoudid", label: "What did you do — in plain, honest words?", placeholder: "No softening, no 'but'. Just what happened.", hint: "Accountability begins with clarity." },
      { id: "impact", label: "What do you think it cost them?", placeholder: "e.g. Their trust. Years of peace. The version of themselves that believed in people…", hint: "Name the real damage." },
    ],
    love: [
      { id: "moment", label: "Describe the moment you knew.", placeholder: "e.g. It was something small — the way they handed me a coffee without asking how I take it, because they already knew…", hint: "Love lives in specifics." },
      { id: "scared", label: "What about loving them scares you?", placeholder: "e.g. That I'll never deserve it. That I might fail them. That it's the best thing I've ever had…", hint: "Real love letters hold fear alongside joy." },
    ],
    child: [
      { id: "fear", label: "What do you most fear for them?", placeholder: "e.g. That the world will make them small. That they'll inherit my worst habits…", hint: "A parent's fears are a kind of love." },
      { id: "proud", label: "What about them already makes you proud — right now, as they are?", placeholder: "Not potential. Not future. What you see today.", hint: "Children carry these words forever." },
    ],
    reconcile: [
      { id: "yourpart", label: "What was your part in the falling out?", placeholder: "Be honest — even if they were also wrong.", hint: "Reconciliation requires owning your share." },
      { id: "missed", label: "What have you missed most about them?", placeholder: "e.g. The way they could make me laugh at myself. Their brutal honesty. Sunday dinners…", hint: "This is what makes reaching out worth it." },
    ],
    gratitude: [
      { id: "changed", label: "How did they change the direction of your life?", placeholder: "e.g. They were the first person who told me I was capable of more than I believed…", hint: "Gratitude lands when it's specific." },
      { id: "neverknow", label: "What do they probably not know they gave you?", placeholder: "e.g. The confidence to leave. The permission to rest. The belief that I mattered…", hint: "The hidden gifts are the most powerful to name." },
    ],
    farewell: [
      { id: "legacy", label: "What do you want to leave behind?", placeholder: "e.g. The way I tried to make people feel seen. The projects I believed in most…", hint: "A farewell is also a statement of identity." },
      { id: "advice", label: "One piece of advice for whoever comes after you.", placeholder: "e.g. Don't confuse busyness with purpose. Protect the people who tell you the truth…", hint: "Make it something only you could say." },
    ],
    legacy: [
      { id: "regret", label: "Is there anything you regret — that this letter might put right?", placeholder: "e.g. Not saying I loved them enough. Being too proud to apologise…", hint: "This letter exists so nothing is left unsaid." },
      { id: "future", label: "What do you hope the world looks like when they read this?", placeholder: "e.g. That they're settled. That they've forgiven themselves for things that weren't their fault…", hint: "Write to a version of them you may never meet." },
    ],
  };

  return [...(byOccasion[occasionId] || []), ...shared];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildPrompt(occasion, answers, tone, questions) {
  const qaBlock = questions.map(q => {
    const val = answers[q.id]?.trim();
    return val ? `${q.label}\n→ ${val}` : null;
  }).filter(Boolean).join("\n\n");

  return `You are a master letter writer — deeply human, emotionally intelligent, and literary without being flowery. Your letters have made people weep and reconcile and forgive.

Write a personal letter for someone with the following context:

OCCASION: ${occasion}
REQUESTED TONE: ${tone}

WHAT THEY SHARED:
${qaBlock}

INSTRUCTIONS:
- Write 4–6 paragraphs. No more.
- Use their own words and phrases back where powerful — if they wrote "too proud and too stupid", let that land in the letter.
- Name the specific memory they shared. Make it vivid.
- Do NOT resolve everything neatly. Real letters leave a door open, not a bow tied.
- Avoid clichés: no "words cannot express", no "at the end of the day", no "from the bottom of my heart".
- The silence between people is often more painful than the original wound — acknowledge it.
- Write in first person. Do not use placeholder names like [Name].
- Begin directly with the letter. No preamble, no title, no "Dear [X]:" — just the first sentence of the letter itself.
- Make it feel like it could only have been written by this specific person, about this specific person.`;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("landing"); 
  // landing → occasion → intake → tone → generating → result → package → checkout
  const [occasion, setOccasion] = useState(null);
  const [answers, setAnswers] = useState({});
  const [tone, setTone] = useState(null);
  const [letter, setLetter] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("premium");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const streamRef = useRef(null);

  const questions = occasion ? getEmotionalQuestions(occasion.id) : [];
  const answeredCount = questions.filter(q => answers[q.id]?.trim().length > 10).length;
  const canGenerate = answeredCount >= Math.min(3, questions.length);

  async function generateLetter() {
    setStep("generating");
    setLoading(true);
    setStreamedText("");

    const occ = OCCASIONS.find(o => o.id === occasion.id);
    const t = TONES.find(t => t.id === tone);
    const prompt = buildPrompt(occ?.label, answers, t?.label, questions);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("") 
        || "Something went wrong. Please try again.";

      setLetter(text);
      setLoading(false);
      setStep("result");

      // Stream text in with typewriter effect
      let i = 0;
      const interval = setInterval(() => {
        i += 4;
        setStreamedText(text.slice(0, i));
        if (i >= text.length) {
          setStreamedText(text);
          clearInterval(interval);
        }
      }, 14);
      streamRef.current = interval;
    } catch (e) {
      const errText = "We couldn't reach the letter writer right now. Please try again in a moment.";
      setLetter(errText);
      setStreamedText(errText);
      setLoading(false);
      setStep("result");
    }
  }

  function handleStripeCheckout() {
    const pkg = PACKAGES.find(p => p.id === selectedPackage);
    if (!pkg) return;
    // In production, this opens Stripe Payment Link
    // Replace STRIPE_LINKS[selectedPackage] with your real Stripe payment link
    window.open(STRIPE_LINKS[selectedPackage], "_blank");
    setStep("checkout");
  }

  function reset() {
    clearInterval(streamRef.current);
    setStep("landing");
    setOccasion(null);
    setAnswers({});
    setTone(null);
    setLetter("");
    setStreamedText("");
    setSelectedPackage("premium");
    setEmail("");
    setEmailSent(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        :root {
          --bg: #f5f0e8;
          --bg2: #ede7d9;
          --bg3: #e4ddd0;
          --text: #1a1510;
          --text2: #5a4f42;
          --text3: #8a7d6e;
          --gold: #9a7a3a;
          --gold-light: #c9a96e;
          --border: #d4c9b8;
          --font-display: 'Cormorant Garamond', Georgia, serif;
          --font-body: 'EB Garamond', Georgia, serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .fade-up-2 { animation: fadeUp 0.5s ease 0.1s both; }
        .fade-up-3 { animation: fadeUp 0.5s ease 0.2s both; }
        textarea { appearance: none; }
        textarea:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--bg2); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        .occasion-btn:hover { background: var(--bg3) !important; border-color: var(--gold) !important; }
        .tone-btn:hover { background: var(--bg3) !important; border-color: var(--gold) !important; }
        .pkg-btn:hover { box-shadow: 0 4px 24px rgba(154,122,58,0.12) !important; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "20px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--bg)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 300, color: "var(--gold)", fontStyle: "italic", letterSpacing: "0.05em" }}>Last Word</div>
          <div style={{ fontSize: "10px", letterSpacing: "0.3em", color: "var(--text3)", textTransform: "uppercase", marginTop: "1px" }}>Letters that matter</div>
        </button>

        {/* Progress dots */}
        {step !== "landing" && step !== "checkout" && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {["occasion","intake","tone","result","package"].map((s, i) => {
              const stepOrder = ["occasion","intake","tone","generating","result","package"];
              const current = stepOrder.indexOf(step);
              const mine = stepOrder.indexOf(s);
              return (
                <div key={s} style={{
                  width: current === mine ? "20px" : "7px",
                  height: "7px",
                  borderRadius: "4px",
                  background: current >= mine ? "var(--gold)" : "var(--border)",
                  transition: "all 0.3s ease",
                }} />
              );
            })}
          </div>
        )}
      </header>

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "50px 24px 100px" }}>

        {/* ══════════════════════════════════════════
            LANDING
        ══════════════════════════════════════════ */}
        {step === "landing" && (
          <div className="fade-up" style={{ textAlign: "center", paddingTop: "40px" }}>
            <div style={{ fontSize: "13px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "24px" }}>
              ✦ &nbsp; Premium letter writing &nbsp; ✦
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(42px, 8vw, 68px)",
              fontWeight: 300, lineHeight: 1.1, marginBottom: "24px", color: "var(--text)",
            }}>
              Some things are<br />
              <em style={{ color: "var(--gold)" }}>too important</em><br />
              to leave unsaid.
            </h1>
            <p className="fade-up-2" style={{ fontSize: "18px", color: "var(--text2)", lineHeight: 1.8, maxWidth: "480px", margin: "0 auto 48px", fontStyle: "italic" }}>
              We help you find the words for the conversations you've been putting off — apologies, love letters, reconciliations, legacies. Real letters. Written for real people.
            </p>

            <button className="fade-up-3" onClick={() => setStep("occasion")} style={{
              background: "var(--gold)",
              color: "#fff",
              border: "none",
              padding: "18px 48px",
              fontFamily: "var(--font-body)",
              fontSize: "16px",
              letterSpacing: "0.05em",
              cursor: "pointer",
              borderRadius: "3px",
              marginBottom: "48px",
            }}>
              Begin writing →
            </button>

            {/* Trust signals */}
            <div style={{ display: "flex", gap: "32px", justifyContent: "center", flexWrap: "wrap", marginTop: "16px" }}>
              {["Letters from £15","Private & confidential","Delivered to your inbox"].map(t => (
                <div key={t} style={{ fontSize: "13px", color: "var(--text3)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "var(--gold)" }}>✓</span> {t}
                </div>
              ))}
            </div>

            {/* Divider quote */}
            <div style={{ margin: "64px 0 0", padding: "40px 0", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontStyle: "italic", color: "var(--text2)", lineHeight: 1.7 }}>
                "The letter said everything I'd spent ten years<br />not knowing how to say."
              </p>
              <p style={{ fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text3)", marginTop: "16px" }}>— Premium customer, London</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 1: OCCASION
        ══════════════════════════════════════════ */}
        {step === "occasion" && (
          <div className="fade-up">
            <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "20px" }}>Step 1 of 4 — Occasion</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 300, marginBottom: "10px", lineHeight: 1.2 }}>
              What calls for<br /><em style={{ color: "var(--gold)" }}>this letter?</em>
            </h2>
            <p style={{ color: "var(--text3)", marginBottom: "36px", fontSize: "16px", fontStyle: "italic" }}>
              Choose the moment that needs words.
            </p>
            <div style={{ display: "grid", gap: "8px" }}>
              {OCCASIONS.map(o => (
                <button key={o.id} className="occasion-btn" onClick={() => { setOccasion(o); setAnswers({}); setStep("intake"); }}
                  style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    padding: "18px 22px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    borderRadius: "4px",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: "16px",
                  }}>
                  <span style={{ fontSize: "22px", flexShrink: 0 }}>{o.emoji}</span>
                  <div>
                    <div style={{ fontSize: "16px", marginBottom: "2px" }}>{o.label}</div>
                    <div style={{ fontSize: "13px", color: "var(--text3)", fontStyle: "italic" }}>{o.hint}</div>
                  </div>
                  <span style={{ marginLeft: "auto", color: "var(--gold)", fontSize: "18px" }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2: EMOTIONAL INTAKE
        ══════════════════════════════════════════ */}
        {step === "intake" && (
          <div className="fade-up">
            <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "20px" }}>Step 2 of 4 — Your story</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 300, marginBottom: "10px", lineHeight: 1.2 }}>
              Tell us what<br /><em style={{ color: "var(--gold)" }}>really happened.</em>
            </h2>
            <p style={{ color: "var(--text3)", marginBottom: "8px", fontSize: "16px", fontStyle: "italic" }}>
              Don't worry about phrasing. That's our job.
            </p>
            <p style={{ color: "var(--text3)", fontSize: "14px", marginBottom: "40px" }}>
              Answer at least {Math.min(3, questions.length)} questions. The more you share, the more the letter will feel like <em>you</em>.
            </p>

            <div style={{ display: "grid", gap: "28px", marginBottom: "40px" }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{ animation: `fadeUp 0.4s ease ${idx * 0.07}s both` }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--text)", fontStyle: "italic" }}>
                      {q.label}
                    </span>
                    {q.hint && (
                      <span style={{ display: "block", fontSize: "12px", color: "var(--gold)", letterSpacing: "0.05em", marginTop: "4px" }}>
                        ↳ {q.hint}
                      </span>
                    )}
                  </label>
                  <div style={{
                    background: "var(--bg2)",
                    border: `1px solid ${answers[q.id]?.trim().length > 10 ? "var(--gold)" : "var(--border)"}`,
                    borderRadius: "4px",
                    transition: "border-color 0.2s",
                  }}>
                    <textarea
                      value={answers[q.id] || ""}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={q.placeholder}
                      rows={3}
                      style={{
                        width: "100%", background: "transparent", border: "none",
                        color: "var(--text)", fontFamily: "var(--font-body)",
                        fontSize: "15px", lineHeight: 1.75, padding: "14px 16px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                  {answers[q.id]?.trim().length > 10 && (
                    <div style={{ fontSize: "12px", color: "var(--gold)", marginTop: "4px" }}>✓ noted</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "16px 20px", marginBottom: "32px" }}>
              <div style={{ fontSize: "13px", color: "var(--text3)", marginBottom: "6px" }}>Questions answered</div>
              <div style={{ display: "flex", gap: "6px" }}>
                {questions.map((q, i) => (
                  <div key={i} style={{
                    flex: 1, height: "4px", borderRadius: "2px",
                    background: answers[q.id]?.trim().length > 10 ? "var(--gold)" : "var(--border)",
                    transition: "background 0.3s",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "6px" }}>
                {answeredCount} of {questions.length} — {canGenerate ? "ready to continue" : `${Math.min(3, questions.length) - answeredCount} more needed`}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setStep("occasion")} style={ghostBtn}>← Back</button>
              <button onClick={() => canGenerate && setStep("tone")}
                style={{ ...primaryBtn, opacity: canGenerate ? 1 : 0.4, cursor: canGenerate ? "pointer" : "default" }}>
                Choose tone →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 3: TONE
        ══════════════════════════════════════════ */}
        {step === "tone" && (
          <div className="fade-up">
            <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "20px" }}>Step 3 of 4 — Voice</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 300, marginBottom: "10px", lineHeight: 1.2 }}>
              How should it<br /><em style={{ color: "var(--gold)" }}>feel to read?</em>
            </h2>
            <p style={{ color: "var(--text3)", marginBottom: "36px", fontSize: "16px", fontStyle: "italic" }}>
              Choose the emotional register for your letter.
            </p>
            <div style={{ display: "grid", gap: "10px", marginBottom: "36px" }}>
              {TONES.map(t => (
                <button key={t.id} className="tone-btn" onClick={() => setTone(t.id)}
                  style={{
                    background: tone === t.id ? "var(--bg3)" : "var(--bg2)",
                    border: `1px solid ${tone === t.id ? "var(--gold)" : "var(--border)"}`,
                    color: "var(--text)",
                    padding: "18px 22px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    borderRadius: "4px",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: "16px",
                  }}>
                  <span style={{ fontSize: "22px" }}>{t.emoji}</span>
                  <div>
                    <div style={{ fontSize: "16px", marginBottom: "2px" }}>{t.label}</div>
                    <div style={{ fontSize: "13px", color: "var(--text3)", fontStyle: "italic" }}>{t.desc}</div>
                  </div>
                  {tone === t.id && <span style={{ marginLeft: "auto", color: "var(--gold)", fontSize: "14px", letterSpacing: "0.1em" }}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setStep("intake")} style={ghostBtn}>← Back</button>
              <button onClick={() => tone && generateLetter()}
                style={{ ...primaryBtn, opacity: tone ? 1 : 0.4, cursor: tone ? "pointer" : "default" }}>
                Write my letter →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            GENERATING
        ══════════════════════════════════════════ */}
        {step === "generating" && (
          <div style={{ textAlign: "center", padding: "100px 0", animation: "fadeUp 0.5s ease" }}>
            <div style={{
              width: "56px", height: "56px", margin: "0 auto 32px",
              border: "1px solid var(--gold-light)", borderTop: "1px solid transparent",
              borderRadius: "50%", animation: "spin 1.4s linear infinite",
            }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: "28px", color: "var(--gold)", fontStyle: "italic", marginBottom: "16px" }}>
              Finding your words…
            </h2>
            <p style={{ color: "var(--text3)", lineHeight: 1.8, fontSize: "15px" }}>
              Reading everything you shared.<br />This takes just a moment.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            RESULT: THE LETTER
        ══════════════════════════════════════════ */}
        {step === "result" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--gold)" }}>Your letter</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            {/* The letter itself — styled as physical paper */}
            <div style={{
              background: "#fdfaf4",
              border: "1px solid #e8e0ce",
              borderRadius: "2px",
              padding: "clamp(28px, 6vw, 52px)",
              boxShadow: "0 2px 40px rgba(154,122,58,0.08), 0 1px 3px rgba(0,0,0,0.04)",
              marginBottom: "48px",
              position: "relative",
            }}>
              {/* Paper texture line */}
              <div style={{
                position: "absolute", top: 0, left: "52px", right: "52px", height: "1px",
                background: "linear-gradient(90deg, transparent, #e8e0ce 20%, #e8e0ce 80%, transparent)",
              }} />
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(15px, 2.5vw, 17px)",
                lineHeight: 2.0,
                color: "#2a1f10",
                whiteSpace: "pre-wrap",
              }}>
                {streamedText}
                <span style={{ borderRight: "1.5px solid var(--gold)", animation: "blink 1s step-end infinite" }}>&nbsp;</span>
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontStyle: "italic", color: "var(--text2)", marginBottom: "6px" }}>
                Ready to send it?
              </p>
              <p style={{ color: "var(--text3)", fontSize: "14px" }}>Choose a package to download or deliver your letter.</p>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
              <button onClick={() => setStep("tone")} style={ghostBtn}>← Revise tone</button>
              <button onClick={() => setStep("package")} style={primaryBtn}>Choose package →</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            PACKAGE SELECTION + STRIPE
        ══════════════════════════════════════════ */}
        {step === "package" && (
          <div className="fade-up">
            <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "20px" }}>Step 4 of 4 — Delivery</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 300, marginBottom: "10px", lineHeight: 1.2 }}>
              How would you like<br /><em style={{ color: "var(--gold)" }}>to keep this letter?</em>
            </h2>
            <p style={{ color: "var(--text3)", marginBottom: "36px", fontSize: "15px", fontStyle: "italic" }}>
              All packages include your complete letter, written for you alone.
            </p>

            <div style={{ display: "grid", gap: "14px", marginBottom: "36px" }}>
              {PACKAGES.map(pkg => (
                <button key={pkg.id} className="pkg-btn" onClick={() => setSelectedPackage(pkg.id)}
                  style={{
                    background: selectedPackage === pkg.id ? "#fdfaf4" : "var(--bg2)",
                    border: `2px solid ${selectedPackage === pkg.id ? pkg.accent : "var(--border)"}`,
                    color: "var(--text)",
                    padding: "22px 24px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    borderRadius: "4px",
                    transition: "all 0.2s",
                    position: "relative",
                  }}>
                  {pkg.popular && (
                    <div style={{
                      position: "absolute", top: "-1px", right: "16px",
                      background: pkg.accent,
                      color: "#fff",
                      fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
                      padding: "3px 10px", borderRadius: "0 0 4px 4px",
                    }}>Most chosen</div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 400 }}>{pkg.label}</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: pkg.accent, fontStyle: "italic" }}>{pkg.price}</div>
                  </div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {pkg.features.map(f => (
                      <div key={f} style={{ fontSize: "14px", color: "var(--text2)", display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ color: pkg.accent, fontSize: "12px" }}>✓</span> {f}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Email field */}
            <div style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", fontSize: "14px", color: "var(--text2)", marginBottom: "8px" }}>
                Your email — we'll send the letter here
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: "100%",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "14px 16px",
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Stripe CTA */}
            <button onClick={handleStripeCheckout}
              style={{
                width: "100%",
                background: "var(--gold)",
                color: "#fff",
                border: "none",
                padding: "18px",
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                letterSpacing: "0.03em",
                cursor: "pointer",
                borderRadius: "3px",
                marginBottom: "12px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Pay {PACKAGES.find(p => p.id === selectedPackage)?.price} securely with Stripe
            </button>

            <div style={{ textAlign: "center", display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
              {["256-bit encryption", "No card stored", "Instant delivery"].map(t => (
                <span key={t} style={{ fontSize: "12px", color: "var(--text3)" }}>🔒 {t}</span>
              ))}
            </div>

            <div style={{ marginTop: "24px" }}>
              <button onClick={() => setStep("result")} style={{ ...ghostBtn, width: "100%", textAlign: "center" }}>← Back to letter</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            CHECKOUT CONFIRMATION
        ══════════════════════════════════════════ */}
        {step === "checkout" && (
          <div style={{ textAlign: "center", padding: "60px 0", animation: "fadeUp 0.6s ease" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              border: "2px solid var(--gold)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 28px",
              fontFamily: "var(--font-display)", fontSize: "28px", color: "var(--gold)",
            }}>✦</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: "36px", color: "var(--gold)", fontStyle: "italic", marginBottom: "16px" }}>
              Your letter is ready.
            </h1>
            <p style={{ color: "var(--text2)", lineHeight: 1.8, maxWidth: "440px", margin: "0 auto 16px", fontSize: "16px", fontStyle: "italic" }}>
              Stripe is processing your payment. Once confirmed, your letter will arrive at your inbox within minutes.
            </p>
            <p style={{ color: "var(--text3)", fontSize: "14px", marginBottom: "48px" }}>
              Check your spam folder if it doesn't arrive within 5 minutes.
            </p>

            {/* Order summary */}
            <div style={{
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: "4px", padding: "24px 28px",
              maxWidth: "380px", margin: "0 auto 40px", textAlign: "left",
            }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text3)", marginBottom: "16px" }}>Order summary</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "var(--text2)" }}>{PACKAGES.find(p => p.id === selectedPackage)?.label}</span>
                <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: "18px" }}>{PACKAGES.find(p => p.id === selectedPackage)?.price}</span>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "13px", color: "var(--text3)", fontStyle: "italic" }}>
                {occasion?.label} · {TONES.find(t => t.id === tone)?.label}
              </div>
            </div>

            <button onClick={reset} style={primaryBtn}>Write another letter →</button>
          </div>
        )}

      </main>

      {/* ── FOOTER ── */}
      {step === "landing" && (
        <footer style={{ borderTop: "1px solid var(--border)", padding: "32px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontStyle: "italic", color: "var(--gold)", marginBottom: "8px" }}>Last Word</div>
          <p style={{ fontSize: "12px", color: "var(--text3)", letterSpacing: "0.1em" }}>
            Powered by Claude AI &nbsp;·&nbsp; Payments by Stripe &nbsp;·&nbsp; Private by design
          </p>
        </footer>
      )}
    </div>
  );
}

// ─── SHARED BUTTON STYLES ──────────────────────────────────────────────────────
const primaryBtn = {
  background: "var(--gold)",
  color: "#fff",
  border: "none",
  padding: "14px 32px",
  fontSize: "15px",
  fontFamily: "'EB Garamond', Georgia, serif",
  letterSpacing: "0.03em",
  cursor: "pointer",
  borderRadius: "3px",
  flex: 1,
};

const ghostBtn = {
  background: "transparent",
  color: "var(--text3)",
  border: "1px solid var(--border)",
  padding: "14px 24px",
  fontSize: "15px",
  fontFamily: "'EB Garamond', Georgia, serif",
  cursor: "pointer",
  borderRadius: "3px",
};
