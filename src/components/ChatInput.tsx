import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Tooltip, Dropdown, Menu, message as antdMessage, Upload, Space, Tag, Modal } from 'antd';
import { 
  SendOutlined, 
  PaperClipOutlined, 
  GlobalOutlined, 
  DatabaseOutlined,
  BulbOutlined,
  PictureOutlined,
  UploadOutlined,
  InboxOutlined,
  FileOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import FileManager, { FileEntity } from '../utils/FileManager';
import '../styles/ChatInput.css';

const { TextArea } = Input;

interface ChatInputProps {
  onSendMessage: (content: string, options?: { 
    enableInternet?: boolean;
    useKnowledge?: boolean;
    enableDeepThought?: boolean;
    fileIds?: string[];  // 添加文件ID数组
  }) => void;
  loading?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  onFilePreview?: (fileId: string) => void;
}

// 本地存储键名
const SENT_FILES_IDS_KEY = 'paperpuppy_sent_file_ids';

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage,
  loading = false,
  inputRef,
  onFilePreview
}) => {
  const [message, setMessage] = useState('');
  const [enableInternet, setEnableInternet] = useState(false);
  const [useKnowledge, setUseKnowledge] = useState(false);
  const [enableDeepThought, setEnableDeepThought] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [sentFileIds, setSentFileIds] = useState<string[]>([]);
  const [showSentFiles, setShowSentFiles] = useState(false);
  const [atBottom, setAtBottom] = useState(true);  // 新增：是否在底部的状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  
  // 引用DOM元素
  const textAreaRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // 获取文件管理器实例
  const fileManager = FileManager.getInstance();
  
  // 自动聚焦输入框
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  // 从本地存储加载已发送的文件ID
  useEffect(() => {
    const loadSentFileIds = () => {
      const storedIds = localStorage.getItem(SENT_FILES_IDS_KEY);
      if (storedIds) {
        try {
          const parsedIds = JSON.parse(storedIds) as string[];
          setSentFileIds(parsedIds);
        } catch (e) {
          console.error('Failed to parse sent file IDs from localStorage', e);
        }
      }
    };
    
    loadSentFileIds();
  }, []);

  // 添加粘贴文件处理
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || !textAreaRef.current) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handlePastedFile(file);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // 处理粘贴的文件
  const handlePastedFile = async (file: File) => {
    try {
      const fileEntity = await fileManager.addFile(file);
      setUploadedFileIds(prev => [...prev, fileEntity.id]);
      antdMessage.success(`已添加 ${fileEntity.name}，大小：${FileManager.formatFileSize(fileEntity.size)}`);
    } catch (error) {
      antdMessage.error('无法处理粘贴的文件');
      console.error('Error handling pasted file:', error);
    }
  };

  // 处理互斥的功能开关
  const toggleInternet = () => {
    setEnableInternet(!enableInternet);
    if (!enableInternet && enableDeepThought) {
      // 如果要启用联网搜索且深度思考已开启，则关闭深度思考
      setEnableDeepThought(false);
    }
  };

  const toggleDeepThought = () => {
    setEnableDeepThought(!enableDeepThought);
    if (!enableDeepThought && enableInternet) {
      // 如果要启用联网搜索且联网搜索已开启，则关闭联网搜索
      setEnableInternet(false);
    }
  };

  // 保存已发送的文件ID到本地存储
  const saveFileIdsToStorage = (fileIds: string[]) => {
    try {
      // 限制存储的文件数量，避免超出存储限制
      const limitedIds = fileIds.slice(0, 20);
      localStorage.setItem(SENT_FILES_IDS_KEY, JSON.stringify(limitedIds));
    } catch (e) {
      console.error('Failed to save file IDs to localStorage', e);
    }
  };

  // 处理消息发送
  const handleSendMessage = () => {
    if ((message.trim() || uploadedFileIds.length > 0) && !loading) {
      let finalMessage = message;
      
      // 如果有上传的文件，将文件信息附加到消息中
      if (uploadedFileIds.length > 0) {
        const fileTexts = uploadedFileIds.map(fileId => {
          const file = fileManager.getFile(fileId);
          if (!file) return '';
          return fileManager.getFileMessageText(fileId);
        }).filter(text => text !== '');
        
        const attachmentText = fileTexts.join('\n');
        finalMessage = finalMessage.trim() 
          ? `${finalMessage}\n\n${attachmentText}`
          : attachmentText;
        
        // 更新已发送文件ID列表
        setSentFileIds(prevIds => {
          const newSentIds = [...uploadedFileIds, ...prevIds];
          // 限制存储的文件数量
          const limitedIds = newSentIds.slice(0, 20);
          saveFileIdsToStorage(limitedIds);
          return limitedIds;
        });
      }
      
      onSendMessage(finalMessage, {
        enableInternet,
        useKnowledge,
        enableDeepThought,
        fileIds: uploadedFileIds
      });
      
      setMessage('');
      setUploadedFileIds([]);
      setShowUploadPanel(false);
    }
  };

  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter键发送消息，Shift+Enter换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const fileEntity = await fileManager.addFile(file);
        setUploadedFileIds(prev => [...prev, fileEntity.id]);
        antdMessage.success(`已添加 ${fileEntity.name}，大小：${FileManager.formatFileSize(fileEntity.size)}`);
      } catch (error) {
        antdMessage.error('上传文件失败');
        console.error('Error uploading file:', error);
      }
      
      // 清空文件输入，以便可以选择相同的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证是否为图片
      if (!file.type.startsWith('image/')) {
        antdMessage.error('请选择图片文件');
        return;
      }

      // 最大文件大小限制（5MB）
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        antdMessage.error('图片大小不能超过5MB');
        return;
      }

      try {
        const fileEntity = await fileManager.addFile(file);
        setUploadedFileIds(prev => [...prev, fileEntity.id]);
        antdMessage.success(`已添加 ${fileEntity.name}，大小：${FileManager.formatFileSize(fileEntity.size)}`);
      } catch (error) {
        antdMessage.error('上传图片失败');
        console.error('Error uploading image:', error);
      }
      
      // 清空文件输入，以便可以选择相同的文件
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // 删除上传的文件
  const handleRemoveFile = (fileId: string) => {
    setUploadedFileIds(prev => prev.filter(id => id !== fileId));
  };

  // 移除已发送的文件
  const handleRemoveSentFile = (fileId: string) => {
    setSentFileIds(prev => {
      const newIds = prev.filter(id => id !== fileId);
      saveFileIdsToStorage(newIds);
      return newIds;
    });
  };

  // 预览文件
  const handlePreviewFile = (fileId: string) => {
    setPreviewFileId(fileId);
    setPreviewVisible(true);
  };

  // 将已发送的文件添加到当前上传列表
  const handleReuploadFile = (fileId: string) => {
    // 检查是否已添加相同文件
    if (uploadedFileIds.includes(fileId)) {
      antdMessage.warning('此文件已在上传列表中');
      return;
    }
    
    setUploadedFileIds(prev => [...prev, fileId]);
    antdMessage.success('文件已添加到上传列表');
    setSentFileIds(prev => {
      // 将文件ID移到列表前面
      const newIds = [
        fileId,
        ...prev.filter(id => id !== fileId)
      ];
      saveFileIdsToStorage(newIds);
      return newIds;
    });
  };

  // 选择上传文件
  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  // 选择上传图片
  const handleUploadImage = () => {
    imageInputRef.current?.click();
  };

  // 处理拖拽上传
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handlePastedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 关闭预览
  const handleClosePreview = () => {
    setPreviewVisible(false);
  };

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    if (fileType === 'image') {
      return <PictureOutlined />;
    } else if (fileType === 'pdf') {
      return <FilePdfOutlined />;
    } else {
      return <FileOutlined />;
    }
  };

  // 上传菜单
  const uploadMenu = (
    <Menu>
      <Menu.Item key="image" icon={<PictureOutlined />} onClick={handleUploadImage}>
        上传图片
      </Menu.Item>
      <Menu.Item key="file" icon={<PaperClipOutlined />} onClick={handleUploadFile}>
        上传文件
      </Menu.Item>
      <Menu.Item key="panel" icon={<InboxOutlined />} onClick={() => setShowUploadPanel(!showUploadPanel)}>
        上传面板
      </Menu.Item>
      {sentFileIds.length > 0 && [
        <Menu.Divider key="divider" />,
        <Menu.ItemGroup key="recent" title="最近发送">
          {sentFileIds.slice(0, 5).map(fileId => {
            const file = fileManager.getFile(fileId);
            if (!file) return null;
            return (
              <Menu.Item 
                key={fileId} 
                icon={getFileIcon(file.type)}
                onClick={() => handleReuploadFile(fileId)}
              >
                {file.name.length > 15 ? `${file.name.slice(0, 12)}...` : file.name}
              </Menu.Item>
            );
          }).filter(Boolean)}
          {sentFileIds.length > 5 && (
            <Menu.Item 
              key="more" 
              onClick={() => setShowUploadPanel(true)}
            >
              查看更多...
            </Menu.Item>
          )}
        </Menu.ItemGroup>
      ]}
    </Menu>
  );

  // 渲染已上传文件预览
  const renderUploadedFiles = () => {
    if (uploadedFileIds.length === 0) return null;
    
    return (
      <div className="uploaded-files-container">
        <div className="uploaded-files-header">
          <div className="uploaded-files-title">已上传 ({uploadedFileIds.length})</div>
        </div>
        <div className="uploaded-files-list">
          {uploadedFileIds.map(fileId => {
            const file = fileManager.getFile(fileId);
            if (!file) return null;
            
            return (
              <div key={fileId} className="uploaded-file-item">
                {file.type === 'image' && file.previewUrl ? (
                  <div 
                    className="uploaded-file-preview" 
                    onClick={() => handlePreviewFile(fileId)}
                  >
                    <img src={file.previewUrl} alt={file.name} />
                  </div>
                ) : file.type === 'pdf' ? (
                  <div 
                    className="uploaded-file-icon uploaded-file-pdf"
                    onClick={() => handlePreviewFile(fileId)}
                  >
                    <FilePdfOutlined />
                  </div>
                ) : (
                  <div 
                    className="uploaded-file-icon"
                    onClick={() => file.url && window.open(file.url, '_blank')}
                  >
                    <FileOutlined />
                  </div>
                )}
                <div className="uploaded-file-info">
                  <div className="uploaded-file-name" title={file.name}>
                    {file.name.length > 18 ? `${file.name.slice(0, 15)}...` : file.name}
                  </div>
                  <div className="uploaded-file-size">{FileManager.formatFileSize(file.size)}</div>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  className="uploaded-file-remove"
                  onClick={() => handleRemoveFile(fileId)}
                />
              </div>
            );
          }).filter(Boolean)}
        </div>
      </div>
    );
  };

  // 渲染已发送文件列表
  const renderSentFiles = () => {
    if (sentFileIds.length === 0) return null;
    
    return (
      <div className="sent-files-section">
        <div className="sent-files-header">
          <div className="sent-files-title">最近发送的文件</div>
        </div>
        <div className="sent-files-list">
          {sentFileIds.map(fileId => {
            const file = fileManager.getFile(fileId);
            if (!file) return null;
            
            return (
              <div key={fileId} className="sent-file-item">
                {file.type === 'image' && file.previewUrl ? (
                  <div className="sent-file-preview" onClick={() => handlePreviewFile(fileId)}>
                    <img src={file.previewUrl} alt={file.name} />
                  </div>
                ) : file.type === 'pdf' ? (
                  <div className="sent-file-icon sent-file-pdf" onClick={() => handlePreviewFile(fileId)}>
                    <FilePdfOutlined />
                  </div>
                ) : (
                  <div className="sent-file-icon" onClick={() => handlePreviewFile(fileId)}>
                    <FileOutlined />
                  </div>
                )}
                <div className="sent-file-info">
                  <div className="sent-file-name" title={file.name}>
                    {file.name.length > 18 ? `${file.name.slice(0, 15)}...` : file.name}
                  </div>
                  <div className="sent-file-size">{FileManager.formatFileSize(file.size)}</div>
                </div>
                <div className="sent-file-actions">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    className="sent-file-action"
                    onClick={() => handlePreviewFile(fileId)}
                    title="预览"
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<UploadOutlined />}
                    className="sent-file-action"
                    onClick={() => handleReuploadFile(fileId)}
                    title="再次发送"
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    className="sent-file-action"
                    onClick={() => handleRemoveSentFile(fileId)}
                    title="从历史中删除"
                  />
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>
      </div>
    );
  };

  // 上传面板
  const renderUploadPanel = () => {
    if (!showUploadPanel) return null;
    
    return (
      <div className="upload-panel">
        <div className="upload-panel-header">
          <div className="upload-panel-title">上传文件</div>
          <Button 
            type="text" 
            size="small" 
            onClick={() => setShowUploadPanel(false)}
            className="upload-panel-close"
          >
            关闭
          </Button>
        </div>
        <div 
          className="upload-dragger"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleUploadFile}
        >
          <div className="upload-dragger-icon">
            <InboxOutlined />
          </div>
          <div className="upload-dragger-text">
            <p className="upload-dragger-hint">点击或拖拽文件到此区域上传</p>
            <p className="upload-dragger-tip">支持单个文件上传，最大50MB</p>
          </div>
        </div>
        
        {renderSentFiles()}
        
        <div className="upload-panel-tips">
          <p>也可以<span className="text-link" onClick={() => document.execCommand('paste')}>直接粘贴</span>文件或图片到输入框</p>
        </div>
      </div>
    );
  };

  // 渲染文件预览内容
  const renderPreviewContent = () => {
    if (!previewFileId) return null;
    
    const file = fileManager.getFile(previewFileId);
    if (!file) return null;

    if (file.type === 'image' && file.previewUrl) {
      return (
        <div className="file-preview-image-container">
          <img src={file.previewUrl} alt={file.name} />
        </div>
      );
    } else if (file.type === 'pdf' && file.url) {
      return (
        <div className="file-preview-pdf-container">
          <iframe 
            src={`${file.url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH&zoom=page-fit&pagemode=thumbs`} 
            title={file.name}
            width="100%"
            height="100%"
            className="pdf-viewer"
            allowFullScreen
          />
        </div>
      );
    } else {
      return (
        <div className="file-preview-info">
          <div className="file-preview-icon">
            {file.type === 'pdf' ? <FilePdfOutlined /> : <FileOutlined />}
          </div>
          <p className="file-preview-name">{file.name}</p>
          <p className="file-preview-size">{FileManager.formatFileSize(file.size)}</p>
          {file.url && (
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              onClick={() => window.open(file.url, '_blank')}
            >
              在新窗口打开
            </Button>
          )}
        </div>
      );
    }
  };

  // 监听滚动事件，检测是否在底部
  useEffect(() => {
    const checkIfScrolledToBottom = () => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        // 如果滚动到距离底部20px以内，认为是在底部
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
        setAtBottom(isAtBottom);
      }
    };
    
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', checkIfScrolledToBottom);
      // 初始检查
      checkIfScrolledToBottom();
      
      return () => {
        messagesContainer.removeEventListener('scroll', checkIfScrolledToBottom);
      };
    }
  }, []);

  return (
    <div className={`chat-input-container ${atBottom ? 'at-bottom' : ''}`}>
      {/* 隐藏的文件输入 */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload} 
      />
      {/* 隐藏的图片输入 */}
      <input 
        type="file" 
        ref={imageInputRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleImageUpload} 
      />
      
      <div className="input-wrapper">
        {renderUploadPanel()}
        <div className="input-area" onDrop={handleDrop} onDragOver={handleDragOver}>
          {renderUploadedFiles()}
          <TextArea
            ref={textAreaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您想问的问题..."
            autoSize={{ minRows: 1, maxRows: 6 }}
            disabled={loading}
            className="chat-textarea"
          />
          
          <div className="input-actions">
            <div className="action-left">
              <div className="feature-toggles">
                <div 
                  className={`feature-toggle ${enableInternet ? 'active' : ''}`} 
                  onClick={toggleInternet}
                >
                  <GlobalOutlined className="feature-icon" />
                  <span className="feature-text">联网搜索</span>
                </div>
                <div 
                  className={`feature-toggle ${useKnowledge ? 'active' : ''}`} 
                  onClick={() => setUseKnowledge(!useKnowledge)}
                >
                  <DatabaseOutlined className="feature-icon" />
                  <span className="feature-text">知识库</span>
                </div>
                <div 
                  className={`feature-toggle ${enableDeepThought ? 'active' : ''}`} 
                  onClick={toggleDeepThought}
                >
                  <BulbOutlined className="feature-icon" />
                  <span className="feature-text">深度思考</span>
                </div>
              </div>
            </div>
            
            <div className="action-right">
              <Dropdown overlay={uploadMenu} placement="topRight" trigger={['click']}>
                <Button
                  icon={<UploadOutlined />}
                  type="text"
                  className={`action-button upload-button ${uploadedFileIds.length > 0 ? 'has-uploads' : ''} ${sentFileIds.length > 0 ? 'has-history' : ''}`}
                  disabled={loading}
                  aria-label="上传文件或图片"
                />
              </Dropdown>
              
              <Tooltip title="发送消息">
                <Button
                  icon={<SendOutlined />}
                  type="primary"
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && uploadedFileIds.length === 0) || loading}
                  className="send-button"
                />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* 文件预览模态框 */}
      <Modal
        open={previewVisible}
        title={fileManager.getFile(previewFileId || '')?.name}
        footer={null}
        onCancel={handleClosePreview}
        className="file-preview-modal"
        width={previewFileId && fileManager.getFile(previewFileId)?.type === 'pdf' ? 980 : 700}
        centered
        destroyOnClose
      >
        {renderPreviewContent()}
      </Modal>
    </div>
  );
};

export default ChatInput; 