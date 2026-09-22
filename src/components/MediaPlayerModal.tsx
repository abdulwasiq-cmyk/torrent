import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Copy,
  Check,
  Film,
  FileText,
  Music,
} from 'lucide-react';
import { TorrentFile, TorrentItem } from '../types';
import { formatBytes } from '../utils/formatters';

interface MediaPlayerModalProps {
  file: TorrentFile | null;
  torrent: TorrentItem | null;
  onClose: () => void;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({ file, torrent, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!file) return;

    if (file.type === 'document' || file.name.endsWith('.nfo') || file.name.endsWith('.txt') || file.name.endsWith('.srt')) {
      setLoadingText(true);
      fetch(`/api/stream/${file.id}`)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(() => {
          setTextContent('Unable to load document preview.');
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
    }
  }, [file]);

  // Close on Escape key
  useEffect(() => {
    if (!file || !torrent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, torrent, onClose]);

  if (!file || !torrent) return null;

  const streamUrl = `/api/stream/${file.id}`;
  const downloadUrl = `/api/download/${file.id}`;

  const handleCopyLink = async () => {
    const directUrl = `${window.location.origin}${downloadUrl}`;
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      prompt('Direct Download URL:', directUrl);
    }
  };

  const togglePlay = () => {
    if (file.type === 'video' && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else if (file.type === 'audio' && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (file.type === 'video' && videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else if (file.type === 'audio' && audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (file.type === 'video' && videoRef.current) {
      videoRef.current.playbackRate = speed;
    } else if (file.type === 'audio' && audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-neutral-900 text-white w-full max-w-4xl rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {file.type === 'video' ? (
              <Film className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : file.type === 'audio' ? (
              <Music className="w-5 h-5 text-indigo-400 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-100 truncate">{file.name}</h3>
              <p className="text-xs text-neutral-400">
                {formatBytes(file.size)} • Instant Cloud Stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            {/* Direct Download */}
            <a
              href={downloadUrl}
              download
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Canvas */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[65vh] overflow-hidden relative">
          {file.type === 'video' ? (
            <video
              ref={videoRef}
              src={streamUrl}
              autoPlay
              controls
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full max-h-[60vh] object-contain"
            />
          ) : file.type === 'audio' ? (
            <div className="p-8 text-center w-full max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-indigo-950 border border-indigo-800 flex items-center justify-center mx-auto text-indigo-400 mb-4 shadow-lg animate-pulse">
                <Music className="w-10 h-10" />
              </div>
              <h4 className="text-base font-semibold text-white truncate mb-1">{file.name}</h4>
              <p className="text-xs text-neutral-400 mb-6">{torrent.name}</p>
              <audio
                ref={audioRef}
                src={streamUrl}
                autoPlay
                controls
                className="w-full"
              />
            </div>
          ) : (
            <div className="w-full h-full p-6 overflow-y-auto font-mono text-xs text-neutral-300 bg-neutral-950 whitespace-pre-wrap select-text">
              {loadingText ? 'Loading document...' : textContent || 'No text content.'}
            </div>
          )}
        </div>

        {/* Controls Bar for Video */}
        {file.type === 'video' && (
          <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-white transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-white transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-500">Speed:</span>
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    playbackRate === s ? 'bg-emerald-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {s}x
                </button>
              ))}

              <div className="h-4 w-px bg-neutral-800 mx-1" />

              <button
                onClick={handleFullscreen}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-white transition-colors cursor-pointer"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
