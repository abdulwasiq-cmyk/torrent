import React from 'react';
import { Cloud, Zap, HardDrive, Trash2, Server } from 'lucide-react';
import { StorageStats, CloudStats } from '../types';
import { formatBytes } from '../utils/formatters';

interface HeaderProps {
  storage: StorageStats;
  cloudStats: CloudStats | null;
  onClearStorage: () => void;
  onOpenBulkExport: () => void;
  totalTorrents: number;
}

export const Header: React.FC<HeaderProps> = ({
  storage,
  cloudStats,
  onClearStorage,
  onOpenBulkExport,
  totalTorrents,
}) => {
  const usedPercent = Math.min(100, Math.round((storage.usedBytes / storage.totalBytes) * 100));

  const getStorageColor = (pct: number) => {
    if (pct > 85) return 'bg-rose-500';
    if (pct > 65) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <header className="border-b border-neutral-200 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-600/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg text-neutral-900 tracking-tight">
                  InstantSeeder<span className="text-emerald-600">.cloud</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  qBittorrent connected
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-normal">
                qBittorrent downloads with direct HTTP links and media streaming
              </p>
            </div>
          </div>

          {/* Storage Quota & Actions */}
          <div className="flex items-center flex-wrap gap-4">
            {/* Storage Progress Bar (Seedr Free Tier style: 5 GB quota) */}
            <div className="flex items-center gap-3 bg-neutral-50 px-3.5 py-1.5 rounded-xl border border-neutral-200/80">
              <HardDrive className="w-4 h-4 text-neutral-500" />
              <div className="flex flex-col min-w-[140px] sm:min-w-[180px]">
                <div className="flex justify-between items-center text-xs font-medium text-neutral-700 mb-1">
                  <span>Cloud Storage</span>
                  <span className="font-semibold text-neutral-900">
                    {formatBytes(storage.usedBytes)} / {formatBytes(storage.totalBytes)}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getStorageColor(usedPercent)}`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-700">
                {usedPercent}%
              </span>
            </div>

            {/* Cloud Swarm Telemetry */}
            {cloudStats && (
              <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200/60">
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                <span>Node Speed: <strong className="text-neutral-900">{cloudStats.cloudSpeed}</strong></span>
                <span className="text-neutral-300">•</span>
                <span>Active Swarm: <strong className="text-neutral-900">{cloudStats.activeSeeds} peers</strong></span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              {totalTorrents > 0 && (
                <button
                  onClick={onOpenBulkExport}
                  title="Export all direct download links for IDM, JDownloader or curl"
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors border border-neutral-200 flex items-center gap-1.5"
                >
                  Export Links
                </button>
              )}
              {totalTorrents > 0 && (
                <button
                  onClick={onClearStorage}
                  title="Clear cloud storage"
                  className="p-1.5 text-xs font-medium rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
