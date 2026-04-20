from __future__ import annotations

import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path


def _is_wsl() -> bool:
    try:
        return b"microsoft" in Path("/proc/version").read_bytes().lower()
    except OSError:
        return False


def _kill_existing(port: int) -> None:
    try:
        if sys.platform == "win32":
            pids: set[int] = set()
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
            for pid in pids:
                if pid > 0:
                    subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                                   capture_output=True, timeout=5)
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)],
                                   capture_output=True, timeout=5)
            if pids:
                for _ in range(10):
                    time.sleep(0.5)
                    check = subprocess.run(
                        ["netstat", "-ano"],
                        capture_output=True, text=True, timeout=5,
                    )
                    if not any(f":{port}" in ln and "LISTENING" in ln
                               for ln in check.stdout.splitlines()):
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
    except (OSError, ValueError, subprocess.TimeoutExpired):
        pass


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", action="store_true", help="Force headless/browser mode")
    parser.add_argument("--port", type=int, default=5000, help="Port to listen on (default: 5000)")
    args = parser.parse_args()

    port = args.port
    _kill_existing(port)

    wsl = _is_wsl()
    pure_linux = sys.platform == "linux" and not wsl
    use_webview = not args.server and sys.platform in ("win32", "darwin")

    host = "0.0.0.0" if pure_linux else "127.0.0.1"
    url = f"http://127.0.0.1:{port}"

    if use_webview:
        def start_server():
            import uvicorn
            uvicorn.run("backend.main:app", host=host, port=port, log_level="warning")

        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
        import webview
        webview.create_window("PiTH", url, width=1400, height=900)
        webview.start()
    else:
        import socket as _socket
        sock = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
        sock.setsockopt(_socket.SOL_SOCKET, _socket.SO_REUSEADDR, 1)
        sock.bind((host, port))
        sock.listen(128)

        def start_server():
            import uvicorn
            uvicorn.run("backend.main:app", fd=sock.fileno(), log_level="warning")

        print(f"PiTH running at {url}")
        if pure_linux:
            print(f"Remote access: ssh -L {port}:localhost:{port} <user>@<host>")
        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
        if wsl:
            subprocess.Popen(["cmd.exe", "/c", "start", url])
        elif not pure_linux:  # --server on Windows/Mac
            threading.Timer(1.5, webbrowser.open, [url]).start()
        server_thread.join()


if __name__ == "__main__":
    main()
