from pydantic import BaseModel, Field

class PriceDemoRequest(BaseModel):
    product: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=60)
    month: int = Field(ge=1, le=12)
    quantity_kg: float = Field(gt=0, le=100000)
    quality_grade: int = Field(default=2, ge=1, le=3)

class DemandDemoRequest(BaseModel):
    product: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=60)
    month: int = Field(ge=1, le=12)
    recent_monthly_quantity_kg: float = Field(ge=0, le=1000000)
