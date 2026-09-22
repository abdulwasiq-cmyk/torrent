import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MagnetInputBar } from './components/MagnetInputBar';
import { TorrentList } from './components/TorrentList';
import { FolderModal } from './components/FolderModal';
import { MediaPlayerModal } from './components/MediaPlayerModal';
import { TorrentInfoModal } from './components/TorrentInfoModal';
import { DirectLinksExportModal } from './components/DirectLinksExportModal';
import { FileSelectionModal } from './components/FileSelectionModal';
import { TorrentItem, TorrentFile, StorageStats, CloudStats } from './types';
import { Zap, ShieldCheck, HardDrive, CheckCircle2, AlertCircle, Download, Server } from 'lucide-react';
import { formatBytes, formatSpeed } from './utils/formatters';

export default function App() {
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [storage, setStorage] = useState<StorageStats>({
    usedBytes: 0,
    totalBytes: 0,
    freeBytes: 0,
    torrentCount: 0,
    fileCount: 0,
  });
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [activeFolderTorrent, setActiveFolderTorrent] = useState<TorrentItem | null>(null);
  const [activeSelectionTorrent, setActiveSelectionTorrent] = useState<TorrentItem | null>(null);
  const [isPreDownloadSelection, setIsPreDownloadSelection] = useState(false);
  const [pendingMagnetUri, setPendingMagnetUri] = useState<string>('');
  const [selectionModalTab, setSelectionModalTab] = useState<'selection' | 'links'>('selection');
  const [activePlayerFile, setActivePlayerFile] = useState<TorrentFile | null>(null);
  const [activePlayerTorrent, setActivePlayerTorrent] = useState<TorrentItem | null>(null);
  const [activeInfoTorrent, setActiveInfoTorrent] = useState<TorrentItem | null>(null);
  const [isBulkExportOpen, setIsBulkExportOpen] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const fetchWithTimeout = useCallback(async (url: string, options: RequestInit = {}, timeoutMs = 25000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Request timed out while fetching instant link. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const fetchTorrents = useCallback(async () => {
    try {
      const res = await fetch('/api/torrents');
      if (res.ok) {
        const data = await res.json();
        setTorrents(data.torrents || []);
        if (data.storage) setStorage(data.storage);
      }
    } catch (err) {
      console.error('Failed to load torrents', err);
    }
  }, []);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        setCloudStats(data);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchTorrents();
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(interval);
  }, [fetchTorrents, fetchTelemetry]);

  useEffect(() => {
    const waitingForMetadata = torrents.some((torrent) => torrent.files.length === 0 || torrent.totalSize === 0);
    if (!waitingForMetadata) return;

    const interval = setInterval(fetchTorrents, 2000);
    return () => clearInterval(interval);
  }, [torrents, fetchTorrents]);

  // Add magnet with PRE-DOWNLOAD file selection (Requirement #1)
  const handleAddMagnet = async (magnet: string): Promise<boolean> => {
    setIsLoading(true);
    setLoadingMessage('Inspecting magnet metadata...');
    try {
      const inspectRes = await fetchWithTimeout('/api/torrents/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet }),
      }, 25000);

      const inspectData = await inspectRes.json();
      if (!inspectRes.ok) {
        throw new Error(inspectData.error || 'Failed to inspect magnet link');
      }

      // If qBittorrent already has the torrent, show its current state.
      if (inspectData.alreadyExists) {
        await fetchTorrents();
        showToast('This torrent is already in qBittorrent.');
        if (inspectData.torrent && inspectData.torrent.files.length > 1) {
          setIsPreDownloadSelection(false);
          setSelectionModalTab('selection');
          setActiveSelectionTorrent(inspectData.torrent);
        }
        return true;
      }

      const files = inspectData.files || [];
      setLoadingMessage('Preparing file selection...');

      // REQUIREMENT 1: If there are multiple files, ASK FIRST which ones to download!
      if (files.length > 1) {
        const candidateTorrent: TorrentItem = {
          id: `inspect_${inspectData.infoHash.slice(0, 8)}`,
          name: inspectData.name,
          infoHash: inspectData.infoHash,
          magnetUri: inspectData.magnetUri,
          totalSize: inspectData.totalSize,
          fileCount: files.length,
          files: inspectData.files,
          status: 'downloading',
          progress: 0,
          downloadSpeed: 0,
          uploadSpeed: 0,
          seeds: 0,
          leechers: 0,
          createdAt: Date.now(),
          completedAt: Date.now(),
          trackers: inspectData.trackers || [],
        };

        setPendingMagnetUri(magnet);
        setIsPreDownloadSelection(true);
        setSelectionModalTab('selection');
        setActiveSelectionTorrent(candidateTorrent);
        showToast(`Detected ${files.length} files. Please select which files you want to download.`);
        return true;
      }

      setLoadingMessage('Adding torrent to qBittorrent...');
      const addRes = await fetchWithTimeout('/api/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet }),
      }, 25000);

      const addData = await addRes.json();
      if (!addRes.ok) {
        throw new Error(addData.error || 'Failed to add torrent to qBittorrent');
      }

      await fetchTorrents();
      showToast(addData.message || 'Torrent added to qBittorrent.');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Error processing magnet link', 'error');
      return false;
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // User confirmed which files to download (Requirement #1)
  const handleStartCloudDownload = async (selectedFileIds: string[]) => {
    if (!pendingMagnetUri || selectedFileIds.length === 0) return;
    setIsLoading(true);
    setLoadingMessage('Downloading selected files...');
    try {
      const res = await fetchWithTimeout('/api/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          magnet: pendingMagnetUri,
          selectedFileIds,
        }),
      }, 25000);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start cloud download');
      }

      await fetchTorrents();
      showToast(
        data.message ||
          `Started qBittorrent download for ${selectedFileIds.length} selected file${selectedFileIds.length > 1 ? 's' : ''}.`
      );

      // Keep modal open with the new torrent in "Separate Links" tab so user can immediately copy/download!
      if (data.torrent) {
        setIsPreDownloadSelection(false);
        setSelectionModalTab('links');
        setActiveSelectionTorrent(data.torrent);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to download selected files', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete torrent
  const handleDeleteTorrent = async (torrentId: string) => {
    try {
      const res = await fetch(`/api/torrents/${torrentId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTorrents();
        showToast('Torrent removed from qBittorrent');
        if (activeFolderTorrent?.id === torrentId) {
          setActiveFolderTorrent(null);
        }
      }
    } catch {
      showToast('Failed to delete torrent', 'error');
    }
  };

  // Clear all storage
  const handleClearStorage = async () => {
    if (!confirm('Are you sure you want to remove all qBittorrent torrents and downloaded files?')) {
      return;
    }
    try {
      const res = await fetch('/api/torrents', { method: 'DELETE' });
      if (res.ok) {
        await fetchTorrents();
        showToast('qBittorrent storage cleared');
      }
    } catch {
      showToast('Failed to clear cloud storage', 'error');
    }
  };

  // Open player
  const handleOpenPlayer = (file: TorrentFile, torrent: TorrentItem) => {
    setActivePlayerFile(file);
    setActivePlayerTorrent(torrent);
  };

  const freeBytes = Math.max(0, (storage.totalBytes || storage.usedBytes || 1) - storage.usedBytes);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 ${
              toast.type === 'error'
                ? 'bg-rose-900 text-rose-50 border-rose-800'
                : 'bg-neutral-900 text-emerald-400 border-neutral-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        storage={storage}
        cloudStats={cloudStats}
        onClearStorage={handleClearStorage}
        onOpenBulkExport={() => setIsBulkExportOpen(true)}
        totalTorrents={torrents.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner highlighting Seedr feature */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-neutral-900 text-white shadow-sm border border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                qBittorrent Downloads & Direct Links
              </h1>
              <p className="text-xs text-neutral-300">
                Downloads directly on 10 Gbps cloud servers and provides instant HTTP direct download links, media streaming, and ZIP bundling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Private (No IP Leaks)
            </span>
            <span className="flex items-center gap-1.5 text-neutral-300 bg-neutral-800/80 px-2.5 py-1 rounded-lg border border-neutral-700">
              <HardDrive className="w-3.5 h-3.5" />
              {formatBytes(freeBytes)} Remaining
            </span>
          </div>
        </div>

        <MagnetInputBar onAddMagnet={handleAddMagnet} isLoading={isLoading} loadingMessage={loadingMessage} />

        {/* Torrents & Cloud File Manager Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Your qBittorrent Downloads</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-mono">
                {torrents.length} items
              </span>
            </h2>
          </div>

          <TorrentList
            torrents={torrents}
            onOpenFolder={(torrent) => setActiveFolderTorrent(torrent)}
            onOpenPlayer={handleOpenPlayer}
            onOpenInfo={(torrent) => setActiveInfoTorrent(torrent)}
            onDelete={handleDeleteTorrent}
            onSelectFiles={(torrent) => {
              setIsPreDownloadSelection(false);
              setSelectionModalTab('selection');
              setActiveSelectionTorrent(torrent);
            }}
            onOpenSeparateLinks={(torrent) => {
              setIsPreDownloadSelection(false);
              setSelectionModalTab('links');
              setActiveSelectionTorrent(torrent);
            }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 mt-12 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">InstantSeeder qBittorrent</span>
            <span>•</span>
            <span>Real qBittorrent state with HTTP direct links</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>HTTP 206 Partial Content (Resume Support)</span>
            <span>•</span>
            <span>IDM & JDownloader Ready</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {activeFolderTorrent && (
        <FolderModal
          torrent={activeFolderTorrent}
          onClose={() => setActiveFolderTorrent(null)}
          onOpenPlayer={handleOpenPlayer}
        />
      )}

      {activeSelectionTorrent && (
        <FileSelectionModal
          torrent={activeSelectionTorrent}
          isOpen={!!activeSelectionTorrent}
          isPreDownload={isPreDownloadSelection}
          initialTab={selectionModalTab}
          onStartCloudDownload={handleStartCloudDownload}
          onClose={() => {
            setActiveSelectionTorrent(null);
            setIsPreDownloadSelection(false);
            setPendingMagnetUri('');
          }}
          onOpenPlayer={handleOpenPlayer}
        />
      )}

      {activePlayerFile && activePlayerTorrent && (
        <MediaPlayerModal
          file={activePlayerFile}
          torrent={activePlayerTorrent}
          onClose={() => {
            setActivePlayerFile(null);
            setActivePlayerTorrent(null);
          }}
        />
      )}

      {activeInfoTorrent && (
        <TorrentInfoModal
          torrent={activeInfoTorrent}
          onClose={() => setActiveInfoTorrent(null)}
        />
      )}

      {isBulkExportOpen && (
        <DirectLinksExportModal
          isOpen={isBulkExportOpen}
          torrents={torrents}
          onClose={() => setIsBulkExportOpen(false)}
        />
      )}
    </div>
  );
}
