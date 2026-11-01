/**
 * ContextBridge - Chrome Extension Popup Script (Manifest V3)
 * 
 * Beginner Guide & Architecture Overview:
 * --------------------------------------
 * 1. Storage: Chrome extensions use `chrome.storage.local` to persist data on the user's machine.
 *    Unlike regular webpage `localStorage`, `chrome.storage.local` is asynchronous and can store
 *    rich JavaScript objects without needing manual JSON.stringify() conversions.
 *    We include a fallback to `localStorage` so this script also works in standalone testing.
 * 
 * 2. DOM Elements: We cache references to all HTML inputs and buttons upfront to make the code fast
 *    and easy to follow.
 * 
 * 3. Lifecycle:
 *    - When the popup opens, we load saved contexts and restore draft/active context.
 *    - The user can fill fields manually or click a quick-fill preset.
 *    - Clicking "Generate Package" formats the text ready for another AI chat.
 *    - Clicking "Save Locally" commits it to storage.
 *    - The user can switch to "Saved Contexts" to reopen or copy previous packages.
 */

// Storage key used to identify ContextBridge data
const STORAGE_KEY = 'contextbridge_saved_items';

// In-memory state
let savedContexts = [];
let currentEditingId = null;

// Built-in presets for quick-filling common tasks
const TEMPLATES = {
  feature: {
    projectName: "User Authentication Flow",
    currentTask: "Implement secure session tokens and OAuth callback handler",
    importantContext: "Building a TypeScript React SPA with an Express backend. Need to avoid storing secrets in client bundle and handle refresh tokens via HTTP-only cookies.",
    workCompleted: "1. Created login/register modal UI\n2. Set up backend /api/auth routes\n3. Tested email validation",
    nextSteps: "1. Create middleware to verify bearer token\n2. Implement protected route wrapper in React\n3. Add logout state cleanup"
  },
  bugfix: {
    projectName: "Fix Infinite Re-render in Dashboard",
    currentTask: "Diagnose and fix Maximum update depth exceeded error when filtering table",
    importantContext: "React 19 with TanStack Table. The error occurs when changing the date range filter while sorting is active.",
    workCompleted: "1. Isolated error to useEffect dependency array in useFilter hook\n2. Confirmed state setter is called inside render loop",
    nextSteps: "1. Memoize filter params with useMemo\n2. Refactor useEffect into user event callback\n3. Verify test suite passes"
  },
  refactor: {
    projectName: "Context State Architecture Refactor",
    currentTask: "Migrate prop-drilled state into centralized zustand/context store",
    importantContext: "Clean architecture principles. Need backward compatibility with existing components during migration.",
    workCompleted: "1. Audited all components passing user and theme props\n2. Drafted initial store interface",
    nextSteps: "1. Implement store hooks\n2. Migrate top-level navbar and sidebar\n3. Delete unused prop interfaces"
  }
};

/**
 * Universal Storage Helper:
 * Wraps chrome.storage.local and window.localStorage into a uniform Promise-based API.
 */
const storage = {
  get: function(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || []);
        });
      } else {
        try {
          const raw = localStorage.getItem(key);
          resolve(raw ? JSON.parse(raw) : []);
        } catch (e) {
          console.error("Storage read error", e);
          resolve([]);
        }
      }
    });
  },
  set: function(key, value) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          resolve();
        } catch (e) {
          console.error("Storage write error", e);
          resolve();
        }
      }
    });
  }
};

// --- DOM Element References ---
const form = document.getElementById('contextForm');
const inputProjectName = document.getElementById('projectName');
const inputCurrentTask = document.getElementById('currentTask');
const inputImportantContext = document.getElementById('importantContext');
const inputWorkCompleted = document.getElementById('workCompleted');
const inputNextSteps = document.getElementById('nextSteps');

const tabEditor = document.getElementById('tabEditor');
const tabHistory = document.getElementById('tabHistory');
const viewEditor = document.getElementById('viewEditor');
const viewHistory = document.getElementById('viewHistory');
const historyCountBadge = document.getElementById('historyCount');
const historySearch = document.getElementById('historySearch');
const savedListContainer = document.getElementById('savedListContainer');

const btnNewProject = document.getElementById('btnNewProject');
const btnSave = document.getElementById('btnSave');
const btnClearForm = document.getElementById('btnClearForm');
const outputSection = document.getElementById('outputSection');
const outputPreview = document.getElementById('outputPreview');
const outputStats = document.getElementById('outputStats');
const formatSelector = document.getElementById('formatSelector');
const btnCopyPackage = document.getElementById('btnCopyPackage');
const btnCopyText = document.getElementById('btnCopyText');
const toast = document.getElementById('toast');

/**
 * Initialize extension when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedContexts();
  setupEventListeners();
});

/**
 * Load all saved contexts from local storage
 */
