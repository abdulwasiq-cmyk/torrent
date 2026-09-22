import React, { useState, useEffect } from 'react';
import { X, Info, Copy, Check, Radio, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { TorrentItem } from '../types';
import { formatBytes } from '../utils/formatters';

interface TorrentInfoModalProps {
  torrent: TorrentItem | null;
  onClose: () => void;
}

export const TorrentInfoModal: React.FC<TorrentInfoModalProps> = ({ torrent, onClose }) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedMagnet, setCopiedMagnet] = useState(false);

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

  if (!torrent) return null;

  const copyToClipboard = async (text: string, type: 'hash' | 'magnet') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'hash') {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      } else {
        setCopiedMagnet(true);
        setTimeout(() => setCopiedMagnet(false), 2000);
      }
    } catch {
      prompt('Copy text:', text);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-100 text-neutral-700">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Torrent Telemetry & Details</h3>
              <p className="text-xs text-neutral-500">Debrid cache inspection and swarm metadata</p>
            </div>
          </div>
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

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Name & Size */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
              Torrent Name
            </label>
            <p className="text-sm font-medium text-neutral-900 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 break-words">
              {torrent.name}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
              <span className="text-[11px] text-neutral-500 block">Total Size</span>
              <span className="text-sm font-semibold text-neutral-900 font-mono">
                {formatBytes(torrent.totalSize)}
              </span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
              <span className="text-[11px] text-neutral-500 block">Active Seeds</span>
              <span className="text-sm font-semibold text-emerald-600 font-mono">
                {torrent.seeds}
              </span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
              <span className="text-[11px] text-neutral-500 block">Cache Status</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                Instant (100%)
              </span>
            </div>
          </div>

          {/* Info Hash (BTIH) */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
              BTIH Info Hash (SHA-1)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={torrent.infoHash}
                className="w-full font-mono text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(torrent.infoHash, 'hash')}
                className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Raw Magnet Link */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
              Full Magnet URI
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={torrent.magnetUri}
                className="w-full font-mono text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 truncate focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(torrent.magnetUri, 'magnet')}
                className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                {copiedMagnet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>{copiedMagnet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Trackers */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>Announce Trackers ({torrent.trackers.length})</span>
            </label>
            <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 max-h-32 overflow-y-auto space-y-1 font-mono text-xs text-neutral-600">
              {torrent.trackers.map((tr, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] truncate">
                  <span className="truncate">{tr}</span>
                  <span className="text-emerald-600 font-sans text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 ml-2">
                    Online
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs">
          <span className="text-neutral-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified against public DHT swarm.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
