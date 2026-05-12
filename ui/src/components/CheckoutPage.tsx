import { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUser, CheckoutInput, Product } from "../types";
import { resolveImageUrl } from "../api";

type Props = {
  selectedProduct: Product | null;
  checkoutForm: CheckoutInput;
  setCheckoutForm: React.Dispatch<React.SetStateAction<CheckoutInput>>;
  onAddToCart: () => Promise<void>;
  onCheckout: (e: FormEvent) => Promise<void>;
  actionMessage: string | null;
  authUser: AuthUser | null;
};

export default function CheckoutPage({
  selectedProduct,
  checkoutForm,
  setCheckoutForm,
  onAddToCart,
  onCheckout,
  actionMessage,
  authUser,
}: Props) {
  const navigate = useNavigate();
  const isGuest = authUser == null;

  return (
    <div style={{ background: "#F4F5EE", minHeight: "100vh" }}>
      <section
        style={{
          background: "linear-gradient(135deg, #1A3028 0%, #2C5F3E 60%, #3A7D52 100%)",
          padding: "52px 24px 44px",
          textAlign: "center",
        }}
      >
        <span style={{ display: "inline-block", background: "rgba(168,216,184,0.18)", color: "#A8D8B8", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", padding: "4px 14px", borderRadius: 20, marginBottom: 14 }}>
          Secure Checkout
        </span>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" }}>
          Complete Your Order
        </h1>
        <p style={{ color: "#A8D8B8", fontSize: 13, margin: 0 }}>
          Review your item and fill in your shipping details below.
        </p>
      </section>

      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #D4DCC8", padding: "10px 28px", fontSize: 11, color: "#687860", display: "flex", gap: 6, alignItems: "center" }}>
        <Link to="/"      style={{ color: "#3A7D52", textDecoration: "none" }}>Home</Link>
        <span>›</span>
        <Link to="/buyer" style={{ color: "#3A7D52", textDecoration: "none" }}>Shop</Link>
        <span>›</span>
        <span style={{ color: "#1A3028", fontWeight: 600 }}>Checkout</span>
      </div>

      <div style={{ maxWidth: 960, margin: "36px auto", padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        {/* Left — Shipping form */}
        <div>
          <div style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "28px 28px 24px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A3028", marginBottom: 4 }}>
              Shipping & Payment
            </h2>
            <p style={{ fontSize: 12, color: "#687860", marginBottom: 22 }}>
              {isGuest ? "Checking out as guest." : `Logged in as ${authUser?.username}.`}
            </p>

            <form onSubmit={onCheckout}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Full Name",         key: "full_name",  type: "text",  placeholder: "e.g. Mai Phan" },
                  { label: "Email",             key: "email",      type: "email", placeholder: "e.g. mai@example.com" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#1A3028", display: "block", marginBottom: 4, letterSpacing: "0.3px", textTransform: "uppercase" }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      value={checkoutForm[key as keyof CheckoutInput]}
                      onChange={(e) => setCheckoutForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={inputStyle}
                      required
                    />
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#1A3028", display: "block", marginBottom: 4, letterSpacing: "0.3px", textTransform: "uppercase" }}>
                    Shipping Address
                  </label>
                  <textarea
                    value={checkoutForm.address}
                    onChange={(e) => setCheckoutForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street, City, State, Postcode"
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#1A3028", display: "block", marginBottom: 4, letterSpacing: "0.3px", textTransform: "uppercase" }}>
                    Payment Method
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {(["card", "paypal", "cod"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setCheckoutForm((prev) => ({ ...prev, payment_method: method }))}
                        style={{
                          border:      `2px solid ${checkoutForm.payment_method === method ? "#3A7D52" : "#D4DCC8"}`,
                          background:  checkoutForm.payment_method === method ? "#EAF4EE" : "#FFFFFF",
                          color:       checkoutForm.payment_method === method ? "#1A3028" : "#687860",
                          borderRadius: 6,
                          padding:     "10px 6px",
                          fontSize:    12,
                          fontWeight:  checkoutForm.payment_method === method ? 700 : 500,
                          cursor:      "pointer",
                          transition:  "all 0.15s",
                          textAlign:   "center",
                        }}
                      >
                        {method === "card" ? "💳 Card" : method === "paypal" ? "🅿️ PayPal" : "💵 Cash on Delivery"}
                      </button>
                    ))}
                  </div>
                </div>

                {actionMessage ? (
                  <p style={{ fontSize: 12, color: "#3A7D52", background: "#EAF4EE", border: "1px solid #A8D8B8", borderRadius: 6, padding: "8px 12px", margin: 0 }}>
                    {actionMessage}
                  </p>
                ) : null}

                <button type="submit" style={{ background: "#1A3028", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "14px", fontSize: 12, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer", marginTop: 4 }}>
                  Place Order →
                </button>
                <button type="button" onClick={() => navigate("/buyer")} style={{ background: "none", border: "1.5px solid #D4DCC8", borderRadius: 4, padding: "10px", fontSize: 11, fontWeight: 600, color: "#687860", cursor: "pointer", letterSpacing: "0.5px" }}>
                  ← Back to Shopping
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right — Order summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "22px" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: "#1A3028", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #E8EDD8" }}>
              Order Summary
            </h3>
            {selectedProduct ? (
              <>
                <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 6, overflow: "hidden", background: selectedProduct.brand_bg ?? "#EDE5DA", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selectedProduct.image_local ? (
                      <img src={resolveImageUrl(selectedProduct.image_local)} alt={selectedProduct.product_title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span style={{ fontSize: 28 }}>{selectedProduct.brand_emoji ?? "🛍️"}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1A3028", lineHeight: 1.4, marginBottom: 4 }}>{selectedProduct.product_title}</p>
                    <p style={{ fontSize: 11, color: "#687860", marginBottom: 6 }}>{selectedProduct.brand_name}</p>
                    {selectedProduct.price != null && (
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#1A3028" }}>₹{selectedProduct.price.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #E8EDD8", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    ["Subtotal", `₹${selectedProduct.price?.toLocaleString() ?? "—"}`],
                    ["Shipping", selectedProduct.price != null && selectedProduct.price >= 999 ? "Free" : "₹99"],
                    ["Total",    selectedProduct.price != null ? `₹${(selectedProduct.price + (selectedProduct.price >= 999 ? 0 : 99)).toLocaleString()}` : "—"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: label === "Total" ? 13 : 12 }}>
                      <span style={{ color: "#687860", fontWeight: label === "Total" ? 700 : 400 }}>{label}</span>
                      <span style={{ color: "#1A3028", fontWeight: label === "Total" ? 700 : 500 }}>{value}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={onAddToCart} style={{ width: "100%", marginTop: 14, background: "#3A7D52", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer" }}>
                  Add to Cart
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 13, color: "#687860", marginBottom: 14 }}>No product selected.</p>
                <Link to="/buyer" style={{ background: "#1A3028", color: "#FFFFFF", textDecoration: "none", padding: "10px 20px", fontSize: 11, fontWeight: 600, borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Browse Products
                </Link>
              </div>
            )}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["🔒", "Secure 256-bit SSL encryption"],
              ["🚚", "Free shipping on orders over ₹999"],
              ["↩️", "Easy 30-day returns"],
            ].map(([icon, text]) => (
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

const inputStyle: React.CSSProperties = {
  width:      "100%",
  border:     "1.5px solid #D4DCC8",
  borderRadius: 4,
  padding:    "10px 12px",
  fontSize:   13,
  color:      "#1A3028",
  background: "#FAFAF8",
  outline:    "none",
  boxSizing:  "border-box",
};
