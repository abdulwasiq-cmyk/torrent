import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
import { TorrentItem } from '../types';

interface DirectLinksExportModalProps {
  isOpen?: boolean;
  torrents: TorrentItem[];
  onClose: () => void;
}

export const DirectLinksExportModal: React.FC<DirectLinksExportModalProps> = ({
  isOpen = true,
  torrents,
  onClose,
}) => {
  const [format, setFormat] = useState<'plain' | 'idm' | 'curl' | 'aria2'>('plain');
  const [copied, setCopied] = useState(false);

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

  if (!isOpen) return null;

  // Flatten all files across torrents
  const allFiles = torrents.flatMap((t) =>
    t.files.map((f) => ({
      ...f,
      torrentName: t.name,
      directUrl: `${window.location.origin}/api/download/${f.id}`,
    }))
  );

  const generateContent = () => {
    if (format === 'plain') {
      return allFiles.map((f) => f.directUrl).join('\n');
    }
    if (format === 'idm') {
      // IDM Batch file format or text list
      return allFiles
        .map(
          (f) =>
            `<${f.directUrl}>\nfilepath=\\Downloads\\${f.torrentName}\nfilename=${f.name}`
        )
        .join('\n\n');
    }
    if (format === 'curl') {
      return allFiles.map((f) => `curl -L -O -J "${f.directUrl}"`).join('\n');
    }
    if (format === 'aria2') {
      return allFiles.map((f) => `${f.directUrl}\n  out=${f.name}`).join('\n');
    }
    return '';
  };

  const content = generateContent();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy links:', content);
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seedr_direct_links_${format}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="bulk-export-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-export-title"
    >
      <div
        id="bulk-export-modal-dialog"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 relative"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div>
            <h3 id="bulk-export-title" className="text-base font-semibold text-neutral-900">
              Bulk Direct Download Links
            </h3>
            <p className="text-xs text-neutral-500">
              Instant high-speed CDN URLs for download managers & command line
            </p>
          </div>
          <button
            id="bulk-export-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            title="Close (Esc)"
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/80 active:bg-neutral-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-6 py-3 border-b border-neutral-100 bg-white flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 font-medium">Format:</span>
          <button
            type="button"
            onClick={() => setFormat('plain')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              format === 'plain'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Plain URLs ({allFiles.length})
          </button>
          <button
            type="button"
            onClick={() => setFormat('curl')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              format === 'curl'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            cURL / Wget
          </button>
          <button
            type="button"
            onClick={() => setFormat('aria2')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              format === 'aria2'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Aria2 List
          </button>
          <button
            type="button"
            onClick={() => setFormat('idm')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              format === 'idm'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            IDM Export
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6 flex-1 flex flex-col min-h-0 bg-neutral-950">
          <textarea
            readOnly
            value={content}
            className="w-full flex-1 bg-transparent text-emerald-400 font-mono text-xs p-2 resize-none focus:outline-none select-all"
            rows={12}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-500 truncate">
            {allFiles.length} direct links generated with HTTP 206 range resume support
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="bulk-export-save-btn"
              type="button"
              onClick={handleDownloadText}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .txt</span>
            </button>
            <button
              id="bulk-export-copy-btn"
              type="button"
              onClick={handleCopy}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy All Links'}</span>
            </button>
            <button
              id="bulk-export-footer-close-btn"
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
