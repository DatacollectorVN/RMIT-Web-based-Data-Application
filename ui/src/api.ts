import type { AuthUser, CheckoutInput, Product, ProductInput, Review, ReviewInput, UserRole } from "./types";

// ----- Brand visual config (backend doesn't have brand_bg / brand_emoji) -----
const BRAND_CONFIG: Record<string, { emoji: string; bg: string; txt: string }> = {
  "Nykaa Cosmetics":       { emoji: "💄", bg: "#F8E8EE", txt: "#8B1A4A" },
  "Kay Beauty":            { emoji: "✨", bg: "#E8EAF6", txt: "#303F9F" },
  "Lakme":                 { emoji: "💋", bg: "#FFF3E0", txt: "#E65100" },
  "Maybelline New York":   { emoji: "🌹", bg: "#FCE4EC", txt: "#880E4F" },
  "Herbal Essences":       { emoji: "🌿", bg: "#E8F5E9", txt: "#2E7D32" },
  "L'Oreal Paris":         { emoji: "🌸", bg: "#F3E5F5", txt: "#6A1B9A" },
  "NYX Professional Makeup": { emoji: "🎨", bg: "#E3F2FD", txt: "#0D47A1" },
  "Nykaa Naturals":        { emoji: "🍃", bg: "#E8F5E9", txt: "#388E3C" },
  "Nivea":                 { emoji: "💙", bg: "#E3F2FD", txt: "#1565C0" },
  "Olay":                  { emoji: "🌟", bg: "#FFF8E1", txt: "#F57F17" },
  "Colorbar":              { emoji: "🎨", bg: "#FFF3E0", txt: "#6D4C41" },
};

function brandConfig(brand: string) {
  return BRAND_CONFIG[brand] ?? { emoji: "🛍️", bg: "#E8EDD8", txt: "#4A5A40" };
}

// ----- Backend → Frontend type mappers -----

type RawProduct = Record<string, unknown>;
type RawReview  = Record<string, unknown>;

function mapProduct(raw: RawProduct): Product {
  const brand  = String(raw.brand ?? "");
  const photos = (raw.photos as Array<{ url: string; is_primary: boolean; is_active: boolean }> | undefined) ?? [];
  const active  = photos.filter(p => p.is_active);
  const primary = active.find(p => p.is_primary) ?? active[0] ?? null;
  // Also accept photo_url from computed field (ProductResponse)
  const photoUrl = primary?.url || (raw.photo_url ? String(raw.photo_url) : null);
  const cfg     = brandConfig(brand);
  return {
    product_id:    String(raw.id),
    product_title: String(raw.name ?? ""),
    brand_name:    brand,
    price:         Number(raw.price ?? 0),
    avg_rating:    null,   // enriched from reviews cache after fetch
    review_count:  0,
    product_tags:  String(raw.category ?? ""),
    description:   raw.description != null ? String(raw.description) : null,
    image_local:   photoUrl,
    img_placeholder: null,
    brand_bg:      cfg.bg,
    brand_txt:     cfg.txt,
    brand_emoji:   cfg.emoji,
  };
}

function mapReview(raw: RawReview): Review {
  return {
    review_id:      String(raw.id),
    product_id:     String(raw.product_id),
    user_id:        raw.user_id != null ? String(raw.user_id) : null,
    review_title:   raw.title != null ? String(raw.title) : null,
    review_text:    String(raw.content ?? ""),
    review_rating:  Number(raw.rating ?? 0),
    is_a_buyer:     raw.final_label === true ? 1 : 0,
    model_predicted: raw.ai_label === true ? 1 : raw.ai_label === false ? 0 : null,
    user_overridden: 0,
    author:         `User #${raw.user_id ?? "anon"}`,
    source:         "GlowShop",
    created_at:     raw.created_at != null ? String(raw.created_at) : undefined,
  };
}

// ----- Image URL resolver -----
export function resolveImageUrl(localPath: string | null | undefined): string {
  if (!localPath) return "";
  return localPath;
}

// ----- Module-level product cache (refreshed every 60 s) -----
let _cache: Product[] | null = null;
let _cacheAt  = 0;

// ----- Review stats cache (avg_rating / review_count per product_id) -----
let _reviewStats: Record<string, { avg_rating: number; review_count: number }> = {};
let _reviewStatsAt = 0;

async function getReviewStats(): Promise<Record<string, { avg_rating: number; review_count: number }>> {
  if (Object.keys(_reviewStats).length > 0 && Date.now() - _reviewStatsAt < 60_000) return _reviewStats;
  try {
    const res = await fetch("/api/v1/reviews/?page=1&limit=500");
    if (!res.ok) return _reviewStats;
    const json = await res.json() as { data: { items: RawReview[] } };
    const items = json.data?.items ?? [];
    const acc: Record<string, { sum: number; count: number }> = {};
    for (const r of items) {
      const pid = String(r.product_id);
      if (!acc[pid]) acc[pid] = { sum: 0, count: 0 };
      acc[pid].sum   += Number(r.rating ?? 0);
      acc[pid].count += 1;
    }
    const result: Record<string, { avg_rating: number; review_count: number }> = {};
    for (const [pid, s] of Object.entries(acc)) {
      result[pid] = { avg_rating: s.count > 0 ? s.sum / s.count : 0, review_count: s.count };
    }
    _reviewStats   = result;
    _reviewStatsAt = Date.now();
    return _reviewStats;
  } catch {
    return _reviewStats;
  }
}

// ----- User name cache (id → display name) -----
let _userNames: Record<string, string> | null = null;

