import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { fetchBrands, fetchProductsPage, searchProducts } from "../api";
import type { AuthUser, Product } from "../types";

const PAGE_LIMIT = 100;

type Props = {
  authUser: AuthUser | null;
  selectedProductId?: string;
  onProductSelect?: (product: Product) => void;
  refreshKey?: number;
};

export default function BuyerPage({ authUser, selectedProductId, onProductSelect, refreshKey }: Props) {
  const navigate = useNavigate();

  const [items, setItems]           = useState<Product[]>([]);
  const [brands, setBrands]         = useState<string[]>([]);
  const [brand, setBrand]           = useState("");
  const [query, setQuery]           = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [toast, setToast]           = useState<string | null>(null);
  const [isSearch, setIsSearch]     = useState(false);

  const shownBrands = useMemo(() => brands.slice(0, 16), [brands]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadProducts = async (activePage: number, activeBrand: string) => {
    setLoading(true);
    setError(null);
    setIsSearch(false);
    try {
      const data = await fetchProductsPage(activePage, PAGE_LIMIT, activeBrand || undefined);
      setItems(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts(page, brand);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, brand, refreshKey]);

  useEffect(() => {
    fetchBrands().then(setBrands).catch(() => {});
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) { void loadProducts(page, brand); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await searchProducts(query.trim());
      setItems(data.items);
      setTotalPages(1);
      setTotal(data.items.length);
      setIsSearch(true);
    } catch {
      setError("Search failed. Try another keyword.");
    } finally {
      setLoading(false);
    }
  };

  const onBrandChange = (b: string) => {
    setBrand(b);
    setPage(1);   // reset to page 1 on brand change
    setQuery("");
  };

  const onClear = () => {
    setBrand("");
    setQuery("");
    setPage(1);
  };

  const onQuickAddToCart = (product: Product) => {
    setToast(`🚧 Cart coming soon — "${product.product_title}" not added yet.`);
    setTimeout(() => setToast(null), 3000);
  };

  const onCardSelect = (product: Product) => {
    if (onProductSelect) onProductSelect(product);
    else navigate(`/product/${product.product_id}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hero banner */}
      <div style={styles.banner}>
        <div style={styles.bannerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 1.5, background: "#A8D8B8" }} />
            <span style={styles.bannerLabel}>{brand ? "Brand Collection" : "Shop"}</span>
          </div>
          <h1 style={styles.bannerTitle}>{brand || "All Products"}</h1>
          <p style={styles.bannerSub}>
            {brand ? `Explore the full ${brand} collection.` : "Discover beauty products from top brands."}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div style={styles.searchBar}>
        <div style={styles.bannerInner}>
          <form onSubmit={onSearch} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#687860" strokeWidth="2"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Fuzzy search product name"
                style={styles.searchInput}
              />
            </div>
            <button type="submit" style={styles.searchBtn}>Search</button>
            {(brand || query) && (
              <button type="button" onClick={onClear} style={styles.clearBtn}>Clear</button>
            )}
          </form>
        </div>
      </div>

      {/* Brand filter pills */}
      <div style={styles.pillsRow}>
        <BrandPill label="All" active={!brand} onClick={() => onBrandChange("")} />
        {shownBrands.map(b => (
          <BrandPill key={b} label={b} active={brand === b} onClick={() => onBrandChange(b)} />
        ))}
      </div>

      {/* Status feedback */}
      <div style={{ maxWidth: 1180, margin: "12px auto 0", padding: "0 28px" }}>
        {toast   && <p style={styles.toast}>{toast}</p>}
        {error   && <p style={styles.errorMsg}>{error}</p>}
        {loading && <p style={{ fontSize: 12, color: "#687860" }}>Loading products…</p>}
        {!loading && !error && !isSearch && (
          <p style={{ fontSize: 11, color: "#687860" }}>
            {total.toLocaleString()} product{total !== 1 ? "s" : ""}{brand ? ` in ${brand}` : ""} · page {page} of {totalPages}
          </p>
        )}
      </div>

      {/* Product grid */}
      <div style={{ maxWidth: 1180, margin: "16px auto 0", padding: "0 20px" }}>
        {items.length === 0 && !loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#687860" }}>
            <p style={{ fontSize: 16 }}>No products found.</p>
            {(brand || query) && <p style={{ fontSize: 13 }}>Try clearing the filter above.</p>}
          </div>
        ) : (
          <div style={styles.grid}>
            {items.map(product => (
              <ProductCard
                key={product.product_id}
                product={product}
                selected={selectedProductId === product.product_id}
                onSelect={() => onCardSelect(product)}
                onQuickSelect={p => onQuickAddToCart(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isSearch && totalPages > 1 && (
        <div style={styles.pagination}>
          <PagBtn label="← Prev" disabled={page <= 1}          onClick={() => setPage(p => p - 1)} />
          {buildPageNumbers(page, totalPages).map((n, i) =>
            n === "…"
              ? <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "#687860", fontSize: 12 }}>…</span>
              : <PagBtn key={n} label={String(n)} active={n === page} onClick={() => setPage(Number(n))} />
          )}
          <PagBtn label="Next →" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} />
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 40 }} />
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BrandPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      border:       `1.5px solid ${active ? "#3A7D52" : "#D4DCC8"}`,
      background:   active ? "#3A7D52" : "#FFFFFF",
      color:        active ? "#FFFFFF" : "#1A3028",
      fontSize:     11,
      fontWeight:   500,
      padding:      "5px 16px",
      borderRadius: 20,
      cursor:       "pointer",
      whiteSpace:   "nowrap",
      flexShrink:   0,
    }}>
      {label}
    </button>
  );
}

function PagBtn({ label, onClick, disabled = false, active = false }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border:       `1.5px solid ${active ? "#3A7D52" : "#D4DCC8"}`,
        background:   active ? "#3A7D52" : "#FFFFFF",
        color:        active ? "#FFFFFF" : disabled ? "#BBBBBB" : "#1A3028",
        fontSize:     11,
        fontWeight:   active ? 700 : 500,
        padding:      "6px 12px",
        borderRadius: 4,
        cursor:       disabled ? "default" : "pointer",
        minWidth:     32,
      }}
    >
      {label}
    </button>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  banner:      { background: "linear-gradient(135deg,#1A3028 0%,#2C5F3E 60%,#3A7D52 100%)", padding: "36px 28px 32px" },
  bannerInner: { maxWidth: 1180, margin: "0 auto" },
  bannerLabel: { fontSize: 9, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#A8D8B8" },
  bannerTitle: { fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 800, color: "#FFFFFF", margin: "0 0 6px" },
  bannerSub:   { fontSize: 12, color: "#D4DCC8", margin: 0 },
  searchBar:   { background: "#E8EDD8", padding: "12px 28px", borderBottom: "1px solid #D4DCC8" },
  searchInput: { width: "100%", border: "1.5px solid #D4DCC8", borderRadius: 2, padding: "9px 12px 9px 34px", fontSize: 12, background: "#FFFFFF", color: "#1A3028", boxSizing: "border-box" as const },
  searchBtn:   { background: "#3A7D52", color: "#FFFFFF", border: "none", borderRadius: 2, padding: "9px 20px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  clearBtn:    { background: "none", border: "1.5px solid #D4DCC8", borderRadius: 2, padding: "9px 14px", fontSize: 11, color: "#687860", cursor: "pointer" },
  pillsRow:    { background: "#FFFFFF", padding: "10px 28px", borderBottom: "1px solid #D4DCC8", display: "flex", gap: 8, overflowX: "auto" as const, justifyContent: "center" },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  pagination:  { display: "flex", justifyContent: "center", alignItems: "center", gap: 6, padding: "24px 20px 0" },
  toast:       { fontSize: 12, color: "#2D6A4F", background: "#EAF4EE", border: "1px solid #A8D8B8", borderRadius: 4, padding: "8px 12px", marginBottom: 6 },
  errorMsg:    { fontSize: 12, color: "#C0392B", background: "#FDECEA", border: "1px solid #F5A7A5", borderRadius: 4, padding: "8px 12px", marginBottom: 6 },
};
