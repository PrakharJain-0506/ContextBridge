import React, { useState } from 'react';
import {
  Copy,
  Check,
  Save,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Sliders,
  Sparkles,
  FileText,
  Search,
  Code
} from 'lucide-react';
import { ContextItem, OutputFormat } from '../types';
import { formatContextPackage, calculateTextStats, PRESET_TEMPLATES } from '../services/formatter';

interface FullWorkspaceProps {
  contexts: ContextItem[];
  onSaveContext: (item: Partial<ContextItem> & { id?: string }) => Promise<void>;
  onDeleteContext: (id: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const FullWorkspace: React.FC<FullWorkspaceProps> = ({
  contexts,
  onSaveContext,
  onDeleteContext,
  onShowToast
}) => {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Next.js API Gateway Refactor');
  const [currentTask, setCurrentTask] = useState('Implement resilient rate-limiting middleware using token-bucket algorithm');
  const [importantContext, setImportantContext] = useState('Target environment is serverless Edge functions. Must not rely on local in-memory dictionaries across distributed instances; use Redis or Upstash. Max 60 requests/minute per API key.');
  const [workCompleted, setWorkCompleted] = useState('1. Researched Upstash ratelimit SDK\n2. Created test client with mock Redis connection\n3. Wrote benchmark script');
  const [nextSteps, setNextSteps] = useState('1. Write withRateLimit(handler) Next.js route wrapper\n2. Return 429 Too Many Requests with Retry-After header\n3. Verify unit tests under burst traffic');

  const [format, setFormat] = useState<OutputFormat>('standard');
  const [includeMetaInstruction, setIncludeMetaInstruction] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAI, setSelectedAI] = useState<'claude' | 'chatgpt' | 'gemini' | 'cursor'>('claude');

  const handleApplyPreset = (presetId: string) => {
    const found = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (!found) return;
    setCurrentId(null);
    setProjectName(found.data.projectName);
    setCurrentTask(found.data.currentTask);
    setImportantContext(found.data.importantContext);
    setWorkCompleted(found.data.workCompleted);
    setNextSteps(found.data.nextSteps);
    onShowToast(`Loaded ${found.label} template`);
  };

  const handleNew = () => {
    setCurrentId(null);
    setProjectName('');
    setCurrentTask('');
    setImportantContext('');
    setWorkCompleted('');
    setNextSteps('');
    onShowToast('Started fresh context');
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      onShowToast('Please provide a Project Name');
      return;
    }
    await onSaveContext({
      id: currentId || undefined,
      projectName,
      currentTask,
      importantContext,
      workCompleted,
      nextSteps
    });
    onShowToast('Saved to local storage!');
  };

  const handleLoadContext = (item: ContextItem) => {
    setCurrentId(item.id);
    setProjectName(item.projectName);
    setCurrentTask(item.currentTask);
    setImportantContext(item.importantContext);
    setWorkCompleted(item.workCompleted);
    setNextSteps(item.nextSteps);
    onShowToast(`Loaded "${item.projectName}"`);
  };

  const packageText = formatContextPackage(
    { projectName, currentTask, importantContext, workCompleted, nextSteps },
    format,
    includeMetaInstruction
  );

