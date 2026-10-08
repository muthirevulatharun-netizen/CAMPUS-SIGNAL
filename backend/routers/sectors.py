from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Sector
from schemas import SectorResponse, SectorCreate
from typing import List

router = APIRouter(prefix="/sectors", tags=["sectors"])

@router.get("", response_model=List[SectorResponse])
def get_sectors(db: Session = Depends(get_db)):
    return db.query(Sector).all()

@router.post("", response_model=SectorResponse)
def create_sector(sector: SectorCreate, db: Session = Depends(get_db)):
    new_sector = Sector(**sector.model_dump())
    db.add(new_sector)
    db.commit()
    db.refresh(new_sector)
    return new_sector
