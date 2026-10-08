from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Sector, User
from schemas import SectorResponse, SectorCreate
from typing import List
from routers.auth import get_current_user, require_roles
from audit import record_admin_action

router = APIRouter(prefix="/sectors", tags=["sectors"])

@router.get("", response_model=List[SectorResponse])
def get_sectors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Sector).filter(Sector.is_active.is_(True)).order_by(Sector.name).all()

@router.post("", response_model=SectorResponse)
def create_sector(
    sector: SectorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    existing = db.query(Sector).filter(Sector.name == sector.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="A sector with this name already exists")
    new_sector = Sector(**sector.model_dump())
    db.add(new_sector)
    db.flush()
    record_admin_action(db, current_user.id, "sector_created", f"Created sector {new_sector.name}")
    db.commit()
    db.refresh(new_sector)
    return new_sector
