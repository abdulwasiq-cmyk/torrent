import React, { useState } from 'react';
import { Zap, Link2, Clipboard, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface MagnetInputBarProps {
  onAddMagnet: (magnet: string) => Promise<boolean>;
  isLoading: boolean;
  loadingMessage?: string;
}

export const MagnetInputBar: React.FC<MagnetInputBarProps> = ({ onAddMagnet, isLoading, loadingMessage }) => {
  const [magnetInput, setMagnetInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput.trim()) return;

    setError(null);
    setSuccessMsg(null);

    const success = await onAddMagnet(magnetInput.trim());
    if (success) {
      setSuccessMsg('Torrent added to qBittorrent.');
      setMagnetInput('');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMagnetInput(text.trim());
      }
    } catch {
      // Permission denied or not supported in iframe
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 md:p-6 mb-8 transition-all">
      <div className="max-w-3xl">
        <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-600 fill-emerald-600" />
          Instant Cloud Torrent Fetcher
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Paste a BitTorrent magnet link or 40-character info hash. qBittorrent will resolve the metadata and manage the download.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Link2 className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={magnetInput}
              onChange={(e) => {
                setMagnetInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Paste magnet:?xt=urn:btih:... or 40-char info hash"
              className="w-full pl-11 pr-24 py-3 bg-neutral-50/80 border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-mono"
            />
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="absolute inset-y-1.5 right-1.5 px-3 flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors shadow-2xs"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !magnetInput.trim()}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingMessage || 'Resolving qBittorrent metadata...'}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>Fetch Instant Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {isLoading && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-neutral-600">
              {loadingMessage || 'Resolving metadata and preparing your instant link...'}
            </div>
          </div>
        )}

        {/* Status alerts */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </form>

    </div>
  );
};
