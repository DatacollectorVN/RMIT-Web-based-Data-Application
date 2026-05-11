# Product photos (runtime storage)

This directory holds uploaded product image files for local dev and for bind-mounting on EC2. **Do not commit actual uploads** (see root `.gitignore`).

## Layout (recommended)

Store files in a stable, cache-friendly tree:

```text
data/product-photos/
  products/
    {product_id}/
      {photo_id}_{slug-or-hash}.webp   # or .jpg, .png
```

- `product_id` and `photo_id` match PostgreSQL so URLs and backups stay predictable.
- The `photos.url` column in the API should store either:
  - a **path** the app resolves to a file under `PRODUCT_PHOTOS_DIR`, or
  - a **public URL** such as `https://api.yourdomain.com/media/products/123/456_hero.webp` once static serving is wired.

## Docker (same host as UI)

- **Bind mount (recommended on EC2):** `./data/product-photos` on the host → `/var/lib/beauty-app/product-photos` in the `app` container. Persist backups by backing up the host folder.
- Only the **API container** needs read-write access for uploads. The **UI container usually does not need this folder**: the browser loads images via `http(s)` URLs pointing at the API (or a reverse proxy path).

Optional: mount the same directory **read-only** into an `nginx` sidecar or the UI container only if you intentionally serve files from nginx with `alias`; otherwise serve via FastAPI `StaticFiles` or proxy `/media` to the app.

## EC2 (single instance)

1. Create the host path once, e.g. `/opt/beauty-app/data/product-photos`, and use the same bind mount in `docker-compose` (or your orchestration) as in dev.
2. Point `PRODUCT_PHOTOS_DIR` to the in-container path (see `.env.example`).
3. In production, put **nginx** or **ALB** in front: `https://api.example.com` for the app; CORS and image URLs should use that public origin so the UI (served from another port or `ui` container) can display images without direct filesystem access.
