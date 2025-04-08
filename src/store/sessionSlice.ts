import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatSession {
  id: number;
  name: string;
  backendSessionId?: number;
  lastMessage?: string;
  timestamp?: string;
  pinned?: boolean;
  starred?: boolean;
  group?: string;
  updateTime?: string; // 添加updateTime字段，存储后端会话的更新时间
}

interface SessionState {
  sessions: ChatSession[];
  activeSessionId: number | null;
  showGrouped: boolean;
  showMoreInfo: boolean;
  lastRefreshed: number; // 标记最后一次刷新会话列表的时间戳
}

// 从localStorage获取初始状态
const loadInitialState = (): SessionState => {
  try {
    const savedSessions = localStorage.getItem('chatSessions');
    const savedActiveId = localStorage.getItem('activeSessionId');
    const savedGrouped = localStorage.getItem('showGrouped');
    const savedMoreInfo = localStorage.getItem('showMoreInfo');
    
    return {
      sessions: savedSessions ? JSON.parse(savedSessions) : [],
      activeSessionId: savedActiveId ? parseInt(savedActiveId, 10) : null,
      showGrouped: savedGrouped ? JSON.parse(savedGrouped) : false,
      showMoreInfo: savedMoreInfo ? JSON.parse(savedMoreInfo) : false,
      lastRefreshed: 0, // 初始化为0
    };
  } catch (error) {
    console.error('Error loading sessions from localStorage:', error);
    return {
      sessions: [],
      activeSessionId: null,
      showGrouped: false,
      showMoreInfo: false,
      lastRefreshed: 0,
    };
  }
};

const initialState: SessionState = loadInitialState();

export const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<ChatSession[]>) => {
      state.sessions = action.payload;
      state.lastRefreshed = Date.now(); // 更新最后刷新时间戳
      localStorage.setItem('chatSessions', JSON.stringify(action.payload));
    },
    addSession: (state, action: PayloadAction<ChatSession>) => {
      state.sessions = [action.payload, ...state.sessions];
      localStorage.setItem('chatSessions', JSON.stringify(state.sessions));
    },
    updateSession: (state, action: PayloadAction<ChatSession>) => {
      const index = state.sessions.findIndex(
        (session) => session.id === action.payload.id
      );
      if (index !== -1) {
        state.sessions[index] = action.payload;
        localStorage.setItem('chatSessions', JSON.stringify(state.sessions));
      }
    },
    deleteSession: (state, action: PayloadAction<number>) => {
      state.sessions = state.sessions.filter(
        (session) => session.id !== action.payload
      );
      localStorage.setItem('chatSessions', JSON.stringify(state.sessions));
    },
    setActiveSessionId: (state, action: PayloadAction<number>) => {
      state.activeSessionId = action.payload;
      localStorage.setItem('activeSessionId', action.payload.toString());
    },
    toggleGrouped: (state, action: PayloadAction<boolean>) => {
      state.showGrouped = action.payload;
      localStorage.setItem('showGrouped', JSON.stringify(action.payload));
    },
    toggleMoreInfo: (state, action: PayloadAction<boolean>) => {
      state.showMoreInfo = action.payload;
      localStorage.setItem('showMoreInfo', JSON.stringify(action.payload));
    },
    toggleSessionPinned: (state, action: PayloadAction<number>) => {
      const index = state.sessions.findIndex(
        (session) => session.id === action.payload
      );
      if (index !== -1) {
        state.sessions[index].pinned = !state.sessions[index].pinned;
        
        // 重新排序会话，将置顶会话放在前面
        const pinnedSessions = state.sessions.filter(session => session.pinned);
        const normalSessions = state.sessions.filter(session => !session.pinned);
        state.sessions = [...pinnedSessions, ...normalSessions];
        
        localStorage.setItem('chatSessions', JSON.stringify(state.sessions));
      }
    },
    toggleSessionStarred: (state, action: PayloadAction<number>) => {
      const index = state.sessions.findIndex(
        (session) => session.id === action.payload
      );
      if (index !== -1) {
        state.sessions[index].starred = !state.sessions[index].starred;
        localStorage.setItem('chatSessions', JSON.stringify(state.sessions));
      }
    },
  },
});

export const {
  setSessions,
  addSession,
  updateSession,
  deleteSession,
  setActiveSessionId,
  toggleGrouped,
  toggleMoreInfo,
  toggleSessionPinned,
  toggleSessionStarred,
} = sessionSlice.actions;

export default sessionSlice.reducer; 