import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  fileIds?: string[];
  // 添加后端API返回的重要字段
  sessionId?: number | string;  // 消息所属的会话ID
  tempId?: string;     // 流式消息的临时ID
  rawContent?: string; // 原始格式的消息内容
  fromStream?: boolean; // 标记是否来自流
  streamId?: string;   // 流会话ID
  animate?: boolean;   // 动画标记
  isDraft?: boolean;   // 是否是草稿状态
  streamComplete?: boolean; // 流是否完成
  stableId?: string;   // 流期间保持稳定的ID
}

interface MessageState {
  messages: Record<number, Message[]>;
  loading: boolean;
  activeStreamId: string | null; // 当前活跃的流ID
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
      return { messages: parsedMessages, loading: false, activeStreamId: null };
    }
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
  }
  
  return { messages: {}, loading: false, activeStreamId: null };
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
      
      // 检查是否已存在相同ID的消息
      const existingMessageIndex = state.messages[sessionId].findIndex(msg => msg.id === message.id);
      if (existingMessageIndex === -1) {
        // 只有当消息不存在时才添加
        state.messages[sessionId].push(serializedMessage);
        localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
      }
    },
    addAssistantMessage: (state, action: PayloadAction<{ sessionId: number; message: Message }>) => {
      const { sessionId, message } = action.payload;
      const serializedMessage = serializeTimestamp(message);
      
      if (!state.messages[sessionId]) {
        state.messages[sessionId] = [];
      }
      
      // 检查是否已存在相同ID的消息
      const existingMessageIndex = state.messages[sessionId].findIndex(msg => msg.id === message.id);
      if (existingMessageIndex === -1) {
        // 只有当消息不存在时才添加
        state.messages[sessionId].push(serializedMessage);
        localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
      }
    },
    // 新增：创建或更新流式消息
    updateStreamMessage: (state, action: PayloadAction<{ 
      sessionId: number; 
      streamId: string;
      content: string;
      isComplete?: boolean;
    }>) => {
      const { sessionId, streamId, content, isComplete = false } = action.payload;
      
      if (!state.messages[sessionId]) {
        state.messages[sessionId] = [];
      }
      
      // 设置当前活跃的流ID
      if (!isComplete) {
        state.activeStreamId = streamId;
      }
      
      // 查找会话中是否已有此流ID的消息
      const existingMessageIndex = state.messages[sessionId].findIndex(
        msg => msg.streamId === streamId
      );
      
      if (existingMessageIndex >= 0) {
        // 更新现有消息的内容
        state.messages[sessionId][existingMessageIndex].content = content;
        
        // 如果流完成，更新标记
        if (isComplete) {
          state.messages[sessionId][existingMessageIndex].streamComplete = true;
          state.messages[sessionId][existingMessageIndex].isDraft = false;
          state.activeStreamId = null;
          
          // 流完成时保存到本地存储
          localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
        }
      } else {
        // 创建新的消息
        const newMessage: Message = {
          id: `stream-${streamId}`,
          stableId: streamId, // 保持一个稳定的ID用于引用
          content: content,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          streamId: streamId,
          fromStream: true,
          isDraft: !isComplete,
          streamComplete: isComplete,
          animate: true
        };
        
        state.messages[sessionId].push(newMessage);
        
        // 只有流完成时才保存到本地存储
        if (isComplete) {
          state.activeStreamId = null;
          localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
        }
      }
    },
    clearSessionMessages: (state, action: PayloadAction<number>) => {
      const sessionId = action.payload;
      delete state.messages[sessionId];
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      // 重置活跃流ID
      if (!action.payload) {
        state.activeStreamId = null;
      }
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
  updateStreamMessage,
  clearSessionMessages,
  setLoading,
  createEmptySession
} = messageSlice.actions;

export default messageSlice.reducer; 