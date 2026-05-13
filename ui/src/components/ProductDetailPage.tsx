import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createReview, fetchProductById, fetchProductReviews, fetchSimilarProducts, resolveImageUrl, triggerCountingPredict, triggerSemanticPredict } from "../api";
import type { AuthUser, Product, Review } from "../types";

type Props = {
  authUser: AuthUser | null;
};

function formatCategory(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function ProductDetailPage({ authUser }: Props) {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct]               = useState<Product | null>(null);
  const [similarProducts, setSimilar]       = useState<Array<Product & { similarity: number }>>([]);
  const [reviews, setReviews]               = useState<Review[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [reviewStatus, setReviewStatus]     = useState<string | null>(null);
  const [cartToast, setCartToast]           = useState<string | null>(null);
  const [aiModel, setAiModel]               = useState<"counting" | "semantic">("counting");
  const [semanticVariant, setSemanticVariant] = useState<"nli" | "miniLM">("nli");
  const [threshold, setThreshold]           = useState(0.5);
  const [reviewProcessing, setReviewProcessing] = useState(false);

  const onAddToBag = () => {
    setCartToast("🚧 Cart coming soon — this feature is under development.");
    setTimeout(() => setCartToast(null), 3500);
  };
  const [reviewForm, setReviewForm] = useState({ rating: 4, title: "", body: "" });

  useEffect(() => {
    if (!productId) {
      setError("Missing product id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetchProductById(productId),
      fetchSimilarProducts(productId, 4, authUser?.id ? String(authUser.id) : null).catch(() => []),
      fetchProductReviews(productId, 20).catch(() => [])
    ])
      .then(([p, sim, rev]) => {
        setProduct(p);
        setSimilar(sim);
        setReviews(rev);
      })
      .catch(() => setError("Failed to load this product."))
      .finally(() => setLoading(false));
  }, [productId, authUser?.id]);

  if (loading) {
    return <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px", color: "#687860" }}>Loading product...</div>;
  }

  if (error || !product) {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px" }}>
        <p style={{ color: "#C0392B", marginBottom: 12 }}>{error ?? "Product not found."}</p>
        <Link to="/" style={{ color: "#3A7D52", textDecoration: "underline" }}>Back to home</Link>
      </div>
    );
  }

  const imageUrl      = resolveImageUrl(product.image_local);
  // BUG 9: compute avg rating from actual fetched reviews
  const avgRating     = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.review_rating, 0) / reviews.length
    : 0;
  const roundedRating = Math.max(0, Math.min(5, Math.round(avgRating)));
  // BUG 8: use actual fetched review count
  const reviewCount   = reviews.length;
  // BUG 10: compute verified buyer % from actual review data
  const verifiedBuyerPct = reviews.length > 0
    ? Math.round(reviews.filter(r => r.is_a_buyer === 1).length / reviews.length * 100)
    : null;

  const galleryTiles = [
    { id: "main",    bg: product.brand_bg || "#E8EDD8", src: imageUrl, emoji: product.brand_emoji || "💄" },
    { id: "thumb-1", bg: "#E8D8CC",                     src: imageUrl, emoji: product.brand_emoji || "✨" },
    { id: "thumb-2", bg: "#DCCFE7",                     src: imageUrl, emoji: product.brand_emoji || "💋" },
    { id: "thumb-3", bg: "#D1C3AA",                     src: imageUrl, emoji: product.brand_emoji || "🌸" }
  ];
  const similarToShow = similarProducts.filter(p => p.product_id !== product.product_id).slice(0, 4);

  const openReviewForm = () => {
    if (!authUser) { navigate("/login"); return; }
    setShowReviewForm(true);
    setReviewStatus(null);
    setTimeout(() => {
      document.getElementById("inline-review-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setReviewStatus(null);
    try {
      const created = await createReview(
        product.product_id,
        { title: reviewForm.title, body: reviewForm.body, rating: reviewForm.rating },
        authUser!.id!,
      );
      setReviewForm({ rating: 4, title: "", body: "" });

      // Trigger AI in background (fire-and-forget) — pass actual review content
      setReviewProcessing(true);
      setReviewStatus("⏳ Review submitted! Our AI is analysing it in the background…");
      const aiBody = { review_title: reviewForm.title, review_text: reviewForm.body, review_rating: reviewForm.rating };
      if (aiModel === "counting") {
        void triggerCountingPredict(created.id, product.product_id, authUser?.id, threshold, aiBody);
      } else {
        void triggerSemanticPredict(created.id, product.product_id, semanticVariant, authUser?.id, threshold, aiBody);
      }
      setReviewProcessing(false);

      const latest = await fetchProductReviews(product.product_id, 20);
      setReviews(latest);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit review.";
      setReviewStatus(msg.includes("401") ? "Please login to submit a review." : `Error: ${msg}`);
    } finally {
      setSubmitting(false);
      setReviewProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 18px 28px" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "#9AA394", marginBottom: 14 }}>
        <Link to="/buyer" style={{ color: "#9AA394", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.color = "#3A7D52")} onMouseLeave={e => (e.currentTarget.style.color = "#9AA394")}>Products</Link>
        {" "}<span style={{ color: "#C1C8BA" }}>›</span>{" "}
        <Link to={`/buyer?brand=${encodeURIComponent(product.brand_name)}`} style={{ color: "#9AA394", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.color = "#3A7D52")} onMouseLeave={e => (e.currentTarget.style.color = "#9AA394")}>{product.brand_name}</Link>
        {" "}<span style={{ color: "#C1C8BA" }}>›</span>{" "}
        <span style={{ color: "#1A3028", fontWeight: 500 }}>{product.product_title}</span>
      </div>

      {/* Main grid */}
      <div style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", display: "grid", gridTemplateColumns: "minmax(260px, 450px) 1fr", gap: 16, padding: 16 }}>
        {/* Gallery */}
        <div>
          <div style={{ background: galleryTiles[0].bg, minHeight: 390, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #D4DCC8" }}>
            {galleryTiles[0].src ? (
              <img src={galleryTiles[0].src} alt={product.product_title} style={{ width: "100%", height: 390, objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 84 }}>{galleryTiles[0].emoji}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {galleryTiles.slice(1).map((tile) => (
              <div key={tile.id} style={{ width: 68, height: 68, border: "1px solid #D4DCC8", background: tile.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tile.src ? (
                  <img src={tile.src} alt={`${product.product_title} preview`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{tile.emoji}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "0 2px" }}>
          <p style={{ fontSize: 12, color: "#3A7D52", marginBottom: 4, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase" }}>{product.brand_name}</p>
          {/* BUG 11 fixed: removed duplicate italic subtitle */}
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, lineHeight: 1.2, color: "#1A3028", marginBottom: 8 }}>{product.product_title}</h1>
          {/* BUG 12 fixed: formatted category with label */}
          {product.product_tags && (
            <p style={{ fontSize: 12, color: "#687860", margin: "0 0 10px", textTransform: "capitalize", letterSpacing: "0.5px" }}>
              Category: <span style={{ fontWeight: 600, color: "#4D5948" }}>{formatCategory(product.product_tags)}</span>
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 }}>
            <div style={{ color: "#C9A84C", fontSize: 16 }}>{"★".repeat(roundedRating)}{"☆".repeat(5 - roundedRating)}</div>
            <span style={{ color: "#687860", fontSize: 14 }}>{avgRating.toFixed(1)}</span>
            <span style={{ color: "#687860", fontSize: 14 }}>{reviewCount.toLocaleString()} review{reviewCount !== 1 ? "s" : ""}</span>
          </div>
          {/* BUG 4 + BUG 5 fixed: proper price format, no fake discount */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#1A3028", margin: 0 }}>
              {product.price != null ? `$${Number(product.price).toFixed(2)}` : "Price unavailable"}
            </p>
          </div>
          <div style={{ borderTop: "1px solid #D4DCC8", marginTop: 10, paddingTop: 12 }}>
            <p style={{ fontSize: 14, color: "#4D5948", margin: "0 0 14px", lineHeight: 1.6 }}>
              {product.description || "Premium beauty product — dermatologist tested."}
            </p>
            {cartToast && (
              <p style={{ fontSize: 12, color: "#92640A", background: "#FEF3C7", border: "1px solid #F9C74F", borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
                {cartToast}
              </p>
            )}
            <button type="button" onClick={onAddToBag} style={{ width: "100%", background: "#FFFFFF", border: "1px solid #D4DCC8", fontSize: 18, fontWeight: 500, color: "#1A3028", padding: "12px 14px", cursor: "pointer", borderRadius: 12, marginBottom: 10, fontFamily: "'Inter', sans-serif" }}>
              Add to bag
            </button>
            <button type="button" onClick={openReviewForm} style={{ width: "100%", background: "#FFFFFF", border: "1px solid #D4DCC8", fontSize: 18, fontWeight: 500, color: "#1A3028", padding: "12px 14px", cursor: "pointer", borderRadius: 12, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
              Write a review
            </button>
          </div>
        </div>
      </div>

      {/* Similar products */}
      {similarToShow.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid #D4DCC8", paddingTop: 12 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#1A3028", marginBottom: 10 }}>
            You might also love
            {authUser && <span style={{ fontSize: 12, fontWeight: 400, color: "#3A7D52", marginLeft: 10 }}>· personalised for you</span>}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {similarToShow.map((item, idx) => {
              const itemImage = resolveImageUrl(item.image_local);
              return (
                <div
                  key={item.product_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/product/${item.product_id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/product/${item.product_id}`); } }}
                  style={{ border: "1px solid #D4DCC8", background: "#FFFFFF", cursor: "pointer" }}
                >
                  <div style={{ background: item.brand_bg || "#E8EDD8", height: 118, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {itemImage ? (
                      <img src={itemImage} alt={item.product_title} style={{ width: "100%", height: 118, objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 30 }}>{item.brand_emoji || "✨"}</span>
                    )}
                  </div>
                  <div style={{ padding: 10 }}>
                    <p style={{ margin: 0, fontSize: 11, color: "#687860", textTransform: "uppercase" }}>{item.brand_name}</p>
                    <p style={{ margin: "2px 0", fontFamily: "'Playfair Display',serif", fontSize: 14, lineHeight: 1.2, color: "#1A3028" }}>{item.product_title}</p>
                    <p style={{ margin: 0, color: "#3A7D52", fontWeight: 700, fontSize: 12 }}>
                      {item.similarity > 0
                        ? `${Math.round(item.similarity * 100)}% similar`
                        : "Similar product"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews — BUG 8 fixed: count uses reviews.length */}
      <div style={{ marginTop: 16, borderTop: "1px solid #D4DCC8", paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#1A3028" }}>
            Reviews <span style={{ fontSize: 15, color: "#687860" }}>({reviewCount.toLocaleString()})</span>
          </h2>
          <button type="button" onClick={openReviewForm} style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", color: "#1A3028", padding: "10px 16px", fontSize: 14, borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
            Write a review
          </button>
        </div>

        {showReviewForm && (
          <form id="inline-review-form" onSubmit={handleSubmitReview} style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 10, padding: 16, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: 20, color: "#1A3028" }}>Write a review</h3>
            <p style={{ marginTop: 2, marginBottom: 12, color: "#687860", fontStyle: "italic", fontSize: 13 }}>for {product.product_title}</p>

            <p style={{ margin: "0 0 6px", fontWeight: 700, letterSpacing: "1.2px", color: "#687860", fontSize: 12 }}>RATING</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                return (
                  <button key={`rate-${value}`} type="button" onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 28, color: value <= reviewForm.rating ? "#C9A84C" : "#B9B9B9", padding: 0 }} aria-label={`Rate ${value} star`}>★</button>
                );
              })}
            </div>

            <label style={{ display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: "1.2px", color: "#687860", fontSize: 12 }}>REVIEW TITLE</label>
            <input value={reviewForm.title} onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Summarise your experience..." style={{ width: "100%", border: "1px solid #D4DCC8", borderRadius: 10, padding: "12px 14px", fontSize: 16, color: "#1A3028", marginBottom: 12 }} required />

            <label style={{ display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: "1.2px", color: "#687860", fontSize: 12 }}>YOUR REVIEW <span style={{ color: "#3A7D52" }}>*</span></label>
            <textarea value={reviewForm.body} onChange={(e) => setReviewForm((prev) => ({ ...prev, body: e.target.value }))} placeholder="Tell others what you think..." style={{ width: "100%", border: "1px solid #D4DCC8", borderRadius: 10, padding: "12px 14px", fontSize: 16, color: "#1A3028", minHeight: 120, resize: "vertical", marginBottom: 8 }} minLength={10} required />
            <p style={{ marginTop: 0, marginBottom: 10, color: "#687860", fontSize: 12 }}>Minimum 10 characters</p>

            {/* AI model selector */}
            <div style={{ border: "1px solid #D4DCC8", background: "#FAFAF8", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, letterSpacing: "1.2px", color: "#687860", fontSize: 11 }}>AI ANALYSIS MODEL</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#1A3028" }}>
                  <input type="radio" name="aiModel" value="counting" checked={aiModel === "counting"} onChange={() => setAiModel("counting")} />
                  <span><strong>Counting Model</strong> — Random Forest</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#1A3028" }}>
                  <input type="radio" name="aiModel" value="semantic" checked={aiModel === "semantic"} onChange={() => setAiModel("semantic")} />
                  <span><strong>Semantic Model</strong> — NLP-based</span>
                </label>
                {aiModel === "semantic" && (
                  <div style={{ marginLeft: 22, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, borderTop: "1px dashed #D4DCC8" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#1A3028" }}>
                      <input type="radio" name="semanticVariant" value="nli" checked={semanticVariant === "nli"} onChange={() => setSemanticVariant("nli")} />
                      NLI — DeBERTa
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#1A3028" }}>
                      <input type="radio" name="semanticVariant" value="miniLM" checked={semanticVariant === "miniLM"} onChange={() => setSemanticVariant("miniLM")} />
                      MiniLM
                    </label>
                  </div>
                )}

                {/* Threshold slider */}
                <div style={{ paddingTop: 10, borderTop: "1px dashed #D4DCC8", marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#687860", letterSpacing: "0.8px" }}>BUYER THRESHOLD</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#3A7D52", minWidth: 32, textAlign: "right" }}>{threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={1} step={0.01}
                    value={threshold}
                    onChange={e => setThreshold(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#3A7D52", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#687860", marginTop: 2 }}>
                    <span>0.0 — lenient</span>
                    <span>default: 0.50</span>
                    <span>strict — 1.0</span>
                  </div>
                </div>
              </div>
            </div>

            {reviewStatus && (
              <p style={{ margin: "0 0 10px", fontSize: 12, padding: "8px 12px", borderRadius: 6, background: reviewStatus.startsWith("⏳") ? "#EAF4EE" : reviewStatus.startsWith("Error") ? "#FDECEA" : "#EAF4EE", color: reviewStatus.startsWith("Error") ? "#C0392B" : "#2D6A4F", border: `1px solid ${reviewStatus.startsWith("Error") ? "#F5A7A5" : "#A8D8B8"}` }}>
                {reviewStatus}
              </p>
            )}

            <button type="submit" disabled={submitting || reviewProcessing} style={{ width: "100%", border: "1px solid #D4DCC8", borderRadius: 12, padding: "12px 14px", fontSize: 15, fontWeight: 700, color: "#1A3028", background: "#FFFFFF", cursor: submitting || reviewProcessing ? "default" : "pointer", marginBottom: 8, opacity: submitting || reviewProcessing ? 0.7 : 1 }}>
              {submitting || reviewProcessing ? "Submitting…" : "Submit Review"}
            </button>
            <p style={{ margin: 0, fontSize: 12, color: "#687860", textAlign: "center" }}>Posting as {authUser?.username || "Guest"} ({authUser?.role || "guest"})</p>
          </form>
        )}

        {reviews.length === 0 ? (
          <div style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", padding: 14, color: "#687860", fontSize: 13 }}>No reviews yet for this product.</div>
        ) : (
          reviews.map((r) => {
            const authorName  = r.author || "Anonymous";
            const initials    = authorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const clampRating = Math.max(0, Math.min(5, r.review_rating));
            return (
              <div key={r.review_id} style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", padding: 14, marginBottom: 8, borderRadius: 4 }}>
                {/* Author row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#3A7D52", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF" }}>{initials}</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: "#1A3028", fontSize: 14 }}>{authorName}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#687860" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</p>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: "#C9A84C", fontSize: 15, letterSpacing: 1 }}>{"★".repeat(clampRating)}{"☆".repeat(5 - clampRating)}</p>
                </div>
                {r.review_title && <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 13, color: "#1A3028" }}>{r.review_title}</p>}
                <p style={{ margin: 0, color: "#455146", fontSize: 13, lineHeight: 1.5 }}>{r.review_text}</p>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <Link to="/" style={{ color: "#3A7D52", textDecoration: "underline", fontSize: 12 }}>Back to home</Link>
      </div>
    </div>
  );
}
