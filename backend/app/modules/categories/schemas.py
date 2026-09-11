from pydantic import BaseModel
from typing import Optional, List

class CategoryBase(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    level: int
    parent_id: Optional[str] = None

class CategoryResponse(CategoryBase):
    pass
    # Depending on needs, children could be included, but a flat list is usually fine
    
    class Config:
        from_attributes = True
