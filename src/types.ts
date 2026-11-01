export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export type SupportedPlatform = 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'copilot' | 'grok' | 'unsupported';

export interface CapturedConversation {
  platform: SupportedPlatform;
  platformName?: string;
  detected: boolean;
  pageTitle?: string;
  url?: string;
  capturedAt: string;
  messages: ConversationMessage[];
  messageCount: number;
  turnCount: number;
  isPartial: boolean;
  sourceNotice?: string;
  errorReason?: string;
}

export interface ContextItem {
  id: string;
  projectName: string;
  currentTask: string;
  importantContext: string;
  workCompleted: string;
  nextSteps: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  capturedConversation?: CapturedConversation;
}

export type OutputFormat = 'standard' | 'markdown' | 'xml' | 'compact';

export type AppViewMode = 'simulator' | 'workspace' | 'inspector' | 'guide';

export interface TemplatePreset {
  id: string;
  label: string;
  description: string;
  data: Omit<ContextItem, 'id' | 'createdAt' | 'updatedAt'>;
}
