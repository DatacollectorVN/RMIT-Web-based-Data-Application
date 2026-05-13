import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

import { useAuth } from "./hooks/useAuth";
import NavBar from "./components/NavBar";
import ProductDetailPage from "./components/ProductDetailPage";
import CheckoutPage from "./components/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import BuyerPage from "./pages/BuyerPage";
import DashboardPage from "./pages/DashboardPage";
import MyReviewsPage from "./pages/MyReviewsPage";

export default function App() {
  const { authUser, login, logout } = useAuth();
  const location = useLocation();

  useEffect(() => { /* reserve for future global navigation side-effects */ }, [location.pathname]);

  return (
    <div style={{ background: "#F4F5EE", color: "#1A3028", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <PromoBanner />
      <NavBar authUser={authUser} onLogout={logout} />

      <main>
        <Routes>
          {/* Default: redirect root to buyer shop */}
          <Route path="/"         element={<Navigate to="/buyer" replace />} />

          {/* Public pages */}
          <Route path="/buyer"    element={<BuyerPage authUser={authUser} />} />
          <Route path="/product/:productId" element={<ProductDetailPage authUser={authUser} />} />
          <Route path="/checkout" element={<CheckoutPage authUser={authUser} />} />
          <Route path="/login"    element={<LoginPage onLogin={login} />} />

          {/* Protected: my reviews */}
          <Route
            path="/my-reviews"
            element={
              authUser
                ? <MyReviewsPage authUser={authUser} />
                : <Navigate to="/login" replace />
            }
          />

          {/* Protected: admin dashboard */}
          <Route
            path="/admin"
            element={
              authUser?.role === "admin"
                ? <DashboardPage />
                : <Navigate to="/login" replace />
            }
          />

          {/* 404: send back to shop */}
          <Route path="*" element={<Navigate to="/buyer" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

// ── Layout sub-components ────────────────────────────────────────────────────

function PromoBanner() {
  return (
    <div style={{ background: "#2C5F3E", padding: "7px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", animation: "ticker 28s linear infinite", fontSize: 11, color: "#FFFFFF", fontWeight: 500 }}>
        {[0, 1].map(i => (
          <span key={i} style={{ display: "flex", gap: 56 }}>
            <span>Free shipping on orders over $999</span>
            <span>20% off new accounts — use <span style={{ color: "#A8D8B8", textDecoration: "underline" }}>GLOW20</span></span>
            <span>AI-powered beauty discovery platform</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#1A3028", color: "#A8D8B8", marginTop: 80, padding: "48px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
        <div>
          <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>GlowShop</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>AI-powered cosmetics discovery platform. Powered by FastAPI + OpenSearch.</p>
        </div>
        <div>
          <h4 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: 12 }}>Explore</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, listStyle: "none", padding: 0, margin: 0 }}>
            <li><a href="/buyer"                    style={footerLink}>All Products</a></li>
            <li><a href={`${import.meta.env.VITE_API_HOST ?? "http://localhost:8080"}/docs`} style={footerLink}>API Docs</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: 12 }}>Account</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, listStyle: "none", padding: 0, margin: 0 }}>
            <li><a href="/login"    style={footerLink}>Login</a></li>
            <li><a href="/checkout" style={footerLink}>Checkout</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

const footerLink: React.CSSProperties = { color: "#A8D8B8", textDecoration: "none" };
