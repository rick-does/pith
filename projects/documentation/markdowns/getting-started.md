# Getting Started

PiTH comes in two versions: a **standalone app** (recommended for most users) and a **web app** (for developers who want to run from source).

## Standalone app

No installation required. Everything is bundled in the download.

### 1. Download

Go to the [Releases page](https://github.com/rick-does/pith/releases) and download the zip for your platform:

- `pith-Windows.zip` — Windows
- `pith-macOS.zip` — Mac
- `pith-Linux.zip` — Linux

### 2. Unzip and run

Unzip to wherever you want to keep the app and your files. This creates a `pith/` folder. Open it and run the executable for your platform:

**Windows:** Double-click `pith.exe`. The app opens in its own window.

**Mac:** Double-click `pith`. The app opens in its own window. The first time, right-click and choose **Open** to bypass the unsigned app warning.

**Linux:** Run `./pith` from a terminal. The server starts and prints a URL — open it in your browser. Press `Ctrl+C` to stop.

Your projects are stored in a `projects/` folder created automatically inside the app directory.

## Web app (run from source)

Requires [Python 3.12+](https://www.python.org/downloads) and [Node.js LTS](https://nodejs.org).

**Windows:**

```bat
git clone git@github.com:rick-does/pith.git
cd pith
start.bat
```

**Mac / Linux / WSL:**

```bash
git clone git@github.com:rick-does/pith.git
cd pith
./start.sh
```

On first run the script installs all dependencies and builds the frontend — this takes a minute or two. Subsequent runs start immediately.

Once running, open your browser and go to `http://localhost:8002`.

To stop the server, press `Ctrl+C` in the terminal.

## First use

Both versions open to the **Documentation** project by default. After that, the app remembers the last project you had open.
