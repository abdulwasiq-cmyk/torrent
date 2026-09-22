import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Download,
  Film,
  Music,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Play,
  Copy,
  Check,
  Search,
  FolderOpen,
  Filter,
  CheckCircle2,
  HardDrive,
  Link2,
  ArrowUpDown,
  FileDown,
  CloudDownload,
  ExternalLink,
  ListOrdered,
  FileCode,
} from 'lucide-react';
import { TorrentItem, TorrentFile } from '../types';
import { formatBytes } from '../utils/formatters';

interface FileSelectionModalProps {
  torrent: TorrentItem;
  isOpen: boolean;
  onClose: () => void;
  onOpenPlayer?: (file: TorrentFile, torrent: TorrentItem) => void;
  onConfirmSelection?: (selectedFileIds: string[]) => void;
  isPreDownload?: boolean;
  onStartCloudDownload?: (selectedFileIds: string[]) => Promise<void> | void;
  initialTab?: 'selection' | 'links';
}

export const FileSelectionModal: React.FC<FileSelectionModalProps> = ({
  torrent,
  isOpen,
  onClose,
  onOpenPlayer,
  onConfirmSelection,
  isPreDownload = false,
  onStartCloudDownload,
  initialTab = 'selection',
}) => {
  // Pre-select all files by default
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(torrent?.files?.map((f) => f.id) || [])
  );
  const [activeTab, setActiveTab] = useState<'selection' | 'links'>(initialTab);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'video' | 'audio' | 'document' | 'other'>('all');
  const [linkFormat, setLinkFormat] = useState<'plain' | 'idm' | 'curl'>('plain');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Synchronize when torrent changes
  useEffect(() => {
    if (torrent?.files) {
      setSelectedIds(new Set(torrent.files.map((f) => f.id)));
      setSearchQuery('');
      setCategoryFilter('all');
      setActiveTab(initialTab);
      setDownloadStarted(false);
    }
  }, [torrent, initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const rawFiles = torrent?.files || [];

  // NATURAL ALPHABETICAL ORDER SORTING (Mandatory Requirement #2)
  const sortedFiles = useMemo(() => {
    return [...rawFiles].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [rawFiles, sortOrder]);

  // Categorize files
  const videoFiles = useMemo(() => sortedFiles.filter((f) => f.type === 'video'), [sortedFiles]);
  const subtitleOrDocFiles = useMemo(
    () => sortedFiles.filter((f) => f.type === 'document' || f.name.endsWith('.srt') || f.name.endsWith('.vtt')),
    [sortedFiles]
  );
  const audioFiles = useMemo(() => sortedFiles.filter((f) => f.type === 'audio'), [sortedFiles]);

  // Filtered files based on category and search
  const filteredFiles = useMemo(() => {
    return sortedFiles.filter((file) => {
      if (categoryFilter === 'video' && file.type !== 'video') return false;
      if (categoryFilter === 'audio' && file.type !== 'audio') return false;
      if (categoryFilter === 'document' && file.type !== 'document' && !file.name.endsWith('.srt')) return false;
      if (categoryFilter === 'other' && ['video', 'audio', 'document'].includes(file.type)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query);
      }
      return true;
    });
  }, [sortedFiles, categoryFilter, searchQuery]);

  if (!isOpen || !torrent) return null;

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

  const selectOnlySubtitles = () => {
    setSelectedIds(new Set(subtitleOrDocFiles.map((f) => f.id)));
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

  const selectedFiles = sortedFiles.filter((f) => selectedIds.has(f.id));
  const selectedTotalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const getFileIcon = (file: TorrentFile) => {
    if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
      return <FileText className="w-4 h-4 text-teal-600" />;
    }
    switch (file.type) {
      case 'video':
        return <Film className="w-4 h-4 text-emerald-600" />;
      case 'audio':
        return <Music className="w-4 h-4 text-indigo-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'archive':
        return <FileArchive className="w-4 h-4 text-purple-600" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-sky-600" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getFileDirectUrl = (file: TorrentFile) => {
    return `${window.location.origin}/api/download/${file.id}`;
  };

  const handleCopyLink = async (file: TorrentFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = getFileDirectUrl(file);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      prompt('Direct Download URL:', link);
    }
  };

  const handleDownloadSingle = (file: TorrentFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/download/${file.id}`;
    link.download = file.name;
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

  // Copy all separate links to clipboard
  const handleCopyAllLinks = async () => {
    if (selectedFiles.length === 0) return;
    let text = '';
    if (linkFormat === 'plain') {
      text = selectedFiles.map((f) => getFileDirectUrl(f)).join('\n');
    } else if (linkFormat === 'idm') {
      text = selectedFiles
        .map((f) => `<${getFileDirectUrl(f)}>\nfilepath=\\Downloads\\${torrent.name}\nfilename=${f.name}`)
        .join('\n\n');
    } else if (linkFormat === 'curl') {
      text = selectedFiles.map((f) => `curl -L -O -J "${getFileDirectUrl(f)}"`).join('\n');
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      prompt('Copy links:', text);
    }
  };

  // Save links as .txt file
  const handleExportLinksTxt = () => {
    if (selectedFiles.length === 0) return;
    const lines = [
      `# Torrent: ${torrent.name}`,
      `# InfoHash: ${torrent.infoHash}`,
      `# Total Selected Files: ${selectedFiles.length} (${formatBytes(selectedTotalSize)})`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      ...selectedFiles.map((f) => `${f.name}\t${formatBytes(f.size)}\t${getFileDirectUrl(f)}`),
      '',
      '# Direct URL list (for IDM / JDownloader / aria2):',
      ...selectedFiles.map((f) => getFileDirectUrl(f)),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${torrent.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_separate_links.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all selected files individually (separate browser downloads)
  const handleDownloadEachSeparately = () => {
    if (selectedFiles.length === 0) return;
    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `/api/download/${file.id}`;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 400); // slight delay so browser doesn't block multiple popups
    });
  };

  // Handle start cloud download (Requirement #1)
  const handleStartCloudDownload = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      if (onStartCloudDownload) {
        await onStartCloudDownload(Array.from(selectedIds));
      }
      setDownloadStarted(true);
      // Auto-switch to Separate Links tab to show the user their links immediately!
      setActiveTab('links');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download selected as ZIP archive
  const handleDownloadZipArchive = () => {
    if (selectedIds.size === 0) return;
    if (onConfirmSelection) {
      onConfirmSelection(Array.from(selectedIds));
    }

    if (selectedIds.size === 1) {
      const singleId = Array.from(selectedIds)[0];
      const singleFile = sortedFiles.find((f) => f.id === singleId);
      const link = document.createElement('a');
      link.href = `/api/download/${singleId}`;
      if (singleFile) link.download = singleFile.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 200);
      onClose();
      return;
    }

    const fileIdsParam = Array.from(selectedIds).join(',');
    const link = document.createElement('a');
    link.href = `/api/torrents/${torrent.id}/zip?files=${encodeURIComponent(fileIdsParam)}`;
    link.download = `${torrent.name}_selected.zip`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 200);
    onClose();
  };

  return (
    <div
      id="file-selection-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-selection-title"
    >
      <div
        id="file-selection-dialog"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/90 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-700" />
                {rawFiles.length} Files in Torrent
              </span>

              {isPreDownload ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <CloudDownload className="w-3.5 h-3.5 text-amber-700" />
                  Select Files First
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  qBittorrent files
                </span>
              )}

              <span className="text-xs text-neutral-500 font-mono">
                Total: {formatBytes(torrent.totalSize)}
              </span>
            </div>

            <h3 id="file-selection-title" className="text-lg font-bold text-neutral-900 mt-1 truncate" title={torrent.name}>
              {isPreDownload ? 'Which files would you like to download?' : torrent.name}
            </h3>

            <p className="text-xs text-neutral-600 truncate mt-0.5">
              {isPreDownload
                ? 'Select only the files you want. Our cloud servers will download only your chosen files.'
                : 'Manage files, stream online, or get separate direct download links.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/80 active:bg-neutral-300 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: [Select Files] vs [Separate Download Links] */}
        <div className="px-6 border-b border-neutral-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('selection')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'selection'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Select Files ({selectedIds.size}/{rawFiles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'links'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Separate Download Links ({selectedIds.size})</span>
            </button>
          </div>

          {/* Alphabetical Order Badge & Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title="Toggle Alphabetical Sorting"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
            <span>Alphabetical: {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
          </button>
        </div>

        {/* Success notification banner after starting cloud download */}
        {downloadStarted && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Cloud Download Started!</strong> Downloading only your <strong>{selectedIds.size} selected files</strong> ({formatBytes(selectedTotalSize)}). Individual links are listed below:
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
            >
              View Links →
            </button>
          </div>
        )}

        {/* TAB 1: FILE SELECTION */}
        {activeTab === 'selection' && (
          <>
            {/* Category Filter Tabs & Search */}
            <div className="px-6 py-3 border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All Files ({rawFiles.length})
                </button>

                {videoFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('video')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      categoryFilter === 'video'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Videos ({videoFiles.length})</span>
                  </button>
                )}

                {subtitleOrDocFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('document')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      categoryFilter === 'document'
                        ? 'bg-teal-700 text-white'
                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Subs & Docs ({subtitleOrDocFiles.length})</span>
                  </button>
                )}

                {audioFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('audio')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      categoryFilter === 'audio'
                        ? 'bg-indigo-700 text-white'
                        : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Audio ({audioFiles.length})</span>
                  </button>
                )}
              </div>

              {/* Quick Search */}
              <div className="relative shrink-0 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder={`Search ${rawFiles.length} files...`}
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

            {/* Quick Selection Toolbar */}
            <div className="px-6 py-2.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between text-xs text-neutral-700 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="flex items-center gap-1.5 font-semibold text-neutral-800 hover:text-emerald-700 transition-colors cursor-pointer select-none"
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

                {/* Quick Preset Buttons */}
                {videoFiles.length > 0 && rawFiles.length > videoFiles.length && (
                  <button
                    type="button"
                    onClick={selectOnlyVideos}
                    className="px-2 py-0.5 rounded-md bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    Only {videoFiles.length} Videos
                  </button>
                )}

                {subtitleOrDocFiles.length > 0 && rawFiles.length > subtitleOrDocFiles.length && (
                  <button
                    type="button"
                    onClick={selectOnlySubtitles}
                    className="px-2 py-0.5 rounded-md bg-teal-100/70 hover:bg-teal-100 text-teal-800 font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    Only {subtitleOrDocFiles.length} Subtitles
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-600 font-medium">
                  <strong className="text-emerald-700">{selectedIds.size}</strong> of {rawFiles.length} selected
                </span>
                <span className="font-mono text-neutral-500 font-semibold">({formatBytes(selectedTotalSize)})</span>
              </div>
            </div>

            {/* Scrollable File List (Sorted Alphabetically) */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-2 sm:p-3">
              {filteredFiles.length === 0 ? (
                <div className="py-12 text-center text-neutral-500">
                  <Filter className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-neutral-700">No files match your filter</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Try searching for something else or clearing the search query.
                  </p>
                </div>
              ) : (
                filteredFiles.map((file, idx) => {
                  const isChecked = selectedIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFile(file.id)}
                      className={`p-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer group select-none ${
                        isChecked
                          ? 'bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200'
                          : 'hover:bg-neutral-50 border border-transparent'
                      }`}
                    >
                      {/* Checkbox and File info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0 text-emerald-600">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400" />
                          )}
                        </div>

                        <div className="p-2 rounded-lg bg-neutral-100 group-hover:bg-white shrink-0 transition-colors">
                          {getFileIcon(file)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-neutral-400 shrink-0">#{idx + 1}</span>
                            <p className="text-xs sm:text-sm font-semibold text-neutral-900 truncate" title={file.name}>
                              {file.name}
                            </p>
                            {file.type === 'video' && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Video
                              </span>
                            )}
                            {(file.name.endsWith('.srt') || file.name.endsWith('.vtt')) && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-800">
                                Subtitle
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500 font-mono">
                            <span className="font-semibold text-neutral-700">{formatBytes(file.size)}</span>
                            {file.path.includes('/') && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[280px]" title={file.path}>
                                  {file.path}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Individual Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {file.streamable && onOpenPlayer && (
                          <button
                            type="button"
                            onClick={() => onOpenPlayer(file, torrent)}
                            title="Stream online in player"
                            className="p-1.5 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-teal-600" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(file, e)}
                          title="Copy direct download link"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 active:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          {copiedId === file.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownloadSingle(file, e)}
                          title="Download this file only"
                          className="p-1.5 rounded-lg text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-neutral-600 truncate flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">
                  {selectedIds.size === 0 ? (
                    <span className="text-amber-700 font-medium">Please select at least 1 file</span>
                  ) : isPreDownload ? (
                    <span>
                      Will download only <strong>{selectedIds.size} files</strong> ({formatBytes(selectedTotalSize)}) to cloud storage
                    </span>
                  ) : (
                    <span>
                      Selected <strong>{selectedIds.size} of {rawFiles.length} files</strong> ({formatBytes(selectedTotalSize)})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('links')}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Get Separate Links</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {isPreDownload ? (
                  /* REQUIREMENT 1: Ask first which ones to download, then start downloading only those files */
                  <button
                    type="button"
                    disabled={selectedIds.size === 0 || isSubmitting}
                    onClick={handleStartCloudDownload}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                      selectedIds.size === 0 || isSubmitting
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                    }`}
                  >
                    <CloudDownload className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Starting Cloud Download...'
                        : selectedIds.size === 0
                        ? 'Select Files First'
                        : `Download Only Selected (${selectedIds.size})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={selectedIds.size === 0}
                    onClick={handleDownloadZipArchive}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                      selectedIds.size === 0
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {selectedIds.size === 0
                        ? 'Select Files'
                        : selectedIds.size === 1
                        ? 'Direct Download 1 File'
                        : `Download ZIP (${selectedIds.size} Files)`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: SEPARATE DOWNLOAD LINKS (Requirement #3) */}
        {activeTab === 'links' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Links Controls Bar */}
            <div className="px-6 py-3 border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  Separate Direct Download Links ({selectedFiles.length} Files)
                </h4>
                <p className="text-xs text-neutral-500">
                  Direct HTTP high-speed URLs for each file. Compatible with IDM, JDownloader, aria2, and browser.
                </p>
              </div>

              {/* Format selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-neutral-500">Format:</span>
                <button
                  type="button"
                  onClick={() => setLinkFormat('plain')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    linkFormat === 'plain'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Plain URLs
                </button>
                <button
                  type="button"
                  onClick={() => setLinkFormat('idm')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    linkFormat === 'idm'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  IDM List
                </button>
                <button
                  type="button"
                  onClick={() => setLinkFormat('curl')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    linkFormat === 'curl'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  cURL
                </button>
              </div>
            </div>

            {/* Quick Batch Actions Toolbar */}
            <div className="px-6 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-neutral-600 font-medium">
                {selectedFiles.length} separate links ready ({formatBytes(selectedTotalSize)})
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportLinksTxt}
                  className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Save .txt</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadEachSeparately}
                  title="Trigger separate downloads for each file without zipping"
                  className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Each Separately</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllLinks}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? 'All Copied!' : 'Copy All Separate Links'}</span>
                </button>
              </div>
            </div>

            {/* List of Individual Files with their Separate Links */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-3">
              {selectedFiles.length === 0 ? (
                <div className="py-12 text-center text-neutral-500">
                  <Link2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-neutral-700">No files selected</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('selection')}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Switch to selection tab to select files
                  </button>
                </div>
              ) : (
                selectedFiles.map((file, idx) => {
                  const directUrl = getFileDirectUrl(file);
                  const isCopied = copiedId === file.id;

                  return (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-white hover:bg-neutral-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-100"
                    >
                      {/* File Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-neutral-400 shrink-0">#{idx + 1}</span>
                          <div className="p-1 rounded-md bg-neutral-100 shrink-0">
                            {getFileIcon(file)}
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-xs font-mono text-neutral-500 shrink-0">
                            ({formatBytes(file.size)})
                          </span>
                        </div>

                        {/* Separate Direct URL Box */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-neutral-700 truncate select-all">
                            {directUrl}
                          </div>
                        </div>
                      </div>

                      {/* Actions for this individual link */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {file.streamable && onOpenPlayer && (
                          <button
                            type="button"
                            onClick={() => onOpenPlayer(file, torrent)}
                            title="Stream file online"
                            className="p-2 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/50 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-teal-600" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopyLink(file)}
                          title="Copy this separate direct link"
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
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

                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(file)}
                          title="Download this file directly"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-600 gap-3">
              <span className="truncate">
                All separate links support HTTP Range Requests (resumable downloads via IDM / JDownloader).
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('selection')}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-medium transition-colors cursor-pointer"
                >
                  ← Back to Selection
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
