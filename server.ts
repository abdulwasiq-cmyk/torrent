import "dotenv/config";
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ASSETS_DIR = path.join(__dirname, 'server_assets');

const app = express();
const PORT = 3000;
const QBIT_HOST = process.env.QBIT_HOST || '127.0.0.1';
const QBIT_PORT = Number(process.env.QBIT_PORT || '8080');
const QBIT_USERNAME = process.env.QBITTORRENT_USERNAME || 'admin';
const QBIT_PASSWORD = process.env.QBITTORRENT_PASSWORD || 'adminadmin';
const QBIT_AUTH_ENABLED = (process.env.QBIT_AUTH_ENABLED ?? 'true').toLowerCase() !== 'false';
const QBIT_DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR || path.join(__dirname, 'downloads'));
let qBitSessionCookie = '';

app.use(express.json());

export interface StoredFile {
  id: string;
  torrentId: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  type: 'video' | 'audio' | 'image' | 'archive' | 'document' | 'iso' | 'other';
  streamable: boolean;
  externalMediaUrl?: string;
  downloadPath?: string;
  qBitIndex?: number;
}

export interface StoredTorrent {
  id: string;
  name: string;
  infoHash: string;
  magnetUri: string;
  totalSize: number;
  files: StoredFile[];
  status: 'ready' | 'downloading' | 'queued' | 'error';
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  seeds: number;
  leechers: number;
  cached: boolean;
  createdAt: number;
  completedAt?: number;
  trackers: string[];
}

const TORRENT_DOWNLOAD_ROOT = QBIT_DOWNLOAD_DIR;

function getFilesystemStorageStats(dir: string) {
  try {
    const stats = fs.statfsSync(dir);
    const totalBytes = Number(stats.bsize) * Number(stats.blocks);
    const freeBytes = Number(stats.bsize) * Number(stats.bavail);
    return {
      totalBytes: Math.max(0, totalBytes),
      freeBytes: Math.max(0, freeBytes),
      usedBytes: Math.max(0, totalBytes - freeBytes),
    };
  } catch {
    return { totalBytes: 0, freeBytes: 0, usedBytes: 0 };
  }
}

function determineFileType(fileName: string): { type: StoredFile['type']; mimeType: string; streamable: boolean } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'm4v'].includes(ext)) return { type: 'video', mimeType: 'video/mp4', streamable: true };
  if (['mkv'].includes(ext)) return { type: 'video', mimeType: 'video/x-matroska', streamable: true };
  if (['webm'].includes(ext)) return { type: 'video', mimeType: 'video/webm', streamable: true };
  if (['avi'].includes(ext)) return { type: 'video', mimeType: 'video/x-msvideo', streamable: true };
  if (['mov'].includes(ext)) return { type: 'video', mimeType: 'video/quicktime', streamable: true };
  if (['mp3'].includes(ext)) return { type: 'audio', mimeType: 'audio/mpeg', streamable: true };
  if (['flac'].includes(ext)) return { type: 'audio', mimeType: 'audio/flac', streamable: true };
  if (['wav'].includes(ext)) return { type: 'audio', mimeType: 'audio/wav', streamable: true };
  if (['ogg', 'oga'].includes(ext)) return { type: 'audio', mimeType: 'audio/ogg', streamable: true };
  if (['aac', 'm4a'].includes(ext)) return { type: 'audio', mimeType: 'audio/aac', streamable: true };
  if (['jpg', 'jpeg'].includes(ext)) return { type: 'image', mimeType: 'image/jpeg', streamable: true };
  if (['png'].includes(ext)) return { type: 'image', mimeType: 'image/png', streamable: true };
  if (['webp'].includes(ext)) return { type: 'image', mimeType: 'image/webp', streamable: true };
  if (['iso', 'img'].includes(ext)) return { type: 'iso', mimeType: 'application/x-iso9660-image', streamable: false };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { type: 'archive', mimeType: 'application/zip', streamable: false };
  if (['srt', 'vtt', 'sub'].includes(ext)) return { type: 'document', mimeType: 'text/plain', streamable: true };
  if (['nfo', 'txt', 'md', 'pdf', 'doc', 'docx'].includes(ext)) return { type: 'document', mimeType: 'text/plain', streamable: true };
  return { type: 'document', mimeType: 'application/octet-stream', streamable: false };
}

function makeStableFileId(infoHash: string, filePath: string, index: number): string {
  const normalizedPath = String(filePath || `file_${index + 1}`)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9._/-]+/g, '_')
    .replace(/\/+/, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || `file_${index + 1}`;

  return `f_${infoHash}_${normalizedPath}_${index + 1}`;
}

