import React, { useState, useEffect } from 'react';
import { Layout, message, Button, Modal } from 'antd';
import { MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
// 导入SessionAPI用于流式消息传输，这是Swagger生成的API无法满足的功能
import { SessionAPI } from '../utils/api-helper';
import FileManager from '../utils/FileManager';
import '../styles/ChatPage.css';
import { useDispatch } from 'react-redux';
import { 
  addSession, 
  setActiveSessionId,
  updateSession,
  ChatSession,
  setSessions  
} from '../store/sessionSlice';
import { 
  addUserMessage, 
  addAssistantMessage, 
  clearSessionMessages, 
  setLoading as setMessageLoading,
  createEmptySession,
  Message
} from '../store/messageSlice';
import { useAppSelector } from '../store';
import { 
  getSessionsUsingGet, 
  createSessionUsingPost, 
  getSessionMessagesUsingGet,
  getSessionByIdUsingGet,
  getSessionMessagesByTimeStampUsingGet
} from '../api/sessionController';
import { userLogoutUsingPost } from '../api/userController';
import { v4 as uuidv4 } from 'uuid';
// 导入文件预览模态框组件（如需使用请取消注释）
// import FilePreviewModal from './FilePreviewModal';
import { useStreamMessage } from '../hooks/useStreamMessage';

const { Sider, Content } = Layout;

// 聊天消息数据由Redux状态管理
const initialMessages: Record<number, Message[]> = {};

const ChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { activeSessionId } = useAppSelector((state) => state.sessions);
  const { messages: allMessages, loading } = useAppSelector((state) => state.messages);
  const sessionData = useAppSelector(state => state.sessions.sessions);
  
  const [collapsed, setCollapsed] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { streamContent: streamedContent, isProcessing, processStream, cancelGeneration } = useStreamMessage(activeSessionId);

  // 获取文件管理器实例
  const fileManager = FileManager.getInstance();

  // 确保有一个默认会话ID
  const currentSessionId = activeSessionId || 1;

  // 初始化消息
  useEffect(() => {
    // 如果Redux store中没有消息，从初始数据加载
    // 只有在没有从后端加载到会话的情况下才使用初始示例数据
    if (Object.keys(allMessages).length === 0 && sessionData.length === 0) {
      // 将初始消息加载到Redux
      Object.keys(initialMessages).forEach(sessionKey => {
        const sessionId = parseInt(sessionKey);
        initialMessages[sessionId].forEach(msg => {
          if (msg.role === 'user') {
            dispatch(addUserMessage({ sessionId, message: msg }));
          } else {
            dispatch(addAssistantMessage({ sessionId, message: msg }));
          }
        });
      });
    }
  }, [dispatch, allMessages, sessionData]);

  // 辅助函数：获取会话分组（今天、昨天、本周、更早）
  const getSessionGroup = (updateTime?: string): string => {
    if (!updateTime) return '未知';
    
    const sessionDate = new Date(updateTime);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 今天
    if (sessionDate.toDateString() === today.toDateString()) {
      return '今天';
    }
    
    // 昨天
    if (sessionDate.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    
    // 本周（过去7天）
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (sessionDate >= oneWeekAgo) {
      return '本周';
    }
    
    // 更早
    return '更早';
  };

  // 从后端加载历史会话
  useEffect(() => {
    // 每次应用启动时都从后端获取最新会话列表，确保缓存一致性
    // 注意：这里只加载会话列表，不加载消息内容，消息内容仍然在点击会话时加载
    const fetchHistorySessions = async () => {
      try {
        console.log('从后端获取会话列表');
        // 使用Swagger生成的API函数获取会话列表
        const response = await getSessionsUsingGet();
        if (response && response.data && response.data.code === 0 && response.data.data) {
          const backendSessions = response.data.data;
          
          // 将后端会话转换为前端会话格式
          const convertedSessions: ChatSession[] = backendSessions.map(session => {
            // 确保ID是number类型
            const sessionId = session.id ? Number(session.id) : Date.now();
            
            // 优先使用theme字段作为会话标题，如果为空则使用sessionName或默认值
            console.log('会话信息:', session);
            return {
              id: sessionId,
              name: session.theme || session.sessionName || "未命名会话",
              backendSessionId: sessionId, // 保存后端会话ID
              lastMessage: "点击加载消息", // 默认提示
              timestamp: session.updateTime ? new Date(session.updateTime).toLocaleString() : "未知时间",
              group: getSessionGroup(session.updateTime),
              updateTime: session.updateTime // 保存原始的updateTime字段，用于时间戳比较
            };
          });
          
          // 对会话进行排序 - 按更新时间降序
          const sortedSessions = convertedSessions.sort((a, b) => {
            const timeA = a.timestamp && a.timestamp !== "未知时间" ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp && b.timestamp !== "未知时间" ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
          });
          
          // 检查本地是否已有会话，如果有则合并保留用户本地设置的星标和置顶状态
          const localSessions = sessionData;
          
          if (localSessions && localSessions.length > 0) {
            // 合并本地和远程会话，保留本地设置的星标和置顶状态
            const mergedSessions = sortedSessions.map(session => {
              const localSession = localSessions.find(local => local.backendSessionId === session.backendSessionId);
              if (localSession) {
                // 如果本地会话存在，检查是否需要更新
                const needsUpdate = !localSession.updateTime || 
                                    (session.updateTime && localSession.updateTime !== session.updateTime);
                
                console.log(`会话 ${session.id} 本地时间戳: ${localSession.updateTime}, 后端时间戳: ${session.updateTime}, 需要更新: ${needsUpdate}`);
                
                // 如果需要更新，使用后端数据，但保留本地设置
                if (needsUpdate) {
                  // 标记会话需要重新加载消息
                  localStorage.setItem(`session_${session.id}_needsRefresh`, 'true');
                  
                  return {
                    ...session,
                    pinned: localSession.pinned,
                    starred: localSession.starred
                  };
                } else {
                  // 如果不需要更新，保留本地会话信息，仅更新标题等关键信息
                  return {
                    ...localSession,
                    name: session.name, // 使用最新的标题
                    updateTime: session.updateTime // 保持时间戳一致
                  };
                }
              }
              // 如果本地没有这个会话，这是一个新会话，需要标记为需要刷新
              // 因为新会话需要从后端加载消息
              localStorage.setItem(`session_${session.id}_needsRefresh`, 'true');
              
              // 初始化该会话的加载时间，避免使用默认值0导致isDataStale总是为true
              const updatedTimes = {
                ...sessionLoadTimes,
                [session.id]: Date.now()
              };
              setSessionLoadTimes(updatedTimes);
              localStorage.setItem('sessionLoadTimes', JSON.stringify(updatedTimes));
              
              return session;
            });
            
            dispatch(setSessions(mergedSessions));
          } else {
            // 直接设置后端获取的会话，并标记所有会话需要重新加载
            // 这是首次加载会话列表，所有会话都需要从后端加载消息
            const initialTimes = { ...sessionLoadTimes };
            
            sortedSessions.forEach(session => {
              localStorage.setItem(`session_${session.id}_needsRefresh`, 'true');
              
              // 初始化所有会话的加载时间，避免使用默认值0导致isDataStale总是为true
              initialTimes[session.id] = Date.now();
            });
            
            setSessionLoadTimes(initialTimes);
            localStorage.setItem('sessionLoadTimes', JSON.stringify(initialTimes));
            
            dispatch(setSessions(sortedSessions));
          }
          
          // 记录会话列表的最后加载时间
          localStorage.setItem('sessionsLastLoadTime', Date.now().toString());
        }
      } catch (error) {
        console.error('获取历史会话失败:', error);
        message.error('获取历史会话失败，将使用本地缓存');
      }
    };
    
    // 立即执行获取会话列表
    fetchHistorySessions();
    
    // 设置定期刷新会话列表的定时器（每5分钟刷新一次）
    const refreshInterval = setInterval(() => {
      console.log('定时刷新会话列表');
      fetchHistorySessions();
    }, 5 * 60 * 1000);
    
    // 组件卸载时清除定时器
    return () => clearInterval(refreshInterval);
    
  }, [dispatch]); // 移除sessionData依赖，防止无限循环

  // 组件首次加载时，确保当前有一个活跃会话
  useEffect(() => {
    // 取消自动选择第一个会话
    // if (!activeSessionId && sessionData.length > 0) {
    //   dispatch(setActiveSessionId(sessionData[0].id));
    // }
  }, [activeSessionId, sessionData, dispatch]);
  
  // 维护会话ID映射关系
  useEffect(() => {
    // 当会话列表变更时检查并同步ID映射
    let sessionIdMap = new Map();
    sessionData.forEach(session => {
      if (session.backendSessionId) {
        sessionIdMap.set(session.backendSessionId, session.id);
      }
    });
    
    // 保存映射关系
    if (sessionIdMap.size > 0) {
      localStorage.setItem('sessionIdMap', JSON.stringify(Array.from(sessionIdMap.entries())));
    }
  }, [sessionData]);

  // 处理侧边栏切换
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // 缓存会话消息的时间戳记录
  const [sessionLoadTimes, setSessionLoadTimes] = useState<Record<number, number>>(() => {
    // 从 localStorage 中加载会话加载时间
    try {
      const savedTimes = localStorage.getItem('sessionLoadTimes');
      return savedTimes ? JSON.parse(savedTimes) : {};
    } catch (e) {
      console.error('解析会话加载时间失败:', e);
      return {};
    }
  });

  // 处理会话选择
  const handleSelectSession = async (sessionId: number) => {
    // 首先取消可能正在进行的流式生成
    if (isProcessing) {
      cancelGeneration();
    }
    
    // 当切换会话时，流式内容已经通过cancelGeneration()重置
    
    // 设置活动会话ID
    dispatch(setActiveSessionId(sessionId));
    
    // 获取当前会话信息
    const selectedSession = sessionData.find(s => s.id === sessionId);
    
    // 如果会话加载时间不存在，初始化为当前时间
    // 这避免了使用默认值0导致isDataStale总是为true
    if (!sessionLoadTimes[sessionId]) {
      const updatedTimes = {
        ...sessionLoadTimes,
        [sessionId]: Date.now()
      };
      setSessionLoadTimes(updatedTimes);
      localStorage.setItem('sessionLoadTimes', JSON.stringify(updatedTimes));
    }
    
    // 如果存在后端会话ID，尝试获取历史消息
    if (selectedSession?.backendSessionId) {
      try {
        // 检查是否已经加载过这个会话的消息
        const sessionMessages = allMessages[sessionId] || [];
        
        // 检查会话是否需要刷新
        const needsRefresh = localStorage.getItem(`session_${sessionId}_needsRefresh`) === 'true';
        
        // 只在会话消息为空或需要刷新时加载消息
        // 移除了数据过期的检查，完全依赖时间戳比较和刷新标记
        
        if (sessionMessages.length === 0 || needsRefresh) {
          // 显示加载状态
          dispatch(setMessageLoading(true));
          
          let response;
          
          // 如果是首次加载或需要完全刷新，则清除所有消息并使用原始API
          if (sessionMessages.length === 0 || needsRefresh) {
            console.log(`从后端加载全部会话消息. 会话ID: ${sessionId}`);
            
            // 清除现有消息，避免消息累加
            dispatch(clearSessionMessages(sessionId));
            
            // 使用原始API获取所有会话消息
            response = await getSessionMessagesUsingGet({ sessionId: selectedSession.backendSessionId });
          } else {
            // 增量更新：获取最新的消息时间戳
            const latestMessage = [...sessionMessages].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )[0];
            
            let lastTimestamp = null;
            if (latestMessage && latestMessage.timestamp) {
              lastTimestamp = new Date(latestMessage.timestamp).toISOString();
              console.log(`从后端增量加载会话消息. 会话ID: ${sessionId}, 最新消息时间: ${lastTimestamp}`);
              
              // 使用新API获取指定时间戳后的消息
              response = await getSessionMessagesByTimeStampUsingGet({ 
                sessionId: selectedSession.backendSessionId,
                timeStamp: lastTimestamp
              });
            } else {
              // 如果无法获取最新时间戳，默认使用原始API
              console.log(`无法获取最新消息时间戳，使用原始API加载全部消息`);
              response = await getSessionMessagesUsingGet({ sessionId: selectedSession.backendSessionId });
            }
          }
          
          // 添加日志输出，查看响应内容
          console.log('从后端获取的消息数据:', response);
          
          // API函数返回的是 SessionMessages[] 类型
          // 不是 BaseResponse 类型，所以直接使用 response.data
          const messages = response && response.data ? response.data : [];
          
          console.log('处理后的消息数组:', messages);
          
          // 清除需要刷新的标记
          localStorage.removeItem(`session_${sessionId}_needsRefresh`);
          
          // 更新会话加载时间
          const updatedTimes = {
            ...sessionLoadTimes,
            [sessionId]: Date.now()
          };
          setSessionLoadTimes(updatedTimes);
          
          // 将更新后的时间保存到 localStorage
          localStorage.setItem('sessionLoadTimes', JSON.stringify(updatedTimes));
          
          if (messages && messages.length > 0) {
            // 获取已存在的消息ID，用于去重
            const existingIds = new Set<string>();
            sessionMessages.forEach(msg => existingIds.add(msg.id));
            
            const processedMessages: Message[] = [];
            
            // 先将所有消息转换为前端格式，然后一次性添加
            messages.forEach((msg, index) => {
              // 生成唯一的消息ID
              // 优先使用tempId，如果没有则使用索引和时间戳生成唯一ID
              const messageId = msg.tempId || `backend-${selectedSession.backendSessionId}-${index}-${Date.now()}`;
              
              // 避免添加重复消息
              if (!existingIds.has(messageId)) {
                const message: Message = {
                  id: messageId,
                  content: msg.rawContent || msg.content || '',
                  role: msg.role as 'user' | 'assistant',
                  timestamp: msg.createTime || new Date().toISOString(),
                  // 保留后端返回的重要字段
                  sessionId: msg.sessionId ? Number(msg.sessionId) : selectedSession.backendSessionId || sessionId,
                  tempId: msg.tempId,
                  rawContent: msg.rawContent || msg.content || ''
                };
                
                processedMessages.push(message);
              }
            });
            
            // 按时间排序消息
            processedMessages.sort((a, b) => {
              const timeA = new Date(a.timestamp).getTime();
              const timeB = new Date(b.timestamp).getTime();
              return timeA - timeB;
            });
            
            // 一次性添加所有消息
            processedMessages.forEach(message => {
              if (message.role === 'user') {
                dispatch(addUserMessage({ sessionId, message }));
              } else {
                dispatch(addAssistantMessage({ sessionId, message }));
              }
            });
            
            console.log('已添加消息数量:', processedMessages.length);
            
            // 更新会话的最后消息
            if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              const messageContent = lastMsg.rawContent || lastMsg.content || '';
              dispatch(updateSession({
                ...selectedSession,
                lastMessage: messageContent.substring(0, 30) + (messageContent.length > 30 ? '...' : '')
              }));
            }
          }
          
          // 更新会话消息加载时间
          setSessionLoadTimes(prev => ({
            ...prev,
            [sessionId]: Date.now()
          }));
          
          // 关闭加载状态
          dispatch(setMessageLoading(false));
        } else {
          console.log(`使用缓存的会话消息. 会话ID: ${sessionId}, 消息数: ${sessionMessages.length}`);
        }
      } catch (error) {
        console.error('加载会话消息失败:', error);
        message.error('无法加载历史消息');
        dispatch(setMessageLoading(false));
      }
    }
    
    // 只在移动端自动隐藏侧边栏
    if (isMobile) {
      setCollapsed(true);
    }
  };

  // 发送消息到服务器
  const handleSendMessage = async (content: string, options?: {
    fileIds?: string[];
    enableDeepThought?: boolean;
    enableInternet?: boolean;
    useKnowledge?: boolean;
  }) => {
    if (!content.trim() && (!options?.fileIds || options.fileIds.length === 0)) return;
    
    // 流处理在useStreamMessage钩子中已处理
    
    // 创建并添加用户消息
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      fileIds: options?.fileIds || [],
      sessionId: activeSessionId || 0  // 在创建时就添加会话ID
    };

    // 获取当前会话信息
    const currentSession = sessionData.find(s => s.id === activeSessionId);
    
    // 添加用户消息到对话中
    dispatch(addUserMessage({ sessionId: activeSessionId || 0, message: userMessage }));
    dispatch(setMessageLoading(true));
    
    try {
      // 步骤1: 确保有一个有效的后端会话ID
      let backendSessionId: number;
      
      // 如果当前会话没有关联的后端会话ID，先创建一个新会话
      if (!currentSession?.backendSessionId) {
        console.log('需要创建新的后端会话');
        
        // 使用Swagger生成的API函数创建新会话
        const response = await createSessionUsingPost({ sessionName: "PaperPuppy" });
        
        if (!response || !response.data || response.data.code !== 0 || !response.data.data || !response.data.data.id) {
          console.error('创建会话失败或返回了无效的会话ID:', response);
          message.error('创建会话失败：无法获取有效的会话ID');
          dispatch(setMessageLoading(false));
          return;
        }
        
        // 保存新的后端会话ID
        backendSessionId = response.data.data.id;
        console.log('成功创建了新后端会话:', backendSessionId, typeof backendSessionId);
        
        // 获取现有的前端ID，或使用当前前端ID
        const frontendId = activeSessionId || Date.now();
        
        // 获取会话信息，检查是否有theme
        let sessionName = "PaperPuppy";
        
        // 如果有返回的会话信息，先检查是否有theme
        if (response.data.data.theme) {
          sessionName = response.data.data.theme;
        }
        
        // 更新会话信息
        const updatedSession: ChatSession = {
          id: frontendId, // 保持前端ID不变
          name: currentSession?.name || sessionName, // 优先使用theme，如果没有则使用默认值
          backendSessionId: backendSessionId, // 保存后端ID用于后续API调用
          lastMessage: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
          timestamp: '刚刚',
          group: '今天'
        };
        
        // 如果会话不存在，创建新会话
        if (!currentSession) {
          dispatch(addSession(updatedSession));
          dispatch(createEmptySession(frontendId));
        } else {
          // 更新现有会话
          dispatch(updateSession(updatedSession));
        }
        
        // 更新会话ID映射
        let sessionIdMap = new Map();
        try {
          const mappingStr = localStorage.getItem('sessionIdMap');
          if (mappingStr) {
            sessionIdMap = new Map(JSON.parse(mappingStr));
          }
        } catch (e) {
          console.error('解析会话ID映射失败:', e);
        }
        
        sessionIdMap.set(String(backendSessionId), frontendId);
        localStorage.setItem('sessionIdMap', JSON.stringify(Array.from(sessionIdMap.entries())));
      } else {
        // 对于已有会话，使用缓存的后端会话ID
        backendSessionId = currentSession.backendSessionId;
        console.log('使用已有后端会话ID:', backendSessionId, typeof backendSessionId);
      }
      
      // 步骤2: 发送消息到后端
      await sendMessageToSession(backendSessionId, content, options);
      
    } catch (error) {
      console.error('发送消息过程中出错:', error);
      message.error('发送消息失败');
      dispatch(setMessageLoading(false));
    }
  };
  
  // 发送消息到指定会话并处理响应
  const sendMessageToSession = async (
    sessionId: number, // 这是后端会话ID
    content: string, 
    options?: {
      fileIds?: string[];
      enableDeepThought?: boolean;
      enableInternet?: boolean;
      useKnowledge?: boolean;
    }
  ) => {
    try {
      console.log('开始向会话ID发送消息:', sessionId);
      console.log('消息内容:', content);
      
      // 创建FormData对象
      const formData = new FormData();
      
      // 添加消息内容
      formData.append('message', content);
      
      // 添加选项参数
      if (options?.enableDeepThought) {
        formData.append('enableDeepThought', 'true');
      }
      
      if (options?.enableInternet) {
        formData.append('enableInternet', 'true');
      }
      
      if (options?.useKnowledge) {
        formData.append('useKnowledge', 'true');
      }
      
      // 添加文件ID
      if (options?.fileIds && options.fileIds.length > 0) {
        options.fileIds.forEach(fileId => {
          formData.append('fileIds', fileId);
        });
      }
      
      // 设置流式响应的URL，使用统一的baseURL
      // 注意：使用与request.ts中相同的baseURL配置
      const baseURL = 'http://192.168.50.140/api';
      // 路径已从'/api/xx'修改为'/xx'以避免重复前缀
      const sseUrl = `${baseURL}/sessions/${sessionId}/sendRPC`;
      console.log('准备发送POST请求，使用后端ID:', sessionId, '前端ID:', activeSessionId, 'URL:', sseUrl);
      
      // 将后端ID保存到局部变量，确保在回调中可用
      const currentBackendSessionId = sessionId;
      
      // 使用新的流处理钩子处理请求
      await processStream(sseUrl, formData, {
        sessionId: activeSessionId || 0,
        onError: (error) => {
          console.error('流处理错误:', error);
          message.error('发送消息失败: ' + error.message);
        },
        onComplete: async (content) => {
          // 流式消息完成后更新会话加载时间
          if (activeSessionId) {
            setSessionLoadTimes(prev => ({
              ...prev,
              [activeSessionId]: Date.now()
            }));
            
            // 获取当前会话信息
            const currentSession = sessionData.find(s => s.id === activeSessionId);
            
            // 只在会话标题为默认值"PaperPuppy"或者未设置时才获取会话信息
            if (currentSession && (currentSession.name === "PaperPuppy" || !currentSession.name)) {
              try {
                // 使用局部保存的后端ID，确保即使是新创建的会话也能正确获取信息
                // 如果当前会话有后端ID，优先使用，否则使用局部保存的ID
                const backendSessionId = currentSession.backendSessionId || currentBackendSessionId;
                console.log('消息流处理完成，获取会话信息，使用后端ID:', backendSessionId, '前端ID:', activeSessionId);
                
                if (!backendSessionId) {
                  console.error('无法获取会话信息：后端ID不存在');
                  return;
                }
                
                const sessionResponse = await getSessionByIdUsingGet({ sessionId: backendSessionId });
                
                if (sessionResponse && sessionResponse.data && sessionResponse.data.code === 0 && sessionResponse.data.data) {
                  const sessionInfo = sessionResponse.data.data;
                  console.log('获取到会话信息:', sessionInfo);
                  
                  // 如果有theme，更新会话标题
                  if (sessionInfo.theme) {
                    console.log('使用theme更新会话标题:', sessionInfo.theme);
                    
                    // 更新会话标题
                    const updatedSession = {
                      ...currentSession,
                      name: sessionInfo.theme // 使用theme作为会话标题
                    };
                    
                    dispatch(updateSession(updatedSession));
                  }
                }
              } catch (error) {
                console.error('获取会话信息失败:', error);
              }
            } else {
              console.log('会话标题已经设置，不需要获取会话信息');
            }
          }
        }
      });
      
    } catch (error) {
      console.error('发送消息到会话失败:', error);
      message.error('发送消息失败');
      dispatch(setMessageLoading(false));
    }
  };

  // 清除当前会话的消息
  const clearCurrentSessionMessages = () => {
    dispatch(clearSessionMessages(currentSessionId));
    message.success('已清空当前会话');
  };

  // 处理退出登录
  const handleLogout = async () => {
    try {
      // 使用Swagger生成的API函数退出登录
      const response = await userLogoutUsingPost();
      const success = response && response.data && response.data.code === 0;
      
      if (success) {
        // 清除会话加载标志
        localStorage.removeItem('hasLoadedSessionsFromBackend');
        
        // 清除其他数据
        localStorage.removeItem('userToken');
        localStorage.removeItem('chatSessions');
        localStorage.removeItem('activeSessionId');
        
        // 刷新页面，强制重新加载应用
        window.location.href = '/login';
      } else {
        message.error('登出失败，请重试');
      }
    } catch (error) {
      console.error('登出过程中出错:', error);
      message.error('登出失败，请重试');
    }
  };

  // 当前会话的消息 - 确保会话消息的隔离
  const currentMessages = currentSessionId ? (allMessages[currentSessionId] || []) : [];
  
  // 检测窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 576;
      setIsMobile(mobile);
      
      // 只在移动端自动隐藏侧边栏
      if (mobile) {
        setCollapsed(true);
      }
    };
    
    // 初始化时检查窗口大小
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 获取当前会话的名称
  const getCurrentSessionName = () => {
    const currentSession = sessionData.find(s => s.id === currentSessionId);
    return currentSession?.name || '新建会话';
  };

  // 处理文件预览
  const handlePreviewFile = (fileId: string) => {
    setPreviewFileId(fileId);
    setPreviewModalVisible(true);
  };
  
  // 关闭文件预览模态框
  const handleClosePreview = () => {
    setPreviewModalVisible(false);
    setPreviewFileId(null);
  };

  // 渲染文件预览内容
  const renderPreviewContent = () => {
    if (!previewFileId) return null;
    
    const file = fileManager.getFile(previewFileId);
    if (!file) return null;

    if (file.type === 'image' && file.previewUrl) {
      return (
        <div className="file-preview-image-container">
          <img 
            src={file.previewUrl} 
            alt={file.name} 
            style={{ maxWidth: '100%', maxHeight: '70vh' }} 
          />
        </div>
      );
    } else if (file.type === 'pdf' && file.url) {
      return (
        <div className="file-preview-pdf-container">
          <iframe
            src={`${file.url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH&zoom=page-fit&pagemode=thumbs`}
            className="pdf-viewer"
            title={file.name}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      );
    } else {
      return (
        <div className="file-preview-info">
          <div className="file-preview-icon">
            {file.type === 'pdf' ? (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#ff4d4f" stroke="#ff4d4f" strokeWidth="1" opacity="0.2" />
                <path d="M14 2V8H20" fill="#ff4d4f" stroke="#ff4d4f" strokeWidth="1" opacity="0.5" />
                <text x="12" y="16" textAnchor="middle" fontSize="6" fill="#ff4d4f">PDF</text>
              </svg>
            ) : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#e6e6e6" stroke="#666" strokeWidth="1"/>
                <path d="M14 2V8H20" fill="#e6e6e6" stroke="#666" strokeWidth="1"/>
                <path d="M16 13H8V15H16V13Z" fill="#666"/>
                <path d="M16 17H8V19H16V17Z" fill="#666"/>
                <path d="M10 9H8V11H10V9Z" fill="#666"/>
              </svg>
            )}
          </div>
          <p className="file-preview-name">{file.name}</p>
          <p className="file-preview-size">{FileManager.formatFileSize(file.size)}</p>
          {file.url && (
            <Button 
              type="primary" 
              onClick={() => window.open(file.url, '_blank')}
            >
              在新窗口打开
            </Button>
          )}
        </div>
      );
    }
  };

  // 创建一个新会话
  const handleCreateNewSession = () => {
    // 检查当前会话是否为空（新会话）
    const currentSession = sessionData.find(s => s.id === currentSessionId);
    
    const isEmptyCurrentSession = 
      currentMessages.length === 0 && 
      currentSession?.name === "PaperPuppy";
    
    if (isEmptyCurrentSession) {
      // 直接使用antd的message组件显示提示
      message.info('您已处于新的会话中', 2); // 显示2秒
      return;
    }
    
    const newSessionId = Date.now();
    const newSession: ChatSession = {
      id: newSessionId,
      name: "PaperPuppy",
      lastMessage: '新建会话',
      timestamp: '刚刚',
      group: '今天'
      // 注意：不设置backendSessionId，表示这是一个前端创建但未经后端确认的会话
    };
    
    dispatch(addSession(newSession));
    dispatch(createEmptySession(newSessionId));
    dispatch(setActiveSessionId(newSessionId));
    message.success('已创建新会话');
  };

  return (
    <Layout className="chat-page">
      <Sider 
        className="sidebar" 
        width={250} 
        collapsible 
        collapsed={collapsed}
        trigger={null}
        collapsedWidth={0}
      >
        <Sidebar 
          onSelectSession={handleSelectSession} 
          onLogout={handleLogout}
          onToggleSidebar={() => setCollapsed(!collapsed)}
          onClearSession={clearCurrentSessionMessages}
          currentSessionId={currentSessionId}
        />
      </Sider>
      
      <Layout className={`content-layout ${!collapsed ? 'with-sidebar' : ''}`}>
        {/* 侧边栏收缩后显示展开按钮和新建会话按钮 */}
        {collapsed && (
          <div className="collapsed-sidebar-buttons">
            <Button 
              className="sidebar-collapse-button" 
              type="text" 
              icon={<MenuUnfoldOutlined />} 
              onClick={toggleSidebar}
            />
            <Button 
              className="sidebar-collapse-button" 
              type="text" 
              icon={<PlusOutlined />} 
              onClick={handleCreateNewSession}
            />
          </div>
        )}
        
        <Content className="chat-content">
          <div className="chat-container">
            <div className="chat-messages-container">
              <ChatMessages 
                messages={currentMessages} 
                loading={loading}
                sessionId={currentSessionId}
                sessionName={getCurrentSessionName()}
                onPreviewFile={handlePreviewFile}
                streamContent={streamedContent}
                onCancelGeneration={cancelGeneration}
              />
            </div>
            <div className="chat-input-wrapper">
              <ChatInput onSendMessage={handleSendMessage} loading={loading} />
            </div>
          </div>
        </Content>
      </Layout>

      <Modal
        title={fileManager.getFile(previewFileId || '')?.name}
        open={previewModalVisible}
        onCancel={handleClosePreview}
        footer={null}
        width={previewFileId && fileManager.getFile(previewFileId)?.type === 'pdf' ? 980 : 700}
        className="file-preview-modal"
        destroyOnClose
      >
        {renderPreviewContent()}
      </Modal>
    </Layout>
  );
};

export default ChatPage; 