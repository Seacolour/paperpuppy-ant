// API 响应的基本类型
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 用户信息
export interface UserInfo {
  id: number;
  userName: string;
  userAccount: string;
  userAvatar?: string;
  userRole: string;
  userToken?: string;
  createTime?: string;
}

// 登录用户信息
export interface LoginUserInfo extends UserInfo {
  userToken: string;
}

// 会话数据
export interface Session {
  id: number;
  sessionName: string;
  userId: number;
  createTime: string;
  updateTime: string;
}

// 会话消息
export interface SessionMessage {
  id: number;
  sessionId: number;
  userId: number;
  content: string;
  rawContent?: string; // 原始格式的消息内容
  role: 'user' | 'assistant';
  createTime: string;
  tempId?: string;    // 流式消息的临时ID
  messageType?: string; // 消息类型，如AIMessage等
}

// 用户订阅信息
export interface UserSubscription {
  id: number;
  userId: number;
  endTime: string;
  isValid: boolean;
} 