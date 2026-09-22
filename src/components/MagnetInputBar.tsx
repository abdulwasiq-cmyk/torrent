import React, { useState } from 'react';
import { Zap, Link2, Clipboard, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface MagnetInputBarProps {
  onAddMagnet: (magnet: string) => Promise<boolean>;
  isLoading: boolean;
  loadingMessage?: string;
}

const SAMPLE_MAGNETS = [
  {
    name: 'Breaking Bad S01 (16 Files)',
    size: '2.83 GB',
    type: '16 Files Series',
    magnet: 'magnet:?xt=urn:btih:3b8f60c29d612e698188de217743d11b3ef25890&dn=Breaking+Bad+Season+1+Complete&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce',
  },
  {
    name: 'Big Buck Bunny (1080p)',
    size: '844 MB',
    type: 'Video',
    magnet: 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny+1080p&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce',
  },
  {
    name: 'Tears of Steel (Sci-Fi)',
    size: '570 MB',
    type: 'Video',
    magnet: 'magnet:?xt=urn:btih:254f664a78441c2c31e0b571167909386d3fd327&dn=Tears+of+Steel+1080p&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce',
  },
  {
    name: 'Ubuntu 24.04 Desktop ISO',
    size: '2.75 GB',
    type: 'OS / ISO',
    magnet: 'magnet:?xt=urn:btih:26478951ad73e0428d052a65f909db51d3b903e8&dn=ubuntu-24.04-desktop-amd64.iso&tr=https%3A%2F%2Ftorrent.ubuntu.com%2Fannounce',
  },
  {
    name: 'Sintel (Blender 4K)',
    size: '1.2 GB',
    type: 'Animation',
    magnet: 'magnet:?xt=urn:btih:08a806048a1a25b2f7477152245071f549b4fb79&dn=Sintel+4K&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce',
  },
];

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
      setSuccessMsg('Torrent fetched and cloud-cached instantly!');
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

  const handlePickSample = async (sampleMagnet: string) => {
    setMagnetInput(sampleMagnet);
    setError(null);
    setSuccessMsg(null);
    const success = await onAddMagnet(sampleMagnet);
    if (success) {
      setSuccessMsg('Sample torrent loaded into cloud storage!');
      setMagnetInput('');
      setTimeout(() => setSuccessMsg(null), 4000);
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
          Paste any BitTorrent magnet link or 40-character info hash. Our debrid engine checks our multi-terabyte cloud cache to prepare direct download links instantly without waiting for peers.
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
                <span>{loadingMessage || 'Resolving Debrid...'}</span>
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

      {/* Quick Test Samples */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Quick 1-Click Test Magnets:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_MAGNETS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => handlePickSample(sample.magnet)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-700 border border-neutral-200 hover:border-emerald-300 transition-all cursor-pointer"
            >
              <span>{sample.name}</span>
              <span className="text-neutral-400 text-[10px] font-mono">({sample.size})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
