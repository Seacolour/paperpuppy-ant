import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  fileIds?: string[];
}

interface MessageState {
  messages: Record<number, Message[]>;
  loading: boolean;
}

// 本地存储键名
const MESSAGES_STORAGE_KEY = 'paperpuppy_messages';

// 从localStorage获取初始状态
const loadInitialState = (): MessageState => {
  try {
    const storedMessages = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (storedMessages) {
      const parsedMessages = JSON.parse(storedMessages) as Record<number, Message[]>;
      
      // 不再需要将字符串转为Date对象
      return { messages: parsedMessages, loading: false };
    }
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
  }
  
  return { messages: {}, loading: false };
};

const initialState: MessageState = loadInitialState();

// 辅助函数：将Date对象或其他类型转为ISO字符串
const serializeTimestamp = (message: Message): Message => {
  // 如果timestamp已经是字符串，直接返回
  if (typeof message.timestamp === 'string') {
    return message;
  }
  
  // 处理可能是Date对象的情况 (使用any类型绕过TypeScript的类型检查)
  const timestamp = message.timestamp as any;
  if (timestamp && typeof timestamp.toISOString === 'function') {
    return {
      ...message,
      timestamp: timestamp.toISOString()
    };
  }
  
  // 如果不是Date也不是字符串，则转为字符串
  return {
    ...message,
    timestamp: String(message.timestamp)
  };
};

export const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<Record<number, Message[]>>) => {
      // 确保所有时间戳都是字符串
      const serialized = Object.entries(action.payload).reduce((acc, [sessionId, messages]) => {
        acc[parseInt(sessionId)] = messages.map(serializeTimestamp);
        return acc;
      }, {} as Record<number, Message[]>);
      
      state.messages = serialized;
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(serialized));
    },
    addUserMessage: (state, action: PayloadAction<{ sessionId: number; message: Message }>) => {
      const { sessionId, message } = action.payload;
      const serializedMessage = serializeTimestamp(message);
      
      if (!state.messages[sessionId]) {
        state.messages[sessionId] = [];
      }
      state.messages[sessionId].push(serializedMessage);
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
    },
    addAssistantMessage: (state, action: PayloadAction<{ sessionId: number; message: Message }>) => {
      const { sessionId, message } = action.payload;
      const serializedMessage = serializeTimestamp(message);
      
      if (!state.messages[sessionId]) {
        state.messages[sessionId] = [];
      }
      state.messages[sessionId].push(serializedMessage);
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
    },
    clearSessionMessages: (state, action: PayloadAction<number>) => {
      const sessionId = action.payload;
      delete state.messages[sessionId];
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    createEmptySession: (state, action: PayloadAction<number>) => {
      const sessionId = action.payload;
      state.messages[sessionId] = [];
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
    }
  },
});

export const {
  setMessages,
  addUserMessage,
  addAssistantMessage,
  clearSessionMessages,
  setLoading,
  createEmptySession
} = messageSlice.actions;

export default messageSlice.reducer; 