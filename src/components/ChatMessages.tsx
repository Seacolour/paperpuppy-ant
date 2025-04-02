import React, { useRef, useEffect, useState } from 'react';
import { Typography, Avatar, Spin, Empty, Button, Tooltip, Space, Tag, Divider } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, LikeOutlined, DislikeOutlined, MessageOutlined, SendOutlined, ThunderboltOutlined, MoreOutlined, PictureOutlined, QuestionCircleOutlined, FilePdfOutlined, FileOutlined } from '@ant-design/icons';
import FileManager, { FileEntity } from '../utils/FileManager';
import '../styles/ChatMessages.css';
import { Message } from '../types/message';
import { useAppSelector } from '../store';

const { Text, Paragraph, Title } = Typography;

interface ChatMessagesProps {
  messages: Message[];
  loading?: boolean;
  sessionId?: number;
  onSendMessage?: (content: string) => void;
  sessionName?: string;
  onPreviewFile?: (fileId: string) => void;
  streamContent?: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  loading = false,
  sessionId,
  onSendMessage,
  sessionName,
  onPreviewFile,
  streamContent = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // 获取文件管理器实例
  const fileManager = FileManager.getInstance();

  // 滚动到最新消息
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // 当消息列表变化或加载状态变化时，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // 确保在消息内容渲染后也能滚动到底部
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, streamContent]);

  // 检测滚动状态，决定是否显示顶部边界
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const scrollTop = messagesContainerRef.current.scrollTop;
        setIsScrolled(scrollTop > 10);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // 初始检查
      handleScroll();
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => {
        setCopiedId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  // 复制消息内容
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestion: string) => {
    if (onSendMessage) {
      onSendMessage(suggestion);
    }
  };
  
  // 处理文件预览
  const handleFilePreview = (fileId: string) => {
    if (onPreviewFile) {
      onPreviewFile(fileId);
    }
  };

  // 提取并渲染文件附件
  const renderFileAttachments = (message: Message) => {
    if (!message.fileIds || message.fileIds.length === 0) return null;
    
    return (
      <div className="message-files-container">
        {message.fileIds.map(fileId => {
          const file = fileManager.getFile(fileId);
          if (!file) return null;
          
          // 确定文件类型的图标和样式
          const getFileIconClass = () => {
            switch (file.type) {
              case 'pdf':
                return 'message-file-pdf';
              case 'image':
                return 'message-file-image';
              default:
                return '';
            }
          };
          
          return (
            <div key={fileId} className="message-file-item" onClick={() => handleFilePreview(fileId)}>
              {file.type === 'image' && file.previewUrl ? (
                <div className={`message-file-icon ${getFileIconClass()}`}>
                  <img src={file.previewUrl} alt={file.name} />
                </div>
              ) : (
                <div className={`message-file-icon ${getFileIconClass()}`}>
                  {file.type === 'pdf' ? (
                    <FilePdfOutlined />
                  ) : (
                    <FileOutlined />
                  )}
                </div>
              )}
              <div className="message-file-info">
                <div className="message-file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="message-file-size">{FileManager.formatFileSize(file.size)}</div>
              </div>
            </div>
          );
        }).filter(Boolean)}
      </div>
    );
  };

  // 解析消息内容中的文件引用
  const parseMessageContent = (content: string) => {
    // 匹配文件引用的正则表达式，例如: [PDF文件: file.pdf, 1.5MB, fileId:12345]
    const fileRegex = /\[(图片|PDF文件|文件): ([^,]+), ([^,]+), fileId:([^\]]+)\]/g;
    
    if (fileRegex.test(content)) {
      // 替换掉文件引用，因为会单独渲染
      return content.replace(fileRegex, '').trim();
    }
    
    return content;
  };

  // 从消息内容中提取文件ID
  const extractFileIdsFromContent = (content: string): string[] => {
    const fileIds: string[] = [];
    const fileRegex = /\[(图片|PDF文件|文件): ([^,]+), ([^,]+), fileId:([^\]]+)\]/g;
    
    let match;
    while ((match = fileRegex.exec(content)) !== null) {
      const fileId = match[4];
      if (fileId && !fileIds.includes(fileId)) {
        fileIds.push(fileId);
      }
    }
    
    return fileIds;
  };

  // 渲染消息功能按钮
  const renderMessageActions = (message: Message) => {
    if (message.role === 'assistant') {
      return (
        <div className="message-actions assistant-actions">
          <Tooltip title={copiedId === message.id ? "已复制" : "复制"}>
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              size="small" 
              onClick={() => copyToClipboard(message.content, message.id)}
              className={copiedId === message.id ? "copied" : ""}
            />
          </Tooltip>
          <Tooltip title="有帮助">
            <Button 
              type="text" 
              icon={<LikeOutlined />} 
              size="small" 
            />
          </Tooltip>
          <Tooltip title="没帮助">
            <Button 
              type="text" 
              icon={<DislikeOutlined />} 
              size="small" 
            />
          </Tooltip>
          <Tooltip title="更多操作">
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              size="small" 
            />
          </Tooltip>
        </div>
      );
    } else {
      // 用户消息的按钮
      return null; // 在消息体内部直接渲染，此处返回null
    }
  };

  // 渲染加载状态
  const renderLoading = () => (
    <div className="message assistant-message typing-message">
      <div className="assistant-content">
        <div className="typing-animation">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      </div>
    </div>
  );

  // 渲染助手消息时结合流式内容
  const renderAssistantMessage = (message: Message, index: number) => {
    // 如果是最后一条助手消息且有流式内容，则使用流式内容渲染
    const isLastAssistantMessage = 
      index === messages.length - 1 && 
      message.role === 'assistant';
    
    // 根据不同情况选择要渲染的内容
    let contentToRender;
    
    // 流式加载时展示流内容
    if (isLastAssistantMessage && loading && streamContent && streamContent.length > 0) {
      contentToRender = streamContent;
    } else {
      // 非加载状态或流内容为空时，使用消息的原始内容
      // 确保消息内容不为空
      contentToRender = message.content || '';
    }

    // 确保内容不为空，避免渲染空内容
    if (!contentToRender) {
      console.warn("警告: 消息内容为空，使用占位内容");
      contentToRender = "内容加载中...";
    }

    return (
      <div className="assistant-content">
        <div className="assistant-text">
          {/* 普通文本显示，不使用Markdown */}
          <div className="text-content">
            {contentToRender.split('\n').map((line, i) => (
              <div key={i} className="text-line">{line || ' '}</div>
            ))}
          </div>
        </div>
        <div className="bubble-footer">
          <Tooltip title={copiedId === message.id ? "已复制" : "复制"}>
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              size="small" 
              onClick={() => copyToClipboard(message.content, message.id)}
              className={copiedId === message.id ? "copied" : ""}
            />
          </Tooltip>
          <Tooltip title="有帮助">
            <Button 
              type="text" 
              icon={<LikeOutlined />} 
              size="small" 
            />
          </Tooltip>
          <Tooltip title="没帮助">
            <Button 
              type="text" 
              icon={<DislikeOutlined />} 
              size="small" 
            />
          </Tooltip>
          <Tooltip title="更多操作">
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              size="small" 
            />
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className={`session-name-container ${isScrolled ? 'scrolled' : ''}`}>
        <Title level={4} className="session-name">{sessionName || '新的对话'}</Title>
      </div>
      <div className="messages-container" ref={messagesContainerRef}>
        <div className="chat-messages">
          {messages.length === 0 && !loading ? (
            <div className="chat-messages-empty">
              <div className="empty-icon">
                <MessageOutlined />
              </div>
              <Empty
                description={
                  <Text type="secondary">
                    开始新的对话
                  </Text>
                }
              />
              <div className="suggestion-cards">
                <div className="suggestion-card" onClick={() => handleSuggestionClick("简要介绍一下Transformer模型的核心机制")}>
                  <ThunderboltOutlined />
                  <div className="card-content">
                    <Text strong>Transformer模型</Text>
                    <Text type="secondary">介绍Transformer模型的核心机制</Text>
                  </div>
                </div>
                
                <div className="suggestion-card" onClick={() => handleSuggestionClick("如何有效改进我的研究方法部分？")}>
                  <QuestionCircleOutlined />
                  <div className="card-content">
                    <Text strong>研究方法改进</Text>
                    <Text type="secondary">获取研究方法部分的改进建议</Text>
                  </div>
                </div>
                
                <div className="suggestion-card" onClick={() => handleSuggestionClick("帮我生成一个研究数据分析计划")}>
                  <PictureOutlined />
                  <div className="card-content">
                    <Text strong>数据分析计划</Text>
                    <Text type="secondary">创建研究数据分析计划</Text>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                // 提取文件ID
                let messageFileIds = message.fileIds || [];
                const parsedContent = parseMessageContent(message.content);
                
                // 如果消息内容包含文件引用但没有fileIds属性，则提取文件ID
                if (!message.fileIds && message.role === 'user' && 
                    (message.content.includes('[图片:') || 
                     message.content.includes('[PDF文件:') || 
                     message.content.includes('[文件:'))) {
                  messageFileIds = extractFileIdsFromContent(message.content);
                }
                
                const hasFiles = messageFileIds.length > 0;
                const showContent = parsedContent.trim() !== '';
                
                return (
                  <div 
                    key={message.id} 
                    className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                    style={{ backgroundColor: 'white' }}
                  >
                    {/* 用户消息的文件在上方 */}
                    {hasFiles && message.role === 'user' && (
                      renderFileAttachments({...message, fileIds: messageFileIds})
                    )}
                    
                    {/* 只有当有内容时才显示消息气泡 */}
                    {(showContent || message.role === 'assistant') && (
                      <div className={`message-content ${message.role === 'assistant' ? 'assistant-content' : 'user-content'}`}>
                        {/* 用户消息内容 */}
                        {message.role === 'user' ? (
                          <>
                            <div className="message-bubble">
                              <div className="bubble-content">
                                <div className="user-text">{parsedContent}</div>
                              </div>
                            </div>
                            <div className="bubble-footer">
                              <Tooltip title={copiedId === message.id ? "已复制" : "复制"}>
                                <Button 
                                  type="text" 
                                  icon={<CopyOutlined />} 
                                  size="small" 
                                  onClick={() => copyToClipboard(message.content, message.id)}
                                  className={copiedId === message.id ? "copied" : ""}
                                />
                              </Tooltip>
                            </div>
                          </>
                        ) : (
                          <>
                            {renderAssistantMessage(message, index)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* 处理流式消息 */}
              {loading && streamContent && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="message assistant-message typing-message">
                  <div className="assistant-content">
                    <div className="assistant-text">
                      <div className="text-content">
                        {streamContent.split('\n').map((line, i) => (
                          <div key={i} className="text-line">{line || ' '}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {loading && !streamContent && (
                <div className="message assistant-message typing-message">
                  <div className="assistant-content">
                    <div className="typing-animation">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="messages-end-anchor" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessages; 