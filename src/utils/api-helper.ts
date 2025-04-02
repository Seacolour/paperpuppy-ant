import { message } from 'antd';
import axios, { AxiosResponse } from 'axios';
import { ApiResponse, LoginUserInfo, UserInfo, Session, SessionMessage, UserSubscription } from '../types/api';

// 创建axios实例
const request = axios.create({
  baseURL: 'http://localhost:8101', // 基础URL，实际项目中替换为您的API地址
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 确保设置为true以支持跨域请求携带cookie
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 获取token并添加到请求头
    const token = localStorage.getItem('userToken');
    
    if (token && config.headers) {
      // 添加认证头
      config.headers['Authorization'] = `Bearer ${token}`;  // 使用Bearer前缀
      
      // 仅在开发环境记录日志
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] 发送认证请求:', config.url);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[API] 发送未授权请求:', config.url);
    }
    return config;
  },
  (error) => {
    // 对请求错误做些什么
    console.error('[API] 请求构建失败:', error);
    message.error('请求发送失败');
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 仅在开发环境记录响应信息
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] 响应:', response.config.url, '状态:', response.status);
    }

    // 返回完整响应，不做额外处理
    return response;
  },
  (error) => {
    // 对响应错误做点什么
    let errMsg = '请求失败';
    
    if (error.response) {
      // 响应错误处理
      const status = error.response.status;
      
      if (process.env.NODE_ENV === 'development') {
        console.error('[API] 响应状态错误:', status);
      }
      
      switch (status) {
        case 400:
          errMsg = '请求错误';
          break;
        case 401:
          errMsg = '未授权，请重新登录';
          // 清除token并跳转到登录页
          localStorage.removeItem('userToken');
          sessionStorage.removeItem('userInfo');
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] Token无效，跳转到登录页');
          }
          setTimeout(() => {
            window.location.replace('/login');
          }, 1500);
          break;
        case 403:
          errMsg = '拒绝访问';
          break;
        case 404:
          errMsg = '请求的资源不存在';
          break;
        case 500:
          errMsg = '服务器内部错误';
          break;
        default:
          errMsg = `请求失败: ${status}`;
      }
    } else if (error.request) {
      // 请求发出，但没有收到响应
      console.error('[API] 网络错误');
      errMsg = '网络错误，请检查您的网络连接';
    } else {
      // 请求设置触发的错误
      console.error('[API] 请求错误:', error.message);
      errMsg = error.message;
    }
    
    message.error(errMsg);
    return Promise.reject(error);
  }
);

