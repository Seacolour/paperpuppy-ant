/**
 * Markdown和LaTeX渲染相关的工具函数
 */

/**
 * 检测内容是否包含复杂的数学公式
 * @param content 要检测的文本内容
 * @returns 是否包含复杂公式
 */
export const containsComplexMath = (content: string): boolean => {
  // 防止处理空内容或非字符串
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  try {
    // 为提高性能和稳定性，先进行简单快速检查
    const quickCheck = /(\$|\\\(|\\\[|\\begin\{)/i.test(content);
    if (!quickCheck) {
      return false;
    }

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
  } catch (e) {
    console.error('检测数学公式时出错:', e);
    // 错误时返回false，使用简单渲染
    return false;
  }
};

/**
 * 解析消息内容中的文件引用
 * @param content 消息内容
 * @returns 处理后的内容
 */
export const parseMessageContent = (content: string): string => {
  // 防止处理空内容或非字符串
  if (!content || typeof content !== 'string') {
    return '';
  }

  // 匹配文件引用的正则表达式，例如: [PDF文件: file.pdf, 1.5MB, fileId:12345]
  const fileRegex = /\[(图片|PDF文件|文件): ([^,]+), ([^,]+), fileId:([^\]]+)\]/g;
  
  if (fileRegex.test(content)) {
    // 替换掉文件引用，因为会单独渲染
    return content.replace(fileRegex, '').trim();
  }
  
  return content;
};

/**
 * 从消息内容中提取文件ID
 * @param content 消息内容
 * @returns 文件ID数组
 */
export const extractFileIdsFromContent = (content: string): string[] => {
  // 防止处理空内容或非字符串
  if (!content || typeof content !== 'string') {
    return [];
  }

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

/**
 * 渲染TeX公式到HTML
 * @param formula LaTeX公式内容
 * @param displayMode 是否为块级显示模式
 * @returns 渲染后的HTML
 */
export const renderTeXToHTML = (formula: string, displayMode: boolean = false): string => {
  try {
    // 这里可以扩展直接调用KaTeX的渲染函数
    // 此函数需要在组件中实际使用时传入KaTeX实例
    return `<span class="katex-error">${displayMode ? '$$' : '$'}${formula}${displayMode ? '$$' : '$'}</span>`;
  } catch (error) {
    console.error('渲染TeX公式出错:', error);
    return `<span class="katex-error">${displayMode ? '$$' : '$'}${formula}${displayMode ? '$$' : '$'}</span>`;
  }
}; 