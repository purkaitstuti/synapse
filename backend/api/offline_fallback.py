
"""Retrieval-based concept outline when generative AI is unavailable."""

def build_offline_outline(problem, mechanisms):
    if not mechanisms:
        raise ValueError("At least one retrieved mechanism is required.")

    selected = [
        item for item in mechanisms
        if isinstance(item, dict)
    ][:5]

    if not selected:
        raise ValueError("No valid mechanisms supplied.")

    names = [
        str(item.get("mechanism_name") or "Unnamed mechanism")
        for item in selected
    ]

    principles = [
        str(item.get("working_principle") or "Principle not documented")
        for item in selected
    ]

    return {
        "problem_analysis": (
            "The stated problem requires investigation: " + problem
        ),
        "root_causes": [
            "Root causes have not been independently established.",
            "Further domain-specific investigation is required."
        ],
        "innovation_title": (
            "Exploratory Concept Outline: " + names[0]
        ),
        "proposed_solution": (
            "Investigate whether the retrieved mechanisms can "
            "inform a solution to the stated problem. "
            "This is a retrieval-based research outline, "
            "not an AI-generated design or validated invention."
        ),
        "mechanisms_used": names,
        "working_principle": "Candidate mechanisms:\n" + "\n".join(
            f"{name}: {principle}"
            for name, principle in zip(names, principles)
        ),
        "implementation_steps": [
            "Define measurable requirements for the problem.",
            "Review independent scientific evidence for each mechanism.",
            "Identify possible interactions and incompatibilities.",
            "Design a small-scale proof-of-concept experiment.",
            "Evaluate results before proposing a practical solution."
        ],
        "advantages": [
            "Provides a starting point for interdisciplinary research.",
            "Keeps retrieved mechanism candidates visible."
        ],
        "limitations": [
            "No generative AI was used to create this outline.",
            "No mechanism combination has been validated.",
            "Scientific evidence and feasibility remain unverified.",
            "Similarity scores are not confidence probabilities."
        ],
        "validation_plan": [
            "Locate and review primary scientific publications.",
            "Verify mechanism behavior under relevant conditions.",
            "Evaluate safety, feasibility and reproducibility."
        ],
        "novelty_explanation": (
            "Novelty has not been assessed. "
            "A literature and patent review is required."
        ),
        "scientific_confidence": "Unverified research outline"
    }