// 用户API包装器
export const UserAPI = {
  // 用户登录
  login: async (username: string, password: string): Promise<LoginUserInfo | null> => {
    try {
      const response = await request.post<any, any>('/api/user/login', {
        userAccount: username,
        userPassword: password
      });
      
      // 验证API响应格式
      if (response && response.data && response.data.code === 0 && response.data.data) {
        const userData = response.data.data;
        
        // 登录成功，存储token
        if (userData.userToken) {
          localStorage.setItem('userToken', userData.userToken);
          sessionStorage.setItem('userInfo', JSON.stringify(userData));
          return userData;
        } else {
          // 开发环境下记录更详细的错误
          if (process.env.NODE_ENV === 'development') {
            console.warn('[API] 登录成功但没有返回token');
          }
          message.error('登录成功但未获取到令牌，请联系管理员');
          return null;
        }
      } else {
        // 这里可能是响应格式不符合预期
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] 登录响应格式错误');
        }
        message.error('登录失败，服务器响应格式异常');
        return null;
      }
    } catch (error: any) {
      console.error('[API] 登录请求失败');
      message.error(error?.message || '网络错误，请稍后重试');
      return null;
    }
  },

  // 手机验证码登录
  loginWithMobile: async (mobile: string, code: string): Promise<LoginUserInfo | null> => {
    try {
      // 打印参数帮助调试
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] 手机验证码登录请求参数:', { phone: mobile, captcha: code });
      }
      
      // 根据typings.d.ts中API.SMSGetRequest类型定义，登录需要的是captcha而不是code
      const response = await request.post<any, any>('/api/user/login/phone', {
        phone: mobile,
        captcha: code
      });
      
      // 详细记录响应数据结构用于调试
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] 手机登录响应完整数据:', response);
        console.log('[API] 手机登录响应数据结构:', JSON.stringify(response.data, null, 2));
      }
      
      // 验证API响应格式
      if (response && response.data) {
        if (response.data.code === 0 && response.data.data) {
          const userData = response.data.data;
          
          // 登录成功，存储token
          if (userData.userToken) {
            localStorage.setItem('userToken', userData.userToken);
            sessionStorage.setItem('userInfo', JSON.stringify(userData));
            return userData;
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[API] 手机登录成功但没有返回token');
            }
            message.error('登录成功但未获取到令牌，请联系管理员');
            return null;
          }
        } else {
          // API返回了错误状态码
          if (process.env.NODE_ENV === 'development') {
            console.error('[API] 手机登录失败:', response.data.message);
          }
          message.error(response.data.message || '验证码错误或已过期');
          return null;
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] 手机登录响应格式错误');
        }
        message.error('登录失败，服务器响应格式异常');
        return null;
      }
    } catch (error: any) {
      // 详细记录错误信息
      if (process.env.NODE_ENV === 'development') {
        console.error('[API] 手机登录请求失败:', error);
        if (error.response) {
          console.error('[API] 响应状态:', error.response.status);
          console.error('[API] 响应数据:', error.response.data);
        }
      }
      
      // 提取API返回的错误信息并显示
      const errorMessage = error.response?.data?.message || error.message || '网络错误，请稍后重试';
      message.error(errorMessage);
      return null;
    }
  },

  // 发送手机验证码
  sendVerificationCode: async (mobile: string): Promise<boolean> => {
    try {
      // 打印参数帮助调试
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] 发送验证码请求参数:', { phone: mobile });
      }
      
      // 发送验证码请求
      const response = await request.get<any, any>('/api/sms/getPhoneNumber', {
        params: {
          phone: mobile
          // 移除captcha参数，因为实际上getPhoneNumberUsingGETParams类型只需要手机号
        }
      });
      
      // 详细记录响应数据结构
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] 验证码API响应完整数据:', response);
        console.log('[API] 验证码API响应数据结构:', JSON.stringify(response.data, null, 2));
      }
      
      if (response && response.data) {
        // 验证响应中的code字段
        if (response.data.code === 0) {
          // 成功发送验证码
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] 验证码发送成功');
          }
          return true;
        } else {
          // API返回了错误状态码
          if (process.env.NODE_ENV === 'development') {
            console.error('[API] 验证码发送失败. 错误码:', response.data.code);
            console.error('[API] 错误消息:', response.data.message);
            console.error('[API] 其他响应数据:', response.data);
          }
          message.error(response.data.message || '发送验证码失败');
          return false;
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] 验证码API响应格式异常:', response);
        }
        message.error('发送验证码失败，服务器响应异常');
        return false;
      }
    } catch (error: any) {
      // 详细记录错误信息
      if (process.env.NODE_ENV === 'development') {
        console.error('[API] 发送验证码请求失败:', error);
        if (error.response) {
          console.error('[API] 响应状态:', error.response.status);
          console.error('[API] 响应数据:', error.response.data);
        }
      }
      
      // 提取API返回的错误信息并显示
      const errorMessage = error.response?.data?.message || error.message || '网络错误，请稍后重试';
      message.error(errorMessage);
      return false;
    }
  },

  // 获取当前登录用户信息
  getCurrentUser: async (): Promise<UserInfo | null> => {
    try {
      const { data } = await request.get<any, AxiosResponse<ApiResponse<UserInfo>>>('/api/user/get/login');
      if (data.code === 0 && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  },

  // 用户注册
  register: async (userAccount: string, userPassword: string, checkPassword: string, email?: string): Promise<boolean> => {
    try {
      const { data } = await request.post<any, AxiosResponse<ApiResponse<number>>>('/api/user/register', {
        userAccount,
        userPassword,
        checkPassword,
        email
      });
      
      if (data.code === 0 && data.data) {
        message.success('注册成功');
        return true;
      } else {
        message.error(data.message || '注册失败');
        return false;
      }
    } catch (error) {
      message.error('注册请求失败');
      console.error('注册请求失败:', error);
      return false;
    }
  },

  // 用户登出
  logout: async (): Promise<boolean> => {
    try {
      await request.post('/api/user/logout');
      localStorage.removeItem('userToken');
      return true;
    } catch (error) {
      console.error('登出失败:', error);
      return false;
    }
  },

  // 更新用户自己的信息
  updateMyInfo: async (userName?: string, userAvatar?: string): Promise<boolean> => {
    try {
      const { data } = await request.post<any, AxiosResponse<ApiResponse<boolean>>>('/api/user/update/my', {
        userName,
        userAvatar
      });
      
      if (data.code === 0) {
        message.success('个人信息更新成功');
        return true;
      } else {
        message.error(data.message || '更新失败');
        return false;
      }
    } catch (error) {
      message.error('更新请求失败');
      console.error('更新请求失败:', error);
      return false;
    }
  }
};

// 会话API包装器
export const SessionAPI = {
  // 创建新会话
  createSession: async (sessionName: string): Promise<{ id: number } | null> => {
    try {
      console.log('[API] 发送认证请求:', '/api/sessions/create');
      const response = await request.post<any, AxiosResponse<ApiResponse<any>>>('/api/sessions/create', null, {
        params: { sessionName },
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });
      
      console.log('[API] 响应:', '/api/sessions/create 状态:', response.status);
      console.log('[API] 响应数据:', JSON.stringify(response.data));
      
      if (response.data && response.data.code === 0) {
        // 如果data字段直接是数字，则直接使用
        if (typeof response.data.data === 'number') {
          return { id: response.data.data };
        }
        
        // 如果data字段是对象，尝试获取id属性
        if (response.data.data && typeof response.data.data === 'object' && 'id' in response.data.data) {
          return { id: Number(response.data.data.id) };
        }
        
        // 如果data字段是字符串但可以转为数字
        if (typeof response.data.data === 'string' && !isNaN(Number(response.data.data))) {
          return { id: Number(response.data.data) };
        }
        
        console.error('无法解析会话ID，原始响应:', response.data);
        message.error('创建会话失败：无法解析会话ID');
        return null;
      } else {
        message.error(response.data?.message || '创建会话失败');
        return null;
      }
    } catch (error) {
      message.error('创建会话请求失败');
      console.error('创建会话请求失败:', error);
      return null;
    }
  },

  // 获取会话列表
  getSessionList: async (): Promise<Session[]> => {
    try {
      const { data } = await request.get<any, AxiosResponse<ApiResponse<Session[]>>>('/api/sessions/getSessions');
      if (data.code === 0 && data.data) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  },

  // 发送消息
  sendMessage: async (sessionId: number, content: string, options?: {
    enableDeepThought?: boolean;
    enableInternet?: boolean;
    useKnowledge?: boolean;
    fileIds?: string[];
  }): Promise<boolean> => {
    try {
      const formData = new FormData();
      
      // 添加文件ID到FormData
      if (options?.fileIds && options.fileIds.length > 0) {
        options.fileIds.forEach(fileId => {
          formData.append('fileIds', fileId);
        });
      }
      
      // 添加消息及其他参数
      formData.append('message', content);
      
      if (options?.enableDeepThought) {
        formData.append('enableDeepThought', 'true');
      }
      
      if (options?.enableInternet) {
        formData.append('enableInternet', 'true');
      }
      
      if (options?.useKnowledge) {
        formData.append('useKnowledge', 'true');
      }
      
      // 使用POST请求发送到sendRPC接口
      const response = await request.post(`/api/sessions/${sessionId}/sendRPC`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json, text/plain, text/event-stream, */*'
        }
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] 发送消息响应:', response);
      }
      
      if (response) {
        return true;
      } else {
        const errorMsg = '发送消息失败';
        message.error(errorMsg);
        return false;
      }
    } catch (error) {
      const errorMsg = '发送消息请求失败';
      message.error(errorMsg);
      console.error('发送消息请求失败:', error);
      return false;
    }
  },

  // 获取会话消息历史
  getSessionMessages: async (sessionId: number): Promise<SessionMessage[]> => {
    try {
      const { data } = await request.get<any, AxiosResponse<SessionMessage[]>>('/api/sessions/getSessionMessages', {
        params: { sessionId }
      });
      
      if (data) {
        return data;
      }
      return [];
    } catch (error) {
      console.error('获取会话消息失败:', error);
      return [];
    }
  }
};

// 订阅API包装器
export const SubscriptionAPI = {
  // 检查VIP状态
  checkVIPStatus: async (userId: number): Promise<UserSubscription | null> => {
    try {
      const { data } = await request.get<any, AxiosResponse<ApiResponse<UserSubscription>>>('/api/subscription/status', {
        params: { userId }
      });
      
      if (data.code === 0 && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('检查VIP状态失败:', error);
      return null;
    }
  }
};

export default {
  user: UserAPI,
  session: SessionAPI,
  subscription: SubscriptionAPI
}; 