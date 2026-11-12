from typing import Literal

from pydantic import BaseModel, Field


class SolutionDraft(BaseModel):
    name: str
    description: str
    inspiration_source: str
    original_mechanism: str
    adaptation: str
    implementation: str
    required_resources: list[str] = Field(default_factory=list)
    expected_benefits: list[str] = Field(default_factory=list)
    challenges: list[str] = Field(default_factory=list)
    feasibility: str = ""


class Solution(SolutionDraft):
    status: Literal["conceptual"] = "conceptual"  # never "scientifically validated"
    source: Literal["gemini", "offline"]


class FusionDraft(BaseModel):
    name: str
    common_mechanisms: list[str] = Field(default_factory=list)
    combination_logic: str
    proposed_innovation: str
    working_principle: str
    implementation_possibilities: list[str] = Field(default_factory=list)
    advantages: list[str] = Field(default_factory=list)
    risks_limitations: list[str] = Field(default_factory=list)


class Fusion(FusionDraft):
    selected_concepts: list[str]
    status: Literal["conceptual"] = "conceptual"
    source: Literal["gemini", "offline"]
