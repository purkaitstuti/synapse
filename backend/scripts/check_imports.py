"""Run from backend/:  python scripts/check_imports.py [--fix]
Finds imports using the wrong package prefix ('backend.') and modules loaded twice under two names."""
import importlib
import pkgutil
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIX = "--fix" in sys.argv
problems = 0

if (ROOT / "__init__.py").exists():
    print(f"PROBLEM: {ROOT / '__init__.py'} exists. pytest then treats 'backend' as a package and loads modules "
          "twice (as app.x and app.x). Delete that file.")
    problems += 1

for f in sorted(ROOT.rglob("*.py")):
    if ".venv" in f.parts or f.name == "check_imports.py":
        continue
    text = f.read_text(encoding="utf-8-sig")
    hits = [(i + 1, l.strip()) for i, l in enumerate(text.splitlines()) if re.match(r"\s*(from|import)\s+backend\b", l)]
    for n, l in hits:
        print(f"PROBLEM: {f.relative_to(ROOT)}:{n}: {l}")
    problems += len(hits)
    if hits and FIX:
        f.write_text(re.sub(r"^(\s*)(from|import)\s+backend\.", r"\1\2 ", text, flags=re.M), encoding="utf-8")
        print(f"  fixed {f.relative_to(ROOT)}")

sys.path.insert(0, str(ROOT))
try:
    import app as app
    for m in pkgutil.walk_packages(app.__path__, "app."):
        importlib.import_module(m.name)
except ImportError as e:
    print("runtime check skipped (install requirements first):", e)
else:
    seen: dict[str, list[str]] = {}
    for name, mod in list(sys.modules.items()):
        fp = getattr(mod, "__file__", None)
        if fp and ROOT in Path(fp).resolve().parents:
            seen.setdefault(str(Path(fp).resolve()), []).append(name)
    for fp, names in seen.items():
        if len(names) > 1:
            print("PROBLEM: same file loaded under several names:", names)
            problems += 1

print("OK: imports are consistent" if not problems else f"{problems} problem(s) found" + (" (re-run without --fix to confirm)" if FIX else ""))
sys.exit(1 if problems else 0)
