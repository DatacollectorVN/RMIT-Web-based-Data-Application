import math
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from opensearch.client import get_opensearch
from schemas.photo import PhotoResponse, PhotoUpdate
from schemas.product import ProductCreate, ProductResponse, ProductUpdate
from repositories import product_repo
from services import product_service, search_service

router = APIRouter(prefix="/products", tags=["products"])


def _product_detail_response(product, review_stats: dict | None = None) -> ProductResponse:
    """Build detail DTO: only active photos; ``photo_url`` is computed on ``ProductResponse``."""
    photos = getattr(product, "photos", None) or []
    active = [p for p in photos if p.is_active]
    s = (review_stats or {}).get(product.id, {})
    return ProductResponse(
        id=product.id,
        brand=product.brand,
        name=product.name,
        description=product.description,
        price=product.price,
        category=product.category,
        created_at=product.created_at,
        updated_at=product.updated_at,
        photos=[PhotoResponse.model_validate(p) for p in active],
        review_count=s.get("review_count", 0),
        avg_rating=s.get("avg_rating"),
    )


# --- Combined add-product (product + optional photo in one multipart request) ---

@router.post("/add-product", status_code=201, summary="Create product with optional photo")
async def add_product(
    request: Request,
    brand: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    price: Decimal = Form(...),
    category: str = Form(...),
    file: UploadFile | None = File(None, description="Optional primary product image"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = ProductCreate(brand=brand, name=name, description=description, price=price, category=category)
    os_client = get_opensearch(request)
    product = await product_service.add_product_with_photo(db, os_client, data, file)
    return {"data": ProductResponse.model_validate(product)}


# --- Product CRUD ---

@router.get("/")
async def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    brand: str | None = Query(None, description="Filter by brand name"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    products, total = await product_service.list_products(db, page, limit, brand)
    stats = await product_repo.get_review_stats(db, [p.id for p in products])
    return {
        "data": {
            "total": total,
            "total_pages": math.ceil(total / limit),
            "page": page,
            "limit": limit,
            "items": [_product_detail_response(p, stats) for p in products],
        }
    }


@router.get("/search", summary="Search products by name (OpenSearch)")
async def search_products(
    request: Request,
    q: str = Query("", description="Search text matched against product name"),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    os_client = get_opensearch(request)
    products, total = await search_service.search_products_by_name(os_client, db, q, size=limit)
    stats = await product_repo.get_review_stats(db, [p.id for p in products])
    return {
        "data": {
            "total": total,
            "total_pages": math.ceil(total / limit),
            "limit": limit,
            "items": [_product_detail_response(p, stats) for p in products],
        }
    }


@router.get("/{product_id}")
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    product = await product_service.get_product(db, product_id)
    stats = await product_repo.get_review_stats(db, [product_id])
    return {"data": _product_detail_response(product, stats)}


@router.post("/", status_code=201)
async def create_product(
    body: ProductCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    os_client = get_opensearch(request)
    product = await product_service.create_product(db, os_client, body)
    return {"data": ProductResponse.model_validate(product)}


@router.patch("/{product_id}")
async def update_product(
    product_id: int,
    body: ProductUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    os_client = get_opensearch(request)
    product = await product_service.update_product(db, os_client, product_id, body)
    return {"data": ProductResponse.model_validate(product)}


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    os_client = get_opensearch(request)
    await product_service.delete_product(db, os_client, product_id)
    return {"data": {"deleted": True, "id": product_id}}


# --- Photo sub-resource ---

@router.get("/{product_id}/photos")
async def list_photos(
    product_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    photos = await product_service.list_photos(db, product_id)
    return {"data": [PhotoResponse.model_validate(p) for p in photos]}


@router.post("/{product_id}/photos", status_code=201)
async def create_photo(
    product_id: int,
    file: UploadFile = File(..., description="Image file to upload (saved as .png)"),
    is_primary: bool = Form(False),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    db: AsyncSession = Depends(get_db),
) -> dict:
    photo = await product_service.create_photo(
        db, product_id, file, is_primary, sort_order, is_active
    )
    return {"data": PhotoResponse.model_validate(photo)}


@router.patch("/{product_id}/photos/{photo_id}")
async def update_photo(
    product_id: int,
    photo_id: int,
    body: PhotoUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    photo = await product_service.update_photo(db, product_id, photo_id, body)
    return {"data": PhotoResponse.model_validate(photo)}


@router.delete("/{product_id}/photos/{photo_id}")
async def delete_photo(
    product_id: int,
    photo_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await product_service.delete_photo(db, product_id, photo_id)
    return {"data": {"deleted": True, "id": photo_id}}
