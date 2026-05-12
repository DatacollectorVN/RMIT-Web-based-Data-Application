import { useMemo, useState } from "react";
import { resolveImageUrl } from "../api";
import type { Product } from "../types";

type Props = {
  product: Product;
  onSelect?: (product: Product) => void;
  onQuickSelect?: (product: Product) => void;
  selected?: boolean;
};

export default function ProductCard({ product, onSelect, onQuickSelect, selected = false }: Props) {
  const localSrc = useMemo(() => resolveImageUrl(product.image_local), [product.image_local]);
  const [src, setSrc]               = useState(localSrc);
  const [fallbackStep, setFallback] = useState<0 | 1 | 2>(0);
  const [showEmoji, setShowEmoji]   = useState(!localSrc);
  const [loaded, setLoaded]         = useState(false);

  const roundedRating = Math.floor(product.avg_rating ?? 0);
  const clampedBrand  = product.brand_name.toUpperCase().slice(0, 12);

  const onImageError = () => {
    if (fallbackStep === 0 && product.img_placeholder) {
      setSrc(product.img_placeholder);
      setFallback(1);
      setLoaded(false);
      return;
    }
    setShowEmoji(true);
    setFallback(2);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(product);
        }
      }}
      className={`product-card group bg-white border overflow-hidden transition-all duration-300 cursor-pointer block text-left w-full ${
        selected ? "ring-1" : ""
      }`}
      style={{ borderColor: selected ? "#3A7D52" : "#D4DCC8", borderRadius: 0 }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "1", backgroundColor: product.brand_bg || "#E8EDD8" }}>
        {!showEmoji ? (
          <img
            src={src}
            onError={onImageError}
            onLoad={() => setLoaded(true)}
            alt={product.product_title}
            className={`product-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              loaded ? "loaded" : ""
            }`}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center flex-col"
            style={{ backgroundColor: product.brand_bg || "#E8EDD8" }}
          >
            <span style={{ fontSize: "3rem" }}>{product.brand_emoji || "🛍️"}</span>
            <span
              style={{
                color:         product.brand_txt || "#4A5A40",
                fontSize:      "0.65rem",
                fontWeight:    700,
                letterSpacing: "0.8px",
                marginTop:     "6px",
                textTransform: "uppercase",
                textAlign:     "center",
                padding:       "0 8px",
                fontFamily:    "'Inter', sans-serif"
              }}
            >
              {product.brand_name}
            </span>
          </div>
        )}

        <span
          className="absolute top-2 left-2 text-xs font-semibold px-2 py-1"
          style={{ background: "#1A3028", color: "#FFFFFF", fontSize: "0.6rem", letterSpacing: "0.5px", fontFamily: "'Inter',sans-serif" }}
        >
          {clampedBrand}
        </span>

        <button
          type="button"
          aria-label="Select product"
          onClick={(e) => {
            e.stopPropagation();
            (onQuickSelect ?? onSelect)?.(product);
          }}
          style={{
            position:     "absolute",
            right:        8,
            bottom:       8,
            width:        28,
            height:       28,
            borderRadius: "50%",
            background:   "#1A3028",
            color:        "#FFFFFF",
            border:       "none",
            fontSize:     18,
            lineHeight:   "28px",
            cursor:       "pointer"
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = "#3A7D52"; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = "#1A3028"; }}
        >
          +
        </button>
      </div>

      <div style={{ padding: "12px", background: "#FFFFFF" }}>
        <p style={{ fontSize: "0.6rem", color: "#687860", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px", fontFamily: "'Inter',sans-serif" }}>
          {product.brand_name}
        </p>
        <p
          style={{
            fontSize:            "0.78rem",
            fontWeight:          700,
            color:               "#1A3028",
            lineHeight:          1.4,
            marginBottom:        "6px",
            fontFamily:          "'Playfair Display',Georgia,serif",
            display:             "-webkit-box",
            WebkitLineClamp:     2,
            WebkitBoxOrient:     "vertical",
            overflow:            "hidden"
          }}
        >
          {product.product_title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`${product.product_id}-star-${i}`} style={{ color: i < roundedRating ? "#C9A84C" : "#E5E5E5", fontSize: "11px" }}>
              ★
            </span>
          ))}
          <span style={{ fontSize: "10px", color: "#687860", fontFamily: "'Inter',sans-serif" }}>
            ({product.review_count ?? 0})
          </span>
        </div>
        {product.price != null ? (
          <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1A3028", fontFamily: "'Playfair Display',Georgia,serif" }}>
            ${Number(product.price).toFixed(2)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
