from fastapi import APIRouter
from app.modules.auth.router import router as auth_router
from app.modules.products.router import router as products_router
from app.modules.categories.router import router as categories_router
from app.modules.distributors.router import router as distributors_router
from app.modules.orders.router import router as orders_router
from app.modules.profiles.router import router as profiles_router
from app.modules.intelligence.router import router as intelligence_router
from app.modules.schemes.router import router as schemes_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(profiles_router, prefix="/profiles", tags=["profiles"])
api_router.include_router(products_router)
api_router.include_router(categories_router)
api_router.include_router(distributors_router)
api_router.include_router(orders_router)
api_router.include_router(intelligence_router)
api_router.include_router(schemes_router)
