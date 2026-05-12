import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchBrands, fetchProducts } from "../api";
import type { Product } from "../types";
import ProductCard from "./ProductCard";

const BRAND_ORDER = [
  "Nykaa Cosmetics",
  "Kay Beauty",
  "Lakme",
  "Maybelline New York",
  "Herbal Essences",
  "L'Oreal Paris",
  "NYX Professional Makeup",
  "Nykaa Naturals",
  "Nivea",
  "Olay",
  "Colorbar",
];

const SLIDES = [
  {
    bg:        "linear-gradient(135deg,#1A3028 0%,#2C5F3E 60%,#3A7D52 100%)",
    eyebrow:   "New Collection",
    headlineA: "Discover Your",
    headlineB: "Perfect Beauty",
    sub:       "AI-powered recommendations from verified reviews.",
    cta:       "Shop Now",
    ctaLink:   "/buyer",
    visual: [
      { bg: "#EDD8C8", emoji: "💄" },
      { bg: "#DCD0EC", emoji: "✨" },
      { bg: "#C8DCE8", emoji: "💧" },
      { bg: "#E8C8D0", emoji: "💋" },
    ],
  },
  {
    bg:        "linear-gradient(135deg,#2E1A2A 0%,#4A2E40 60%,#6B3A50 100%)",
    eyebrow:   "Kay Beauty",
    headlineA: "The Boldest",
    headlineB: "Looks Are Here",
    sub:       "Exclusive collection from top-rated products.",
    cta:       "Shop Kay Beauty",
    ctaLink:   "/buyer",
    bigEmoji:  "✨",
  },
  {
    bg:        "linear-gradient(135deg,#1A2E1A 0%,#2E4A2E 60%,#3A6030 100%)",
    eyebrow:   "Herbal Essences",
    headlineA: "Nature-Powered",
    headlineB: "Hair Care",
    sub:       "Explore botanical formulas and top picks.",
    cta:       "Explore Range",
    ctaLink:   "/buyer",
    bigEmoji:  "🌿",
  },
];

