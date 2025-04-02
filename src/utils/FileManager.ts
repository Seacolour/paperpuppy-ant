// 文件实体类型定义
export interface FileEntity {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'pdf' | 'file';
  url: string;
  previewUrl?: string;
  createdAt: Date;
}

// 本地存储的键名
const FILE_STORAGE_KEY = 'paperpuppy_files';

/**
 * 文件管理器类
 * 用于处理文件的存储、读取和预览
 */
class FileManager {
  private static instance: FileManager;
  private files: Map<string, FileEntity>;

  private constructor() {
    this.files = new Map<string, FileEntity>();
    this.loadFromStorage();
  }

  /**
   * 获取FileManager实例（单例模式）
   */
  public static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  /**
   * 从本地存储加载文件
   */
  private loadFromStorage(): void {
    try {
      const storedFiles = localStorage.getItem(FILE_STORAGE_KEY);
      if (storedFiles) {
        const parsedFiles = JSON.parse(storedFiles) as FileEntity[];
        parsedFiles.forEach(file => {
          // 确保日期正确地被转换回Date对象
          file.createdAt = new Date(file.createdAt);
          this.files.set(file.id, file);
        });
      }
    } catch (error) {
      console.error('Failed to load files from storage:', error);
    }
  }

  /**
   * 保存文件到本地存储
   */
  private saveToStorage(): void {
    try {
      const filesArray = Array.from(this.files.values());
      localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(filesArray));
    } catch (error) {
      console.error('Failed to save files to storage:', error);
    }
  }

  /**
   * 添加文件并生成预览URL
   * @param file 文件对象
   * @returns 返回创建的文件实体
   */
  public async addFile(file: File): Promise<FileEntity> {
    // 创建唯一ID
    const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 判断文件类型
    const fileType = this.getFileType(file);
    
    // 创建预览URL
    const url = URL.createObjectURL(file);
    
    // 创建预览图（仅对图片有效）
    let previewUrl = undefined;
    if (fileType === 'image') {
      previewUrl = url;
    }

    // 创建文件实体
    const fileEntity: FileEntity = {
      id,
      name: file.name,
      size: file.size,
      type: fileType,
      url,
      previewUrl,
      createdAt: new Date()
    };

    // 保存文件
    this.files.set(id, fileEntity);
    this.saveToStorage();

    return fileEntity;
  }

  /**
   * 根据ID获取文件
   * @param id 文件ID
   * @returns 文件实体或undefined
   */
  public getFile(id: string): FileEntity | undefined {
    return this.files.get(id);
  }

  /**
   * 获取所有文件
   * @returns 文件实体数组
   */
  public getAllFiles(): FileEntity[] {
    return Array.from(this.files.values());
  }

  /**
   * 根据ID移除文件
   * @param id 文件ID
   * @returns 是否成功移除
   */
  public removeFile(id: string): boolean {
    const result = this.files.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  /**
   * 清空所有文件
   */
  public clearFiles(): void {
    this.files.clear();
    this.saveToStorage();
  }

  /**
   * 判断文件类型
   * @param file 文件对象
   * @returns 文件类型
   */
  private getFileType(file: File): 'image' | 'pdf' | 'file' {
    if (file.type.startsWith('image/')) {
      return 'image';
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    } else {
      return 'file';
    }
  }

  /**
   * 格式化文件大小
   * @param bytes 文件大小（字节）
   * @returns 格式化后的大小字符串
   */
  public static formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * 生成文件在消息中的文本表示
   * @param fileId 文件ID
   * @returns 文件的文本表示
   */
  public getFileMessageText(fileId: string): string {
    const file = this.getFile(fileId);
    if (!file) return '';

    const sizeStr = FileManager.formatFileSize(file.size);
    switch (file.type) {
      case 'image':
        return `[图片: ${file.name}, ${sizeStr}, fileId:${file.id}]`;
      case 'pdf':
        return `[PDF文件: ${file.name}, ${sizeStr}, fileId:${file.id}]`;
      default:
        return `[文件: ${file.name}, ${sizeStr}, fileId:${file.id}]`;
    }
  }
}

export default FileManager; 