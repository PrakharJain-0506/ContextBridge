import { ContextItem, OutputFormat, TemplatePreset } from '../types';

export function formatPlatformName(platform?: string): string {
  switch (platform) {
    case 'gemini': return 'Google Gemini';
    case 'claude': return 'Claude';
    case 'perplexity': return 'Perplexity';
    case 'copilot': return 'Microsoft Copilot';
    case 'grok': return 'Grok';
    case 'chatgpt': return 'ChatGPT';
    default: return 'AI';
  }
}

export function formatContextPackage(
  data: Partial<ContextItem>,
  format: OutputFormat = 'standard',
  includeMetaInstruction: boolean = true
): string {
  const conversation = data.capturedConversation;
  const hasCaptured = conversation && conversation.detected && conversation.messages.length > 0;

  // Primary source: If an automatically captured conversation exists, package it directly!
  if (hasCaptured) {
    const platformName = conversation.platformName || formatPlatformName(conversation.platform);
    const title = (data.projectName || conversation.pageTitle || `${platformName} Conversation Session`).trim();
    const notice = conversation.sourceNotice || `ContextBridge captured the conversation currently loaded on this page.`;
    const msgCount = conversation.messages.length;

    // Optional user supplements
    const hasManualSupplements = (data.currentTask && data.currentTask.trim()) ||
      (data.workCompleted && data.workCompleted.trim()) ||
      (data.nextSteps && data.nextSteps.trim()) ||
      (data.importantContext && data.importantContext.trim());

    switch (format) {
      case 'markdown': {
        const turnsMd = conversation.messages.map((m) => {
          const roleLabel = m.role === 'user' ? 'User' : `Assistant (${platformName})`;
          return `### ${roleLabel}\n${m.content.trim()}`;
        }).join('\n\n');

        let suppMd = '';
        if (hasManualSupplements) {
          suppMd = `\n\n## Review & Working Constraints\n` +
            (data.currentTask ? `**Current Task:** ${data.currentTask}\n\n` : '') +
            (data.importantContext ? `**Context:** ${data.importantContext}\n\n` : '') +
            (data.workCompleted ? `**Completed:** ${data.workCompleted}\n\n` : '') +
            (data.nextSteps ? `**Next Steps:** ${data.nextSteps}\n\n` : '');
        }

        return `# ContextBridge: ${title}
*Source: ${platformName} • ${msgCount} messages captured*

> **Notice:** ${notice}

## Conversation Transcript
${turnsMd}${suppMd}
`;
      }

      case 'xml': {
        const turnsXml = conversation.messages.map((m) =>
          `    <message role="${m.role}">${escapeXml(m.content.trim())}</message>`
        ).join('\n');

        let suppXml = '';
        if (hasManualSupplements) {
          suppXml = `\n  <supplements>\n` +
            (data.currentTask ? `    <current_task>${escapeXml(data.currentTask)}</current_task>\n` : '') +
            (data.importantContext ? `    <important_context>${escapeXml(data.importantContext)}</important_context>\n` : '') +
            (data.workCompleted ? `    <work_completed>${escapeXml(data.workCompleted)}</work_completed>\n` : '') +
            (data.nextSteps ? `    <next_steps>${escapeXml(data.nextSteps)}</next_steps>\n` : '') +
            `  </supplements>`;
        }

        return `<context_bridge source="${conversation.platform}" platform="${escapeXml(platformName)}" messages="${msgCount}">
  <meta>
    <project>${escapeXml(title)}</project>
    <notice>${escapeXml(notice)}</notice>
    <captured_at>${escapeXml(conversation.capturedAt)}</captured_at>
  </meta>
  <conversation>
${turnsXml}
  </conversation>${suppXml}
</context_bridge>`;
      }

      case 'compact': {
        const snippet = conversation.messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content.replace(/\s+/g, ' ').slice(0, 120)}...`)
          .join(' | ');
        const nextPart = data.nextSteps ? ` | NEXT: ${data.nextSteps.replace(/\s+/g, ' ')}` : '';
        return `[CONTEXTBRIDGE: ${platformName.toUpperCase()} (${msgCount} msgs)] ${title} | NOTICE: ${notice} | ${snippet}${nextPart}`;
      }

      case 'standard':
      default: {
        const metaHeader = includeMetaInstruction
          ? `[SYSTEM CONTEXT: The user is transferring their active working context from ${platformName}. Review the captured conversation transcript below and continue the task directly without asking the user to re-explain.]\n\n`
          : '';

        const transcript = conversation.messages.map((m) => {
          const roleLabel = m.role === 'user' ? '[USER]' : `[ASSISTANT (${platformName.toUpperCase()})]`;
          return `${roleLabel}:\n${m.content.trim()}`;
        }).join('\n\n');

        let suppText = '';
        if (hasManualSupplements) {
          suppText = `\n\n----------------------------------------\nSUPPLEMENTAL NOTES & NEXT STEPS:\n` +
            (data.currentTask ? `TASK: ${data.currentTask}\n` : '') +
            (data.importantContext ? `CONTEXT: ${data.importantContext}\n` : '') +
            (data.workCompleted ? `COMPLETED: ${data.workCompleted}\n` : '') +
            (data.nextSteps ? `NEXT STEPS: ${data.nextSteps}\n` : '');
        }

        return `${metaHeader}PROJECT: ${title}
SOURCE: ${platformName} (Auto-Captured)
MESSAGES CAPTURED: ${msgCount}
STATUS: ${notice}

CONVERSATION TRANSCRIPT:
----------------------------------------\n${transcript}${suppText}`;
      }
    }
  }

  // Fallback: Manual context fields (when no conversation is detected)
  const name = (data.projectName || 'Untitled Project').trim();
  const task = (data.currentTask || 'None specified').trim();
  const context = (data.importantContext || 'None specified').trim();
  const completed = (data.workCompleted || 'None specified').trim();
  const next = (data.nextSteps || 'None specified').trim();

  const metaHeader = includeMetaInstruction
    ? `[SYSTEM CONTEXT: You are continuing an active project session. Review the structured context package below before responding. Follow the NEXT STEPS directly.]\n\n`
    : '';

  switch (format) {
    case 'markdown':
      return `${metaHeader}# Project: ${name}

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
      return `${metaHeader}<context_bridge>
  <project>${escapeXml(name)}</project>
  <current_task>${escapeXml(task)}</current_task>
  <important_context>${escapeXml(context)}</important_context>
  <work_completed>${escapeXml(completed)}</work_completed>
  <next_steps>${escapeXml(next)}</next_steps>
</context_bridge>`;

    case 'compact':
      return `${metaHeader}PROJECT: ${name} | TASK: ${task} | CONTEXT: ${context} | COMPLETED: ${completed} | NEXT: ${next}`;

    case 'standard':
    default:
      return `${metaHeader}PROJECT: ${name}

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

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function calculateTextStats(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = text.length;
  // Approximation for LLM tokens (~4 characters per token in English text)
  const tokens = Math.ceil(chars / 4);
  return { words, chars, tokens };
}

export const PRESET_TEMPLATES: TemplatePreset[] = [
  {
    id: 'feature',
    label: 'New Feature',
    description: 'Structure for implementing new functionality',
    data: {
      projectName: 'Full-Stack Search & Filtering',
      currentTask: 'Add debounced multi-field search with server-side pagination',
      importantContext: 'Frontend: React 19 + Tailwind. Backend: Node Express. Avoid hammering the API on every keystroke by debouncing input with 300ms delay.',
      workCompleted: '1. Built UI search input with clear icon\n2. Created backend /api/items?search=&page= query handler\n3. Verified pagination numbers update',
      nextSteps: '1. Add custom useDebounce hook in React\n2. Hook debounced query to fetch call\n3. Add empty state illustration for 0 results'
    }
  },
  {
    id: 'bugfix',
    label: 'Bug Fix',
    description: 'Diagnose and resolve an unexpected defect',
    data: {
      projectName: 'Fix Modal Overlay Scroll Lock',
      currentTask: 'Prevent background page scrolling when dialog modal is open on iOS Safari',
      importantContext: 'Mobile web app. Setting document.body.style.overflow = hidden fails on WebKit touch devices. Need a touchmove canceler or position: fixed wrapper.',
      workCompleted: '1. Reproduced issue on iPhone Safari\n2. Verified that desktop Chrome correctly blocks scroll',
      nextSteps: '1. Save window.scrollY before opening modal\n2. Apply fixed top offset to body\n3. Restore previous scroll position on close'
    }
  },
  {
    id: 'architecture',
    label: 'Architecture',
    description: 'System design, schema, and API contracts',
    data: {
      projectName: 'Event-Driven Webhook Pipeline',
      currentTask: 'Design idempotent webhook consumer with retry queue',
      importantContext: 'Third-party payment webhooks may be delivered more than once or out of order. Database must record processed event_id before dispatching jobs.',
      workCompleted: '1. Drafted JSON payload schema\n2. Created webhook verification signature checker with HMAC-SHA256',
      nextSteps: '1. Define webhook_events table in SQL\n2. Implement 200 OK fast response\n3. Queue background processing worker'
    }
  },
  {
    id: 'refactor',
    label: 'Code Refactor',
    description: 'Clean up code without altering external behavior',
    data: {
      projectName: 'Extract Custom Hook for LocalStorage',
      currentTask: 'Consolidate duplicate localStorage read/write logic into reusable useLocalStorage hook',
      importantContext: 'Multiple components have try/catch JSON.parse blocks. Ensure window storage events trigger updates across browser tabs.',
      workCompleted: '1. Identified 4 components repeating the same storage code\n2. Wrote TypeScript interface for the target hook',
      nextSteps: '1. Implement useLocalStorage<T>(key, initialValue)\n2. Add window.addEventListener("storage") listener\n3. Replace repetitive code in settings and theme components'
    }
  }
];
