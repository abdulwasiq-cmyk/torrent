import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Folder,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  Disc,
  File,
  Download,
  Play,
  Copy,
  Check,
  FileArchive as ZipIcon,
  HardDrive,
  CheckSquare,
  Square,
  Search,
  Filter,
} from 'lucide-react';
import { TorrentItem, TorrentFile } from '../types';
import { formatBytes } from '../utils/formatters';

interface FolderModalProps {
  torrent: TorrentItem | null;
  onClose: () => void;
  onOpenPlayer: (file: TorrentFile, torrent: TorrentItem) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({ torrent, onClose, onOpenPlayer }) => {
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'video' | 'document' | 'audio'>('all');

  // Initialize selected file IDs when torrent changes
  useEffect(() => {
    if (torrent?.files) {
      setSelectedIds(new Set(torrent.files.map((f) => f.id)));
      setSearchQuery('');
      setCategoryFilter('all');
    }
  }, [torrent]);

  // Close on Escape key
  useEffect(() => {
    if (!torrent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [torrent, onClose]);

  const rawFiles = torrent?.files || [];
  const files = useMemo(() => {
    return [...rawFiles].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [rawFiles]);

  const videoFiles = useMemo(() => files.filter((f) => f.type === 'video'), [files]);
  const subOrDocFiles = useMemo(
    () => files.filter((f) => f.type === 'document' || f.name.endsWith('.srt') || f.name.endsWith('.vtt')),
    [files]
  );
  const audioFiles = useMemo(() => files.filter((f) => f.type === 'audio'), [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (categoryFilter === 'video' && file.type !== 'video') return false;
      if (categoryFilter === 'document' && file.type !== 'document' && !file.name.endsWith('.srt')) return false;
      if (categoryFilter === 'audio' && file.type !== 'audio') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return file.name.toLowerCase().includes(q) || file.path.toLowerCase().includes(q);
      }
      return true;
    });
  }, [files, categoryFilter, searchQuery]);

  if (!torrent) return null;

  const allFilteredSelected =
    filteredFiles.length > 0 && filteredFiles.every((f) => selectedIds.has(f.id));
  const someFilteredSelected =
    filteredFiles.some((f) => selectedIds.has(f.id)) && !allFilteredSelected;

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredFiles.forEach((f) => next.delete(f.id));
      } else {
        filteredFiles.forEach((f) => next.add(f.id));
      }
      return next;
    });
  };

  const selectOnlyVideos = () => {
    setSelectedIds(new Set(videoFiles.map((f) => f.id)));
  };

  const selectOnlySubs = () => {
    setSelectedIds(new Set(subOrDocFiles.map((f) => f.id)));
  };

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedFiles = files.filter((f) => selectedIds.has(f.id));
  const selectedTotalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const handleCopyLink = async (file: TorrentFile) => {
    const directUrl = `${window.location.origin}/api/download/${file.id}`;
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedFileId(file.id);
      setTimeout(() => setCopiedFileId(null), 2500);
    } catch {
      prompt('Direct Download URL:', directUrl);
    }
  };

  const handleDirectDownload = (file: TorrentFile) => {
    window.location.href = `/api/download/${file.id}`;
  };

  const handleDownloadZipAll = () => {
    window.location.href = `/api/torrents/${torrent.id}/zip`;
  };

  const handleDownloadSelected = () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size === 1) {
      const singleId = Array.from(selectedIds)[0];
      window.location.href = `/api/download/${singleId}`;
      return;
    }
    const fileIdsParam = Array.from(selectedIds).join(',');
    window.location.href = `/api/torrents/${torrent.id}/zip?files=${encodeURIComponent(fileIdsParam)}`;
  };

  const getFileIcon = (file: TorrentFile) => {
    if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
      return <FileText className="w-4 h-4 text-teal-600" />;
    }
    switch (file.type) {
      case 'video':
        return <FileVideo className="w-4 h-4 text-emerald-600" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-indigo-600" />;
      case 'iso':
        return <Disc className="w-4 h-4 text-amber-600" />;
      case 'archive':
        return <FileArchive className="w-4 h-4 text-purple-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <File className="w-4 h-4 text-neutral-500" />;
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Folder className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                <span>Cloud Drive Folder</span>
                <span>/</span>
                <span className="font-semibold text-emerald-700">{files.length} Files</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 truncate" title={torrent.name}>
                {torrent.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadZipAll}
              className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ZipIcon className="w-3.5 h-3.5 text-neutral-600" />
              <span>Download ZIP (All)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-2.5 border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All ({files.length})
            </button>

            {videoFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter('video')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'video'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                Videos ({videoFiles.length})
              </button>
            )}

            {subOrDocFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter('document')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'document'
                    ? 'bg-teal-700 text-white'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/60'
                }`}
              >
                Subs & Docs ({subOrDocFiles.length})
              </button>
            )}

            {audioFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter('audio')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'audio'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
                }`}
              >
                Audio ({audioFiles.length})
              </button>
            )}
          </div>

          <div className="relative shrink-0 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={`Filter ${files.length} files...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden text-xs text-neutral-800 placeholder:text-neutral-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Selection Bar */}
        <div className="px-6 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-xs text-neutral-700 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="flex items-center gap-1.5 font-semibold hover:text-emerald-700 transition-colors cursor-pointer select-none"
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : someFilteredSelected ? (
                <div className="w-4 h-4 rounded border-2 border-emerald-600 bg-emerald-600 flex items-center justify-center text-white">
                  <div className="w-2 h-0.5 bg-white rounded-xs" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-neutral-400" />
              )}
              <span>{allFilteredSelected ? 'Deselect All' : 'Select All'}</span>
            </button>

            <span className="text-neutral-300">|</span>

            {videoFiles.length > 0 && files.length > videoFiles.length && (
              <button
                type="button"
                onClick={selectOnlyVideos}
                className="px-2 py-0.5 rounded-md bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 font-medium text-[11px] transition-colors cursor-pointer"
              >
                Only {videoFiles.length} Videos
              </button>
            )}

            {subOrDocFiles.length > 0 && files.length > subOrDocFiles.length && (
              <button
                type="button"
                onClick={selectOnlySubs}
                className="px-2 py-0.5 rounded-md bg-teal-100/70 hover:bg-teal-100 text-teal-800 font-medium text-[11px] transition-colors cursor-pointer"
              >
                Only {subOrDocFiles.length} Subtitles
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>
              Selected: <strong>{selectedIds.size}</strong> of {files.length} ({formatBytes(selectedTotalSize)})
            </span>
            {selectedIds.size > 0 && selectedIds.size < files.length && (
              <button
                type="button"
                onClick={handleDownloadSelected}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-2 sm:p-3">
          {filteredFiles.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <Filter className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-neutral-700">No files found matching filter</p>
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isChecked = selectedIds.has(file.id);
              return (
                <div
                  key={file.id}
                  className={`p-3 rounded-xl transition-colors flex items-center justify-between gap-3 group ${
                    isChecked ? 'bg-emerald-50/50 hover:bg-emerald-50/80 border border-emerald-200/60' : 'hover:bg-neutral-50 border border-transparent'
                  }`}
                >
                  {/* File Info & Selection checkbox */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleFile(file.id)}
                      className="p-1 text-emerald-600 hover:scale-105 transition-transform cursor-pointer"
                      aria-label={`Select ${file.name}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400" />
                      )}
                    </button>

                    <div className="p-2 rounded-lg bg-neutral-100 shrink-0">
                      {getFileIcon(file)}
                    </div>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleFile(file.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-neutral-400 shrink-0">#{idx + 1}</span>
                        <p className="text-xs sm:text-sm font-semibold text-neutral-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                        <span className="font-semibold text-neutral-700">{formatBytes(file.size)}</span>
                        {file.path.includes('/') && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[240px]" title={file.path}>{file.path}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {file.streamable && (
                      <button
                        type="button"
                        onClick={() => onOpenPlayer(file, torrent)}
                        title="Watch or preview online"
                        className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium transition-colors cursor-pointer border border-teal-200/50"
                      >
                        <Play className="w-3.5 h-3.5 fill-teal-600" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyLink(file)}
                      title="Copy permanent direct HTTP download link"
                      className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {copiedFileId === file.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectDownload(file)}
                      title="Instant direct download"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500 gap-3">
          <span className="flex items-center gap-1.5 truncate">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">High-speed Seedr cloud debrid download.</span>
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleDownloadSelected}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Download Selected ({selectedIds.size})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
