import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin, Typography, Space } from 'antd';
import { DownloadOutlined, ExpandOutlined, CloseOutlined } from '@ant-design/icons';
import FileManager from '../utils/FileManager';
import '../styles/FilePreviewModal.css';

const { Text, Title } = Typography;

interface FilePreviewModalProps {
  fileId: string | null;
  visible: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ fileId, visible, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [fileData, setFileData] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  
  const fileManager = FileManager.getInstance();

  useEffect(() => {
    if (fileId && visible) {
      setLoading(true);
      
      // 获取文件数据
      const file = fileManager.getFile(fileId);
      if (file) {
        setFileData(file);
        
        // 根据文件类型创建适当的预览URL
        if (file.type.startsWith('image/')) {
          // 图片文件
          setPreviewUrl(file.url);
        } else if (file.type === 'pdf') {
          // PDF文件 
          setPreviewUrl(file.url);
        } else {
          // 其他类型文件，没有内置预览
          setPreviewUrl(null);
        }
      } else {
        setFileData(null);
        setPreviewUrl(null);
      }
      
      setLoading(false);
    } else {
      // 清理预览状态
      setFileData(null);
      setPreviewUrl(null);
    }
  }, [fileId, visible]);

  // 处理文件下载
  const handleDownload = () => {
    if (fileData && fileData.url) {
      const a = document.createElement('a');
      a.href = fileData.url;
      a.download = fileData.name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 切换全屏预览
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // 渲染文件预览内容
  const renderPreviewContent = () => {
    if (loading) {
      return <div className="preview-loading"><Spin size="large" /></div>;
    }
    
    if (!fileData) {
      return <div className="preview-error">无法加载文件</div>;
    }
    
    if (fileData.type.startsWith('image/')) {
      // 图片预览
      return (
        <div className="preview-image-container">
          <img src={previewUrl || ''} alt={fileData.name} className="preview-image" />
        </div>
      );
    } else if (fileData.type === 'application/pdf') {
      // PDF预览
      return (
        <div className={`file-preview-pdf-container ${fullscreen ? 'fullscreen' : ''}`}>
          <iframe 
            src={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1`} 
            className="pdf-viewer" 
            title="PDF预览"
          ></iframe>
        </div>
      );
    } else {
      // 不支持预览的文件类型
      return (
        <div className="preview-unsupported">
          <Text>此文件类型不支持直接预览</Text>
          <Button 
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
          >
            下载文件
          </Button>
        </div>
      );
    }
  };

  return (
    <Modal
      title={
        <div className="preview-modal-header">
          <Title level={5}>{fileData?.name || '文件预览'}</Title>
          <Space>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleDownload}
              disabled={!fileData}
            />
            <Button 
              icon={<ExpandOutlined />} 
              onClick={toggleFullscreen}
              disabled={!fileData || !(fileData.type === 'application/pdf')}
            />
          </Space>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={fullscreen ? '100%' : 800}
      style={{ top: fullscreen ? 0 : 20 }}
      className={`file-preview-modal ${fullscreen ? 'fullscreen-modal' : ''}`}
      closable={true}
      maskClosable={!fullscreen}
      closeIcon={<CloseOutlined />}
    >
      <div className="preview-content">
        {renderPreviewContent()}
      </div>
    </Modal>
  );
};

export default FilePreviewModal; 