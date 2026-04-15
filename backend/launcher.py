from __future__ import annotations

import os
import sys
import threading
from pathlib import Path


def _get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent.parent


def _kill_existing(port: int) -> None:
    """Kill any process currently listening on the given port."""
    import subprocess
    import time
    try:
        if sys.platform == "win32":
            # Collect all PIDs holding this port
            pids = set()
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    try:
                        pids.add(int(parts[-1]))
                    except ValueError:
                        pass
            # Kill each, then verify the port is free
            for pid in pids:
                if pid > 0:
                    subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                                   capture_output=True, timeout=5)
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)],
                                   capture_output=True, timeout=5)
            if pids:
                # Wait for port to actually free up
                for _ in range(10):
                    time.sleep(0.5)
                    check = subprocess.run(
                        ["netstat", "-ano"],
                        capture_output=True, text=True, timeout=5,
                    )
                    if not any(f":{port}" in l and "LISTENING" in l
                               for l in check.stdout.splitlines()):
                        break
        else:
            result = subprocess.run(
                ["lsof", "-ti", f":{port}"],
                capture_output=True, text=True, timeout=5,
            )
            for pid_str in result.stdout.strip().splitlines():
                try:
                    pid = int(pid_str)
                    if pid > 0:
                        subprocess.run(["kill", "-9", str(pid)],
                                       capture_output=True, timeout=5)
                except ValueError:
                    pass
    except Exception:
        pass


def main():
    base = _get_base_dir()
    os.chdir(str(base))

    frozen = getattr(sys, "frozen", False)
    port = 8003 if frozen else 8002
    _kill_existing(port)
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
