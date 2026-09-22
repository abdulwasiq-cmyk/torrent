import React, { useState } from 'react';
import {
  Folder,
  Download,
  Play,
  FileArchive,
  Info,
  Trash2,
  Copy,
  Check,
  Users,
  Film,
  HardDriveDownload,
  Link2,
} from 'lucide-react';
import { TorrentItem, TorrentFile } from '../types';
import { formatBytes, formatSpeed, timeAgo } from '../utils/formatters';

interface TorrentCardProps {
  torrent: TorrentItem;
  onOpenFolder: (torrent: TorrentItem) => void;
  onOpenPlayer: (file: TorrentFile, torrent: TorrentItem) => void;
  onOpenInfo: (torrent: TorrentItem) => void;
  onDelete: (torrentId: string) => void;
  onSelectFiles?: (torrent: TorrentItem) => void;
  onOpenSeparateLinks?: (torrent: TorrentItem) => void;
  viewMode: 'grid' | 'list';
}

export const TorrentCard: React.FC<TorrentCardProps> = ({
  torrent,
  onOpenFolder,
  onOpenPlayer,
  onOpenInfo,
  onDelete,
  onSelectFiles,
  onOpenSeparateLinks,
  viewMode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  // Find primary file (first streamable video or first file)
  const primaryVideo = torrent.files.find((f) => f.type === 'video');
  const primaryFile = primaryVideo || torrent.files[0];

  const handleCopyDirectLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryFile) return;

    const absoluteUrl = `${window.location.origin}/api/download/${primaryFile.id}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      prompt('Direct Download Link:', absoluteUrl);
    }
  };

  const handleDirectDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If the torrent contains multiple files, ask which files to download
    if (torrent.files.length > 1 && onSelectFiles) {
      onSelectFiles(torrent);
      return;
    }

    if (!primaryFile) return;
    const link = document.createElement('a');
    link.href = `/api/download/${primaryFile.id}`;
    link.download = primaryFile.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 200);
  };

  const handleDownloadZip = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/torrents/${torrent.id}/zip`;
    link.download = `${torrent.name}.zip`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 200);
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 hover:border-emerald-300 transition-all p-4 shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 group">
        {/* Left: Icon & Info */}
        <div
          onClick={() => onOpenFolder(torrent)}
          className="flex items-start gap-3.5 flex-1 min-w-0 cursor-pointer"
        >
          <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            {primaryVideo ? <Film className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-neutral-900 truncate hover:text-emerald-700 transition-colors">
                {torrent.name}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                torrent.status === 'ready'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : torrent.status === 'error'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {torrent.files.length === 0 ? 'Waiting for metadata' : torrent.status}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1 flex-wrap font-mono">
              <span className="font-sans font-medium text-neutral-700">{formatBytes(torrent.totalSize)}</span>
              <span>•</span>
              <span>{torrent.files.length} {torrent.files.length === 1 ? 'file' : 'files'}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-neutral-600 font-sans">
                <Users className="w-3 h-3 text-neutral-400" />
                {torrent.seeds + torrent.leechers} peers
              </span>
              <span>•</span>
              <span>{formatSpeed(torrent.downloadSpeed)} down</span>
              <span>•</span>
              <span>{timeAgo(torrent.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Instant Direct Download Button */}
          <button
            onClick={handleDirectDownload}
            title={
              torrent.files.length > 1
                ? 'Select which files to download'
                : 'Download file directly to computer'
            }
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{torrent.files.length > 1 ? `Choose Files (${torrent.files.length})` : 'Direct Download'}</span>
          </button>

          {/* Copy Direct Link */}
          <button
            onClick={handleCopyDirectLink}
            title="Copy instant direct HTTP download link"
            className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Separate Links of all files */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSeparateLinks?.(torrent);
            }}
            title="View separate direct links for each file in this torrent"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200/60"
          >
            <Link2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Separate Links ({torrent.files.length})</span>
          </button>

          {/* Stream Online (if video exists) */}
          {primaryVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPlayer(primaryVideo, torrent);
              }}
              title="Stream movie/audio online in browser"
              className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-teal-200/60"
            >
              <Play className="w-3.5 h-3.5 fill-teal-600" />
              <span>Watch</span>
            </button>
          )}

          {/* Download Zip */}
          <button
            onClick={handleDownloadZip}
            title="Download entire folder as ZIP archive"
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors border border-neutral-200 cursor-pointer"
          >
            <FileArchive className="w-3.5 h-3.5" />
          </button>

          {/* Torrent Info */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInfo(torrent);
            }}
            title="View infohash & trackers"
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors border border-neutral-200 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(torrent.id);
            }}
            title="Delete from cloud storage"
            className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors border border-neutral-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 hover:border-emerald-300 transition-all p-5 shadow-2xs hover:shadow-xs flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            {primaryVideo ? <Film className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
            torrent.status === 'ready'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : torrent.status === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {torrent.files.length === 0 ? 'Waiting for metadata' : torrent.status}
          </span>
        </div>

        <h3
          onClick={() => onOpenFolder(torrent)}
          className="text-base font-semibold text-neutral-900 line-clamp-2 hover:text-emerald-700 transition-colors cursor-pointer"
          title={torrent.name}
        >
          {torrent.name}
        </h3>

        <div className="flex items-center justify-between text-xs text-neutral-500 mt-3 pt-3 border-t border-neutral-100">
          <span className="font-semibold text-neutral-900">{formatBytes(torrent.totalSize)}</span>
          <span>{torrent.files.length} files</span>
          <span className="flex items-center gap-1 text-neutral-600">
            <Users className="w-3 h-3 text-neutral-400" />
            {torrent.seeds + torrent.leechers} peers
          </span>
          <span>{formatSpeed(torrent.downloadSpeed)} DL</span>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDirectDownload}
            title={
              torrent.files.length > 1
                ? 'Select which files to download'
                : 'Download file directly'
            }
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{torrent.files.length > 1 ? `Choose Files (${torrent.files.length})` : 'Download'}</span>
          </button>

          <button
            onClick={handleCopyDirectLink}
            className="w-full py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            onClick={() => onOpenFolder(torrent)}
            className="text-neutral-600 hover:text-neutral-900 font-medium hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Browse</span>
          </button>

          <button
            onClick={() => onOpenSeparateLinks?.(torrent)}
            className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Separate Links</span>
          </button>

          <div className="flex items-center gap-1">
            {primaryVideo && (
              <button
                onClick={() => onOpenPlayer(primaryVideo, torrent)}
                title="Watch Online"
                className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-600 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-teal-600" />
              </button>
            )}
            <button
              onClick={handleDownloadZip}
              title="Download as ZIP"
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <FileArchive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenInfo(torrent)}
              title="Torrent Details"
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(torrent.id)}
              title="Delete"
              className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
