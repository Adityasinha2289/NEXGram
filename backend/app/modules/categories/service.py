from sqlalchemy.orm import Session
from app.models import Category
from app.modules.categories import schemas

def get_active_categories(db: Session) -> list[Category]:
    return db.query(Category).filter(Category.is_active == True).order_by(Category.level, Category.sort_order).all()
