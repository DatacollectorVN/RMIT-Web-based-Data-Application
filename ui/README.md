# GlowShop — Frontend

React + TypeScript single-page app built with Vite.

---

## Folder structure

```
ui/
├── src/
│   ├── main.tsx              # React entry point (BrowserRouter setup)
│   ├── App.tsx               # Thin shell: promo banner + NavBar + routes + footer
│   ├── types.ts              # Shared TypeScript types (Product, AuthUser, Review, …)
│   ├── api.ts                # All backend API calls + type mappers + product cache
│   │
│   ├── hooks/
│   │   └── useAuth.ts        # Auth state + localStorage persistence
│   │
│   ├── pages/
│   │   ├── BuyerPage.tsx     # Public shop: hero banner, search, brand pills, product grid
│   │   ├── ManagePage.tsx    # Customer/admin workspace: BuyerPage + ProductFormPanel
│   │   └── LoginPage.tsx     # Login form → calls useAuth.login()
│   │
│   └── components/
│       ├── NavBar.tsx            # Sticky navigation bar with role-based links + avatar menu
│       ├── ProductCard.tsx       # Individual product card used in the grid
│       ├── ProductDetailPage.tsx # Full product detail: gallery, reviews, similar products
│       ├── ProductFormPanel.tsx  # Create / update / delete form (used in ManagePage)
│       ├── CheckoutPage.tsx      # Order form + summary; product passed via router state
│       └── RoleBadge.tsx         # Small role label badge (buyer / customer / admin)
```

---

## Routing

| Path | Access | Component |
|------|--------|-----------|
| `/` | public | Redirects to `/buyer` |
| `/buyer` | public | `BuyerPage` |
| `/product/:id` | public | `ProductDetailPage` |
| `/checkout` | public | `CheckoutPage` |
| `/login` | public | `LoginPage` |
| `/customer` | customer or admin | `ManagePage` |
| `/admin` | admin only | `ManagePage` |
| `*` | — | Redirects to `/buyer` |

---

## Authentication

Auth state is managed by `hooks/useAuth.ts`:

- Stored in **`localStorage`** under the key `authUser` — survives page refresh.
- `login(email, password)` calls `POST /api/v1/auth/login` and stores the returned `{ id, username, role }`.
- `logout()` clears the stored session.
- `authUser.id` is used by `ProductDetailPage` to enable **personalised recommendations** (`?user_id=X`).

Demo accounts (password set during seed — check `generate_seed.py` for the hash):
- `alice@example.com` → buyer (id 1)
- `bob@example.com` → seller/customer (id 2)

---

## Data flow

```
useAuth (hook)
  └─ authUser → App → NavBar, all page components

BuyerPage (self-contained)
  ├─ owns: items, brands, brand filter, query, loading, error
  ├─ fetchProducts / searchProducts → api.ts
  └─ ProductCard × N
       └─ onSelect → navigate to /product/:id  (buyer mode)
                   → onProductSelect callback  (manage mode)

ManagePage
  ├─ owns: selectedProduct, refreshKey
  ├─ BuyerPage (with onProductSelect + selectedProductId props)
  └─ ProductFormPanel (create / update / delete)

ProductDetailPage (self-contained)
  ├─ fetchProductById, fetchSimilarProducts(…, authUser.id), fetchProductReviews
  └─ "You might also love" section with real KNN similarity scores

CheckoutPage (self-contained)
  ├─ owns: form state, message state
  └─ selectedProduct read from React Router location.state
       navigate("/checkout", { state: { product } })
```

---

## API layer (`api.ts`)

All backend calls live here. Key functions:

| Function | Endpoint | Notes |
|----------|----------|-------|
| `login(email, password)` | `POST /api/v1/auth/login` | Returns `AuthUser` with `id` |
| `fetchProductsPage(page, limit)` | `GET /api/v1/products/` | Server-side pagination |
| `fetchProducts(limit, offset, brand?)` | local cache | Client-side slice of cached list |
| `fetchProductById(id)` | `GET /api/v1/products/:id` | Single product |
| `searchProducts(q)` | `GET /api/v1/products/search` | Semantic + keyword search |
| `fetchSimilarProducts(id, k, userId?)` | `GET /api/v1/recommendations/similar/:id` | KNN + profile re-ranking |
| `fetchProductReviews(id, limit)` | `GET /api/v1/reviews/` | Paginated reviews |
| `createReview(productId, payload)` | `POST /api/v1/reviews/` | |
| `createProduct / updateProduct / deleteProduct` | `POST/PATCH/DELETE /api/v1/products/` | Admin/customer only |

Products are cached in memory for 60 s. The cache is invalidated on any write operation.

---

## Running locally

```bash
# From the repo root
cd ui
npm install
npm run dev       # Vite dev server on http://localhost:3000
```

The Vite dev server proxies `/api/*` to the FastAPI backend on `http://localhost:8080`.
Make sure the backend and OpenSearch containers are running:

```bash
docker compose up -d
make -C app reindexproducts   # populate OpenSearch vectors (first run only)
```

---

## Adding a new page

1. Create `src/pages/MyPage.tsx` — manage its own state, call `api.ts` directly.
2. Add a `<Route path="/my-path" element={<MyPage authUser={authUser} />} />` in `App.tsx`.
3. Add a nav link in `NavBar.tsx` if needed.

No global state management library is used — state is local to each page component. If two pages need to share state, lift it into `App.tsx` and pass as props.