async function qBitLogin(): Promise<void> {
  if (!QBIT_AUTH_ENABLED) {
    return;
  }

  const form = new URLSearchParams({ username: QBIT_USERNAME, password: QBIT_PASSWORD });
  const response = await fetch(`http://${QBIT_HOST}:${QBIT_PORT}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const cookie = response.headers.get('set-cookie');
  if (cookie) {
    qBitSessionCookie = cookie.split(';')[0];
  }

  if (!response.ok && response.status !== 204) {
    throw new Error(`qBittorrent login failed with status ${response.status}`);
  }
}

async function qBitFetch<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = `http://${QBIT_HOST}:${QBIT_PORT}${endpoint}`;
  const headers = new Headers(init?.headers || {});
  if (qBitSessionCookie) {
    headers.set('Cookie', qBitSessionCookie);
  }

  const response = await fetch(url, { ...init, headers });
  if (response.status === 401 || response.status === 403) {
    await qBitLogin();
    headers.set('Cookie', qBitSessionCookie);

    const retry = await fetch(url, { ...init, headers });
    if (!retry.ok) {
      throw new Error(`qBittorrent API request failed: ${retry.status}`);
    }

    const text = await retry.text();
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`qBittorrent API request failed: ${response.status} ${text}`);
  }

  const text = await response.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

function formatQBitSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const value = Math.min(Math.floor(Math.log(bytesPerSecond) / Math.log(1024)), units.length - 1);
  const size = bytesPerSecond / (1024 ** value);
  return `${size.toFixed(value === 0 ? 0 : 1)} ${units[value]}`;
}

async function getQBitTorrents(): Promise<any[]> {
  const torrents = await qBitFetch<any[]>('/api/v2/torrents/info');
  return Array.isArray(torrents) ? torrents : [];
}

