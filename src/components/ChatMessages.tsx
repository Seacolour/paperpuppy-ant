import React, { useRef, useEffect, useState, memo, useMemo } from 'react';
import { Typography, Avatar, Spin, Empty, Button, Tooltip, Space, Tag, Divider } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, LikeOutlined, DislikeOutlined, MessageOutlined, SendOutlined, ThunderboltOutlined, MoreOutlined, PictureOutlined, QuestionCircleOutlined, FilePdfOutlined, FileOutlined, StopOutlined, CheckOutlined } from '@ant-design/icons';
import FileManager, { FileEntity } from '../utils/FileManager';
import '../styles/ChatMessages.css';
import { Message } from '../types/message';
import { useAppSelector } from '../store';
import MarkdownRenderer from './MarkdownRenderer';

// 导入工具函数
import { 
  parseMessageContent, 
  extractFileIdsFromContent 
} from '../utils/markdownUtils';

const { Text, Paragraph, Title } = Typography;

interface ChatMessagesProps {
  messages: Message[];
  loading?: boolean;
  sessionId?: number;
  onSendMessage?: (content: string) => void;
  sessionName?: string;
  onPreviewFile?: (fileId: string) => void;
  streamContent?: string;
  onCancelGeneration?: () => void;
}

// 打字光标组件
const TypingCursor = memo(() => (
  <span className="typing-cursor"/>
));

