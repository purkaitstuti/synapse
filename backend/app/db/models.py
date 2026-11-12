from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    discipline: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    discoveries: Mapped[list["Discovery"]] = relationship(back_populates="project")


class Discovery(Base):
    __tablename__ = "discoveries"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    problem_analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    project: Mapped[Project] = relationship(back_populates="discoveries")
    analogies: Mapped[list["Analogy"]] = relationship(back_populates="discovery")
    solutions: Mapped[list["Solution"]] = relationship(back_populates="discovery")


class Analogy(Base):
    __tablename__ = "analogies"
    id: Mapped[int] = mapped_column(primary_key=True)
    discovery_id: Mapped[int] = mapped_column(ForeignKey("discoveries.id"))
    source_concept: Mapped[str] = mapped_column(String(255))
    source_domain: Mapped[str] = mapped_column(String(80))
    shared_mechanism: Mapped[str] = mapped_column(Text)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)  # AI estimate
    discovery: Mapped[Discovery] = relationship(back_populates="analogies")


class Solution(Base):
    __tablename__ = "solutions"
    id: Mapped[int] = mapped_column(primary_key=True)
    discovery_id: Mapped[int] = mapped_column(ForeignKey("discoveries.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    feasibility_score: Mapped[float] = mapped_column(Float, default=0.0)  # AI estimate
    impact_score: Mapped[float] = mapped_column(Float, default=0.0)  # AI estimate
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    discovery: Mapped[Discovery] = relationship(back_populates="solutions")
    research: Mapped[list["Research"]] = relationship(back_populates="solution")


class Research(Base):
    __tablename__ = "research"
    id: Mapped[int] = mapped_column(primary_key=True)
    solution_id: Mapped[int] = mapped_column(ForeignKey("solutions.id"))
    paper_title: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)
    publication_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    solution: Mapped[Solution] = relationship(back_populates="research")