async function loadSavedContexts() {
  savedContexts = await storage.get(STORAGE_KEY);
  if (!Array.isArray(savedContexts)) {
    savedContexts = [];
  }
  updateHistoryBadge();
  renderSavedList();
}

/**
 * Wire up all buttons, tabs, and form submissions
 */
function setupEventListeners() {
  // Navigation tabs
  tabEditor.addEventListener('click', () => switchTab('editor'));
  tabHistory.addEventListener('click', () => switchTab('history'));

  // "+ New" button in header
  btnNewProject.addEventListener('click', () => {
    resetForm();
    switchTab('editor');
    inputProjectName.focus();
    showToast('New blank context started');
  });

  // Preset template buttons
  document.querySelectorAll('.template-chip[data-template]').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.getAttribute('data-template');
      applyTemplate(type);
    });
  });

  // Clear form button
  btnClearForm.addEventListener('click', () => {
    resetForm();
    showToast('Form cleared');
  });

  // Form submit -> Generate Package
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateContextPackage();
  });

  // Save button
  btnSave.addEventListener('click', async () => {
    await saveCurrentContext();
  });

  // Format selector change
  formatSelector.addEventListener('change', () => {
    updateOutputText();
  });

  // Copy button
  btnCopyPackage.addEventListener('click', () => {
    copyOutputToClipboard();
  });

  // History search filter
  historySearch.addEventListener('input', () => {
    renderSavedList(historySearch.value);
  });
}

/**
 * Switch between "Editor" and "Saved Contexts" tabs
 */
function switchTab(target) {
  if (target === 'editor') {
    tabEditor.classList.add('active');
    tabHistory.classList.remove('active');
    viewEditor.classList.add('active');
    viewHistory.classList.remove('active');
  } else {
    tabHistory.classList.add('active');
    tabEditor.classList.remove('active');
    viewHistory.classList.add('active');
    viewEditor.classList.remove('active');
    renderSavedList(historySearch.value);
  }
}

/**
 * Apply preset template data to form inputs
 */
function applyTemplate(type) {
  const template = TEMPLATES[type];
  if (!template) return;

  currentEditingId = null; // Detach from previous saved ID so user can save as new
  inputProjectName.value = template.projectName;
  inputCurrentTask.value = template.currentTask;
  inputImportantContext.value = template.importantContext;
  inputWorkCompleted.value = template.workCompleted;
  inputNextSteps.value = template.nextSteps;

  generateContextPackage();
  showToast(`Loaded ${type} template`);
}

/**
 * Reset all input fields to empty
 */
function resetForm() {
  currentEditingId = null;
  form.reset();
  outputSection.classList.add('hidden');
}

/**
 * Get current form values as a clean object
 */
function getFormData() {
  return {
    projectName: inputProjectName.value.trim(),
    currentTask: inputCurrentTask.value.trim(),
    importantContext: inputImportantContext.value.trim(),
    workCompleted: inputWorkCompleted.value.trim(),
    nextSteps: inputNextSteps.value.trim()
  };
}

/**
 * Generate formatted text based on selected output format
 */
