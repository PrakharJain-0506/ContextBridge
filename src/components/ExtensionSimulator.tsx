import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Save,
  Trash2,
  Edit3,
  Search,
  Maximize2,
  X,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Bot,
  User,
  Info
} from 'lucide-react';
import { ContextItem, OutputFormat, ConversationMessage, CapturedConversation } from '../types';
import { formatContextPackage, calculateTextStats, PRESET_TEMPLATES } from '../services/formatter';

// Realistic ChatGPT Conversation Mocks for Active Page DOM extraction
const CHATGPT_SHORT_CONVERSATION: ConversationMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "I'm implementing an async Redis Stream worker in FastAPI. How should I structure the consumer loop with backpressure and acknowledgments?"
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "To structure an async Redis Stream consumer in FastAPI with proper backpressure:\n1. Use `XREADGROUP` with a fixed batch size (e.g. `COUNT 20`).\n2. Dispatch tasks concurrently with `asyncio.gather` bounded by an `asyncio.Semaphore(10)`.\n3. Only call `XACK` after the task completes without exceptions.\n4. Avoid calling `XACK` on failure so the message remains in the Pending Entries List (PEL)."
  },
  {
    id: 'msg-3',
    role: 'user',
    content: "Can you provide the Python snippet for the consumer loop with automatic retries and dead-letter queue routing for failed messages?"
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: "Here is the production-ready consumer pattern:\n```python\nasync def worker_loop(redis: Redis, group: str, consumer: str):\n    while True:\n        entries = await redis.xreadgroup(group, consumer, {'events:inbound': '>'}, count=20)\n        for stream, msgs in entries:\n            for msg_id, payload in msgs:\n                try:\n                    await process_event(payload)\n                    await redis.xack(stream, group, msg_id)\n                except Exception as err:\n                    await route_to_dlq(redis, msg_id, payload, str(err))\n```\nNext step is to wire this loop into FastAPI lifespan startup and shutdown hooks."
  }
];

const CHATGPT_LONG_CONVERSATION: ConversationMessage[] = [
  ...CHATGPT_SHORT_CONVERSATION,
  {
    id: 'msg-5',
    role: 'user',
    content: "Let's also add the FastAPI lifespan handler in `main.py` so the background worker task terminates cleanly on SIGTERM."
  },
  {
    id: 'msg-6',
    role: 'assistant',
    content: "Here is how to wire graceful shutdown using FastAPI's lifespan context manager:\n```python\nfrom contextlib import asynccontextmanager\nfrom fastapi import FastAPI\n\n@asynccontextmanager\nasync def lifespan(app: FastAPI):\n    task = asyncio.create_task(worker_loop(redis_client, 'processors', 'worker-1'))\n    yield\n    task.cancel()\n    await asyncio.gather(task, return_exceptions=True)\n```"
  },
  {
    id: 'msg-7',
    role: 'user',
    content: "What Docker Compose configuration and Prometheus metrics would you recommend for monitoring the consumer queue lag?"
  },
  {
    id: 'msg-8',
    role: 'assistant',
    content: "To monitor consumer queue lag:\n1. Query `XINFO GROUPS events:inbound` lag field.\n2. Export `redis_stream_lag_total` gauge to Prometheus.\n3. Add a healthcheck on `/healthz` verifying Redis ping and active event throughput."
  }
];

// Realistic Google Gemini conversation mock
const GEMINI_CONVERSATION: ConversationMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "How should I structure a real-time event pipeline using Cloud Pub/Sub and BigQuery streaming inserts in Go?"
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "To structure an event streaming pipeline in Go with Cloud Pub/Sub and BigQuery:\n1. Use the `cloud.google.com/go/pubsub` client with dedicated subscription receivers.\n2. Leverage BigQuery Storage Write API (`managedwriter.Client`) with DefaultStream for sub-second append throughput.\n3. Buffer rows in memory using Go worker pools and flush either every 500ms or 1,000 records.\n4. Route schema parsing failures directly to a dead-letter Pub/Sub topic."
  },
  {
    id: 'msg-3',
    role: 'user',
    content: "Can you provide the managedwriter Go code with Proto2/Proto3 descriptor schema registration?"
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: "Here is the BigQuery ManagedWriter pipeline snippet:\n```go\nfunc NewEventWriter(ctx context.Context, project, dataset, table string) (*managedwriter.Client, error) {\n    client, err := managedwriter.NewClient(ctx, project)\n    if err != nil { return nil, err }\n    // Wire managed write stream with automatic connection reconnect\n    return client, nil\n}\n```\nEnsure write permission `roles/bigquery.dataEditor` is granted to the Google Service Account."
  }
];

// Realistic Claude conversation mock
const CLAUDE_CONVERSATION: ConversationMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "I'm refactoring an enterprise React application to use TanStack Query v5 with optimistic updates and rollback on network errors. Can you review this pattern?"
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "Here is the resilient optimistic update pattern for TanStack Query v5:\n1. Cancel outgoing queries via `queryClient.cancelQueries({ queryKey })`.\n2. Snapshot previous cache state using `queryClient.getQueryData(queryKey)`.\n3. Optimistically set the new value in the cache.\n4. In `onError`, rollback the cache using the snapshot.\n5. In `onSettled`, always invalidate the query to ensure eventual consistency with the server."
  },
  {
    id: 'msg-3',
    role: 'user',
    content: "How do we handle concurrent mutations when multiple user inputs fire in rapid succession without race conditions?"
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: "For rapid concurrent mutations, use `scope.id` inside mutation keys or assign an idempotent monotonic timestamp to each mutation context so that stale rollbacks never overwrite newer optimistically applied values."
  }
];

// Realistic Perplexity conversation mock
const PERPLEXITY_CONVERSATION: ConversationMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "What are the latest best practices for zero-copy memory serialization in Apache Arrow vs Protobuf in 2026?"
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "Based on current benchmarks and system designs:\n1. **Apache Arrow** offers true zero-copy in-memory IPC using columnar layout with bitmap validity masks, excelling for analytical vector math and DataFrames.\n2. **Protobuf (v3/v4)** requires deserialization allocation overhead into language-specific struct fields, but excels for small RPC payloads with complex nested hierarchies.\n**Recommendation:** Use Apache Arrow Flight for large tabular data transfer and gRPC Protobuf for lightweight control-plane RPCs."
  }
];