  const stats = calculateTextStats(packageText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(packageText);
      setCopied(true);
      onShowToast('Context package copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Failed to copy to clipboard');
    }
  };

  const handleOpenAI = (url: string, name: string) => {
    handleCopy();
    window.open(url, '_blank');
    onShowToast(`Copied package & opening ${name}!`);
  };

  const filtered = contexts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.projectName.toLowerCase().includes(q) ||
      c.currentTask.toLowerCase().includes(q) ||
      c.importantContext.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Context Portability Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Package your active engineering state so you can move smoothly between Claude, ChatGPT, Gemini, and Cursor without starting over.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Context</span>
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Context</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 3 Columns on Large Screens (Saved History Sidebar + Form Editor + Output Package) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Saved History Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Saved Contexts
              </span>
              <span className="text-xs font-mono text-sky-400">
                {contexts.length} total
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No matching contexts.
                </div>
              ) : (
                filtered.map((item) => {
                  const isActive = currentId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleLoadContext(item)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isActive
                          ? 'bg-sky-950/30 border-sky-500/50 ring-1 ring-sky-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {item.projectName}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteContext(item.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                          title="Delete context"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {item.currentTask || 'No task specified'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Context Form Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            {/* Presets Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Quick Fill Presets</span>
                <span className="text-[11px] text-slate-500">Pick to test</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TEMPLATES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleApplyPreset(p.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-sky-500/10 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-500/40 transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* The 5 ContextBridge Fields */}
            <div className="space-y-3.5">
              {/* 1. Project / Chat Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  1. Project / Chat Name <span className="text-sky-400">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Next.js Auth Overhaul"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* 2. Current Task */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  2. Current Task <span className="text-sky-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={currentTask}
                  onChange={(e) => setCurrentTask(e.target.value)}
                  placeholder="What specific objective are you solving right now?"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed"
                />
              </div>

              {/* 3. Important Context */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  3. Important Context
                </label>
                <textarea
                  rows={3}
                  value={importantContext}
                  onChange={(e) => setImportantContext(e.target.value)}
                  placeholder="Key constraints, tech stack, dependencies, or architectural rules..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed"
                />
              </div>

              {/* 4. Work Completed */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  4. Work Completed
                </label>
                <textarea
                  rows={3}
                  value={workCompleted}
                  onChange={(e) => setWorkCompleted(e.target.value)}
                  placeholder="What code, files, or solutions have already been tested or built?"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed"
                />
              </div>

              {/* 5. Next Steps */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  5. Next Steps
                </label>
                <textarea
                  rows={2}
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="Direct instructions for the receiving AI assistant..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Generated Context Package & AI Transfer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            {/* Header with stats & controls */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Target AI Package
                </span>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {stats.words} words · ~{stats.tokens} tokens
                </div>
              </div>

              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as OutputFormat)}
                className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="standard">Standard Prompt</option>
                <option value="markdown">Clean Markdown</option>
                <option value="xml">XML Tags</option>
                <option value="compact">Compact / 1-Line</option>
              </select>
            </div>

            {/* Target AI Selection Strip */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                Destination AI:
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-lg text-xs">
                <button
                  onClick={() => setSelectedAI('claude')}
                  className={`py-1 rounded font-medium transition-colors cursor-pointer ${
                    selectedAI === 'claude' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Claude
                </button>
                <button
                  onClick={() => setSelectedAI('chatgpt')}
                  className={`py-1 rounded font-medium transition-colors cursor-pointer ${
                    selectedAI === 'chatgpt' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ChatGPT
                </button>
                <button
                  onClick={() => setSelectedAI('gemini')}
                  className={`py-1 rounded font-medium transition-colors cursor-pointer ${
                    selectedAI === 'gemini' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Gemini
                </button>
                <button
                  onClick={() => setSelectedAI('cursor')}
                  className={`py-1 rounded font-medium transition-colors cursor-pointer ${
                    selectedAI === 'cursor' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cursor
                </button>
              </div>
            </div>

            {/* Meta-instruction checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMetaInstruction}
                onChange={(e) => setIncludeMetaInstruction(e.target.checked)}
                className="rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <span>Include AI continuation directive</span>
            </label>

            {/* Output Preview Box */}
            <div className="relative">
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                {packageText}
              </pre>
            </div>

            {/* Copy CTA */}
            <button
              onClick={handleCopy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-sm cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Formatted Context Package</span>
                </>
              )}
            </button>

            {/* Quick Launch Buttons */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 block font-medium">
                Copy & Open Destination AI in 1-Click:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleOpenAI('https://claude.ai/new', 'Claude')}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-amber-400" />
                  <span>Claude</span>
                </button>
                <button
                  onClick={() => handleOpenAI('https://chatgpt.com', 'ChatGPT')}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                  <span>ChatGPT</span>
                </button>
                <button
                  onClick={() => handleOpenAI('https://gemini.google.com/app', 'Gemini')}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-sky-400" />
                  <span>Gemini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