function formatPackage(data, format = 'standard') {
  const name = data.projectName || 'Untitled Project';
  const task = data.currentTask || 'None specified';
  const context = data.importantContext || 'None specified';
  const completed = data.workCompleted || 'None specified';
  const next = data.nextSteps || 'None specified';

  switch (format) {
    case 'markdown':
      return `# ContextBridge: ${name}

## Current Task
${task}

## Important Context
${context}

## Work Completed
${completed}

## Next Steps
${next}
`;

    case 'xml':
      return `<context_bridge>
  <project>${escapeXml(name)}</project>
  <current_task>${escapeXml(task)}</current_task>
  <important_context>${escapeXml(context)}</important_context>
  <work_completed>${escapeXml(completed)}</work_completed>
  <next_steps>${escapeXml(next)}</next_steps>
</context_bridge>`;

    case 'compact':
      return `PROJECT: ${name} | TASK: ${task} | CONTEXT: ${context} | COMPLETED: ${completed} | NEXT: ${next}`;

    case 'standard':
    default:
      return `PROJECT: ${name}

CURRENT TASK:
${task}

IMPORTANT CONTEXT:
${context}

WORK COMPLETED:
${completed}

NEXT STEPS:
${next}`;
  }
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

/**
 * Build and display the structured output package
 */
function generateContextPackage() {
  const data = getFormData();

  if (!data.projectName) {
    inputProjectName.focus();
    showToast('Please enter a project name first');
    return;
  }

  updateOutputText();
  outputSection.classList.remove('hidden');
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Re-render text inside <pre id="outputPreview">
 */
function updateOutputText() {
  const data = getFormData();
  const format = formatSelector.value;
  const formattedText = formatPackage(data, format);

  outputPreview.textContent = formattedText;

  // Calculate statistics
  const wordCount = formattedText.trim() ? formattedText.trim().split(/\s+/).length : 0;
  const charCount = formattedText.length;
  const estimatedTokens = Math.ceil(charCount / 4); // Standard rule of thumb: ~4 chars per token

  outputStats.textContent = `${wordCount} words · ~${estimatedTokens} tokens`;
}

/**
 * Save current context into Chrome's storage API
 */
async function saveCurrentContext() {
  const data = getFormData();

  if (!data.projectName) {
    inputProjectName.focus();
    showToast('Please enter a project name to save');
    return;
  }

  const now = new Date().toISOString();

  if (currentEditingId) {
    // Update existing record
    const index = savedContexts.findIndex(item => item.id === currentEditingId);
    if (index !== -1) {
      savedContexts[index] = {
        ...savedContexts[index],
        ...data,
        updatedAt: now
      };
    }
  } else {
    // Create new record
    const newContext = {
      id: 'ctx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    currentEditingId = newContext.id;
    savedContexts.unshift(newContext); // Prepend to top of list
  }

  await storage.set(STORAGE_KEY, savedContexts);
  updateHistoryBadge();
  showToast('Context saved locally!');
  
  // Also regenerate output so preview stays in sync
  generateContextPackage();
}

/**
 * Copy output package to system clipboard
 */
async function copyOutputToClipboard() {
  const text = outputPreview.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    btnCopyText.textContent = 'Copied!';
    showToast('Package copied to clipboard!');
    setTimeout(() => {
      btnCopyText.textContent = 'Copy Package';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
    showToast('Could not copy automatically');
  }
}

/**
 * Render saved contexts list in History tab
 */
function renderSavedList(query = '') {
  savedListContainer.innerHTML = '';
  const filter = query.toLowerCase().trim();

  const filtered = savedContexts.filter(item => {
    if (!filter) return true;
    return (
      (item.projectName && item.projectName.toLowerCase().includes(filter)) ||
      (item.currentTask && item.currentTask.toLowerCase().includes(filter)) ||
      (item.importantContext && item.importantContext.toLowerCase().includes(filter))
    );
  });

  if (filtered.length === 0) {
    savedListContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto; color: var(--text-muted);">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <p>${savedContexts.length === 0 ? 'No saved contexts yet.' : 'No matching contexts found.'}</p>
        <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 4px;">
          ${savedContexts.length === 0 ? 'Create and save your first context in the Editor!' : 'Try a different search keyword.'}
        </span>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'saved-card';

    const dateFormatted = formatRelativeDate(item.updatedAt || item.createdAt);

    card.innerHTML = `
      <div class="saved-card-header">
        <span class="saved-card-title">${escapeHtml(item.projectName || 'Untitled')}</span>
        <span class="saved-card-date">${dateFormatted}</span>
      </div>
      <p class="saved-card-task">${escapeHtml(item.currentTask || 'No task summary provided.')}</p>
      <div class="saved-card-actions">
        <button class="btn-card btn-edit" title="Load into Editor">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>
        <button class="btn-card btn-direct-copy" title="Copy Standard Context Package">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
        <button class="btn-card btn-card-danger btn-delete" title="Delete Context">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        </button>
      </div>
    `;

    // Edit button click -> load into Editor form
    card.querySelector('.btn-edit').addEventListener('click', () => {
      loadContextIntoEditor(item);
    });

    // Quick Copy button click -> copy formatted context directly
    card.querySelector('.btn-direct-copy').addEventListener('click', async () => {
      const formatted = formatPackage(item, 'standard');
      try {
        await navigator.clipboard.writeText(formatted);
        showToast(`Copied "${item.projectName}"!`);
      } catch (e) {
        showToast('Failed to copy');
      }
    });

    // Delete button click
    card.querySelector('.btn-delete').addEventListener('click', async () => {
      await deleteContext(item.id);
    });

    savedListContainer.appendChild(card);
  });
}

/**
 * Load an existing saved item into the form
 */
function loadContextIntoEditor(item) {
  currentEditingId = item.id;
  inputProjectName.value = item.projectName || '';
  inputCurrentTask.value = item.currentTask || '';
  inputImportantContext.value = item.importantContext || '';
  inputWorkCompleted.value = item.workCompleted || '';
  inputNextSteps.value = item.nextSteps || '';

  generateContextPackage();
  switchTab('editor');
  showToast(`Loaded "${item.projectName}" into editor`);
}

/**
 * Remove an item from savedContexts and update storage
 */
async function deleteContext(id) {
  savedContexts = savedContexts.filter(item => item.id !== id);
  if (currentEditingId === id) {
    currentEditingId = null;
  }
  await storage.set(STORAGE_KEY, savedContexts);
  updateHistoryBadge();
  renderSavedList(historySearch.value);
  showToast('Context deleted');
}

/**
 * Update the badge in the navigation tab
 */
function updateHistoryBadge() {
  historyCountBadge.textContent = savedContexts.length;
}

/**
 * Helper to format timestamps nicely
 */
function formatRelativeDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Display a temporary floating toast message
 */
let toastTimeout;
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}
