# Torrent Cloud UI

A small React + Express app for inspecting magnet links, browsing local downloaded torrent files, and serving real media downloads from disk.

## What this project does

- Accepts magnet links or info hashes
- Tries to inspect and resolve torrent metadata
- Prefers real locally downloaded files already present under the project downloads directory
- Falls back to qBittorrent when available
- Serves actual file bytes through the app for playback and download
- Exposes a simple web UI for selecting files and downloading them

## Tech stack

- React + Vite
- Express + TypeScript
- WebTorrent
- qBittorrent via Docker
- Archiver for ZIP exports

## Project structure

- src/ — React app UI and components
- server.ts — Express API and torrent metadata logic
- downloads/ — actual downloaded torrent content
- qbittorrent/config — qBittorrent runtime config
- docker-compose.yml — qBittorrent service definition

## Prerequisites

- Node.js 18+
- npm
- Docker and Docker Compose

## Environment setup

Create a .env file in the project root if you want to override the defaults:

```bash
QBIT_HOST=127.0.0.1
QBIT_PORT=8080
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=adminadmin
QBIT_AUTH_ENABLED=true
DOWNLOAD_DIR=./downloads
```

## Start qBittorrent

```bash
docker compose up -d
```

This starts the qBittorrent web UI on:

- http://127.0.0.1:8080
- Username: admin
- Password: adminadmin

## Run the app

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The app runs at:

- http://127.0.0.1:3000

## Build for production

```bash
npm run build
npm start
```

## Local download behavior

The app is designed to serve real, already-downloaded files rather than fake sample data. It will:

1. scan the downloads directory for torrent folders by info hash
2. treat those files as real cloud storage entries
3. expose them via the API and UI
4. allow direct download and in-browser streaming when files exist on disk

This makes the app work reliably with local torrent data and avoids synthetic placeholders.

## API highlights

- GET /api/torrents — list torrent records
- POST /api/torrents/inspect — inspect a magnet link
- POST /api/torrents/add — add selected files from a magnet
- GET /api/download/:fileId — download a real file from disk
- GET /api/stream/:fileId — stream media with range support
- GET /api/torrents/:id/zip — download selected torrent files as a ZIP

## Notes

- The project intentionally keeps generated runtime data out of source control. See .gitignore for the exclusion list.
- If qBittorrent is not reachable, the app still attempts to discover already-downloaded torrents locally.
