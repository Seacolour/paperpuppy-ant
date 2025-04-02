import React, { useState, useEffect, useRef } from 'react';
import { Layout, message, Button, Avatar, Typography, Dropdown, Menu, Modal } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, UserOutlined, SettingOutlined, QuestionCircleOutlined, LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { UserAPI } from '../utils/api-helper';
import FileManager from '../utils/FileManager';
import '../styles/ChatPage.css';
import { useDispatch } from 'react-redux';
import { 
  addSession, 
  setActiveSessionId,
  updateSession,
  ChatSession 
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
import { sendMessageRpcUsingPost } from '../api/sessionController';
import { v4 as uuidv4 } from 'uuid';
import { SessionAPI } from '../utils/api-helper';
import FilePreviewModal from './FilePreviewModal';

const { Sider, Content } = Layout;
const { Text } = Typography;

// 本地存储键名
const MESSAGES_STORAGE_KEY = 'paperpuppy_messages';

// 模拟聊天消息数据
const initialMessages: Record<number, Message[]> = {
  1: [
    {
      id: '1',
      content: '你好，我正在研究深度学习在自然语言处理中的应用，能否帮我解释一下Transformer模型的核心机制？',
      role: 'user',
      timestamp: new Date(2023, 2, 20, 14, 30).toISOString()
    },
    {
      id: '2',
      content: `Transformer模型的核心机制主要包括以下几个部分：

1. **自注意力机制（Self-Attention）**：允许模型关注输入序列中的不同位置，从而捕捉长距离依赖关系。

2. **多头注意力（Multi-Head Attention）**：将注意力机制分成多个"头"，每个头可以关注不同的信息模式。

3. **位置编码（Positional Encoding）**：由于Transformer不像RNN那样天然处理序列，位置编码被添加到输入嵌入中以提供位置信息。

4. **前馈神经网络（Feed-Forward Neural Network）**：在每个Transformer层中，自注意力后面是一个前馈网络。

5. **残差连接和层归一化（Residual Connections and Layer Normalization）**：帮助训练更深的网络并保持梯度流动。

Transformer的结构使其特别适合并行化，因为它不需要像RNN那样按顺序处理输入。这使得它在训练大型模型时非常高效。

你对Transformer的哪个方面特别感兴趣？我可以更详细地解释。`,
      role: 'assistant',
      timestamp: new Date(2023, 2, 20, 14, 31).toISOString()
    }
  ],
  2: [
    {
      id: '3',
      content: '我需要改进我的研究方法部分，你有什么建议吗？',
      role: 'user',
      timestamp: new Date(2023, 2, 21, 9, 15).toISOString()
    },
    {
      id: '4',
      content: `改进研究方法部分的几点建议：

1. **明确研究问题和假设**：确保研究问题清晰具体，假设可测试。
  
2. **方法学选择合理性**：解释为什么选择这种方法，它如何适合你的研究问题。
  
3. **详细描述步骤**：提供足够详细的信息，使其他研究者能够复制你的工作。
  
4. **样本选择和规模**：说明样本如何选择，大小如何确定，以及任何纳入/排除标准。
  
5. **数据收集工具**：详细描述使用的工具、问卷或设备，包括其有效性和可靠性。
  
6. **控制变量**：解释如何控制潜在的干扰变量。
  
7. **数据分析方法**：清楚说明使用的统计方法或分析技术，以及为什么选择它们。
  
8. **伦理考虑**：讨论任何伦理问题以及如何解决它们。
  
9. **局限性认识**：坦率承认方法的局限性，表明你对研究有全面认识。
  
10. **前期研究或预试验**：如果进行了预试验，包括结果和随后的方法调整。

需要针对你的具体研究领域或方法提供更具体的建议吗？`,
      role: 'assistant',
      timestamp: new Date(2023, 2, 21, 9, 17).toISOString()
    }
  ],
  3: [],
  4: []
};

const ChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { activeSessionId } = useAppSelector((state) => state.sessions);
  const { messages: allMessages, loading } = useAppSelector((state) => state.messages);
  const sessionData = useAppSelector(state => state.sessions.sessions);
  
  const [collapsed, setCollapsed] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const [streamedContent, setStreamedContent] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  // 获取文件管理器实例
  const fileManager = FileManager.getInstance();

  // 确保有一个默认会话ID
  const currentSessionId = activeSessionId || 1;

  // 初始化消息
  useEffect(() => {
    // 如果Redux store中没有消息，从初始数据加载
    if (Object.keys(allMessages).length === 0) {
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
  }, [dispatch, allMessages]);

  // 处理侧边栏切换
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // 处理会话选择
  const handleSelectSession = (sessionId: number) => {
    dispatch(setActiveSessionId(sessionId));
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
    
    // 关闭之前可能存在的EventSource连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // 在发送新消息前先重置流内容
    setStreamedContent('');

    // 创建并添加用户消息
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      fileIds: options?.fileIds || []
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
        
        // 创建新会话
        const response = await SessionAPI.createSession("PaperPuppy");
        
        if (!response || !response.id || isNaN(response.id)) {
          console.error('创建会话失败或返回了无效的会话ID:', response);
          message.error('创建会话失败：无法获取有效的会话ID');
          dispatch(setMessageLoading(false));
          return;
        }
        
        // 保存新的后端会话ID
        backendSessionId = response.id;
        console.log('成功创建了新后端会话:', backendSessionId, typeof backendSessionId);
        
        // 更新会话信息
        const updatedSession: ChatSession = {
          id: activeSessionId || 0, // 保持前端ID不变
          name: currentSession?.name || "PaperPuppy",
          backendSessionId: backendSessionId, // 保存后端ID用于后续API调用
          lastMessage: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
          timestamp: '刚刚',
          group: '今天'
        };
        
        // 如果会话不存在，创建新会话
        if (!currentSession) {
          dispatch(addSession(updatedSession));
          dispatch(createEmptySession(activeSessionId || 0));
        } else {
          // 更新现有会话
          dispatch(updateSession(updatedSession));
        }
      } else {
        // 对于已有会话，使用缓存的后端会话ID
        backendSessionId = currentSession.backendSessionId;
        console.log('使用已有后端会话ID:', backendSessionId, typeof backendSessionId);
      }
      
      // 步骤2: 发送消息到后端
      await sendMessageToSession(backendSessionId, content, userMessage, options);
      
    } catch (error) {
      console.error('发送消息过程中出错:', error);
      message.error('发送消息失败');
      dispatch(setMessageLoading(false));
    }
  };
  
  // 发送消息到指定会话并处理响应
  const sendMessageToSession = async (
    sessionId: number, 
    content: string, 
    userMessage: Message,
    options?: {
      fileIds?: string[];
      enableDeepThought?: boolean;
      enableInternet?: boolean;
      useKnowledge?: boolean;
    }
  ) => {
    try {
      console.log('开始向会话ID发送消息:', sessionId);
      
      // 重置流内容
      setStreamedContent('');
      
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
      
      // 设置流式响应的URL
      const sseUrl = `http://localhost:8101/api/sessions/${sessionId}/sendRPC`;
      console.log('准备发送POST请求，URL:', sseUrl);
      
      // 发送POST请求并直接处理响应流
      const fetchResponse = await fetch(sseUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
        }
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`HTTP错误: ${fetchResponse.status}`);
      }
      
      console.log('POST请求成功，状态:', fetchResponse.status);
      
      // 获取响应的可读流
      const reader = fetchResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('无法读取响应流');
      }
      
      console.log('开始读取响应流...');
      
      let streamContent = '';
      
      // 添加防抖处理，避免过于频繁的状态更新
      const debounceDelay = 150; // 设置一个合理的延迟时间，单位毫秒
      const updateStreamContent = (() => {
        let timeoutId: NodeJS.Timeout | null = null;
        
        return (content: string) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          timeoutId = setTimeout(() => {
            setStreamedContent(content);
            timeoutId = null;
          }, debounceDelay);
        };
      })();
      
      while (true) {
        const { done, value } = await reader.read();
        
        // 如果流结束
        if (done) {
          console.log('读取流结束');
          break;
        }
        
        const text = decoder.decode(value, { stream: true });
        let hasNewContent = false;
        let newContentToAdd = '';
        
        // 检查是否返回了错误信息
        if (text.includes('error') || text.includes('Error')) {
          console.error('服务器返回错误:', text);
          throw new Error('API返回错误: ' + text);
        }
        
        // 按行处理返回的数据
        const lines = text.split('\n');
        
        // 累积新内容
        for (const line of lines) {
          if (line.startsWith('data:')) {
            // 提取data:后面的内容
            let data = line.substring(5).trim();
            
            // 如果数据以单引号开头和结尾，去掉单引号
            if (data.startsWith("'") && data.endsWith("'")) {
              data = data.substring(1, data.length - 1);
            }
            
            // 只处理非空数据并且不是事件标记
            if (data && !data.includes('event:close') && !data.includes('Connection closed')) {
              // 只有在数据非空时才添加
              if (data.trim()) {
                newContentToAdd += data;
                hasNewContent = true;
              }
            }
          }
        }
        
        // 只有在有新内容时才更新状态，减少不必要的渲染
        if (hasNewContent) {
          streamContent += newContentToAdd;
          updateStreamContent(streamContent);
        }
      }
      
      console.log('流式传输完成，最终内容长度:', streamContent.length);
      
      // 创建助手消息对象
      const assistantMessage: Message = {
        id: uuidv4(),
        content: streamContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      
      // 添加到会话
      dispatch(addAssistantMessage({ 
        sessionId: activeSessionId || 0, 
        message: assistantMessage
      }));
      
      // 更新加载状态
      dispatch(setMessageLoading(false));
      
      // 清理读取器
      reader.releaseLock();
      
      // 延迟清空流内容，确保视图已完全更新
      setTimeout(() => {
        setStreamedContent('');
      }, 500);
      
    } catch (error) {
      console.error('发送消息到会话失败:', error);
      message.error('发送消息失败');
      dispatch(setMessageLoading(false));
    }
  };

  // 清理函数，确保组件卸载时关闭EventSource连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // 清除当前会话的消息
  const clearCurrentSessionMessages = () => {
    dispatch(clearSessionMessages(currentSessionId));
    message.success('已清空当前会话');
  };

  // 处理退出登录
  const handleLogout = async () => {
    try {
      // 调用登出API
      await UserAPI.logout();
      // 移除可能存在的token
      localStorage.removeItem('userToken');
      sessionStorage.removeItem('userInfo');
      message.success('已退出登录');
      // 使用replace方式跳转到登录页
      window.location.replace('/login');
    } catch (error) {
      console.error('登出失败:', error);
      message.error('登出失败，请稍后重试');
    }
  };

  // 用户菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        个人设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  // 当前会话的消息
  const currentMessages = allMessages[currentSessionId] || [];
  
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

  // 关闭预览模态框
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