// Realistic Copilot conversation mock
const COPILOT_CONVERSATION: ConversationMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "Write a GitHub Actions workflow to build, test, and publish a multi-arch Docker image using Buildx and GitHub Container Registry (GHCR)."
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "Here is the GitHub Actions workflow for multi-arch Docker builds:\n```yaml\nname: Build & Push Image\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: docker/setup-qemu-action@v3\n      - uses: docker/setup-buildx-action@v3\n      - uses: docker/login-action@v3\n        with:\n          registry: ghcr.io\n          username: ${{ github.actor }}\n          password: ${{ secrets.GITHUB_TOKEN }}\n      - uses: docker/build-push-action@v6\n        with:\n          platforms: linux/amd64,linux/arm64\n          push: true\n          tags: ghcr.io/${{ github.repository }}:latest\n```"
  }
];

// Realistic Grok conversation mock
const GROK_CONVERSATION: ConversationMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "How would you design a distributed lock service without ZooKeeper using Raft and NVMe SSDs?"
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "To build a high-performance distributed lock manager without ZooKeeper:\n1. Run an embedded Raft consensus group (e.g., hashicorp/raft or tikv/raft-rs) across 3 or 5 nodes.\n2. Store active lock leases in an in-memory lock table backed by an append-only Raft WAL on NVMe.\n3. Issue monotonic fencing tokens (`lock_generation_id`) with every acquired lock to prevent split-brain zombies.\n4. Use heartbeat keep-alives with 5-second automatic lease timeouts."
  }
];

