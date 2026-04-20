#!/usr/bin/env python3
"""Build the PiTH wheel. Runs npm build, stages assets, then python -m build."""

import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).parent


def run(*args, **kwargs):
    result = subprocess.run(args, **kwargs)
    if result.returncode != 0:
        sys.exit(result.returncode)


print("Building frontend...")
npm = "npm.cmd" if sys.platform == "win32" else "npm"
run(npm, "ci", cwd=root / "frontend")
run(npm, "run", "build", cwd=root / "frontend")

print("Staging package assets...")
for dest in (root / "backend" / "ui", root / "backend" / "golden"):
    if dest.exists():
        shutil.rmtree(dest)

shutil.copytree(root / "frontend" / "dist", root / "backend" / "ui")
shutil.copytree(root / "_golden", root / "backend" / "golden")

print("Building wheel...")
run(sys.executable, "-m", "build", cwd=root)

print("\nDone. Upload with:")
print("  twine upload dist/pith-*")
