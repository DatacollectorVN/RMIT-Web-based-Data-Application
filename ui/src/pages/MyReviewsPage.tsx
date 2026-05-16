import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchUserReviews, humanConfirm,
  triggerCountingPredict, triggerSemanticPredict, updateReview,
} from "../api";
import type { AuthUser, Review } from "../types";

type Props = { authUser: AuthUser | null };

export default function MyReviewsPage({ authUser }: Props) {
  const navigate = useNavigate();
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);

  const reload = () => {
    if (!authUser?.id) return;
    setLoading(true);
    fetchUserReviews(authUser.id, page, 10)
      .then(data => { setReviews(data.items); setTotal(data.total); setTotalPages(data.total_pages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authUser?.id) { navigate("/login"); return; }
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, page]);

  return (
    <div style={{ background: "#F4F5EE", minHeight: "100vh" }}>
      {/* Hero */}
      <section style={s.hero}>
        <span style={s.heroTag}>My Account</span>
        <h1 style={s.heroTitle}>My Reviews</h1>
        <p style={s.heroSub}>Edit your reviews and re-run AI analysis. Sorted by most recently updated.</p>
      </section>

      <div style={s.breadcrumb}>
        <Link to="/buyer" style={s.breadcrumbLink}>Shop</Link> ›{" "}
        <span style={{ color: "#1A3028", fontWeight: 600 }}>My Reviews</span>
      </div>

      <div style={s.page}>
        {loading ? (
          <p style={{ fontSize: 13, color: "#687860" }}>Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 15, color: "#687860", marginBottom: 16 }}>You haven't written any reviews yet.</p>
            <Link to="/buyer" style={s.shopLink}>Browse Products</Link>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#687860", margin: 0 }}>
                {total} review{total !== 1 ? "s" : ""} · page {page} of {totalPages}
              </p>
              <button type="button" onClick={reload} disabled={loading}
                style={{ background: "none", border: "1.5px solid #D4DCC8", borderRadius: 4, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#1A3028", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5, opacity: loading ? 0.5 : 1 }}>
                ↻ Refresh
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {reviews.map(r => (
                <ReviewCard key={r.review_id} review={r} authUser={authUser} onRefresh={reload} />
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 24, flexWrap: "wrap" }}>
                <PagBtn label="←" disabled={page <= 1} onClick={() => setPage(p => p - 1)} />
                {buildPageNumbers(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "#687860", fontSize: 12 }}>…</span>
                  ) : (
                    <PagBtn key={p} label={String(p)} disabled={p === page} active={p === page} onClick={() => setPage(Number(p))} />
                  )
                )}
                <PagBtn label="→" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Review card with inline edit form + human confirm ─────────────────────────

function ReviewCard({ review, authUser, onRefresh }: { review: Review; authUser: AuthUser | null; onRefresh: () => void }) {
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState<string | null>(null);
  const [isError, setIsError]   = useState(false);

  // Edit form state
  const [rating, setRating]             = useState(review.review_rating);
  const [title, setTitle]               = useState(review.review_title ?? "");
  const [body, setBody]                 = useState(review.review_text);
  const [aiModel, setAiModel]           = useState<"counting" | "semantic">("counting");
  const [semanticVariant, setVariant]   = useState<"nli" | "miniLM">("nli");
  const [threshold, setThreshold]       = useState(0.5);

  const notify = (msg: string, err = false) => { setStatus(msg); setIsError(err); };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      // 1. Update review content
      await updateReview(review.review_id, { title, content: body, rating });

      // 2. Re-run AI (Mode B) — pass actual updated review content
      notify("⏳ Review updated. AI is re-analysing in the background…");
      const aiBody = { review_title: title, review_text: body, review_rating: rating };
      if (aiModel === "counting") {
        void triggerCountingPredict(Number(review.review_id), review.product_id, authUser?.id, threshold, aiBody);
      } else {
        void triggerSemanticPredict(Number(review.review_id), review.product_id, semanticVariant, authUser?.id, threshold, aiBody);
      }

      setEditing(false);
      onRefresh();
    } catch (err) {
      notify(`Error: ${(err as Error).message}`, true);
    } finally {
      setSaving(false);
    }
  };

  const onHumanConfirm = async (label: boolean) => {
    setSaving(true);
    setStatus(null);
    try {
      await humanConfirm(review.review_id, label);
      notify(`Human label set: ${label ? "Verified Buyer ✓" : "Non-Buyer ✗"}`);
      onRefresh();
    } catch (err) {
      notify(`Error: ${(err as Error).message}`, true);
    } finally {
      setSaving(false);
    }
  };

  const clampRating  = Math.max(0, Math.min(5, review.review_rating));
  const date = (review.updated_at ?? review.created_at)
    ? new Date(review.updated_at ?? review.created_at!).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <div style={s.card}>
      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          {review.review_title && <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#1A3028" }}>{review.review_title}</p>}
          <Link to={`/product/${review.product_id}`} style={{ fontSize: 11, color: "#3A7D52", textDecoration: "none", fontWeight: 600 }}>
            View Product →
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ color: "#C9A84C", fontSize: 14 }}>{"★".repeat(clampRating)}{"☆".repeat(5 - clampRating)}</span>
          {date && <span style={{ fontSize: 10, color: "#687860" }}>{date}</span>}
        </div>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#455146", lineHeight: 1.6 }}>{review.review_text}</p>

      {/* ── AI / Human label badges ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {(review.ai_label !== undefined && review.ai_label !== null) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge label={`AI: ${review.ai_label ? "Buyer" : "Non-Buyer"}`} green={review.ai_label} prefix="🤖" />
            {review.ai_model && (
              <span style={{ fontSize: 10, color: "#456080", border: "1px solid #B8C8D8", borderRadius: 20, padding: "2px 10px", background: "#EEF3FA" }}>
                Model: {review.ai_model}
              </span>
            )}
          </div>
        )}
        {review.final_label !== undefined && review.final_label !== null && (
          <div>
            <Badge label={`Final: ${review.final_label ? "Verified Buyer" : "Non-Buyer"}`} green={review.final_label} prefix="✅" />
          </div>
        )}
        {review.status && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#687860" }}>Status:</span>
            <span style={{ fontSize: 10, color: "#687860", border: "1px solid #D4DCC8", borderRadius: 20, padding: "2px 10px" }}>
              {review.status}
            </span>
          </div>
        )}
      </div>

      {/* ── Human confirm buttons ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#687860", alignSelf: "center", letterSpacing: "0.5px" }}>Verification:</span>
        <button type="button" disabled={saving} onClick={() => void onHumanConfirm(true)}
          style={{ ...s.confirmBtn, background: "#EAF4EE", color: "#2D6A4F", border: "1px solid #A8D8B8" }}>
          ✓ Confirm Buyer
        </button>
        <button type="button" disabled={saving} onClick={() => void onHumanConfirm(false)}
          style={{ ...s.confirmBtn, background: "#FDECEA", color: "#C0392B", border: "1px solid #F5A7A5" }}>
          ✗ Flag As Non Buyer
        </button>
      </div>

      {/* ── Status message ── */}
      {status && (
        <p style={{ fontSize: 12, padding: "7px 12px", borderRadius: 6, marginBottom: 10,
          background: isError ? "#FDECEA" : "#EAF4EE",
          color:      isError ? "#C0392B"  : "#2D6A4F",
          border:     `1px solid ${isError ? "#F5A7A5" : "#A8D8B8"}` }}>
          {status}
        </p>
      )}

      {/* ── Edit toggle ── */}
      {!editing ? (
        <button type="button" onClick={() => setEditing(true)} style={s.editBtn}>
          Edit & Re-analyse
        </button>
      ) : (
        <form onSubmit={e => void onSave(e)} style={{ borderTop: "1px dashed #D4DCC8", paddingTop: 14, marginTop: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#687860", letterSpacing: "1px", marginBottom: 10 }}>EDIT REVIEW</p>

          {/* Rating */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 24, color: i < rating ? "#C9A84C" : "#C0C0C0", padding: 0 }}>
                ★
              </button>
            ))}
          </div>

          {/* Title */}
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Review title…" required
            style={s.input} />

          {/* Body */}
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Your review…" required minLength={10}
            style={{ ...s.input, minHeight: 90, resize: "vertical" as const, marginBottom: 10 }} />

          {/* AI model selector */}
          <div style={s.aiBox}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#687860", letterSpacing: "0.8px" }}>AI ANALYSIS MODEL</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={s.radio}>
                <input type="radio" name={`ai-${review.review_id}`} value="counting" checked={aiModel === "counting"} onChange={() => setAiModel("counting")} />
                <span><strong>Counting Model</strong> — Random Forest</span>
              </label>
              <label style={s.radio}>
                <input type="radio" name={`ai-${review.review_id}`} value="semantic" checked={aiModel === "semantic"} onChange={() => setAiModel("semantic")} />
                <span><strong>Semantic Model</strong> — NLP-based</span>
              </label>
              {aiModel === "semantic" && (
                <div style={{ marginLeft: 22, display: "flex", gap: 16, paddingTop: 4, borderTop: "1px dashed #D4DCC8" }}>
                  {(["nli", "miniLM"] as const).map(v => (
                    <label key={v} style={s.radio}>
                      <input type="radio" name={`sem-${review.review_id}`} value={v} checked={semanticVariant === v} onChange={() => setVariant(v)} />
                      {v === "nli" ? "NLI — DeBERTa" : "MiniLM"}
                    </label>
                  ))}
                </div>
              )}

              {/* Threshold */}
              <div style={{ paddingTop: 8, borderTop: "1px dashed #D4DCC8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#687860", letterSpacing: "0.8px" }}>BUYER THRESHOLD</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#3A7D52" }}>{threshold.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.01} value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#3A7D52" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#687860", marginTop: 2 }}>
                  <span>0.0 — lenient</span><span>default: 0.50</span><span>strict — 1.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" disabled={saving} style={{ ...s.editBtn, flex: 1 }}>
              {saving ? "Saving…" : "Save & Re-analyse"}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={s.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Badge({ label, green, prefix }: { label: string; green: boolean; prefix: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.4px",
      padding: "2px 10px", borderRadius: 20, display: "inline-block",
      background: green ? "#EAF4EE" : "#FDECEA",
      color:      green ? "#2D6A4F"  : "#C0392B",
      border:     `1px solid ${green ? "#A8D8B8" : "#F5A7A5"}`,
    }}>
      {prefix} {label}
    </span>
  );
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function PagBtn({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ border: `1.5px solid ${active ? "#1A3028" : "#D4DCC8"}`,
        background: active ? "#1A3028" : "#FFFFFF",
        color: active ? "#FFFFFF" : disabled ? "#BBBBBB" : "#1A3028",
        fontSize: 11, fontWeight: 600, padding: "7px 13px", borderRadius: 4,
        cursor: disabled ? "default" : "pointer", minWidth: 34 }}>
      {label}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  hero:          { background: "linear-gradient(135deg,#1A3028 0%,#2C5F3E 60%,#3A7D52 100%)", padding: "52px 24px 44px", textAlign: "center" },
  heroTag:       { display: "inline-block", background: "rgba(168,216,184,0.18)", color: "#A8D8B8", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", padding: "4px 14px", borderRadius: 20, marginBottom: 14 } as React.CSSProperties,
  heroTitle:     { fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" },
  heroSub:       { color: "#A8D8B8", fontSize: 13, margin: 0 },
  breadcrumb:    { background: "#FFFFFF", borderBottom: "1px solid #D4DCC8", padding: "10px 28px", fontSize: 11, color: "#687860", display: "flex", gap: 6, alignItems: "center" },
  breadcrumbLink:{ color: "#3A7D52", textDecoration: "none" },
  page:          { maxWidth: 860, margin: "32px auto", padding: "0 20px" },
  card:          { background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "18px 20px" },
  shopLink:      { background: "#1A3028", color: "#FFFFFF", textDecoration: "none", padding: "10px 24px", borderRadius: 4, fontSize: 12, fontWeight: 600 } as React.CSSProperties,
  editBtn:       { background: "#1A3028", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "9px 18px", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.5px" },
  cancelBtn:     { background: "none", border: "1.5px solid #D4DCC8", borderRadius: 4, padding: "9px 14px", fontSize: 11, color: "#687860", cursor: "pointer" },
  confirmBtn:    { fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "4px 14px", cursor: "pointer" },
  input:         { width: "100%", border: "1px solid #D4DCC8", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#1A3028", background: "#FAFAF8", boxSizing: "border-box", marginBottom: 8, display: "block" } as React.CSSProperties,
  aiBox:         { border: "1px solid #D4DCC8", background: "#FAFAF8", borderRadius: 6, padding: "12px 14px", marginBottom: 4 },
  radio:         { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#1A3028" } as React.CSSProperties,
};
