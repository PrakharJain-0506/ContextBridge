import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { FullWorkspace } from './components/FullWorkspace';
import { ArchitectureInspector } from './components/ArchitectureInspector';
import { InstallGuideModal } from './components/InstallGuideModal';
import { ContextItem, AppViewMode } from './types';
import { storageService } from './services/storage';

export default function App() {
  const [viewMode, setViewMode] = useState<AppViewMode>('simulator');
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const items = await storageService.getSavedContexts();
      setContexts(items);
    }
    loadData();
  }, []);

  const handleShowToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2400);
  };

  const handleSaveContext = async (context: Partial<ContextItem> & { id?: string }) => {
    const saved = await storageService.saveSingleContext(
      context as Omit<ContextItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    );
    const updatedList = await storageService.getSavedContexts();
    setContexts(updatedList);
  };

  const handleDeleteContext = async (id: string) => {
    const updated = await storageService.deleteContext(id);
    setContexts(updated);
    handleShowToast('Context deleted');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Header strictly conforming to Top Bar Contract */}
      <Header
        viewMode={viewMode}
        onSelectView={setViewMode}
        savedCount={contexts.length}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {viewMode === 'simulator' && (
          <ExtensionSimulator
            contexts={contexts}
            onSaveContext={handleSaveContext}
            onDeleteContext={handleDeleteContext}
            onSwitchToWorkspace={() => setViewMode('workspace')}
            onShowToast={handleShowToast}
          />
        )}

        {viewMode === 'workspace' && (
          <FullWorkspace
            contexts={contexts}
            onSaveContext={handleSaveContext}
            onDeleteContext={handleDeleteContext}
            onShowToast={handleShowToast}
          />
        )}

        {viewMode === 'inspector' && <ArchitectureInspector />}

        {viewMode === 'guide' && <InstallGuideModal />}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">ContextBridge</span>
          <span>·</span>
          <span>Chrome Manifest V3 Extension</span>
          <span>·</span>
          <span>Local Storage Only (No Cloud Tracking)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <button
            onClick={() => setViewMode('simulator')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Overlay Simulator
          </button>
          <button
            onClick={() => setViewMode('workspace')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Workspace
          </button>
          <button
            onClick={() => setViewMode('inspector')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Code Breakdown
          </button>
          <button
            onClick={() => setViewMode('guide')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Install Steps
          </button>
        </div>
      </footer>

      {/* Global Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-sky-500 text-slate-950 font-semibold text-xs shadow-xl shadow-sky-950/40 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