interface ExtensionSimulatorProps {
  contexts: ContextItem[];
  onSaveContext: (item: Partial<ContextItem> & { id?: string }) => Promise<void>;
  onDeleteContext: (id: string) => Promise<void>;
  onSwitchToWorkspace: () => void;
  onShowToast: (msg: string) => void;
}

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  contexts,
  onSaveContext,
  onDeleteContext,
  onSwitchToWorkspace,
  onShowToast
}) => {
  // Theme state: 'light' (Glass Flow) vs 'dark' (Fluid Glass)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Overlay visibility
  const [isOverlayOpen, setIsOverlayOpen] = useState(true);

  // Simulated browser active page
  const [simulatedPage, setSimulatedPage] = useState<'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'copilot' | 'grok' | 'unsupported'>('chatgpt');

  // Simulated ChatGPT conversation scenario ('short' = 4 msgs, 'long' = 8 msgs)
  const [chatGptScenario, setChatGptScenario] = useState<'short' | 'long'>('short');
  const [capturedConversation, setCapturedConversation] = useState<CapturedConversation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showManualReview, setShowManualReview] = useState(false);

  // Overlay internal view: 'capture' | 'preview' | 'saved'
  const [overlayView, setOverlayView] = useState<'capture' | 'preview' | 'saved'>('capture');

  // Manual form state (fallback or optional supplemental notes)
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('NagrikOne Dashboard');
  const [currentTask, setCurrentTask] = useState('Build NagrikOne citizen grievance analytics dashboard');
  const [workCompleted, setWorkCompleted] = useState('Authentication flow, PostgreSQL database schema, and REST API endpoints');
  const [nextSteps, setNextSteps] = useState('Add Google Maps geospatial heatmaps & real-time webhook listeners');
  const [importantContext, setImportantContext] = useState('Next.js 15 App Router, TypeScript, Tailwind CSS, Leaflet maps. Mobile responsive layout required.');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Formatting & Stats
  const [format, setFormat] = useState<OutputFormat>('standard');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-detect and extract conversation when on supported platform
  useEffect(() => {
    switch (simulatedPage) {
      case 'chatgpt': {
        const messages = chatGptScenario === 'short' ? CHATGPT_SHORT_CONVERSATION : CHATGPT_LONG_CONVERSATION;
        setCapturedConversation({
          platform: 'chatgpt',
          platformName: 'ChatGPT',
          detected: true,
          pageTitle: 'FastAPI Redis Stream Worker',
          url: 'https://chatgpt.com/c/678a1bc2',
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: messages,
          messageCount: messages.length,
          turnCount: Math.ceil(messages.length / 2),
          isPartial: true,
          sourceNotice: 'ContextBridge captured the conversation currently loaded on ChatGPT.'
        });
        break;
      }
      case 'gemini': {
        setCapturedConversation({
          platform: 'gemini',
          platformName: 'Google Gemini',
          detected: true,
          pageTitle: 'Go Cloud PubSub & BigQuery Pipeline',
          url: 'https://gemini.google.com/app/c/49204128',
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: GEMINI_CONVERSATION,
          messageCount: GEMINI_CONVERSATION.length,
          turnCount: Math.ceil(GEMINI_CONVERSATION.length / 2),
          isPartial: true,
          sourceNotice: 'ContextBridge captured the conversation currently loaded on Google Gemini.'
        });
        break;
      }
      case 'claude': {
        setCapturedConversation({
          platform: 'claude',
          platformName: 'Claude',
          detected: true,
          pageTitle: 'TanStack Query v5 Optimistic Updates',
          url: 'https://claude.ai/chat/a9b8c7d6',
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: CLAUDE_CONVERSATION,
          messageCount: CLAUDE_CONVERSATION.length,
          turnCount: Math.ceil(CLAUDE_CONVERSATION.length / 2),
          isPartial: true,
          sourceNotice: 'ContextBridge captured the conversation currently loaded on Claude.'
        });
        break;
      }
      case 'perplexity': {
        setCapturedConversation({
          platform: 'perplexity',
          platformName: 'Perplexity',
          detected: true,
          pageTitle: 'Apache Arrow vs Protobuf Zero-Copy IPC',
          url: 'https://perplexity.ai/search/789abc',
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: PERPLEXITY_CONVERSATION,
          messageCount: PERPLEXITY_CONVERSATION.length,
          turnCount: Math.ceil(PERPLEXITY_CONVERSATION.length / 2),
          isPartial: true,
          sourceNotice: 'ContextBridge captured the conversation currently loaded on Perplexity.'
        });
        break;
      }
      case 'copilot': {
        setCapturedConversation({
          platform: 'copilot',
          platformName: 'Microsoft Copilot',
          detected: true,
          pageTitle: 'Multi-Arch Docker Buildx Pipeline',
          url: 'https://copilot.microsoft.com/chats/c0p1l0t',
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: COPILOT_CONVERSATION,
          messageCount: COPILOT_CONVERSATION.length,
          turnCount: Math.ceil(COPILOT_CONVERSATION.length / 2),
          isPartial: true,
          sourceNotice: 'ContextBridge captured the conversation currently loaded on Microsoft Copilot.'
        });
        break;
      }
      case 'grok': {
        setCapturedConversation({
          platform: 'grok',
          platformName: 'Grok',
          detected: true,
          pageTitle: 'Raft Distributed Lock Manager',
          url: 'https://grok.com/chat/gr0k987',
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: GROK_CONVERSATION,
          messageCount: GROK_CONVERSATION.length,
          turnCount: Math.ceil(GROK_CONVERSATION.length / 2),
          isPartial: true,
          sourceNotice: 'ContextBridge captured the conversation currently loaded on Grok.'
        });
        break;
      }
      case 'unsupported':
      default: {
        setCapturedConversation(null);
        break;
      }
    }
  }, [simulatedPage, chatGptScenario]);

  // Refresh conversation handler (honest re-read of the active page DOM)
  const handleRefreshConversation = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      switch (simulatedPage) {
        case 'chatgpt': {
          const messages = chatGptScenario === 'short' ? CHATGPT_SHORT_CONVERSATION : CHATGPT_LONG_CONVERSATION;
          setCapturedConversation({
            platform: 'chatgpt',
            platformName: 'ChatGPT',
            detected: true,
            pageTitle: 'FastAPI Redis Stream Worker',
            url: 'https://chatgpt.com/c/678a1bc2',
            capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: messages,
            messageCount: messages.length,
            turnCount: Math.ceil(messages.length / 2),
            isPartial: true,
            sourceNotice: 'ContextBridge captured the conversation currently loaded on ChatGPT.'
          });
          onShowToast(`Refreshed: ${messages.length} messages read from active ChatGPT page`);
          break;
        }
        case 'gemini': {
          setCapturedConversation({
            platform: 'gemini',
            platformName: 'Google Gemini',
            detected: true,
            pageTitle: 'Go Cloud PubSub & BigQuery Pipeline',
            url: 'https://gemini.google.com/app/c/49204128',
            capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: GEMINI_CONVERSATION,
            messageCount: GEMINI_CONVERSATION.length,
            turnCount: Math.ceil(GEMINI_CONVERSATION.length / 2),
            isPartial: true,
            sourceNotice: 'ContextBridge captured the conversation currently loaded on Google Gemini.'
          });
          onShowToast(`Refreshed: ${GEMINI_CONVERSATION.length} messages read from Google Gemini`);
          break;
        }
        case 'claude': {
          setCapturedConversation({
            platform: 'claude',
            platformName: 'Claude',
            detected: true,
            pageTitle: 'TanStack Query v5 Optimistic Updates',
            url: 'https://claude.ai/chat/a9b8c7d6',
            capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: CLAUDE_CONVERSATION,
            messageCount: CLAUDE_CONVERSATION.length,
            turnCount: Math.ceil(CLAUDE_CONVERSATION.length / 2),
            isPartial: true,
            sourceNotice: 'ContextBridge captured the conversation currently loaded on Claude.'
          });
          onShowToast(`Refreshed: ${CLAUDE_CONVERSATION.length} messages read from Claude`);
          break;
        }
        case 'perplexity': {
          setCapturedConversation({
            platform: 'perplexity',
            platformName: 'Perplexity',
            detected: true,
            pageTitle: 'Apache Arrow vs Protobuf Zero-Copy IPC',
            url: 'https://perplexity.ai/search/789abc',
            capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: PERPLEXITY_CONVERSATION,
            messageCount: PERPLEXITY_CONVERSATION.length,
            turnCount: Math.ceil(PERPLEXITY_CONVERSATION.length / 2),
            isPartial: true,
            sourceNotice: 'ContextBridge captured the conversation currently loaded on Perplexity.'
          });
          onShowToast(`Refreshed: ${PERPLEXITY_CONVERSATION.length} messages read from Perplexity`);
          break;
        }
        case 'copilot': {
          setCapturedConversation({
            platform: 'copilot',
            platformName: 'Microsoft Copilot',
            detected: true,
            pageTitle: 'Multi-Arch Docker Buildx Pipeline',
            url: 'https://copilot.microsoft.com/chats/c0p1l0t',
            capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: COPILOT_CONVERSATION,
            messageCount: COPILOT_CONVERSATION.length,
            turnCount: Math.ceil(COPILOT_CONVERSATION.length / 2),
            isPartial: true,
            sourceNotice: 'ContextBridge captured the conversation currently loaded on Microsoft Copilot.'
          });
          onShowToast(`Refreshed: ${COPILOT_CONVERSATION.length} messages read from Microsoft Copilot`);
          break;
        }
        case 'grok': {
          setCapturedConversation({
            platform: 'grok',
            platformName: 'Grok',
            detected: true,
            pageTitle: 'Raft Distributed Lock Manager',
            url: 'https://grok.com/chat/gr0k987',
            capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: GROK_CONVERSATION,
            messageCount: GROK_CONVERSATION.length,
            turnCount: Math.ceil(GROK_CONVERSATION.length / 2),
            isPartial: true,
            sourceNotice: 'ContextBridge captured the conversation currently loaded on Grok.'
          });
          onShowToast(`Refreshed: ${GROK_CONVERSATION.length} messages read from Grok`);
          break;
        }
        default: {
          setCapturedConversation(null);
          onShowToast('This AI platform is not currently supported. Manual context mode enabled.');
          break;
        }
      }
    }, 250);
  };

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOverlayOpen) {
        setIsOverlayOpen(false);
        onShowToast('Overlay closed (Esc)');
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOverlayOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOverlayOpen, onShowToast]);

  const packageText = formatContextPackage(
    {
      projectName: capturedConversation?.detected ? (capturedConversation.pageTitle || projectName) : projectName,
      currentTask,
      importantContext,
      workCompleted,
      nextSteps,
      capturedConversation: capturedConversation || undefined
    },
    format,
    true
  );

  const stats = calculateTextStats(packageText);

  const handleApplyPreset = (presetId: string) => {
    const found = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (!found) return;
    setCurrentId(null);
    setProjectName(found.data.projectName);
    setCurrentTask(found.data.currentTask);
    setImportantContext(found.data.importantContext);
    setWorkCompleted(found.data.workCompleted);
    setNextSteps(found.data.nextSteps);
    setOverlayView('capture');
    onShowToast(`Loaded ${found.label} preset`);
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      onShowToast('Please provide a project name');
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
    onShowToast('Saved context to local storage!');
  };

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

  const handleLoadContext = (item: ContextItem) => {
    setCurrentId(item.id);
    setProjectName(item.projectName);
    setCurrentTask(item.currentTask);
    setImportantContext(item.importantContext);
    setWorkCompleted(item.workCompleted);
    setNextSteps(item.nextSteps);
    setOverlayView('capture');
    onShowToast(`Loaded "${item.projectName}" into editor`);
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Controller Ribbon Matching Reference Badge */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 p-3 rounded-2xl bg-slate-900 border border-slate-800">
        {/* Exact Theme Capsule from Reference Image */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-full bg-slate-950 border border-slate-800">
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light Theme — Glass Flow</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                theme === 'dark'
                  ? 'bg-slate-800 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span>Dark Theme — Fluid Glass</span>
            </button>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOverlayOpen(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isOverlayOpen
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isOverlayOpen ? 'Overlay Active (Esc to close)' : 'Click to Open Overlay'}
          </button>
          <button
            onClick={onSwitchToWorkspace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer border border-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Workspace View</span>
          </button>
        </div>
      </div>

      {/* Realistic Browser Window Frame */}
      <div className={`rounded-[24px] border transition-all duration-300 overflow-hidden relative min-h-[720px] flex flex-col shadow-2xl ${
        theme === 'light' ? 'bg-[#f8fafd] border-slate-300/80' : 'bg-slate-950 border-slate-800'
      }`}>
        {/* macOS Window Chrome Top Bar */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 text-xs select-none z-20 ${
          theme === 'light'
            ? 'bg-[#edf2f8]/90 border-slate-200/80 text-slate-600'
            : 'bg-slate-900/90 border-slate-800 text-slate-400'
        }`}>
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-3">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-xs" />
            </div>

            {/* Browser Tabs Switcher */}
            <div className="flex items-center gap-1 text-[11px] overflow-x-auto max-w-[620px] py-0.5">
              <button
                onClick={() => setSimulatedPage('gemini')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  simulatedPage === 'gemini'
                    ? theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-slate-200'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Gemini</span>
              </button>
              <button
                onClick={() => setSimulatedPage('claude')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  simulatedPage === 'claude'
                    ? theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-slate-200'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Claude</span>
              </button>
              <button
                onClick={() => setSimulatedPage('chatgpt')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  simulatedPage === 'chatgpt'
                    ? theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-slate-200'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>ChatGPT</span>
              </button>
              <button
                onClick={() => setSimulatedPage('perplexity')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  simulatedPage === 'perplexity'
                    ? theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-slate-200'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>Perplexity</span>
              </button>
              <button
                onClick={() => setSimulatedPage('copilot')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  simulatedPage === 'copilot'
                    ? theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-slate-200'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Copilot</span>
              </button>
              <button
                onClick={() => setSimulatedPage('grok')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  simulatedPage === 'grok'
                    ? theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-slate-200'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Grok</span>
              </button>
              <button
                onClick={() => setSimulatedPage('unsupported')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  simulatedPage === 'unsupported'
                    ? theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-slate-200'
                    : 'opacity-60 hover:opacity-90'
                }`}
                title="Test behavior on non-AI pages (fallback to manual context mode)"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>GitHub (Unsupported)</span>
              </button>
            </div>
          </div>

          {/* Omnibox URL */}
          <div className={`flex-1 max-w-xs rounded-full px-3 py-1 flex items-center gap-2 text-[11px] font-mono border ${
            theme === 'light'
              ? 'bg-white/90 border-slate-200 text-slate-600'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            <span className="text-emerald-500 text-xs">🔒</span>
            <span className="opacity-50">https://</span>
            <span className="truncate">
              {simulatedPage === 'gemini' && 'gemini.google.com/app'}
              {simulatedPage === 'claude' && 'claude.ai/chat/a9b8c7d6'}
              {simulatedPage === 'chatgpt' && 'chatgpt.com/c/678a1bc2'}
              {simulatedPage === 'perplexity' && 'perplexity.ai/search/789abc'}
              {simulatedPage === 'copilot' && 'copilot.microsoft.com/chats'}
              {simulatedPage === 'grok' && 'grok.com/chat/gr0k987'}
              {simulatedPage === 'unsupported' && 'github.com/facebook/react/issues/12345'}
            </span>
          </div>

          {/* ContextBridge Extension Icon in Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOverlayOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isOverlayOpen
                  ? theme === 'light'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-200'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/40 ring-2 ring-sky-500/20'
                  : theme === 'light'
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Click extension icon to toggle ContextBridge"
            >
              <span className={`w-2 h-2 rounded-full ${isOverlayOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>ContextBridge</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* UNDERLYING HOST WEBPAGE (Simulates Active Browser Page)                   */}
        {/* ========================================================================= */}
        <div className={`flex-1 flex transition-all duration-300 ${
          isOverlayOpen ? 'filter blur-[4px] opacity-70 pointer-events-none' : 'opacity-100'
        } ${theme === 'light' ? 'bg-[#f0f4f9] text-slate-800' : 'bg-[#131314] text-slate-200'}`}>
          {/* Simulated Sidebar */}
          <aside className={`w-60 p-4 border-r hidden md:flex flex-col justify-between shrink-0 ${
            theme === 'light' ? 'bg-[#f0f4f9] border-slate-200/80 text-slate-600' : 'bg-[#1e1f20] border-slate-800 text-slate-400'
          }`}>
            <div className="space-y-4">
              {/* Brand Logo based on simulated page */}
              <div className="flex items-center gap-2 px-2 py-1">
                {simulatedPage === 'chatgpt' ? (
                  <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-emerald-500">
                    <Bot className="w-5 h-5 text-emerald-500" />
                    <span>ChatGPT</span>
                  </div>
                ) : simulatedPage === 'claude' ? (
                  <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-amber-500">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Claude</span>
                  </div>
                ) : simulatedPage === 'gemini' ? (
                  <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 bg-clip-text text-transparent">
                    Gemini
                  </span>
                ) : simulatedPage === 'perplexity' ? (
                  <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-cyan-500">
                    <Search className="w-5 h-5 text-cyan-500" />
                    <span>Perplexity</span>
                  </div>
                ) : simulatedPage === 'copilot' ? (
                  <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-sky-500">
                    <Bot className="w-5 h-5 text-sky-500" />
                    <span>Copilot</span>
                  </div>
                ) : simulatedPage === 'grok' ? (
                  <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-purple-400">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span>Grok</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-slate-400">
                    <span>GitHub</span>
                  </div>
                )}
              </div>

              {/* Sidebar Menu Items */}
              <div className="space-y-1 text-xs">
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-full font-medium ${
                  theme === 'light' ? 'bg-slate-200/80 text-slate-900' : 'bg-slate-800 text-slate-100'
                }`}>
                  <span className="text-sm">✦</span>
                  <span>{simulatedPage === 'unsupported' ? 'Pull Requests' : 'New chat'}</span>
                </div>

                <div className="pt-2 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Active Session</div>
                  <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-sky-400 border border-indigo-500/20 truncate">
                    {capturedConversation?.pageTitle || (simulatedPage === 'unsupported' ? 'Issue #12345: Zero-copy serialization' : 'Active Conversation')}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs px-3 py-2 flex items-center justify-between opacity-75">
              <span>Status: Connected</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">
                {simulatedPage.toUpperCase()}
              </span>
            </div>
          </aside>

          {/* Main Chat Viewport */}
          <main className="flex-1 p-6 overflow-y-auto max-h-[640px]">
            {simulatedPage === 'chatgpt' ? (
              <div className="max-w-2xl mx-auto space-y-4">
                {/* ChatGPT Host DOM indicator & Test Scenario switcher */}
                <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Loaded in Page DOM: {chatGptScenario === 'short' ? '4 messages (2 turns)' : '8 messages (4 turns)'}</span>
                  </div>
                  <button
                    onClick={() => setChatGptScenario(prev => prev === 'short' ? 'long' : 'short')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:opacity-90 cursor-pointer shadow-xs"
                  >
                    Switch to {chatGptScenario === 'short' ? 'Longer Chat (8 msgs)' : 'Short Chat (4 msgs)'}
                  </button>
                </div>

                {/* Conversation Turns in DOM */}
                {(chatGptScenario === 'short' ? CHATGPT_SHORT_CONVERSATION : CHATGPT_LONG_CONVERSATION).map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-2xl text-xs space-y-1.5 border transition-all ${
                      msg.role === 'user'
                        ? theme === 'light' ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800'
                        : theme === 'light' ? 'bg-emerald-50/60 border-emerald-100 shadow-xs' : 'bg-emerald-950/20 border-emerald-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={msg.role === 'user' ? 'text-indigo-600' : 'text-emerald-600'}>
                        {msg.role === 'user' ? 'User' : 'ChatGPT (GPT-4o)'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Turn {Math.floor(idx / 2) + 1}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed opacity-90">{msg.content}</div>
                  </div>
                ))}
              </div>
            ) : capturedConversation && capturedConversation.messages ? (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span>Loaded in Page DOM: {capturedConversation.messageCount} messages ({capturedConversation.platformName})</span>
                  </div>
                </div>

                {capturedConversation.messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-2xl text-xs space-y-1.5 border transition-all ${
                      msg.role === 'user'
                        ? theme === 'light' ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800'
                        : theme === 'light' ? 'bg-indigo-50/60 border-indigo-100 shadow-xs' : 'bg-sky-950/20 border-sky-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={msg.role === 'user' ? 'text-indigo-600' : 'text-sky-600'}>
                        {msg.role === 'user' ? 'User' : capturedConversation.platformName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Turn {Math.floor(idx / 2) + 1}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed opacity-90">{msg.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-md mx-auto py-16 flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 text-xl font-bold">
                  GH
                </div>
                <span className="text-xl font-display font-bold tracking-tight text-slate-700 dark:text-slate-200 block">
                  GitHub — Non-AI Webpage
                </span>
                <p className="text-xs opacity-70 leading-relaxed">
                  You are viewing <code>github.com/facebook/react/issues/12345</code>. Since this domain is not a supported AI chat platform, ContextBridge will automatically show <strong>Manual Context Mode</strong> with customizable context cards.
                </p>
              </div>
            )}
          </main>
        </div>

        {/* ========================================================================= */}
        {/* CONTEXTBRIDGE OVERLAY — FAITHFUL GLASS FLOW & FLUID GLASS RESTORATION     */}
        {/* ========================================================================= */}
        {isOverlayOpen && (
          <div
            className={`absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
              theme === 'light' ? 'bg-slate-900/15 backdrop-blur-[6px]' : 'bg-black/60 backdrop-blur-md'
            }`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOverlayOpen(false);
                onShowToast('Overlay dismissed');
              }
            }}
          >
            {/* Iridescent Ambient Caustic Glows Behind Glass */}
            <div
              className="absolute w-[46rem] h-[32rem] rounded-full blur-3xl pointer-events-none opacity-85"
              style={{
                background: theme === 'light'
                  ? 'radial-gradient(circle at 85% 15%, rgba(165, 180, 252, 0.45) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(251, 146, 120, 0.35) 0%, transparent 40%), radial-gradient(circle at 15% 15%, rgba(186, 230, 253, 0.4) 0%, transparent 40%), radial-gradient(circle at 15% 85%, rgba(167, 243, 208, 0.25) 0%, transparent 40%)'
                  : 'radial-gradient(circle at 85% 20%, rgba(56, 189, 248, 0.18) 0%, transparent 45%), radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.16) 0%, transparent 45%)'
              }}
            />

            {/* MAIN FLOATING GLASS PANEL */}
            <div
              className={`relative w-full max-w-[860px] rounded-[30px] p-6 sm:p-8 flex flex-col gap-6 transition-all duration-300 shadow-2xl ${
                theme === 'light'
                  ? 'bg-gradient-to-br from-white/85 via-white/70 to-white/80 backdrop-blur-3xl border border-white/85 text-slate-800 shadow-[0_25px_70px_-15px_rgba(99,102,241,0.14),0_12px_30px_-6px_rgba(15,23,42,0.05),inset_0_1.5px_1px_rgba(255,255,255,0.95)]'
                  : 'bg-[#0d131f]/90 backdrop-blur-3xl border border-white/10 text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.12)]'
              }`}
            >
              {/* Top Specular Rim */}
              <div
                className={`absolute top-0 inset-x-12 h-[1.5px] pointer-events-none rounded-t-full ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-transparent via-white to-transparent'
                    : 'bg-gradient-to-r from-transparent via-sky-400/60 to-transparent'
                }`}
              />

              {/* HEADER: Matching Reference Image (Freestanding Mobius Ribbon + Title + Close Button) */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* Glowing Mobius / Infinity Loop Ribbon Logo */}
                  <svg className="w-11 h-7 shrink-0" viewBox="0 0 52 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="simMobiusLight" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="45%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                      <linearGradient id="simMobiusDark" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 14 6 C 7 6, 3 10, 3 15 C 3 20, 7 24, 14 24 C 20.5 24, 23.5 18.5, 26 15 C 28.5 11.5, 31.5 6, 38 6 C 45 6, 49 10, 49 15 C 49 20, 45 24, 38 24 C 31.5 24, 28.5 18.5, 26 15 C 23.5 11.5, 20.5 6, 14 6 Z"
                      stroke={theme === 'light' ? 'url(#simMobiusLight)' : 'url(#simMobiusDark)'}
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div>
                    <h1 className="font-display font-bold text-xl tracking-tight leading-none">
                      ContextBridge
                    </h1>
                    <p className={`text-xs mt-1 font-normal ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Move your work, not just your chat.
                    </p>
                  </div>
                </div>

                {/* Right Controls: Close '✕' Button & Saved Drawer Access */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOverlayView(overlayView === 'saved' ? 'capture' : 'saved')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border text-xs ${
                      overlayView === 'saved'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : theme === 'light'
                          ? 'bg-white/60 hover:bg-white text-slate-600 border-white/80'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                    title="Saved Contexts"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsOverlayOpen(false)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    title="Dismiss Overlay (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MAIN CONTENT AREA */}
              {overlayView === 'capture' && (
                /* 1. THE EXACT 2-COLUMN STITCH LAYOUT */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                  {/* Left Column: Dynamic Capture Column (Auto ChatGPT Stream OR Manual Cards) */}
                  <div className="md:col-span-7 flex flex-col gap-3">
                    {capturedConversation && capturedConversation.detected ? (
                      /* AUTOMATIC CONVERSATION CAPTURE STREAM (ChatGPT Detected) */
                      <>
                        {/* Connection Status Bar with Refresh & Scenario Switcher */}
                        <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                          theme === 'light'
                            ? 'bg-white/70 border-white/85 shadow-xs'
                            : 'bg-[#141b29]/80 border-white/10'
                        }`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {capturedConversation.platformName || 'AI'} conversation detected
                            </span>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                              {capturedConversation.messageCount} msgs ({capturedConversation.turnCount} turns)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={handleRefreshConversation}
                              disabled={isRefreshing}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                                theme === 'light'
                                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-xs'
                                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
                              }`}
                              title="Re-read currently loaded messages from the webpage"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
                              <span>{isRefreshing ? 'Reading...' : 'Refresh'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Honest Conversation Notice */}
                        <div className={`px-3 py-2 rounded-xl text-[11px] flex items-center gap-2 border leading-tight ${
                          theme === 'light'
                            ? 'bg-indigo-50/70 border-indigo-100 text-indigo-700'
                            : 'bg-sky-950/30 border-sky-900/40 text-sky-300'
                        }`}>
                          <Info className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          <span>{capturedConversation.sourceNotice || `ContextBridge captured the conversation currently loaded on ${capturedConversation.platformName}.`}</span>
                        </div>

                        {/* Captured Conversation Stream Card */}
                        <div className={`rounded-2xl p-3.5 border transition-all flex flex-col gap-2.5 ${
                          theme === 'light'
                            ? 'bg-white/60 border-white/85 shadow-[0_4px_16px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.9)]'
                            : 'bg-[#141b29]/75 border-white/[0.08]'
                        }`}>
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-inherit">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Captured: <strong>{capturedConversation.pageTitle}</strong></span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              Read at {capturedConversation.capturedAt}
                            </span>
                          </div>

                          {/* Message List */}
                          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {capturedConversation.messages.map((m) => {
                              const isUser = m.role === 'user';
                              return (
                                <div
                                  key={m.id}
                                  className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                                    isUser
                                      ? theme === 'light' ? 'bg-white/80 border-slate-200/70' : 'bg-slate-900/70 border-white/5'
                                      : theme === 'light' ? 'bg-emerald-50/50 border-emerald-100/70' : 'bg-emerald-950/20 border-emerald-900/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      isUser
                                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                      {isUser ? 'USER' : (capturedConversation.platformName?.toUpperCase() || 'AI')}
                                    </span>
                                  </div>
                                  <p className="line-clamp-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {m.content}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Optional Review / Supplement Toggle */}
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => setShowManualReview(!showManualReview)}
                            className={`text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                              theme === 'light' ? 'text-indigo-600 hover:text-indigo-800' : 'text-sky-400 hover:text-sky-300'
                            }`}
                          >
                            <span>{showManualReview ? '▲ Hide supplemental notes' : '▼ Optional: Review or supplement context (task, constraints, next steps)'}</span>
                            {showManualReview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {showManualReview && (
                            <div className={`mt-2 p-3.5 rounded-xl border space-y-2.5 animate-in fade-in duration-150 ${
                              theme === 'light' ? 'bg-white/50 border-white/70 shadow-xs' : 'bg-black/20 border-white/5'
                            }`}>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Target AI Instructions / Next Steps:</label>
                                <textarea
                                  rows={2}
                                  value={nextSteps}
                                  onChange={(e) => setNextSteps(e.target.value)}
                                  placeholder="Override or specify exact instructions for the receiving AI..."
                                  className="w-full bg-transparent border-0 text-xs focus:outline-none p-0 text-inherit resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Supplemental Technical Constraints:</label>
                                <textarea
                                  rows={2}
                                  value={importantContext}
                                  onChange={(e) => setImportantContext(e.target.value)}
                                  placeholder="Runtime libraries, framework version, non-functional requirements..."
                                  className="w-full bg-transparent border-0 text-xs focus:outline-none p-0 text-inherit resize-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      /* MANUAL FALLBACK (Unsupported Website or Empty Chat) */
                      <>
                        {/* Status Banner: Manual Mode */}
                        <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                          theme === 'light'
                            ? 'bg-white/70 border-white/85 shadow-xs'
                            : 'bg-[#141b29]/80 border-white/10'
                        }`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              Unsupported AI Platform
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              This AI platform is not currently supported. Manual context mode enabled.
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSimulatedPage('gemini')}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer"
                            >
                              Gemini
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimulatedPage('claude')}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                            >
                              Claude
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimulatedPage('chatgpt')}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
                            >
                              ChatGPT
                            </button>
                          </div>
                        </div>

                        {/* Card 1: What are you working on? */}
                        <div className={`rounded-2xl p-3.5 sm:p-4 border transition-all flex items-start gap-3.5 ${
                          theme === 'light'
                            ? 'bg-white/60 hover:bg-white/85 border-white/85 shadow-[0_4px_16px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.9)]'
                            : 'bg-[#141b29]/75 hover:bg-[#182133] border-white/[0.08]'
                        }`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            theme === 'light'
                              ? 'bg-white/80 border-slate-200/60 text-slate-700 shadow-xs'
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            <label className={`block text-xs font-semibold tracking-tight ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`}>
                              What are you working on?
                            </label>
                            <input
                              type="text"
                              value={currentTask}
                              onChange={(e) => setCurrentTask(e.target.value)}
                              placeholder="e.g. Build NagrikOne dashboard..."
                              className={`w-full bg-transparent border-0 text-xs font-normal focus:outline-none focus:ring-0 p-0 pt-0.5 leading-relaxed placeholder:text-slate-400 ${
                                theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Card 2: What's been completed? */}
                        <div className={`rounded-2xl p-3.5 sm:p-4 border transition-all flex items-start gap-3.5 ${
                          theme === 'light'
                            ? 'bg-white/60 hover:bg-white/85 border-white/85 shadow-[0_4px_16px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.9)]'
                            : 'bg-[#141b29]/75 hover:bg-[#182133] border-white/[0.08]'
                        }`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            theme === 'light'
                              ? 'bg-white/80 border-slate-200/60 text-slate-700 shadow-xs'
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 11 12 14 22 4" />
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            <label className={`block text-xs font-semibold tracking-tight ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`}>
                              What's been completed?
                            </label>
                            <input
                              type="text"
                              value={workCompleted}
                              onChange={(e) => setWorkCompleted(e.target.value)}
                              placeholder="e.g. Authentication, database setup..."
                              className={`w-full bg-transparent border-0 text-xs font-normal focus:outline-none focus:ring-0 p-0 pt-0.5 leading-relaxed placeholder:text-slate-400 ${
                                theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Card 3: What's next? */}
                        <div className={`rounded-2xl p-3.5 sm:p-4 border transition-all flex items-start gap-3.5 ${
                          theme === 'light'
                            ? 'bg-white/60 hover:bg-white/85 border-white/85 shadow-[0_4px_16px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.9)]'
                            : 'bg-[#141b29]/75 hover:bg-[#182133] border-white/[0.08]'
                        }`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            theme === 'light'
                              ? 'bg-white/80 border-slate-200/60 text-slate-700 shadow-xs'
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 11 12 14 22 4" />
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            <label className={`block text-xs font-semibold tracking-tight ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`}>
                              What's next?
                            </label>
                            <input
                              type="text"
                              value={nextSteps}
                              onChange={(e) => setNextSteps(e.target.value)}
                              placeholder="e.g. Add map integration..."
                              className={`w-full bg-transparent border-0 text-xs font-normal focus:outline-none focus:ring-0 p-0 pt-0.5 leading-relaxed placeholder:text-slate-400 ${
                                theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Expandable Advanced Context (Preserving Project Name & Important Context) */}
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                              theme === 'light' ? 'text-indigo-600 hover:text-indigo-800' : 'text-sky-400 hover:text-sky-300'
                            }`}
                          >
                            <span>{showAdvanced ? 'Hide advanced context' : '+ Edit Project Name & Tech Stack Constraints'}</span>
                            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {showAdvanced && (
                            <div className={`mt-2 p-3 rounded-xl border space-y-2 animate-in fade-in duration-150 ${
                              theme === 'light' ? 'bg-white/50 border-white/70 shadow-xs' : 'bg-black/20 border-white/5'
                            }`}>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Project Name:</label>
                                <input
                                  type="text"
                                  value={projectName}
                                  onChange={(e) => setProjectName(e.target.value)}
                                  placeholder="e.g. NagrikOne Dashboard"
                                  className="w-full bg-transparent border-0 text-xs font-medium focus:outline-none p-0 text-inherit"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Important Context &amp; Constraints:</label>
                                <textarea
                                  rows={2}
                                  value={importantContext}
                                  onChange={(e) => setImportantContext(e.target.value)}
                                  placeholder="Tech stack, architecture rules, runtime dependencies..."
                                  className="w-full bg-transparent border-0 text-xs focus:outline-none p-0 text-inherit resize-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Concentric Arches Bridge Tile + Radiant CTA (5 cols) */}
                  <div className="md:col-span-5 flex flex-col justify-between gap-3">
                    {/* Arches Card */}
                    <div className={`rounded-2xl p-6 border flex flex-col items-center justify-center text-center flex-1 transition-all ${
                      theme === 'light'
                        ? 'bg-white/45 backdrop-blur-xl border-white/75 shadow-[0_4px_20px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.85)]'
                        : 'bg-[#141b29]/50 backdrop-blur-xl border-white/[0.08]'
                    }`}>
                      {/* Concentric Glowing Arch Bridge Graphic from Reference Image */}
                      <svg className="w-24 h-16 my-1" viewBox="0 0 100 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="archOuterLight" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#93c5fd" />
                            <stop offset="100%" stopColor="#a5b4fc" />
                          </linearGradient>
                          <linearGradient id="archInnerLight" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#7c3aed" />
                          </linearGradient>
                          <linearGradient id="archOuterDark" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#818cf8" />
                          </linearGradient>
                          <linearGradient id="archInnerDark" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#c084fc" />
                          </linearGradient>
                        </defs>
                        {/* Outer Arch */}
                        <path
                          d="M 18 52 L 24 52 A 26 26 0 0 1 76 52 L 82 52"
                          stroke={theme === 'light' ? 'url(#archOuterLight)' : 'url(#archOuterDark)'}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        {/* Inner Arch */}
                        <path
                          d="M 30 52 L 34 52 A 16 16 0 0 1 66 52 L 70 52"
                          stroke={theme === 'light' ? 'url(#archInnerLight)' : 'url(#archInnerDark)'}
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Text */}
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium leading-snug tracking-tight ${
                          theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Your context,
                        </p>
                        <p className={`text-xs font-medium leading-snug tracking-tight ${
                          theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          across every AI.
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          {capturedConversation?.detected
                            ? `Ready to Transfer • ${capturedConversation.messageCount} msgs`
                            : 'Zero-loss Context Hand-off'}
                        </p>
                      </div>
                    </div>

                    {/* Generate Context CTA Pill Button Matching Reference Image */}
                    <button
                      type="button"
                      onClick={() => setOverlayView('preview')}
                      className={`w-full py-2.5 px-6 rounded-full text-xs font-semibold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                        theme === 'light'
                          ? 'bg-gradient-to-r from-[#4f46e5] via-[#3b82f6] to-[#60a5fa] hover:from-[#4338ca] hover:to-[#3b82f6] shadow-[0_4px_20px_rgba(79,70,229,0.35)] hover:shadow-[0_6px_25px_rgba(79,70,229,0.5)]'
                          : 'bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#38bdf8] hover:from-[#1d4ed8] hover:to-[#0284c7] shadow-[0_4px_20px_rgba(56,189,248,0.35)]'
                      }`}
                    >
                      <span>Generate Context</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. PREVIEW STATE (After clicking Generate Context) */}
              {overlayView === 'preview' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${theme === 'light' ? 'text-indigo-700' : 'text-sky-400'}`}>
                        Generated Context Package
                      </span>
                      <span className="text-xs font-mono opacity-60">
                        {stats.words} words · ~{stats.tokens} tokens
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOverlayView('capture')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        theme === 'light'
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      ← Back to Edit
                    </button>
                  </div>

                  <pre className={`p-4 rounded-2xl font-mono text-xs leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap select-all border ${
                    theme === 'light'
                      ? 'bg-white/80 border-slate-200/80 text-slate-800'
                      : 'bg-slate-950/80 border-slate-800 text-slate-200'
                  }`}>
                    {packageText}
                  </pre>

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-60">Quick transfer:</span>
                      <button
                        onClick={() => {
                          handleCopy();
                          window.open('https://claude.ai/new', '_blank');
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                          theme === 'light' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        Claude
                      </button>
                      <button
                        onClick={() => {
                          handleCopy();
                          window.open('https://chatgpt.com', '_blank');
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                          theme === 'light' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        ChatGPT
                      </button>
                      <button
                        onClick={() => {
                          handleCopy();
                          window.open('https://gemini.google.com/app', '_blank');
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                          theme === 'light' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        Gemini
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        Save Locally
                      </button>
                      <button
                        onClick={handleCopy}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                          theme === 'light'
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
                            : 'bg-gradient-to-r from-sky-400 to-indigo-400 text-slate-950 shadow-sky-400/30'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Package</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. SAVED CONTEXTS DRAWER */}
              {overlayView === 'saved' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${theme === 'light' ? 'text-indigo-700' : 'text-sky-400'}`}>
                      Saved Contexts ({contexts.length})
                    </span>
                    <button
                      onClick={() => setOverlayView('capture')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        theme === 'light'
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      ← Return to Capture
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-50" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter saved projects by name or task..."
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none ${
                        theme === 'light'
                          ? 'bg-white/90 border-slate-200 text-slate-800'
                          : 'bg-slate-950 border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {filtered.length === 0 ? (
                      <div className="text-center py-8 opacity-60 text-xs">
                        No matching saved contexts found.
                      </div>
                    ) : (
                      filtered.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all ${
                            theme === 'light'
                              ? 'bg-white/80 border-slate-200/80 hover:border-indigo-300 shadow-xs'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold truncate">
                              {item.projectName}
                            </span>
                            <span className="text-[10px] font-mono opacity-50 shrink-0">
                              {new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed">
                            {item.currentTask || 'No task specified'}
                          </p>
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleLoadContext(item)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                                theme === 'light' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-800 text-sky-300 hover:bg-sky-500/20'
                              }`}
                            >
                              Load &amp; Edit
                            </button>
                            <button
                              onClick={async () => {
                                const text = formatContextPackage(item, format, true);
                                await navigator.clipboard.writeText(text);
                                onShowToast(`Copied "${item.projectName}"!`);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors cursor-pointer border ${
                                theme === 'light' ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => onDeleteContext(item.id)}
                              className="ml-auto text-rose-500 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