async function getUserNames(): Promise<Record<string, string>> {
  if (_userNames !== null) return _userNames;
  try {
    const res = await fetch("/api/v1/users/?page=1&limit=200");
    if (!res.ok) { _userNames = {}; return _userNames; }
    const json = await res.json() as { data: { items: Array<{ id: number; full_name: string; email: string }> } };
    _userNames = {};
    for (const u of (json.data?.items ?? [])) {
      _userNames[String(u.id)] = u.full_name || u.email || `User #${u.id}`;
    }
    return _userNames;
  } catch {
    _userNames = {};
    return _userNames;
  }
}

async function getAllProducts(): Promise<Product[]> {
  if (_cache && Date.now() - _cacheAt < 60_000) return _cache;
  const res = await fetch("/api/v1/products/?page=1&limit=100");
  if (!res.ok) throw new Error("Failed to fetch products");
  const json     = await res.json() as { data: { items: RawProduct[] } };
  const products = (json.data?.items ?? []).map(mapProduct);

  // Enrich with review stats
  const stats = await getReviewStats();
  for (const p of products) {
    const s = stats[p.product_id];
    if (s) {
      p.avg_rating   = s.avg_rating;
      p.review_count = s.review_count;
    }
  }

  _cache   = products;
  _cacheAt = Date.now();
  return _cache;
}

// ----- Public API functions -----

export async function fetchProducts(
  limit  = 12,
  offset = 0,
  brand?: string
): Promise<{ items: Product[]; total: number }> {
  const all      = await getAllProducts();
  const filtered = brand ? all.filter(p => p.brand_name === brand) : all;
  return { items: filtered.slice(offset, offset + limit), total: filtered.length };
}

export async function fetchProductById(productId: string): Promise<Product> {
  const res = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`);
  if (!res.ok) throw new Error("Failed to fetch product");
  const json = await res.json() as { data: RawProduct };
  const p    = mapProduct(json.data);
  // Enrich with review stats
  const stats = await getReviewStats();
  const s = stats[p.product_id];
  if (s) { p.avg_rating = s.avg_rating; p.review_count = s.review_count; }
  return p;
}

export async function fetchSimilarProducts(productId: string, topK = 4): Promise<Product[]> {
  try {
    const all     = await getAllProducts();
    const current = all.find(p => p.product_id === productId);
    if (!current) return [];
    return all
      .filter(p => p.product_id !== productId && p.brand_name === current.brand_name)
      .slice(0, topK);
  } catch {
    return [];
  }
}

export async function fetchProductReviews(productId: string, limit = 5): Promise<Review[]> {
  const res = await fetch(
    `/api/v1/reviews/?product_id=${encodeURIComponent(productId)}&limit=${limit}&page=1`
  );
  if (!res.ok) return [];
  const json    = await res.json() as { data: { items: RawReview[] } };
  const reviews = (json.data?.items ?? []).map(mapReview);

  // Resolve user names
  const names = await getUserNames();
  for (const r of reviews) {
    if (r.user_id && names[r.user_id]) {
      r.author = names[r.user_id];
    }
  }
  return reviews;
}

export async function searchProducts(q: string): Promise<Product[]> {
  const all   = await getAllProducts();
  const lower = q.toLowerCase();
  return all.filter(
    p =>
      p.product_title.toLowerCase().includes(lower) ||
      p.brand_name.toLowerCase().includes(lower) ||
      (p.product_tags ?? "").toLowerCase().includes(lower) ||
      (p.description ?? "").toLowerCase().includes(lower)
  );
}

export async function fetchBrands(): Promise<string[]> {
  const all    = await getAllProducts();
  const brands = [...new Set(all.map(p => p.brand_name))].filter(Boolean);
  return brands.sort();
}

// ----- Auth -----
export async function login(_username: string, _password: string, _role: UserRole): Promise<AuthUser> {
  throw new Error("No auth endpoint — using local session");
}

// ----- Reviews -----
export async function createReview(
  productId: string,
  payload: ReviewInput,
  _token?: string
): Promise<unknown> {
  const res = await fetch("/api/v1/reviews/", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id:    1,
      product_id: parseInt(productId, 10),
      title:      payload.title || "Review",
      content:    payload.body,
      rating:     payload.rating,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create review");
  }
  // Invalidate review stats cache so counts update
  _reviewStats   = {};
  _reviewStatsAt = 0;
  _cache         = null;
  return res.json();
}

// ----- Cart / Checkout (no backend endpoints — simulate locally) -----
export async function addToCart(
  _productId: string,
  _quantity: number,
  _token?: string
): Promise<unknown> {
  return { success: true };
}

export async function checkout(
  _payload: CheckoutInput,
  _token?: string
): Promise<unknown> {
  return { success: true };
}

// ----- Product management -----
export async function createProduct(payload: ProductInput, _token?: string): Promise<unknown> {
  const res = await fetch("/api/v1/products/", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brand:       payload.brand_name,
      name:        payload.product_title,
      description: payload.product_tags || "No description provided",
      price:       payload.price,
      category:    "General",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create product");
  }
  _cache = null;
  return res.json();
}

export async function updateProduct(
  productId: string,
  payload: ProductInput,
  _token?: string
): Promise<unknown> {
  const body: Record<string, unknown> = {
    brand: payload.brand_name,
    name:  payload.product_title,
    price: payload.price,
  };
  if (payload.product_tags) body.description = payload.product_tags;

  const res = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update product");
  }
  _cache = null;
  return res.json();
}

export async function deleteProduct(productId: string, _token?: string): Promise<unknown> {
  const res = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to delete product");
  }
  _cache = null;
  return res.json();
}

// ----- Misc -----
export async function fetchMyReviews(_token?: string): Promise<Review[]> {
  return [];
}

export async function fetchCartCount(_token?: string): Promise<number> {
  return 0;
}
