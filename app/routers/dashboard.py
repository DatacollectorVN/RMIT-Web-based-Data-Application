from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)) -> dict:
    """KPI summary cards."""
    result = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM users)                          AS total_users,
            (SELECT COUNT(*) FROM products)                       AS total_products,
            (SELECT COUNT(*) FROM orders)                         AS total_orders,
            (SELECT COALESCE(SUM(total_amount), 0) FROM orders)   AS total_revenue,
            (SELECT COALESCE(AVG(total_amount), 0) FROM orders)   AS avg_order_value,
            (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders
    """))
    row = result.mappings().one()
    return {
        "data": {
            "total_users":    int(row["total_users"]),
            "total_products": int(row["total_products"]),
            "total_orders":   int(row["total_orders"]),
            "total_revenue":  float(row["total_revenue"]),
            "avg_order_value": float(row["avg_order_value"]),
            "pending_orders": int(row["pending_orders"]),
        }
    }


@router.get("/monthly-orders")
async def get_monthly_orders(db: AsyncSession = Depends(get_db)) -> dict:
    """Order count + revenue for the last 12 months (oldest → newest)."""
    result = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
            DATE_TRUNC('month', created_at)                       AS month_date,
            COUNT(*)                                              AS order_count,
            COALESCE(SUM(total_amount), 0)                        AS total_revenue
        FROM orders
        WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month_date ASC
    """))
    rows = result.mappings().all()
    return {
        "data": [
            {
                "month":         row["month"],
                "order_count":   int(row["order_count"]),
                "total_revenue": float(row["total_revenue"]),
            }
            for row in rows
        ]
    }


@router.get("/top-users")
async def get_top_users(db: AsyncSession = Depends(get_db)) -> dict:
    """Top 10 users by total spend."""
    result = await db.execute(text("""
        SELECT
            u.id,
            u.full_name,
            u.email,
            COUNT(o.id)            AS order_count,
            SUM(o.total_amount)    AS total_spent
        FROM orders o
        JOIN users u ON u.id = o.user_id
        GROUP BY u.id, u.full_name, u.email
        ORDER BY total_spent DESC
        LIMIT 10
    """))
    rows = result.mappings().all()
    return {
        "data": [
            {
                "id":          int(row["id"]),
                "full_name":   row["full_name"],
                "email":       row["email"],
                "order_count": int(row["order_count"]),
                "total_spent": float(row["total_spent"]),
            }
            for row in rows
        ]
    }


@router.get("/top-products")
async def get_top_products(db: AsyncSession = Depends(get_db)) -> dict:
    """Top 10 products by revenue from order items."""
    result = await db.execute(text("""
        SELECT
            p.id,
            p.name,
            p.brand,
            SUM(oi.quantity)                         AS units_sold,
            SUM(oi.quantity * oi.unit_price)         AS total_revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        GROUP BY p.id, p.name, p.brand
        ORDER BY total_revenue DESC
        LIMIT 10
    """))
    rows = result.mappings().all()
    return {
        "data": [
            {
                "id":            int(row["id"]),
                "name":          row["name"],
                "brand":         row["brand"],
                "units_sold":    int(row["units_sold"]),
                "total_revenue": float(row["total_revenue"]),
            }
            for row in rows
        ]
    }
