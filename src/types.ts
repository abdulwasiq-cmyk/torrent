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
  createdAt: number;
  completedAt?: number;
  trackers: string[];
}

export interface StorageStats {
  usedBytes: number;
  totalBytes: number;
  freeBytes: number;
  torrentCount: number;
  fileCount: number;
}

export interface CloudStats {
  cloudSpeed: string;
  activeSeeds: number;
  uptime: string;
}

