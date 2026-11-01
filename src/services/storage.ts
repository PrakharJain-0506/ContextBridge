import { ContextItem } from '../types';

export const STORAGE_KEY = 'contextbridge_saved_items';

// Check if running directly inside a Chrome extension environment
declare const chrome: any;

export const storageService = {
  async getSavedContexts(): Promise<ContextItem[]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result: any) => {
          resolve(result[STORAGE_KEY] || []);
        });
      });
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getInitialSeedContexts();
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage read error:', e);
      return getInitialSeedContexts();
    }
  },

  async saveContexts(items: ContextItem[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY]: items }, () => resolve());
      });
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  },

  async saveSingleContext(context: Omit<ContextItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ContextItem> {
    const list = await this.getSavedContexts();
    const now = new Date().toISOString();

    if (context.id) {
      const index = list.findIndex(item => item.id === context.id);
      if (index !== -1) {
        const updated: ContextItem = {
          ...list[index],
          ...context,
          updatedAt: now,
          id: context.id
        };
        list[index] = updated;
        await this.saveContexts(list);
        return updated;
      }
    }

    const newItem: ContextItem = {
      id: 'ctx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      projectName: context.projectName || 'Untitled Project',
      currentTask: context.currentTask || '',
      importantContext: context.importantContext || '',
      workCompleted: context.workCompleted || '',
      nextSteps: context.nextSteps || '',
      createdAt: now,
      updatedAt: now
    };

    list.unshift(newItem);
    await this.saveContexts(list);
    return newItem;
  },

  async deleteContext(id: string): Promise<ContextItem[]> {
    const list = await this.getSavedContexts();
    const filtered = list.filter(item => item.id !== id);
    await this.saveContexts(filtered);
    return filtered;
  }
};

/**
 * High-quality seed context so beginners immediately see real examples
 */
function getInitialSeedContexts(): ContextItem[] {
  const initial = [
    {
      id: 'ctx_starter_01',
      projectName: 'Full-Stack Auth & Token Refresh',
      currentTask: 'Resolve silent token refresh race conditions when multiple API calls trigger at once',
      importantContext: 'TypeScript React SPA + Node Express. Access tokens expire in 15 mins; refresh token is in HttpOnly cookie. Using Axios interceptors. Avoid clearing state during in-flight refresh.',
      workCompleted: '1. Implemented /api/refresh-token endpoint\n2. Added initial Axios response interceptor for 401 status\n3. Verified cookies sent with credentials: true',
      nextSteps: '1. Implement request queue promise while refresh is pending\n2. Re-try queued requests with new Bearer token\n3. Add unit test for concurrent 401 responses',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'ctx_starter_02',
      projectName: 'Database Schema Optimization',
      currentTask: 'Create composite indexes for workspace activity feed queries',
      importantContext: 'PostgreSQL database. The activity query joins users, projects, and event_logs. Table currently has 250,000 rows. Target latency < 50ms.',
      workCompleted: '1. Ran EXPLAIN ANALYZE on slow query\n2. Identified sequential scan on event_logs.created_at',
      nextSteps: '1. Add composite index on (workspace_id, created_at DESC)\n2. Re-measure query plan in staging\n3. Add migration file',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}
