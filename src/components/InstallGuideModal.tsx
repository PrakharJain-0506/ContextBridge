import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Terminal,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { downloadExtensionZip } from '../services/extensionExporter';

export const InstallGuideModal: React.FC = () => {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false
  });

  const toggleCheck = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-slate-100">
            Getting Started: Running Locally & Installing into Chrome
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Follow this clear step-by-step guide to load ContextBridge into your real Chrome browser using Developer Mode and test all MVP features.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400">Progress:</span>
            <div className="text-xs font-mono font-bold text-sky-400">
              {completedCount} / {totalCount} completed
            </div>
          </div>
          <button
            onClick={() => downloadExtensionZip()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Extension ZIP</span>
          </button>
        </div>
      </div>

      {/* 2 Major Columns: 1. Installation Steps | 2. Testing Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Installation Steps (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Part 1: Loading into Chrome (Developer Mode)
          </h2>

          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold font-mono">
                  1
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  Download & Extract the Extension Folder
                </span>
              </div>
              <button
                onClick={() => toggleCheck('step1')}
                className={`text-xs flex items-center gap-1 cursor-pointer ${
                  checklist.step1 ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{checklist.step1 ? 'Done' : 'Mark done'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-7">
              Click the <strong className="text-sky-300">Download Extension (.zip)</strong> button above. Then, unzip/extract the archive to a folder on your computer (e.g. on your Desktop or in your Projects folder).
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold font-mono">
                  2
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  Open Chrome Extensions Page
                </span>
              </div>
              <button
                onClick={() => toggleCheck('step2')}
                className={`text-xs flex items-center gap-1 cursor-pointer ${
                  checklist.step2 ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{checklist.step2 ? 'Done' : 'Mark done'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-7">
              In Google Chrome, type <code className="text-sky-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px]">chrome://extensions</code> in your address bar and press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Enter</kbd>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold font-mono">
                  3
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  Enable Developer Mode
                </span>
              </div>
              <button
                onClick={() => toggleCheck('step3')}
                className={`text-xs flex items-center gap-1 cursor-pointer ${
                  checklist.step3 ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{checklist.step3 ? 'Done' : 'Mark done'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-7">
              In the top-right corner of the Extensions page, toggle the <strong className="text-slate-200">Developer mode</strong> switch to <strong>ON</strong>. A new action bar with "Load unpacked" will appear on the left.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold font-mono">
                  4
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  Click "Load unpacked" & Select Folder
                </span>
              </div>
              <button
                onClick={() => toggleCheck('step4')}
                className={`text-xs flex items-center gap-1 cursor-pointer ${
                  checklist.step4 ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{checklist.step4 ? 'Done' : 'Mark done'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-7">
              Click <strong className="text-slate-200">Load unpacked</strong> and select the unzipped folder (the directory containing <code className="text-sky-300 bg-slate-950 px-1 py-0.5 rounded font-mono">manifest.json</code>). You will now see <strong>ContextBridge</strong> appear in your Chrome extensions list! Pin it for quick access.
            </p>
          </div>

          {/* Local Dev CLI Info */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>Running Locally via Terminal (Optional)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you run this project on your local machine with Node.js installed:
            </p>
            <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
              npm install{'\n'}npm run dev
            </pre>
            <p className="text-xs text-slate-400">
              The web dev server runs on <code className="text-sky-300">http://localhost:3000</code>, while the extension folder in <code className="text-sky-300">/extension</code> is ready for Chrome anytime.
            </p>
          </div>
        </div>

        {/* Right Column: Testing Checklist & Troubleshooting (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Part 2: MVP Feature Verification
          </h2>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-300 block mb-1">
              Verify Each Requirement:
            </span>

            {/* Test 1 */}
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={checklist.test1}
                onChange={() => toggleCheck('test1')}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">1. Open In-Page Overlay over Active Webpage</span>
                <span className="text-slate-400 text-[11px]">
                  Click the toolbar icon or press Cmd+Shift+K. The current webpage stays visible behind a frosted backdrop while the ContextBridge Stitch lens appears.
                </span>
              </div>
            </label>

            {/* Test 2 */}
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={checklist.test2}
                onChange={() => toggleCheck('test2')}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">2. Generate Structured Package</span>
                <span className="text-slate-400 text-[11px]">
                  Click "Generate Package". Notice the formatted text blocks with PROJECT, CURRENT TASK, IMPORTANT CONTEXT, etc.
                </span>
              </div>
            </label>

            {/* Test 3 */}
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={checklist.test3}
                onChange={() => toggleCheck('test3')}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">3. Copy to Clipboard</span>
                <span className="text-slate-400 text-[11px]">
                  Click "Copy Package". See the "Copied!" confirmation and paste into any text editor with Ctrl+V.
                </span>
              </div>
            </label>

            {/* Test 4 */}
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={checklist.test4}
                onChange={() => toggleCheck('test4')}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">4. Local Storage Persistence</span>
                <span className="text-slate-400 text-[11px]">
                  Click "Save Locally", close the popup, reopen it, and see your context in the "Saved Contexts" tab.
                </span>
              </div>
            </label>

            {/* Test 5 */}
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={checklist.test5}
                onChange={() => toggleCheck('test5')}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">5. Transfer to Another AI</span>
                <span className="text-slate-400 text-[11px]">
                  Open Claude or ChatGPT, paste the package as your first prompt, and observe how the AI immediately responds to your exact task without asking basic questions!
                </span>
              </div>
            </label>
          </div>

          {/* Common Beginner Questions & Troubleshooting */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Beginner Troubleshooting</span>
            </span>

            <div className="space-y-2 text-slate-400 text-[11px]">
              <p>
                <strong className="text-slate-200">How do I see changes after editing code?</strong>
                <br />
                Go to <code className="text-sky-300">chrome://extensions</code> and click the small reload icon (<RotateCcw className="w-3 h-3 inline text-slate-300" />) on the ContextBridge card.
              </p>
              <p>
                <strong className="text-slate-200">Does it sync to the cloud?</strong>
                <br />
                Not in Phase 1! The MVP keeps 100% of your data private on your own machine using <code className="text-sky-300">chrome.storage.local</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
