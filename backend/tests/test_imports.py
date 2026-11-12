import sys

from app.engines import analogy


def test_no_modules_loaded_under_backend_prefix():
    import app.main  # noqa: F401
    bad = [m for m in sys.modules if m == "backend" or m.startswith("backend.")]
    assert not bad, f"modules loaded under the wrong prefix: {bad[:5]}"


def test_llmerror_is_a_single_class():
    from app.engines import decomposer
    from app.services.llm import LLMError
    assert decomposer.LLMError is LLMError and analogy.LLMError is LLMError


def test_models_register_on_the_shared_base():
    import app.db.models as models
    from app.db.session import Base
    assert models.User.metadata is Base.metadata
    assert {"users", "projects", "discoveries", "analogies", "solutions", "research"} <= set(Base.metadata.tables)
