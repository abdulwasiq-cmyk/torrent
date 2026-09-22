export interface TorrentFile {
  id: string;
  torrentId: string;
  name: string;
  path: string;
  size: number; // bytes
  mimeType: string;
  type: 'video' | 'audio' | 'image' | 'archive' | 'document' | 'iso' | 'other';
  streamable: boolean;
  downloadUrl: string;
  streamUrl?: string;
}

export interface TorrentItem {
  id: string;
  name: string;
  infoHash: string;
  magnetUri: string;
  totalSize: number; // bytes
  fileCount: number;
  files: TorrentFile[];
  status: 'ready' | 'downloading' | 'queued' | 'error';
  progress: number; // 0 - 100
  downloadSpeed: number; // bytes per sec
  uploadSpeed: number; // bytes per sec
  seeds: number;
  leechers: number;
  cached: boolean; // Instant debrid cache hit
  createdAt: number;
  completedAt?: number;
  trackers: string[];
}

export interface StorageStats {
  usedBytes: number;
  totalBytes: number; // default 5GB = 5 * 1024 * 1024 * 1024
  torrentCount: number;
  fileCount: number;
}

export interface CloudStats {
  cloudSpeed: string;
  activeSeeds: number;
  cacheHitRatio: string;
  uptime: string;
}
