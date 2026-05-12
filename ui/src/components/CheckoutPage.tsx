import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { addToCart, checkout, resolveImageUrl } from "../api";
import type { AuthUser, CheckoutInput, Product } from "../types";

type Props = { authUser: AuthUser | null };

const EMPTY_FORM: CheckoutInput = {
  full_name:      "",
  email:          "",
  address:        "",
  payment_method: "card",
};

/**
 * Checkout page.
 * The product to purchase is passed via React Router location state:
 *   navigate("/checkout", { state: { product } })
 */
export default function CheckoutPage({ authUser }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProduct = (location.state as { product?: Product } | null)?.product ?? null;

  const [form, setForm]       = useState<CheckoutInput>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const notify = (msg: string, err = false) => { setMessage(msg); setIsError(err); };

  const onAddToCart = async () => {
    if (!selectedProduct) return;
    try {
      await addToCart(selectedProduct.product_id, 1, authUser?.token);
      notify(`${selectedProduct.product_title} added to bag!`);
    } catch (err) {
      notify(`Add to cart failed: ${(err as Error).message}`, true);
    }
  };

  const onCheckout = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await checkout(form, authUser?.token);
      notify("Order placed successfully!");
    } catch (err) {
      notify(`Checkout failed: ${(err as Error).message}`, true);
    }
  };

  const price    = selectedProduct?.price ?? 0;
  const shipping = price >= 999 ? 0 : 99;
  const total    = price + shipping;

  return (
    <div style={{ background: "#F4F5EE", minHeight: "100vh" }}>
      {/* Hero */}
      <section style={styles.hero}>
        <span style={styles.heroTag}>Secure Checkout</span>
        <h1 style={styles.heroTitle}>Complete Your Order</h1>
        <p style={styles.heroSub}>Review your item and fill in your shipping details below.</p>
      </section>

      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <Link to="/"      style={styles.breadcrumbLink}>Home</Link> ›{" "}
        <Link to="/buyer" style={styles.breadcrumbLink}>Shop</Link> ›{" "}
        <span style={{ color: "#1A3028", fontWeight: 600 }}>Checkout</span>
      </div>

      {/* Main layout: form (left) + order summary (right) */}
      <div style={styles.layout}>
        {/* Shipping & payment form */}
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Shipping & Payment</h2>
          <p style={styles.sectionSub}>
            {authUser ? `Logged in as ${authUser.username}.` : "Checking out as guest."}
          </p>

          <form onSubmit={onCheckout} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(["full_name", "email"] as const).map(key => (
              <div key={key}>
                <label style={styles.label}>{key === "full_name" ? "Full Name" : "Email"}</label>
                <input
                  type={key === "email" ? "email" : "text"}
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={key === "full_name" ? "e.g. Mai Phan" : "e.g. mai@example.com"}
                  style={styles.input}
                  required
                />
              </div>
            ))}

            <div>
              <label style={styles.label}>Shipping Address</label>
              <textarea
                value={form.address}
                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Street, City, State, Postcode"
                style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                required
              />
            </div>

            <div>
              <label style={styles.label}>Payment Method</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {(["card", "paypal", "cod"] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, payment_method: method }))}
                    style={{
                      border:      `2px solid ${form.payment_method === method ? "#3A7D52" : "#D4DCC8"}`,
                      background:  form.payment_method === method ? "#EAF4EE" : "#FFFFFF",
                      color:       form.payment_method === method ? "#1A3028" : "#687860",
                      borderRadius: 6,
                      padding:     "10px 6px",
                      fontSize:    12,
                      fontWeight:  form.payment_method === method ? 700 : 500,
                      cursor:      "pointer",
                      textAlign:   "center",
                    }}
                  >
                    {method === "card" ? "💳 Card" : method === "paypal" ? "🅿️ PayPal" : "💵 Cash on Delivery"}
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <p style={{ ...styles.feedback, color: isError ? "#C0392B" : "#3A7D52", background: isError ? "#FDECEA" : "#EAF4EE", borderColor: isError ? "#F5A7A5" : "#A8D8B8" }}>
                {message}
              </p>
            )}

            <button type="submit" style={styles.placeOrderBtn}>Place Order →</button>
            <button type="button" onClick={() => navigate("/buyer")} style={styles.backBtn}>← Back to Shopping</button>
          </form>
        </div>

        {/* Order summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>Order Summary</h3>

            {selectedProduct ? (
              <>
                {/* Product row */}
                <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 6, overflow: "hidden", background: selectedProduct.brand_bg ?? "#EDE5DA", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selectedProduct.image_local
                      ? <img src={resolveImageUrl(selectedProduct.image_local)} alt={selectedProduct.product_title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <span style={{ fontSize: 28 }}>{selectedProduct.brand_emoji ?? "🛍️"}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1A3028", lineHeight: 1.4, marginBottom: 4 }}>{selectedProduct.product_title}</p>
                    <p style={{ fontSize: 11, color: "#687860", marginBottom: 6 }}>{selectedProduct.brand_name}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1A3028" }}>${price.toLocaleString()}</p>
                  </div>
                </div>

                {/* Price breakdown */}
                <div style={{ borderTop: "1px solid #E8EDD8", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {([["Subtotal", `$${price.toLocaleString()}`], ["Shipping", shipping === 0 ? "Free" : `$${shipping}`], ["Total", `$${total.toLocaleString()}`]] as const).map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: label === "Total" ? 13 : 12 }}>
                      <span style={{ color: "#687860", fontWeight: label === "Total" ? 700 : 400 }}>{label}</span>
                      <span style={{ color: "#1A3028", fontWeight: label === "Total" ? 700 : 500 }}>{value}</span>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={onAddToCart} style={styles.addToCartBtn}>Add to Cart</button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 13, color: "#687860", marginBottom: 14 }}>No product selected.</p>
                <Link to="/buyer" style={styles.browseLink}>Browse Products</Link>
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div style={styles.trustCard}>
            {[["🔒", "Secure 256-bit SSL encryption"], ["🚚", "Free shipping on orders over $999"], ["↩️", "Easy 30-day returns"]].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 11, color: "#687860" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero:         { background: "linear-gradient(135deg,#1A3028 0%,#2C5F3E 60%,#3A7D52 100%)", padding: "52px 24px 44px", textAlign: "center" },
  heroTag:      { display: "inline-block", background: "rgba(168,216,184,0.18)", color: "#A8D8B8", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", padding: "4px 14px", borderRadius: 20, marginBottom: 14 } as React.CSSProperties,
  heroTitle:    { fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" },
  heroSub:      { color: "#A8D8B8", fontSize: 13, margin: 0 },
  breadcrumb:   { background: "#FFFFFF", borderBottom: "1px solid #D4DCC8", padding: "10px 28px", fontSize: 11, color: "#687860", display: "flex", gap: 6, alignItems: "center" },
  breadcrumbLink: { color: "#3A7D52", textDecoration: "none" },
  layout:       { maxWidth: 960, margin: "36px auto", padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" },
  formCard:     { background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "28px 28px 24px" },
  sectionTitle: { fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#1A3028", marginBottom: 4 },
  sectionSub:   { fontSize: 12, color: "#687860", marginBottom: 22 },
  label:        { fontSize: 11, fontWeight: 600, color: "#1A3028", display: "block", marginBottom: 4, letterSpacing: "0.3px", textTransform: "uppercase" } as React.CSSProperties,
  input:        { width: "100%", border: "1.5px solid #D4DCC8", borderRadius: 4, padding: "10px 12px", fontSize: 13, color: "#1A3028", background: "#FAFAF8", outline: "none", boxSizing: "border-box" } as React.CSSProperties,
  feedback:     { fontSize: 12, border: "1px solid", borderRadius: 6, padding: "8px 12px", margin: 0 },
  placeOrderBtn:{ background: "#1A3028", color: "#FFFFFF", border: "none", borderRadius: 4, padding: 14, fontSize: 12, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer", marginTop: 4 } as React.CSSProperties,
  backBtn:      { background: "none", border: "1.5px solid #D4DCC8", borderRadius: 4, padding: 10, fontSize: 11, fontWeight: 600, color: "#687860", cursor: "pointer", letterSpacing: "0.5px" },
  summaryCard:  { background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: 22 },
  summaryTitle: { fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#1A3028", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #E8EDD8" },
  addToCartBtn: { width: "100%", marginTop: 14, background: "#3A7D52", color: "#FFFFFF", border: "none", borderRadius: 4, padding: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer" } as React.CSSProperties,
  browseLink:   { background: "#1A3028", color: "#FFFFFF", textDecoration: "none", padding: "10px 20px", fontSize: 11, fontWeight: 600, borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase" } as React.CSSProperties,
  trustCard:    { background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 },
};