export default function HomePage() {
  const navigate        = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused]             = useState(false);
  const [brandProducts, setBrandProducts] = useState<Record<string, Product[]>>({});
  const [apiBrands, setApiBrands]         = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setInterval(() => {
      setCurrentSlide((s) => (s + 1) % SLIDES.length);
    }, 4000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [paused]);

  useEffect(() => {
    fetchBrands().then(setApiBrands).catch(() => setApiBrands([]));
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Use BRAND_ORDER for priority, then append any API brands not in it
      const brandsToLoad = [
        ...BRAND_ORDER.filter(b => true), // priority order
      ];
      const next: Record<string, Product[]> = {};
      for (const brand of brandsToLoad) {
        try {
          const data = await fetchProducts(3, 0, brand);
          if (data.items.length > 0) next[brand] = data.items;
        } catch {
          // skip unavailable brand
        }
      }
      if (mounted) setBrandProducts(next);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const availableBrands = useMemo(
    () => BRAND_ORDER.filter((b) => (brandProducts[b] ?? []).length > 0),
    [brandProducts]
  );

  return (
    <div>
      {/* Hero carousel */}
      <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ overflow: "hidden", position: "relative" }}>
        <div style={{ display: "flex", transform: `translateX(-${currentSlide * 100}%)`, transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)" }}>
          {SLIDES.map((s, i) => (
            <div
              key={`${s.eyebrow}-${i}`}
              style={{ minWidth: "100%", height: 240, background: s.bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px", flexShrink: 0 }}
            >
              <div style={{ maxWidth: 340 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 1.5, background: "#3A7D52" }} />
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#3A7D52" }}>{s.eyebrow}</span>
                </div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, fontWeight: 800, lineHeight: 1.1, color: "#FFFFFF", marginBottom: 10 }}>
                  {s.headlineA}<br />
                  <em style={{ fontStyle: "italic", fontWeight: 400, color: "#A8D8B8" }}>{s.headlineB}</em>
                </h1>
                <p style={{ fontSize: 11, color: "#D4DCC8", marginBottom: 18, lineHeight: 1.6 }}>{s.sub}</p>
                <Link to={s.ctaLink} style={{ background: "#3A7D52", color: "#FFFFFF", textDecoration: "none", padding: "10px 22px", fontSize: 10, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", borderRadius: 2, display: "inline-block" }}>
                  {s.cta}
                </Link>
              </div>
              {"visual" in s && s.visual ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: 200, flexShrink: 0 }}>
                  {s.visual.map((v, j) => (
                    <div key={`${s.eyebrow}-tile-${j}`} style={{ background: v.bg, borderRadius: 4, height: 84, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                      {v.emoji}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 90, opacity: 0.5, flexShrink: 0 }}>{("bigEmoji" in s && s.bigEmoji) ? s.bigEmoji : ""}</div>
              )}
            </div>
          ))}
        </div>

        {/* Slide indicators */}
        <div style={{ background: "#E8EDD8", padding: "8px 0", borderBottom: "1px solid #D4DCC8", textAlign: "center" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {SLIDES.map((_, i) => (
              <button
                key={`slide-dot-${i}`}
                onClick={() => setCurrentSlide(i)}
                style={{ width: i === currentSlide ? 16 : 6, height: 6, borderRadius: 3, background: i === currentSlide ? "#3A7D52" : "#C0B4A8", border: "none", cursor: "pointer", transition: "all 0.2s", padding: 0 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ background: "#E8EDD8", padding: "14px 24px", borderBottom: "1px solid #D4DCC8" }}>
        <div style={{ maxWidth: 580, margin: "0 auto", position: "relative" }}>
          <Link to="/buyer" style={{ textDecoration: "none" }}>
            <div style={{ background: "#FFFFFF", border: "1.5px solid #D4DCC8", borderRadius: 2, display: "flex", alignItems: "center", padding: "0 18px", height: 44, boxShadow: "0 2px 8px rgba(0,0,0,.06)", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#687860" strokeWidth="2" style={{ flexShrink: 0, marginRight: 10 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span style={{ fontSize: 12, color: "#687860" }}>Search brands, products, ingredients...</span>
            </div>
          </Link>
        </div>
      </div>

      {/* BUG 15 fixed: brand pills derived from actual API brands */}
      <div style={{ background: "#FFFFFF", padding: "10px 28px", borderBottom: "1px solid #D4DCC8", display: "flex", gap: 8, overflowX: "auto" }}>
        <button
          onClick={() => navigate("/buyer")}
          style={{ border: "1.5px solid #1A3028", background: "#1A3028", color: "#FFFFFF", fontSize: 11, fontWeight: 500, padding: "5px 16px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          All
        </button>
        {apiBrands.map((brand) => (
          <button
            key={brand}
            onClick={() => navigate(`/buyer?brand=${encodeURIComponent(brand)}`)}
            style={{ border: "1.5px solid #D4DCC8", background: "#FFFFFF", color: "#1A3028", fontSize: 11, fontWeight: 500, padding: "5px 16px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0 }}
          >
            {brand}
          </button>
        ))}
      </div>

      {/* Brand product rows */}
      <div id="products-section" style={{ padding: "20px 20px 8px" }}>
        <div id="brands-section" />
        {availableBrands.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#687860" }}>
            <p style={{ fontSize: 16 }}>Loading products from the backend...</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Make sure the app service is running.</p>
          </div>
        )}
        {availableBrands.map((brand, index) => (
          <div key={brand} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: "#1A3028" }}>{brand}</h2>
                <p style={{ fontSize: 10, color: "#687860", marginTop: 1 }}>{brandProducts[brand]?.length ?? 0} products shown</p>
              </div>
              <Link to={`/buyer?brand=${encodeURIComponent(brand)}`} style={{ fontSize: 11, fontWeight: 500, color: "#3A7D52", textDecoration: "underline", letterSpacing: "0.3px" }}>
                View all →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {brandProducts[brand]?.map((product) => (
                <ProductCard key={product.product_id} product={product} onSelect={() => navigate(`/product/${product.product_id}`)} />
              ))}
            </div>
            {index % 2 === 1 && (
              <div style={{ background: "#1A3028", padding: "28px 28px", margin: "28px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3 }}>
                    Verified by real buyers<br />
                    <em style={{ fontStyle: "italic", fontWeight: 400, color: "#A8D8B8" }}>Powered by AI</em>
                  </h3>
                  <p style={{ fontSize: 11, color: "#A8D8B8", marginTop: 6, lineHeight: 1.6 }}>Every label generated by NLP trained on verified reviews.</p>
                </div>
                <button style={{ background: "#FFFFFF", color: "#1A3028", border: "none", padding: "10px 22px", fontSize: 10, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 }}>
                  How it works
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
