from __future__ import annotations

import os
import sys
import threading
from pathlib import Path


def _get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent.parent


def main():
    base = _get_base_dir()
    os.chdir(str(base))

    frozen = getattr(sys, "frozen", False)
    port = 8003 if frozen else 8002
    headless = "--server" in sys.argv or "--no-window" in sys.argv

    if frozen:
        projects_dir = base / "projects"
        if not projects_dir.exists():
            bundled = base / "projects" / "documentation"
            if bundled.exists():
                import shutil
                dest = Path.cwd() / "projects" / "documentation"
                if not dest.exists():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copytree(str(bundled), str(dest))

    def start_server():
        import uvicorn
        uvicorn.run("backend.main:app", host="0.0.0.0", port=port, log_level="warning")

    if headless or sys.platform == "linux":
        print(f"PiTH server running at http://127.0.0.1:{port}")
        start_server()
    else:
        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()

        import webview
        webview.create_window("PiTH", f"http://127.0.0.1:{port}", width=1400, height=900)
        webview.start()


if __name__ == "__main__":
    main()