// 提取并渲染文件附件
const renderFileAttachments = (message: Message, onPreviewFile?: (fileId: string) => void, fileManager?: FileManager) => {
  if (!message.fileIds || message.fileIds.length === 0) return null;
  const fm = fileManager || FileManager.getInstance();
  
  return (
    <div className="message-files-container">
      {message.fileIds.map(fileId => {
        const file = fm.getFile(fileId);
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
        
        const handlePreview = () => {
          if (onPreviewFile) {
            onPreviewFile(fileId);
          }
        };
        
        return (
          <div key={fileId} className="message-file-item" onClick={handlePreview}>
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

// 用户消息组件
const UserMessage = memo(({ message, onCopy, copiedId, onPreviewFile }: { 
  message: Message, 
  onCopy: (text: string, id: string) => void, 
  copiedId: string | null,
  onPreviewFile?: (fileId: string) => void
}) => {
  const fileManager = FileManager.getInstance();
  const parsedContent = parseMessageContent(message.content);
  const messageFileIds = message.fileIds || extractFileIdsFromContent(message.content);
  const hasFiles = messageFileIds.length > 0;

  return (
    <>
      {hasFiles && renderFileAttachments(message, onPreviewFile, fileManager)}
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
            onClick={() => onCopy(message.content, message.id)}
            className={copiedId === message.id ? "copied" : ""}
          />
        </Tooltip>
      </div>
    </>
  );
});

// 稍后将实现新的Markdown渲染器

// 使用新的统一 Markdown 渲染器



// 助手消息组件
const AssistantMessage = memo(({ 
  message, 
  index, 
  isLastMessage, 
  loading, 
  streamContent, 
  onCopy, 
  copiedId 
}: { 
  message: Message, 
  index: number, 
  isLastMessage: boolean, 
  loading: boolean, 
  streamContent: string, 
  onCopy: (text: string, id: string) => void, 
  copiedId: string | null 
}) => {
  const contentRef = useRef<string>(message.content || '');
  
  // 消息是否为流处理消息
  const isStreamMessage = Boolean(message.fromStream || message.streamId);
  
  // 消息是否正在流处理中
  const isActiveStream = message.isDraft === true || (isLastMessage && loading && message.role === 'assistant');
  
  // 选择要渲染的内容
  let contentToRender = message.content || '';
  
  // 流式处理期间，可能需要特殊处理内容
  if (isLastMessage && loading && message.role === 'assistant' && streamContent) {
    // 如果是最后一条消息且正在加载，优先使用流内容
    contentToRender = streamContent;
    contentRef.current = streamContent;
  } else if (isStreamMessage) {
    // 对于流式消息，使用稳定的ref内容
    if (message.content !== contentRef.current && message.content) {
      contentRef.current = message.content;
    }
    contentToRender = contentRef.current;
  }

  // 确保内容不为空
  if (!contentToRender) {
    contentToRender = "内容加载中...";
  }
  
  // 计算消息类名
  const messageClasses = useMemo(() => {
    const classes = [];
    
    if (isActiveStream) {
      classes.push('streaming');
    }
    
    if (message.streamComplete) {
      classes.push('stream-complete');
    }
    
    if (message.animate) {
      classes.push('animate');
    }
    
    return classes.join(' ');
  }, [isActiveStream, message.streamComplete, message.animate]);

  return (
    <div className={messageClasses}>
      <div className="assistant-text">
        <MarkdownRenderer 
          content={contentToRender} 
          isActiveStream={isActiveStream} 
        />
      </div>
        
      {/* 消息底部操作区域 */}
      <div className="message-footer">
        <Tooltip title={copiedId === message.id ? "已复制" : "复制"}>
          <Button
            type="text"
            icon={copiedId === message.id ? <CheckOutlined /> : <CopyOutlined />}
            size="small"
            onClick={() => onCopy(contentToRender, message.id)}
            className={copiedId === message.id ? "copied footer-button" : "footer-button"}
          >
            {copiedId === message.id ? '已复制' : '复制'}
          </Button>
        </Tooltip>
        
        <Space>
          <Tooltip title="有帮助">
            <Button
              type="text"
              icon={<LikeOutlined />}
              size="small"
              className="footer-button"
            />
          </Tooltip>
          <Tooltip title="没帮助">
            <Button
              type="text"
              icon={<DislikeOutlined />}
              size="small"
              className="footer-button"
            />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
});

// 主组件使用memo进行优化
const ChatMessages: React.FC<ChatMessagesProps> = memo(({ 
  messages, 
  loading = false,
  sessionId,
  onSendMessage,
  sessionName,
  onPreviewFile,
  streamContent = '',
  onCancelGeneration
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // 添加自定义样式以确保平滑过渡
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .message {
        transition: all 0.3s ease-in-out;
      }
      
      .message-content {
        transition: opacity 0.3s ease-in-out;
      }
      
      /* 确保流式消息和正常消息之间平滑过渡 */
      .assistant-message .markdown-content, 
      .typing-message .markdown-content {
        transition: opacity 0.3s ease-in-out;
      }
      
      /* 防止布局突变 */
      .assistant-text {
        min-height: 24px;
        transition: min-height 0.3s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
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

  return (
    <div className="chat-container">
      <div className={`session-name-container ${isScrolled ? 'scrolled' : ''}`}>
        <Title level={4} className="session-name">{sessionName || '新的对话'}</Title>
        
        {/* 添加取消生成按钮 */}
        {loading && onCancelGeneration && (
          <Button
            danger
            icon={<StopOutlined />}
            size="small"
            onClick={onCancelGeneration}
            className="cancel-generation-btn"
          >
            停止生成
          </Button>
        )}
      </div>
      <div className="messages-container" ref={messagesContainerRef}>
        <div className="chat-messages">
          {messages.length === 0 ? (
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
            </div>
          ) : (
            <>
              <div className="messages-list">
                {messages.map((message, index) => (
                  <div 
                    key={message.id} 
                    className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                  >
                    <div className={`message-content ${message.role === 'assistant' ? 'assistant-content' : 'user-content'}`}>
                      {message.role === 'user' ? (
                        <UserMessage 
                          message={message} 
                          onCopy={copyToClipboard} 
                          copiedId={copiedId}
                          onPreviewFile={onPreviewFile}
                        />
                      ) : (
                        <AssistantMessage
                          message={message}
                          index={index}
                          isLastMessage={index === messages.length - 1}
                          loading={loading}
                          streamContent={streamContent}
                          onCopy={copyToClipboard}
                          copiedId={copiedId}
                        />
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 流式输入的临时消息 */}
                {loading && streamContent && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="message assistant-message typing-message">
                    <div className="assistant-content">
                      <div className="assistant-text">
                        <MarkdownRenderer 
                          content={streamContent}
                          isActiveStream={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 纯加载动画 - 没有流内容时 */}
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatMessages; 