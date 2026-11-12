from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ProblemInput(BaseModel):
    title: str = ""
    description: str = ""
    primary_discipline: str = ""
    desired_outcome: str = ""
    budget_constraints: str = ""
    resource_limitations: str = ""
    location_context: str = ""
    additional_requirements: str = ""

    @model_validator(mode="after")
    def need_some_text(self):
        if len((self.title + " " + self.description).strip()) < 10:
            raise ValueError("Describe the problem in at least 10 characters (title or description).")
        return self

    def as_text(self) -> str:
        parts = [
            ("Title", self.title), ("Description", self.description),
            ("Primary discipline", self.primary_discipline), ("Desired outcome", self.desired_outcome),
            ("Budget", self.budget_constraints), ("Resources", self.resource_limitations),
            ("Context", self.location_context), ("Other requirements", self.additional_requirements),
        ]
        return "\n".join(f"{k}: {v}" for k, v in parts if v.strip())


class ProblemAnalysis(BaseModel):
    main_problem: str
    root_causes: list[str] = Field(default_factory=list)
    underlying_mechanisms: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    desired_outcome: str = ""
    technical_concepts: list[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    analysis: ProblemAnalysis
    source: Literal["gemini", "offline"]
    note: str = ""  # why offline mode was used, if it was
