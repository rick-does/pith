# Getting Started

PiTH is available three ways: as a **pip package** (recommended), a **standalone app** (no Python required), or run from source.

## pip install (recommended)

Requires Python 3.10+.

```
pip install pith-md
pith
```

**Windows and Mac:** PiTH opens in its own desktop window.

**WSL:** PiTH starts the server and opens your Windows browser automatically.

**Linux:** PiTH starts the server and prints the URL. Open it in your browser. To connect from a remote machine, use an SSH tunnel:

```
ssh -L 5000:localhost:5000 user@host "/path/to/pith"
```

Then open `http://localhost:5000` in your local browser. Close the terminal to stop PiTH.

To use a different port: `pith --port 8080`

## Standalone app

No Python required. Download the latest build from the [Releases page](https://github.com/rick-does/pith/releases) and unzip it.

**Windows:** Double-click `pith.exe`. The app opens in its own window.

**Mac:** Double-click `pith`. Right-click → **Open** the first time to bypass the unsigned app warning.

**Linux:** Run `./pith` from a terminal. The server starts and prints a URL — open it in your browser. Press `Ctrl+C` to stop.

## Run from source

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

On first run the script installs all dependencies and builds the frontend — this takes a minute or two. Subsequent runs start immediately. Open your browser at `http://localhost:8002`.

## First use

PiTH opens to the **Documentation** project by default. After that, it remembers the last project you had open. See [Managing Projects](projects.md) for how to create and switch between projects.

Your projects are stored in `~/.pith/projects/` by default. You can add additional project roots from the project menu to store projects anywhere on your machine.

PiTH watches the `markdowns/` folder for changes every 3 seconds. If you add, rename, or delete files outside the app, the changes are picked up automatically.

The **?** button in the header opens this documentation in your browser at any time.
