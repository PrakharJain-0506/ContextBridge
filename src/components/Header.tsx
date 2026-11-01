import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import { AppViewMode } from '../types';
import { downloadExtensionZip } from '../services/extensionExporter';

interface HeaderProps {
  viewMode: AppViewMode;
  onSelectView: (mode: AppViewMode) => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, onSelectView, savedCount }) => {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadExtensionZip();
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1.5" />
          </svg>
        </div>
        <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
          ContextBridge
        </span>
      </div>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
        <button
          onClick={() => onSelectView('simulator')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 cursor-pointer ${
            viewMode === 'simulator'
              ? 'text-sky-400 font-semibold border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overlay Simulator
        </button>
        <button
          onClick={() => onSelectView('workspace')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 cursor-pointer ${
            viewMode === 'workspace'
              ? 'text-sky-400 font-semibold border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Workspace View
        </button>
        <button
          onClick={() => onSelectView('inspector')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 cursor-pointer ${
            viewMode === 'inspector'
              ? 'text-sky-400 font-semibold border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Extension Code
        </button>
        <button
          onClick={() => onSelectView('guide')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 cursor-pointer ${
            viewMode === 'guide'
              ? 'text-sky-400 font-semibold border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Install Guide
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          title="Download the complete unpacked extension folder as a ZIP file"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'Packing ZIP...' : 'Download Extension (.zip)'}</span>
        </button>
      </div>
    </header>
  );
};
