export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string | Date;
  fileIds?: string[];
  tempId?: string;
  stableKey?: string;
  sessionId?: number | string;
  rawContent?: string;
  isStreaming?: boolean;
  key?: string;
  fromStream?: boolean;
  streamId?: string;
  animate?: boolean;
  isDraft?: boolean;
  streamComplete?: boolean;
  stableId?: string;
} 