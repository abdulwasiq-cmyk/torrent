import React, { useState } from 'react';
import { Search, LayoutGrid, List, FolderOpen, ArrowUpDown } from 'lucide-react';
import { TorrentItem, TorrentFile } from '../types';
import { TorrentCard } from './TorrentCard';

interface TorrentListProps {
  torrents: TorrentItem[];
  onOpenFolder: (torrent: TorrentItem) => void;
  onOpenPlayer: (file: TorrentFile, torrent: TorrentItem) => void;
  onOpenInfo: (torrent: TorrentItem) => void;
  onDelete: (torrentId: string) => void;
  onSelectFiles?: (torrent: TorrentItem) => void;
  onOpenSeparateLinks?: (torrent: TorrentItem) => void;
}

export const TorrentList: React.FC<TorrentListProps> = ({
  torrents,
  onOpenFolder,
  onOpenPlayer,
  onOpenInfo,
  onDelete,
  onSelectFiles,
  onOpenSeparateLinks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'video' | 'iso' | 'audio'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'newest' | 'size' | 'name'>('newest');

  // Filter torrents
  const filtered = torrents
    .filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.files.some((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFilter === 'video') {
        return t.files.some((f) => f.type === 'video');
      }
      if (selectedFilter === 'iso') {
        return t.files.some((f) => f.type === 'iso');
      }
      if (selectedFilter === 'audio') {
        return t.files.some((f) => f.type === 'audio');
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'size') return b.totalSize - a.totalSize;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-neutral-200">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cloud files & torrents..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* Filter Pills, Sorting & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedFilter === 'all' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({torrents.length})
            </button>
            <button
              onClick={() => setSelectedFilter('video')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedFilter === 'video' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setSelectedFilter('iso')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedFilter === 'iso' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              ISOs
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

          {/* Sort selection */}
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-medium text-neutral-700 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="size">Largest Size</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

          {/* Layout Switcher */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-neutral-100 mx-auto flex items-center justify-center text-neutral-400 mb-3">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-neutral-800">
            {searchQuery ? 'No matching cloud files found' : 'Your cloud drive is empty'}
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery
              ? `No torrents match "${searchQuery}". Clear your search query to see all items.`
              : 'Paste a magnet link above to add a real qBittorrent download.'}
          </p>
        </div>
      ) : (
        /* Torrent Grid or List */
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filtered.map((torrent) => (
            <TorrentCard
              key={torrent.id}
              torrent={torrent}
              onOpenFolder={onOpenFolder}
              onOpenPlayer={onOpenPlayer}
              onOpenInfo={onOpenInfo}
              onDelete={onDelete}
              onSelectFiles={onSelectFiles}
              onOpenSeparateLinks={onOpenSeparateLinks}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