function safeDownloadPath(candidate: string): string | null {
  const root = path.resolve(QBIT_DOWNLOAD_DIR);
  const resolved = path.resolve(candidate);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

function qBitStatus(state: string, progress: number): StoredTorrent['status'] {
  if (state.includes('error')) return 'error';
  if (progress >= 100 || state.includes('upload')) return 'ready';
  if (state.includes('queued') || state.includes('paused') || state.includes('checking')) return 'queued';
  return 'downloading';
}

async function mapQBitFiles(info: any, torrentId = String(info.hash)): Promise<StoredFile[]> {
  const files = await qBitFetch<any[]>(`/api/v2/torrents/files?hash=${encodeURIComponent(info.hash)}`);
  const contentPath = String(info.content_path || info.save_path || QBIT_DOWNLOAD_DIR);

  return (Array.isArray(files) ? files : []).map((file, index) => {
    const relativePath = String(file.name || `file_${index + 1}`).replace(/\\/g, '/');
    const downloadPath = safeDownloadPath(path.join(contentPath, relativePath)) || undefined;
    const { type, mimeType, streamable } = determineFileType(relativePath);
    return {
      id: makeStableFileId(String(info.hash), relativePath, index),
      torrentId,
      name: path.basename(relativePath),
      path: relativePath,
      size: Number(file.size || 0),
      mimeType,
      type,
      streamable,
      downloadPath,
      qBitIndex: Number.isFinite(Number(file.index)) ? Number(file.index) : index,
    } satisfies StoredFile;
  });
}

async function mapQBitTorrent(info: any): Promise<StoredTorrent> {
  const progress = Math.min(100, Math.max(0, Number(info.progress || 0) * 100));
  const files = await mapQBitFiles(info);
  let trackers: string[] = [];
  try {
    const trackerRows = await qBitFetch<any[]>(`/api/v2/torrents/trackers?hash=${encodeURIComponent(info.hash)}`);
    trackers = (Array.isArray(trackerRows) ? trackerRows : [])
      .map((tracker) => String(tracker.url || ''))
      .filter((url) => url && !url.startsWith('**'));
  } catch {
    trackers = [];
  }

  const completedAt = Number(info.completion_on || 0);
  return {
    id: String(info.hash),
    name: String(info.name || info.hash),
    infoHash: String(info.hash).toLowerCase(),
    magnetUri: String(info.magnet_uri || `magnet:?xt=urn:btih:${info.hash}`),
    totalSize: Number(info.size) > 0
      ? Number(info.size)
      : Number(info.total_size) > 0
        ? Number(info.total_size)
        : files.reduce((total, file) => total + file.size, 0),
    files,
    status: qBitStatus(String(info.state || '').toLowerCase(), progress),
    progress,
    downloadSpeed: Number(info.dlspeed || 0),
    uploadSpeed: Number(info.upspeed || 0),
    seeds: Number(info.num_seeds || 0),
    leechers: Number(info.num_leechs || 0),
    cached: false,
    createdAt: Number(info.added_on || 0) > 0 ? Number(info.added_on) * 1000 : Date.now(),
    ...(completedAt > 0 ? { completedAt: completedAt * 1000 } : {}),
    trackers,
  };
}

async function getQBitStoredTorrents(): Promise<StoredTorrent[]> {
  const infos = await getQBitTorrents();
  return Promise.all(infos.map((info) => mapQBitTorrent(info)));
}

async function getQBitInfo(infoHash: string): Promise<any | null> {
  const infos = await qBitFetch<any[]>(`/api/v2/torrents/info?hashes=${encodeURIComponent(infoHash)}`);
  return Array.isArray(infos) ? infos.find((info) => String(info.hash || '').toLowerCase() === infoHash.toLowerCase()) || null : null;
}

async function addMagnetToQBit(magnet: string, paused = false): Promise<string> {
  const savePath = QBIT_DOWNLOAD_DIR;
  fs.mkdirSync(savePath, { recursive: true });

  const params = new URLSearchParams({
    urls: magnet,
    savepath: savePath,
    paused: paused ? 'true' : 'false',
  });

  try {
    await qBitFetch('/api/v2/torrents/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (err: any) {
    const message = String(err?.message || '');
    const isDuplicate = /409|already exists|duplicate/i.test(message);
    if (!isDuplicate) {
      throw err;
    }
  }

  const infoHash = magnet.match(/urn:btih:([a-zA-Z0-9]+)/i)?.[1]?.toLowerCase();
  if (!infoHash) {
    throw new Error('Unable to determine qBittorrent info hash from magnet link');
  }

  return infoHash;
}

async function waitForQBitMetadata(infoHash: string, timeoutMs = 30000): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const info = await getQBitInfo(infoHash);
    if (info) {
      const files = await qBitFetch<any[]>(`/api/v2/torrents/files?hash=${encodeURIComponent(infoHash)}`);
      if (info.has_metadata !== false && Array.isArray(files) && files.length > 0) {
        return info;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return getQBitInfo(infoHash);
}

async function applyFilePriorities(infoHash: string, files: StoredFile[], selectedFileIds: string[] | undefined): Promise<void> {
  if (!Array.isArray(selectedFileIds) || selectedFileIds.length === 0) return;
  const selected = new Set(selectedFileIds.map(String));
  await Promise.all(files.map(async (file) => {
    const priority = selected.has(file.id) ? 1 : 0;
    const form = new URLSearchParams({ hash: infoHash, id: String(file.qBitIndex ?? 0), priority: String(priority) });
    await qBitFetch('/api/v2/torrents/filePrio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
  }));
}

async function fetchTorrentMetadataFromQBit(
  magnet: string,
  infoHash: string,
  torrentId: string,
  fallbackName: string
): Promise<{ name: string; files: StoredFile[]; totalSize: number } | null> {
  try {
    const hash = await addMagnetToQBit(magnet, true);
    const torrentInfo = await waitForQBitMetadata(hash);
    if (!torrentInfo) return null;
    const files = await mapQBitFiles(torrentInfo, torrentId);
    return {
      name: torrentInfo.name || fallbackName,
      files,
      totalSize: files.reduce((total, file) => total + file.size, 0),
    };
  } catch (err) {
    console.warn('qBittorrent metadata fetch failed:', err);
  }

  return null;
}

// Parse Magnet URI
function parseMagnet(input: string): {
  infoHash: string;
  name: string;
  trackers: string[];
} {
  const cleaned = input.trim();

  // If plain infoHash hex (40 chars) or base32 (32 chars)
  if (/^[a-fA-F0-9]{40}$/.test(cleaned) || /^[a-zA-Z2-7]{32}$/.test(cleaned)) {
    return {
      infoHash: cleaned.toLowerCase(),
      name: `Torrent_${cleaned.substring(0, 8)}`,
      trackers: ['udp://tracker.opentrackr.org:1337/announce'],
    };
  }

  if (!cleaned.startsWith('magnet:?')) {
    // Check if it's a URL or text containing magnet:
    const match = cleaned.match(/magnet:\?[^\s"']+/);
    if (!match) {
      throw new Error('Invalid magnet link. Must start with magnet:?xt=urn:btih:... or be a 40-character info hash.');
    }
  }

  const queryIndex = cleaned.indexOf('?');
  const queryString = queryIndex !== -1 ? cleaned.substring(queryIndex + 1) : '';
  const params = new URLSearchParams(queryString);

  const xt = params.get('xt') || '';
  const hashMatch = xt.match(/urn:btih:([a-zA-Z0-9]+)/i);
  if (!hashMatch) {
    throw new Error('Magnet link is missing valid BitTorrent Info Hash (xt=urn:btih:...).');
  }

  const infoHash = hashMatch[1].toLowerCase();
  let name = params.get('dn') || '';
  if (!name) {
    name = `Torrent_${infoHash.substring(0, 8)}`;
  } else {
    name = decodeURIComponent(name.replace(/\+/g, ' '));
  }

  const trackers = params.getAll('tr').map((t) => decodeURIComponent(t));
  if (trackers.length === 0) {
    trackers.push('udp://tracker.opentrackr.org:1337/announce', 'udp://tracker.openbittorrent.com:6969/announce');
  }

  return { infoHash, name, trackers };
}


// ==========================================
// API Endpoints
// ==========================================

// Get all torrents & storage stats
app.get('/api/torrents', async (req, res) => {
  try {
    const torrents = (await getQBitStoredTorrents()).sort((a, b) => b.createdAt - a.createdAt);
    const usedBytes = torrents.reduce((acc, torrent) => acc + torrent.totalSize, 0);
    const fileCount = torrents.reduce((acc, torrent) => acc + torrent.files.length, 0);
    const diskStats = getFilesystemStorageStats(QBIT_DOWNLOAD_DIR);
    res.json({
      torrents,
      storage: {
        usedBytes,
        totalBytes: diskStats.totalBytes,
        freeBytes: diskStats.freeBytes,
        torrentCount: torrents.length,
        fileCount,
      },
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Unable to read qBittorrent torrents' });
  }
});

// Inspect magnet metadata before downloading (returns file list so user can choose)
app.post('/api/torrents/inspect', async (req, res) => {
  try {
    const { magnet } = req.body;
    if (!magnet || typeof magnet !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid magnet link or info hash.' });
    }

    const { infoHash, name, trackers } = parseMagnet(magnet);

    const existingInfo = await getQBitInfo(infoHash);
    const cached = existingInfo
      ? await mapQBitTorrent(existingInfo)
      : await fetchTorrentMetadataFromQBit(magnet, infoHash, `inspect_${infoHash.slice(0, 10)}`, name);
    if (!cached) {
      return res.status(404).json({ error: 'Unable to inspect this magnet link. qBittorrent metadata is unavailable.' });
    }

    res.json({
      alreadyExists: Boolean(existingInfo),
      name: cached.name,
      infoHash,
      magnetUri: existingInfo?.magnet_uri || magnet,
      totalSize: cached.totalSize,
      fileCount: cached.files.length,
      files: cached.files.map((f) => ({
        ...f,
        downloadUrl: `/api/download/${f.id}`,
      })),
      trackers,
      cached: false,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to inspect magnet link' });
  }
});

// Add new magnet link (downloads only the user-selected files)
app.post('/api/torrents/add', async (req, res) => {
  try {
    const { magnet, selectedFileIds } = req.body;
    if (!magnet || typeof magnet !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid magnet link or info hash.' });
    }

    const { infoHash, name } = parseMagnet(magnet);
    await addMagnetToQBit(magnet);
    const info = await waitForQBitMetadata(infoHash);
    if (!info) return res.status(404).json({ error: 'qBittorrent has not received metadata for this magnet yet.' });
    const torrent = await mapQBitTorrent(info);
    await applyFilePriorities(infoHash, torrent.files, selectedFileIds);
    await qBitFetch('/api/v2/torrents/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ hashes: infoHash }).toString(),
    });

    res.status(201).json({
      torrent,
      message: `Added ${torrent.name} to qBittorrent.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process magnet link' });
  }
});

app.delete('/api/torrents/:id', async (req, res) => {
  try {
    await qBitFetch('/api/v2/torrents/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ hashes: req.params.id, deleteFiles: 'true' }).toString(),
    });
    res.json({ success: true, message: 'Torrent deleted from qBittorrent' });
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Failed to delete qBittorrent torrent' });
  }
});

app.delete('/api/torrents', async (req, res) => {
  try {
    const torrents = await getQBitTorrents();
    const hashes = torrents.map((torrent) => String(torrent.hash)).filter(Boolean).join('|');
    if (hashes) {
      await qBitFetch('/api/v2/torrents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ hashes, deleteFiles: 'true' }).toString(),
      });
    }
    res.json({ success: true, message: 'qBittorrent storage cleared' });
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Failed to clear qBittorrent torrents' });
  }
});

async function findFile(fileId: string): Promise<{ file: StoredFile; torrent: StoredTorrent } | null> {
  const torrents = await getQBitStoredTorrents();
  for (const torrent of torrents) {
    const file = torrent.files.find((candidate) => candidate.id === fileId);
    if (file) return { file, torrent };
  }
  return null;
}

// Instant Direct Download Endpoint
// Delivers genuine, actual playable media and binary files to the user
app.get('/api/download/:fileId', async (req, res) => {
  const result = await findFile(req.params.fileId);
  if (!result) {
    return res.status(404).send('File not found in Cloud Storage');
  }

  const { file } = result;
  const safeFilename = file.name.replace(/["\r\n]/g, '_');

  const safePath = file.downloadPath ? safeDownloadPath(file.downloadPath) : null;
  if (safePath && fs.existsSync(safePath)) {
    const fileBuffer = fs.readFileSync(safePath);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(file.name)}`
    );
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(fileBuffer.length));
    return res.end(fileBuffer);
  }

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(file.name)}`
  );
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');

  return res.status(404).send('Real qBittorrent file is not available on disk yet.');
});

// Stream Media In-Browser (HTTP 206 Partial Content Support for video/audio seek)
app.get('/api/stream/:fileId', async (req, res) => {
  const result = await findFile(req.params.fileId);
  if (!result) {
    return res.status(404).send('Media not found');
  }

  const { file } = result;

  // Only stream files that exist on disk. No synthetic fallback content.
  const safePath = file.downloadPath ? safeDownloadPath(file.downloadPath) : null;
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).send('This file is not available on disk yet.');
  }

  const isTextFile = ['.srt', '.vtt', '.nfo', '.txt'].some((ext) => file.name.toLowerCase().endsWith(ext));
  if (isTextFile) {
    res.setHeader('Content-Type', file.mimeType || 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    return fs.createReadStream(safePath).pipe(res);
  }

  // Only stream files that exist on disk. No fake sample streams.
  const stat = fs.statSync(safePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(safePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
    });
    fileStream.pipe(res);
    return;
  }

  res.setHeader('Content-Length', fileSize);
  fs.createReadStream(safePath).pipe(res);
});

// Download Entire Torrent or Selected Files as ZIP with Genuine Binary Files
app.get('/api/torrents/:id/zip', async (req, res) => {
  const info = await getQBitInfo(req.params.id);
  if (!info) return res.status(404).send('Torrent not found');
  const torrent = await mapQBitTorrent(info);

  // Check if specific files are requested via ?files=id1,id2
  const filesParam = req.query.files as string | undefined;
  let targetFiles = torrent.files;
  if (filesParam) {
    const requestedIds = new Set(filesParam.split(',').map((s) => s.trim()));
    const matched = torrent.files.filter((f) => requestedIds.has(f.id));
    if (matched.length > 0) {
      targetFiles = matched;
    }
  }

  const isPartial = targetFiles.length < torrent.files.length;
  const safeBaseName = torrent.name.replace(/[^\w\s.-]/g, '_').trim();
  const zipName = `${safeBaseName}${isPartial ? '_selected' : ''}.zip`;
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${zipName}"; filename*=UTF-8''${encodeURIComponent(zipName)}`
  );
  res.setHeader('Content-Type', 'application/zip');

  const archive = new ZipArchive({
    zlib: { level: 4 },
  });

  archive.on('error', (err: any) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  // Append each file with its ACTUAL binary content!
  for (const file of targetFiles) {
    const safePath = file.downloadPath ? safeDownloadPath(file.downloadPath) : null;
    if (!safePath || !fs.existsSync(safePath)) continue;
    archive.file(safePath, { name: file.path });
  }

  archive.finalize();
});

// System Status & Cloud Swarm Telemetry
app.get('/api/system/stats', async (req, res) => {
  const liveQBitTorrents = await getQBitTorrents();

  const totalDownloadSpeed = liveQBitTorrents.reduce((acc, torrent: any) => acc + Number(torrent.dl_speed || 0), 0);
  const totalPeers = liveQBitTorrents.reduce((acc, torrent: any) => acc + Number(torrent.num_seeds || 0) + Number(torrent.num_leechs || 0), 0);

  const diskStats = getFilesystemStorageStats(QBIT_DOWNLOAD_DIR);

  res.json({
    cloudSpeed: formatQBitSpeed(totalDownloadSpeed || 0),
    activeSeeds: totalPeers,
    cacheHitRatio: 'N/A',
    uptime: diskStats.totalBytes > 0 ? 'available' : 'unavailable',
    activeConnections: totalPeers || 0,
    debridNodes: 0,
  });
});

// ==========================================
// Vite / Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Instant Cloud Torrent Seeder running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
