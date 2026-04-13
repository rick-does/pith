"""Development launcher — runs pywebview pointed at the FastAPI backend."""
import threading
import uvicorn
import webview


def start_server():
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8002, log_level="warning")


if __name__ == "__main__":
    server = threading.Thread(target=start_server, daemon=True)
    server.start()
    webview.create_window("PiTH", "http://127.0.0.1:8002", width=1400, height=900)
    webview.start()
