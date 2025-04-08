import React, { useRef, useEffect, useState, memo, useMemo } from 'react';
import { Typography, Avatar, Spin, Empty, Button, Tooltip, Space, Tag, Divider } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, LikeOutlined, DislikeOutlined, MessageOutlined, SendOutlined, ThunderboltOutlined, MoreOutlined, PictureOutlined, QuestionCircleOutlined, FilePdfOutlined, FileOutlined, StopOutlined } from '@ant-design/icons';
import FileManager, { FileEntity } from '../utils/FileManager';
import '../styles/ChatMessages.css';
import { Message } from '../types/message';
import { useAppSelector } from '../store';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import MarkdownIt from 'markdown-it';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'katex/dist/katex.min.css';

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

// 代码块组件
const CodeBlock = memo(({ language, value }: { language: string, value: string }) => {
  return (
    <SyntaxHighlighter
      language={language || 'text'}
      style={vscDarkPlus}
      wrapLongLines={true}
      customStyle={{ margin: '1em 0' }}
    >
      {value}
    </SyntaxHighlighter>
  );
});

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

// 检测内容是否包含复杂的数学公式
const containsComplexMath = (content: string): boolean => {
  // 检测块级公式 \[...\] 和 $$..$$ 样式
  const blockMathRegex = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g;
  
  // 检测行内公式 \(..\) 和 $..$
  const inlineMathRegex = /(\\\([\s\S]*?\\\)|\$(?!\$)[\s\S]*?(?<!\$)\$)/g;
  
  // 检测特殊环境和复杂结构
  const complexEnvironmentRegex = /(\\begin\{(?:equation|align|matrix|bmatrix|pmatrix|vmatrix|array)[\s\S]*?\\end\{(?:equation|align|matrix|bmatrix|pmatrix|vmatrix|array)\})/g;
  
  // 特别检测是否包含 \zeta, \sum 等复杂数学符号
  const complexSymbolsRegex = /(\\zeta|\\sum|\\int|\\prod|\\frac|\\sqrt|\\Delta|\\nabla|\\partial)/g;
  
  // 检测是否存在多层嵌套的环境
  const nestedEnvironments = content.match(complexEnvironmentRegex);
  
  // 测试所有正则表达式
  const hasBlockMath = blockMathRegex.test(content);
  const hasComplexEnvironments = complexEnvironmentRegex.test(content); 
  const hasNestedEnvironments = nestedEnvironments !== null && nestedEnvironments.length > 0;
  const hasMultipleInlineMath = (content.match(inlineMathRegex) || []).length > 3;
  const hasComplexSymbols = complexSymbolsRegex.test(content);
  
  // 如果内容包含这些复杂结构，使用MathRenderer
  return hasBlockMath || 
         hasComplexEnvironments ||
         hasNestedEnvironments ||
         hasMultipleInlineMath ||
         hasComplexSymbols;
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

// 创建一个专门处理复杂公式的组件
const MathRenderer = memo(({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    try {
      // 使用正则表达式查找所有LaTeX公式
      // 先处理内容，将LaTeX公式替换为占位符
      const placeholders: {id: string, type: 'block' | 'inline', content: string, isCodeBlock?: boolean}[] = [];
      let processedContent = content;
      
      // 处理 latex 代码块
      processedContent = processedContent.replace(/```latex\s+([\s\S]*?)```/g, (match: string, p1: string) => {
        // 为代码块中的每个公式创建占位符
        let processedBlock = p1;
        
        // 先处理代码块中的 $$..$$ 格式块级公式
        processedBlock = processedBlock.replace(/\$\$([\s\S]*?)\$\$/g, (match: string, formula: string) => {
          const id = `math-placeholder-${placeholders.length}`;
          placeholders.push({id, type: 'block', content: formula, isCodeBlock: true});
          return `<div id="${id}"></div>`;
        });
        
        // 如果没有处理任何公式，则整个代码块作为一个公式处理
        if (processedBlock === p1) {
          const id = `math-placeholder-${placeholders.length}`;
          placeholders.push({id, type: 'block', content: p1.trim(), isCodeBlock: true});
          return `<div id="${id}"></div>`;
        }
        
        return processedBlock;
      });
      
      // 处理 \[...\] 格式的块级公式
      processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, (match, p1) => {
        const id = `math-placeholder-${placeholders.length}`;
        placeholders.push({id, type: 'block', content: p1});
        return `<div id="${id}"></div>`;
      });
      
      // 处理 $$..$$ 格式的块级公式
      processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, p1) => {
        const id = `math-placeholder-${placeholders.length}`;
        placeholders.push({id, type: 'block', content: p1});
        return `<div id="${id}"></div>`;
      });
      
      // 处理 \(..\) 格式的行内公式
      processedContent = processedContent.replace(/\\\(([\s\S]*?)\\\)/g, (match, p1) => {
        const id = `math-placeholder-${placeholders.length}`;
        placeholders.push({id, type: 'inline', content: p1});
        return `<span id="${id}"></span>`;
      });
      
      // 处理 $..$  格式的行内公式
      processedContent = processedContent.replace(/\$((?!\$)[\s\S]*?)\$/g, (match, p1) => {
        if (p1.includes('$')) return match; // 跳过嵌套的 $
        const id = `math-placeholder-${placeholders.length}`;
        placeholders.push({id, type: 'inline', content: p1});
        return `<span id="${id}"></span>`;
      });
      
      // 渲染Markdown内容（但保留我们的占位符）
      const md = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true
      });
      
      // 确保正确处理换行
      processedContent = processedContent.replace(/\n/g, '  \n');
      const htmlContent = md.render(processedContent);
      
      // 设置初始HTML
      containerRef.current.innerHTML = htmlContent;
      
      // 然后替换所有公式占位符
      placeholders.forEach(({id, type, content, isCodeBlock}) => {
        const placeholder = containerRef.current?.querySelector(`#${id}`);
        if (placeholder) {
          try {
            // 渲染公式
            const html = katex.renderToString(content, {
              displayMode: type === 'block', 
              throwOnError: false,
              trust: true,
              strict: false
            });
            
            // 创建新元素
            const katexElement = document.createElement('div');
            katexElement.className = type === 'block' ? 'katex-display' : 'katex-inline';
            if (isCodeBlock) {
              katexElement.classList.add('from-codeblock');
            }
            katexElement.innerHTML = html;
            
            // 替换占位符
            placeholder.replaceWith(katexElement);
          } catch (err) {
            console.error(`公式渲染错误 (${type}):`, err);
            // 如果是代码块且渲染失败，尝试用pre code显示原始内容
            if (isCodeBlock) {
              const preElement = document.createElement('pre');
              const codeElement = document.createElement('code');
              codeElement.className = 'language-latex';
              codeElement.textContent = content;
              preElement.appendChild(codeElement);
              placeholder.replaceWith(preElement);
            } else {
              placeholder.textContent = type === 'block' ? 
                (content.startsWith('\\[') ? `\\[${content}\\]` : `$$${content}$$`) : 
                (content.startsWith('\\(') ? `\\(${content}\\)` : `$${content}$`);
            }
          }
        }
      });
      
      // 对代码块应用语法高亮
      const codeBlocks = containerRef.current.querySelectorAll('pre code');
      if (codeBlocks.length > 0) {
        codeBlocks.forEach(block => {
          try {
            // 获取语言类型
            const className = block.className || '';
            const lang = className.replace(/language-/, '');
            
            // 添加类名以便Prism识别
            if (!className && lang) {
              block.classList.add(`language-${lang}`);
            }
            
            // 使用Prism高亮
            Prism.highlightElement(block);
          } catch (err) {
            console.error('代码高亮错误:', err);
          }
        });
      }
      
    } catch (err) {
      console.error('渲染错误:', err);
      if (containerRef.current) {
        containerRef.current.textContent = content;
      }
    }
  }, [content]);
  
  return <div className="math-renderer markdown-content" ref={containerRef} />;
});

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
  // 如果是最后一条助手消息且有流式内容，则使用流式内容渲染
  const isLastAssistantMessage = isLastMessage && message.role === 'assistant';
  
  // 根据不同情况选择要渲染的内容
  let contentToRender;
  
  // 流式加载时展示流内容
  if (isLastAssistantMessage && loading && streamContent && streamContent.length > 0) {
    contentToRender = streamContent;
  } else {
    // 非加载状态或流内容为空时，使用消息的原始内容
    contentToRender = message.content || '';
  }

  // 确保内容不为空，避免渲染空内容
  if (!contentToRender) {
    contentToRender = "内容加载中...";
  }

  // 使用useMemo检查内容是否包含复杂公式，避免每次渲染都重新计算
  const hasComplexMath = useMemo(() => {
    return containsComplexMath(contentToRender);
  }, [contentToRender]);

  return (
    <div className="assistant-content">
      <div className="assistant-text">
        {hasComplexMath ? (
          // 对于复杂公式，使用MathRenderer
          <MathRenderer content={contentToRender} />
        ) : (
          // 对于普通内容，使用ReactMarkdown
          <div className="markdown-content">
            {useMemo(() => (
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[[rehypeKatex, { 
                  strict: false,
                  throwOnError: false,
                  trust: true
                }]]}
                key={`markdown-${message.id}-${loading ? 'loading' : 'complete'}`}
                components={{
                code({node, inline, className, children, ...props}: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline ? (
                    <div className="code-wrapper">
                      <CodeBlock
                        language={match ? match[1] : 'text'}
                        value={String(children).replace(/\n$/, '')}
                      />
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({children, ...props}: any) => <div className="markdown-paragraph" {...props}>{children}</div>
              }}
            >
              {contentToRender}
            </ReactMarkdown>
            ), [contentToRender, message.id, loading])}
            {isLastAssistantMessage && loading && <TypingCursor />}
          </div>
        )}
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
                const isLastMessage = index === messages.length - 1;
                
                return (
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
                          isLastMessage={isLastMessage}
                          loading={loading}
                          streamContent={streamContent}
                          onCopy={copyToClipboard}
                          copiedId={copiedId}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* 处理流式消息 - 用于在用户发送消息后但还没有AI回复时 */}
              {loading && streamContent && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="message assistant-message typing-message">
                  <div className="assistant-content">
                    <div className="assistant-text">
                      {containsComplexMath(streamContent) ? (
                        // 对于复杂公式，使用MathRenderer
                        <MathRenderer content={streamContent} />
                      ) : (
                        // 对于普通内容，使用ReactMarkdown
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[[rehypeKatex, { 
                              strict: false,
                              throwOnError: false,
                              trust: true
                            }]]}
                            components={{
                              code({node, inline, className, children, ...props}: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline ? (
                                  <div className="code-wrapper">
                                    <CodeBlock
                                      language={match ? match[1] : 'text'}
                                      value={String(children).replace(/\n$/, '')}
                                    />
                                  </div>
                                ) : (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              p: ({children, ...props}: any) => <div className="markdown-paragraph" {...props}>{children}</div>
                            }}
                          >
                            {streamContent}
                          </ReactMarkdown>
                          <TypingCursor />
                        </div>
                      )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatMessages; 