import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addToCart,
  checkout,
  createProduct,
  createReview,
  deleteProduct,
  fetchCartCount,
  fetchBrands,
  fetchProductById,
  fetchProducts,
  login,
  searchProducts,
  updateProduct
} from "./api";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import ProductDetailPage from "./components/ProductDetailPage";
import CheckoutPage from "./components/CheckoutPage";
import ProductCard from "./components/ProductCard";
import RoleBadge from "./components/RoleBadge";
import type { AuthUser, CheckoutInput, Product, ProductInput, ReviewInput, UserRole } from "./types";

export default function App() {
  const [items, setItems]               = useState<Product[]>([]);
  const [brands, setBrands]             = useState<string[]>([]);
  const [brand, setBrand]               = useState<string>("");
  const [query, setQuery]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [searchError, setSearchError]   = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionMessage, setActionMessage]     = useState<string | null>(null);
  const [authUser, setAuthUser]         = useState<AuthUser | null>(null);
  const [loginForm, setLoginForm]       = useState({ username: "", password: "", role: "buyer" as UserRole });
  const [loginError, setLoginError]     = useState<string | null>(null);
  const [cartCount, setCartCount]       = useState(0);
  const [avatarOpen, setAvatarOpen]     = useState(false);
  const [reviewForm, setReviewForm]     = useState<ReviewInput>({ title: "", body: "", rating: 5, predicted_label: "buy", override_label: "" });
  const [checkoutForm, setCheckoutForm] = useState<CheckoutInput>({ full_name: "", email: "", address: "", payment_method: "card" });
  const [productForm, setProductForm]   = useState<ProductInput>({ product_title: "", brand_name: "", price: 0, product_tags: "", image_local: "" });
  const navigate  = useNavigate();
  const location  = useLocation();
  const isHome    = location.pathname === "/";

  const load = async () => {
    setLoading(true);
    setSearchError(null);
    try {
      const data = await fetchProducts(24, 0, brand || undefined);
      setItems(data.items);
    } catch {
      setSearchError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [brand]);

  useEffect(() => {
    fetchBrands().then(setBrands).catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (location.pathname !== "/buyer") return;
    const params          = new URLSearchParams(location.search);
    const incomingBrand   = params.get("brand");
    const incomingProductId = params.get("productId");
    const action          = params.get("action");

    if (incomingBrand) setBrand(incomingBrand);

    if (incomingProductId) {
      fetchProductById(incomingProductId)
        .then((p) => {
          setSelectedProduct(p);
          if (action === "review") {
            setTimeout(() => { document.getElementById("buyer-review-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
          }
          if (action === "cart") {
            setTimeout(() => { document.getElementById("buyer-cart-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
          }
        })
        .catch(() => undefined);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!selectedProduct) return;
    setProductForm({
      product_title: selectedProduct.product_title,
      brand_name:    selectedProduct.brand_name,
      price:         selectedProduct.price ?? 0,
      product_tags:  selectedProduct.product_tags ?? "",
      image_local:   selectedProduct.image_local ?? ""
    });
  }, [selectedProduct]);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    if (!query.trim()) { void load(); return; }
    setLoading(true);
    try {
      const data = await searchProducts(query.trim());
      setItems(data);
    } catch {
      setSearchError("Search failed. Please try another keyword.");
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setActionMessage(null);
    try {
      const user = await login(loginForm.username, loginForm.password, loginForm.role);
      setAuthUser(user);
      setActionMessage(`Logged in as ${user.role}.`);
      navigate(user.role === "admin" ? "/admin" : user.role === "customer" ? "/customer" : "/buyer");
    } catch {
      // No auth endpoint — use local session
      setAuthUser({ username: loginForm.username || "demo-user", role: loginForm.role });
      setActionMessage(`Using local ${loginForm.role} session (no auth backend in this phase).`);
      setLoginError("Backend auth not available — local session activated.");
      navigate(loginForm.role === "admin" ? "/admin" : loginForm.role === "customer" ? "/customer" : "/buyer");
    }
  };

  const onLogout = () => {
    setAuthUser(null);
    setActionMessage("Logged out. Browsing as guest.");
    navigate("/");
  };

  const onSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setActionMessage(null);
    try {
      await createReview(selectedProduct.product_id, reviewForm, authUser?.token);
      setActionMessage("Review submitted successfully.");
      setReviewForm((prev) => ({ ...prev, title: "", body: "" }));
    } catch (error) {
      setActionMessage(`Review failed: ${(error as Error).message}`);
    }
  };

  const onAddToCart = async () => {
    if (!selectedProduct) return;
    setActionMessage(null);
    try {
      await addToCart(selectedProduct.product_id, 1, authUser?.token);
      setCartCount(c => c + 1);
      setActionMessage(`${selectedProduct.product_title} added to bag!`);
    } catch (error) {
      setActionMessage(`Add-to-cart failed: ${(error as Error).message}`);
    }
  };

  // BUG 3 fix: quick-select from + button also adds to cart and shows badge
  const onQuickAddToCart = async (product: Product) => {
    setSelectedProduct(product);
    try {
      await addToCart(product.product_id, 1, authUser?.token);
      setCartCount(c => c + 1);
      setActionMessage(`${product.product_title} added to bag!`);
    } catch {
      // ignore
    }
  };

  const onCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await checkout(checkoutForm, authUser?.token);
      setActionMessage("Order placed successfully!");
    } catch (error) {
      setActionMessage(`Checkout failed: ${(error as Error).message}`);
    }
  };

  const onCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await createProduct(productForm, authUser?.token);
      setActionMessage("Product created successfully.");
      void load();
    } catch (error) {
      setActionMessage(`Create failed: ${(error as Error).message}`);
    }
  };

  const onUpdateProduct = async () => {
    if (!selectedProduct) return;
    setActionMessage(null);
    try {
      await updateProduct(selectedProduct.product_id, productForm, authUser?.token);
      setActionMessage("Product updated successfully.");
      void load();
    } catch (error) {
      setActionMessage(`Update failed: ${(error as Error).message}`);
    }
  };

  const onDeleteProduct = async () => {
    if (!selectedProduct) return;
    setActionMessage(null);
    try {
      await deleteProduct(selectedProduct.product_id, authUser?.token);
      setActionMessage("Product deleted.");
      setSelectedProduct(null);
      void load();
    } catch (error) {
      setActionMessage(`Delete failed: ${(error as Error).message}`);
    }
  };

  const featured    = useMemo(() => items.slice(0, 8), [items]);
  const shownBrands = useMemo(() => brands.slice(0, 16), [brands]);
  const activeRole: UserRole = authUser?.role ?? "buyer";
  const isGuest = authUser == null;
  const HOME_NAV_LINKS = [
    { id: "products", href: "#products-section", label: "Products" },
    { id: "brands",   href: "#brands-section",   label: "Brands" }
  ];

  useEffect(() => { setAvatarOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!authUser?.token) { setCartCount(0); return; }
    fetchCartCount(authUser.token).then(setCartCount).catch(() => setCartCount(0));
  }, [authUser]);

  // Suppress unused variable warning for featured
  void featured;

  const roleWorkspace = (mode: "buyer" | "customer" | "admin") => {
    const canManageProducts = mode === "customer" || mode === "admin";

    return (
      <>
        {/* ── Banner — matches home page green palette ── */}
        <div style={{ background: "linear-gradient(135deg,#1A3028 0%,#2C5F3E 60%,#3A7D52 100%)", padding: "36px 28px 32px" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 1.5, background: "#A8D8B8" }} />
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#A8D8B8" }}>
                {brand ? "Brand Collection" : mode === "admin" ? "Admin" : mode === "customer" ? "Seller" : "Shop"}
              </span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 800, color: "#FFFFFF", margin: "0 0 6px", lineHeight: 1.2 }}>
              {brand || "All Products"}
            </h1>
            <p style={{ fontSize: 12, color: "#D4DCC8", margin: 0 }}>
              {brand ? `Explore the full ${brand} collection.` : "Discover beauty products from top brands."}
            </p>
          </div>
        </div>

        {/* ── Search + brand filter bar — matches home page style ── */}
        <div style={{ background: "#E8EDD8", padding: "12px 28px", borderBottom: "1px solid #D4DCC8" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <form onSubmit={onSearch} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#687860" strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search brands, products..."
                  style={{ width: "100%", border: "1.5px solid #D4DCC8", borderRadius: 2, padding: "9px 12px 9px 34px", fontSize: 12, background: "#FFFFFF", color: "#1A3028", boxSizing: "border-box" }}
                />
              </div>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                style={{ border: "1.5px solid #D4DCC8", borderRadius: 2, padding: "9px 12px", fontSize: 12, background: "#FFFFFF", color: "#1A3028" }}
              >
                <option value="">All brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <button type="submit" style={{ background: "#3A7D52", color: "#FFFFFF", border: "none", borderRadius: 2, padding: "9px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", cursor: "pointer" }}>
                Search
              </button>
              {(brand || query) && (
                <button type="button" onClick={() => { setBrand(""); setQuery(""); void load(); }} style={{ background: "none", border: "1.5px solid #D4DCC8", borderRadius: 2, padding: "9px 14px", fontSize: 11, color: "#687860", cursor: "pointer" }}>
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>

        {/* ── Brand pills ── */}
        <div style={{ background: "#FFFFFF", padding: "10px 28px", borderBottom: "1px solid #D4DCC8", display: "flex", gap: 8, overflowX: "auto" }}>
          <button
            type="button"
            onClick={() => setBrand("")}
            style={{ border: `1.5px solid ${!brand ? "#1A3028" : "#D4DCC8"}`, background: !brand ? "#1A3028" : "#FFFFFF", color: !brand ? "#FFFFFF" : "#1A3028", fontSize: 11, fontWeight: 500, padding: "5px 16px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            All
          </button>
          {shownBrands.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBrand(b)}
              style={{ border: `1.5px solid ${brand === b ? "#3A7D52" : "#D4DCC8"}`, background: brand === b ? "#3A7D52" : "#FFFFFF", color: brand === b ? "#FFFFFF" : "#1A3028", fontSize: 11, fontWeight: 500, padding: "5px 16px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}
            >
              {b}
            </button>
          ))}
        </div>

        {/* ── Status messages ── */}
        {(actionMessage || searchError || loading) && (
          <div style={{ maxWidth: 1180, margin: "12px auto 0", padding: "0 28px" }}>
            {actionMessage && <p style={{ fontSize: 12, color: "#2D6A4F", background: "#EAF4EE", border: "1px solid #A8D8B8", borderRadius: 4, padding: "8px 12px", margin: "0 0 6px" }}>{actionMessage}</p>}
            {searchError   && <p style={{ fontSize: 12, color: "#C0392B", background: "#FDECEA", border: "1px solid #F5A7A5", borderRadius: 4, padding: "8px 12px", margin: "0 0 6px" }}>{searchError}</p>}
            {loading       && <p style={{ fontSize: 12, color: "#687860", padding: "4px 0" }}>Loading products...</p>}
          </div>
        )}

        {/* ── Product grid — same card style as home page ── */}
        <div style={{ maxWidth: 1180, margin: "20px auto", padding: "0 20px" }}>
          {items.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#687860" }}>
              <p style={{ fontSize: 16 }}>No products found.</p>
              {(brand || query) && <p style={{ fontSize: 13, marginTop: 6 }}>Try clearing the filter above.</p>}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {items.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                selected={selectedProduct?.product_id === product.product_id}
                onSelect={() => navigate(`/product/${product.product_id}`)}
                onQuickSelect={(p) => void onQuickAddToCart(p)}
              />
            ))}
          </div>
        </div>

        {/* ── Product management (admin / customer only) ── */}
        {canManageProducts ? (
          <div style={{ maxWidth: 1180, margin: "20px auto 40px", padding: "0 20px" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 4, padding: "24px" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#1A3028", margin: "0 0 4px" }}>Product Management</h2>
              <p style={{ fontSize: 12, color: "#687860", margin: "0 0 16px" }}>Select a product card above → fill form → Add / Update / Delete</p>
              <form style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} onSubmit={onCreateProduct}>
                <input value={productForm.product_title} onChange={(e) => setProductForm((p) => ({ ...p, product_title: e.target.value }))} placeholder="Product name *" style={mgmtInput} required />
                <input value={productForm.brand_name}    onChange={(e) => setProductForm((p) => ({ ...p, brand_name:    e.target.value }))} placeholder="Brand name *"    style={mgmtInput} required />
                <input type="number" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: Number(e.target.value) }))} placeholder="Price *" style={mgmtInput} required />
                <input value={productForm.image_local ?? ""} onChange={(e) => setProductForm((p) => ({ ...p, image_local: e.target.value }))} placeholder="Image path (optional)" style={mgmtInput} />
                <input value={productForm.product_tags ?? ""} onChange={(e) => setProductForm((p) => ({ ...p, product_tags: e.target.value }))} placeholder="Description (optional)" style={{ ...mgmtInput, gridColumn: "1 / -1" }} />
                <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="submit" style={{ background: "#1A3028", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add Product</button>
                  <button type="button" onClick={() => void onUpdateProduct()} disabled={!selectedProduct} style={{ background: "#3A7D52", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: selectedProduct ? 1 : 0.4 }}>Update Selected</button>
                  <button type="button" onClick={onDeleteProduct} disabled={!selectedProduct} style={{ background: "#C0392B", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: selectedProduct ? 1 : 0.4 }}>Delete Selected</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const mgmtInput: React.CSSProperties = {
    border: "1px solid #D4DCC8",
    borderRadius: 4,
    padding: "9px 12px",
    fontSize: 12,
    color: "#1A3028",
    background: "#FAFAF8",
  };

  return (
    <div style={{ background: "#F4F5EE", color: "#1A3028", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* Ticker */}
      <div style={{ background: "#2C5F3E", padding: "7px 0", overflow: "hidden", position: "relative" }}>
        <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", animation: "ticker 28s linear infinite", fontSize: 11, color: "#FFFFFF", fontWeight: 500, letterSpacing: "0.3px" }}>
          {[...Array(2)].map((_, i) => (
            <span key={i} style={{ display: "flex", gap: 56 }}>
              <span>Free shipping on orders over ₹999</span>
              <span>20% off new accounts — use <span style={{ color: "#A8D8B8", textDecoration: "underline" }}>GLOW20</span></span>
              <span>AI-powered beauty discovery platform</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ background: "#FFFFFF", borderBottom: "1px solid #D4DCC8", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
          {HOME_NAV_LINKS.map((link) =>
            isHome ? (
              <a key={link.id} href={link.href} style={{ color: "#1A3028", fontSize: 11.5, fontWeight: 500, letterSpacing: "0.3px", textDecoration: "none" }}>{link.label}</a>
            ) : (
              <NavLink key={link.id} to="/" style={({ isActive }) => ({ color: isActive ? "#3A7D52" : "#1A3028", fontSize: 11.5, fontWeight: isActive ? 600 : 500, letterSpacing: "0.3px", textDecoration: "none", borderBottom: isActive ? "1.5px solid #3A7D52" : "1.5px solid transparent" })}>
                {link.label}
              </NavLink>
            )
          )}
          {(activeRole === "customer" || activeRole === "admin") && (
            <NavLink to="/customer" style={{ color: "#3A7D52", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.3px", textDecoration: "none" }}>+ My Products</NavLink>
          )}
          {activeRole === "admin" && (
            <NavLink to="/admin" style={{ color: "#3A7D52", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.3px", textDecoration: "none" }}>Dashboard</NavLink>
          )}
        </div>

        <NavLink to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1A3028", fontSize: 22, fontWeight: 800, letterSpacing: "1px", textDecoration: "none", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          GlowShop
        </NavLink>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button type="button" onClick={() => navigate("/buyer")} style={{ background: "none", border: "none", cursor: "pointer", color: "#1A3028", padding: 0 }} aria-label="Open search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </button>

          {authUser ? (
            <button type="button" onClick={() => navigate("/buyer")} style={{ background: "none", border: "none", cursor: "pointer", color: "#1A3028", padding: 0, position: "relative" }} aria-label="Open cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
              {cartCount > 0 ? <span style={{ position: "absolute", top: -6, right: -6, background: "#3A7D52", color: "#FFFFFF", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span> : null}
            </button>
          ) : null}

          {authUser ? (
            <button type="button" onClick={() => setAvatarOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }} aria-label="Account menu">
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#D8ECE4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1A4030" }}>
                {(authUser.username?.[0] || "U").toUpperCase()}
              </div>
            </button>
          ) : (
            <button type="button" onClick={() => navigate("/login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#1A3028", padding: 0 }} aria-label="Account">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.7-3.5 5-5 8-5s6.3 1.5 8 5" /></svg>
            </button>
          )}

          {!authUser ? (
            <button type="button" onClick={() => navigate("/login")} style={{ background: "#1A3028", color: "#FFFFFF", border: "none", padding: "7px 16px", fontSize: 10, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", borderRadius: 2, cursor: "pointer" }}>
              Login
            </button>
          ) : null}

          {authUser && avatarOpen ? (
            <div style={{ position: "absolute", right: 20, top: 54, width: 200, background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 4, zIndex: 100, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #E8EDD8" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#1A3028", margin: 0 }}>{authUser.username}</p>
                <div style={{ marginTop: 6 }}><RoleBadge role={activeRole} /></div>
              </div>
              <button type="button" onClick={() => { setAvatarOpen(false); navigate("/buyer"); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: "#1A3028", background: "none", border: "none", borderBottom: "1px solid #F4F5EE", cursor: "pointer" }}>My Orders</button>
              {(activeRole === "customer" || activeRole === "admin") ? (
                <button type="button" onClick={() => { setAvatarOpen(false); navigate("/customer"); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: "#1A3028", background: "none", border: "none", borderBottom: "1px solid #F4F5EE", cursor: "pointer" }}>My Products</button>
              ) : null}
              {activeRole === "admin" ? (
                <button type="button" onClick={() => { setAvatarOpen(false); navigate("/admin"); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: "#1A3028", background: "none", border: "none", borderBottom: "1px solid #F4F5EE", cursor: "pointer" }}>Dashboard</button>
              ) : null}
              <button type="button" onClick={onLogout} style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: "#C0392B", background: "none", border: "none", borderTop: "1px solid #E8EDD8", cursor: "pointer" }}>Sign out</button>
            </div>
          ) : null}
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:productId" element={<ProductDetailPage authUser={authUser} />} />

          <Route path="/login" element={
            <section className="min-h-[70vh] flex items-center justify-center px-4 py-10">
              <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <h1 className="text-3xl font-bold mb-2">Login to GlowShop</h1>
                <p className="text-sm text-gray-600 mb-6">Select your role to open the matching workspace. You can also continue as a guest buyer.</p>
                <form onSubmit={onLogin} className="grid grid-cols-1 gap-3">
                  <input value={loginForm.username} onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="Username" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" required />
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Password" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" required />
                  <select value={loginForm.role} onChange={(e) => setLoginForm((prev) => ({ ...prev, role: e.target.value as UserRole }))} className="border border-gray-300 rounded-xl px-3 py-2 text-sm">
                    <option value="buyer">Buyer</option>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="bg-forest text-white rounded-xl px-4 py-2 text-sm font-semibold">Login</button>
                </form>
                <div className="mt-4">
                  <button type="button" onClick={() => { setAuthUser(null); navigate("/buyer"); }} className="text-sm bg-forest-light text-white px-4 py-2 rounded-lg font-semibold">
                    Continue as Guest Buyer
                  </button>
                </div>
                {loginError   ? <p className="text-xs text-red-600 mt-3">{loginError}</p>    : null}
                {actionMessage ? <p className="text-xs text-green-700 mt-2">{actionMessage}</p> : null}
              </div>
            </section>
          } />

          <Route path="/buyer"    element={roleWorkspace("buyer")} />
          <Route path="/customer" element={authUser && (authUser.role === "customer" || authUser.role === "admin") ? roleWorkspace("customer") : <Navigate to="/login" replace />} />
          <Route path="/admin"    element={authUser?.role === "admin" ? roleWorkspace("admin") : <Navigate to="/login" replace />} />

          <Route path="/checkout" element={
            <CheckoutPage
              selectedProduct={selectedProduct}
              checkoutForm={checkoutForm}
              setCheckoutForm={setCheckoutForm}
              onAddToCart={onAddToCart}
              onCheckout={onCheckout}
              actionMessage={actionMessage}
              authUser={authUser}
            />
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer style={{ background: "#1A3028", color: "#A8D8B8", marginTop: 80, padding: "48px 0" }}>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>GlowShop</h3>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>AI-powered cosmetics discovery platform. Powered by FastAPI + OpenSearch.</p>
          </div>
          <div>
            <h4 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: 12 }}>Explore</h4>
            <ul style={{ fontSize: 13, lineHeight: 1.8 }}>
              <li><a href="/buyer" style={{ color: "#A8D8B8", textDecoration: "none" }}>All Products</a></li>
              <li><a href="/#products-section" style={{ color: "#A8D8B8", textDecoration: "none" }}>Featured</a></li>
              <li><a href="http://localhost:8080/docs" style={{ color: "#A8D8B8", textDecoration: "none" }}>API Docs</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: 12 }}>Brands</h4>
            <ul style={{ fontSize: 13, lineHeight: 1.8 }}>
              {shownBrands.slice(0, 4).map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
