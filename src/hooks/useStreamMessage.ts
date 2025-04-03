import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, addAssistantMessage, setLoading } from '../store/messageSlice';
import { useDispatch } from 'react-redux';

// 流消息处理Hook
export const useStreamMessage = (activeSessionId: number | null = null) => {
  const [streamContent, setStreamContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dispatch = useDispatch();

  // 关闭当前流
  const closeStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  // 处理流式消息
  const processStream = useCallback(async (
    url: string,
    formData: FormData,
    options?: {
      onComplete?: (content: string) => void,
      onError?: (error: Error) => void,
      debounceDelay?: number,
      sessionId?: number
    }
  ) => {
    try {
      // 关闭之前可能存在的流
      closeStream();

      // 重置状态
      setStreamContent('');
      setIsProcessing(true);
      
      // 创建累积内容变量
      let accumulatedContent = '';

      // 创建新的AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 发送请求，使用AbortController的signal
      const fetchResponse = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
        },
        signal: abortController.signal
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP错误: ${fetchResponse.status}`);
      }

      // 获取响应的可读流
      const reader = fetchResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      console.log('开始读取响应流...');

      // 使用防抖更新UI
      let timeoutId: NodeJS.Timeout | null = null;
      const updateWithDebounce = (content: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const debounceDelay = options?.debounceDelay || 80; // 默认较短延迟，保持流畅性

        timeoutId = setTimeout(() => {
          setStreamContent(content);
          timeoutId = null;
        }, debounceDelay);
      };

      // 处理转义字符和格式化内容
      const processContent = (content: string) => {
        // 正则表达式中的斜杠需要双重转义
        const blockMathRegex = /\\\\?\[([\s\S]*?)\\\\?\]/g;
        const inlineMathRegex = /\\\\?\(([\s\S]*?)\\\\?\)/g;
        
        // 创建新字符串，避免直接修改原内容
        let processed = content;
        
        // 第一步：处理块级公式
        let blockMatches: RegExpExecArray | null;
        const blockReplacements: [number, number, string][] = [];
        
        while ((blockMatches = blockMathRegex.exec(processed)) !== null) {
          const fullMatch = blockMatches[0];
          const mathContent = blockMatches[1];
          const startIdx = blockMatches.index;
          const endIdx = startIdx + fullMatch.length;
          
          // 检查是否是正确的数学公式（以 \[ 开头和 \] 结尾）
          if ((fullMatch.startsWith('\\[') || fullMatch.startsWith('\\\\[')) && 
              (fullMatch.endsWith('\\]') || fullMatch.endsWith('\\\\]'))) {
            blockReplacements.push([startIdx, endIdx, `$$${mathContent}$$`]);
          }
        }
        
        // 从后向前替换，避免索引变化
        for (let i = blockReplacements.length - 1; i >= 0; i--) {
          const [start, end, replacement] = blockReplacements[i];
          processed = processed.slice(0, start) + replacement + processed.slice(end);
        }
        
        // 第二步：处理行内公式
        let inlineMatches: RegExpExecArray | null;
        const inlineReplacements: [number, number, string][] = [];
        
        while ((inlineMatches = inlineMathRegex.exec(processed)) !== null) {
          const fullMatch = inlineMatches[0];
          const mathContent = inlineMatches[1];
          const startIdx = inlineMatches.index;
          const endIdx = startIdx + fullMatch.length;
          
          // 检查是否是正确的数学公式（以 \( 开头和 \) 结尾）
          if ((fullMatch.startsWith('\\(') || fullMatch.startsWith('\\\\(')) && 
              (fullMatch.endsWith('\\)') || fullMatch.endsWith('\\\\)'))) {
            inlineReplacements.push([startIdx, endIdx, `$${mathContent}$`]);
          }
        }
        
        // 从后向前替换，避免索引变化
        for (let i = inlineReplacements.length - 1; i >= 0; i--) {
          const [start, end, replacement] = inlineReplacements[i];
          processed = processed.slice(0, start) + replacement + processed.slice(end);
        }
        
        // 输出日志
        if (blockReplacements.length > 0 || inlineReplacements.length > 0) {
          console.log('原始内容:', content);
          console.log('处理后的内容:', processed);
          console.log(`替换了${blockReplacements.length}个块级公式和${inlineReplacements.length}个行内公式`);
        }
        
        return processed;
      };

      let buffer = '';

      // 模拟Swift的处理逻辑，简化流处理
      while (true) {
        // 检查是否已中止
        if (abortControllerRef.current !== abortController) {
          console.log('流已被新请求中止');
          break;
        }
        
        const { done, value } = await reader.read();
        
        // 如果流结束
        if (done) {
          console.log('读取流结束');
          break;
        }
        
        // 解码数据
        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;
        
        // 按事件分隔符拆分
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const event of events) {
          const lines = event.split('\n');
          
          for (const line of lines) {
            // 只处理以 "data:" 开头的行
            if (line.startsWith('data:')) {
              let rawData = line.slice(5).trim();
              
              // 检查连接关闭标记
              if (rawData === "'Connection closed'" || rawData.includes("Connection closed")) {
                console.log('检测到连接关闭标记');
                continue;
              }
              
              // 提取数据内容
              let extractedData;
              if (rawData.startsWith("'") && rawData.endsWith("'") && rawData.length >= 2) {
                extractedData = rawData.slice(1, -1);
              } else {
                extractedData = rawData;
              }
              // 2. 处理转义字符
              extractedData = extractedData.replace(/\\n/g, '\n');  // 转换\n为实际换行符
              extractedData = extractedData.replace(/\\\\/g, '\\'); // 转换\\为单个\、
              // 处理数据格式并累积
              const finalMessagePart = processContent(extractedData);
              accumulatedContent += finalMessagePart;
              
              // 更新UI显示
              updateWithDebounce(accumulatedContent);
            }
          }
        }
      }
      
      // 处理缓冲区中可能剩余的内容
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            let rawData = line.slice(5).trim();
            
            if (rawData === "'Connection closed'" || rawData.includes("Connection closed")) {
              continue;
            }
            
            let extractedData;
            if (rawData.startsWith("'") && rawData.endsWith("'")) {
              extractedData = rawData.slice(1, -1);
            } else {
              extractedData = rawData;
            }
            
            const finalMessagePart = processContent(extractedData);
            accumulatedContent += finalMessagePart;
          }
        }
      }

      // 确保最终状态已更新
      setStreamContent(accumulatedContent);

      // 如果有会话ID，添加助手消息到Redux
      if (options?.sessionId !== undefined || activeSessionId !== null) {
        const sessionId = options?.sessionId ?? activeSessionId;

        if (sessionId !== null) {
          const assistantMessage: Message = {
            id: uuidv4(),
            content: accumulatedContent,
            role: 'assistant',
            timestamp: new Date().toISOString(),
          };

          dispatch(addAssistantMessage({ sessionId, message: assistantMessage }));
        }
      }

      // 完成回调
      if (options?.onComplete) {
        options.onComplete(accumulatedContent);
      }

      // 释放reader
      reader.releaseLock();

      // 重置状态
      abortControllerRef.current = null;
      setIsProcessing(false);

      // 设置加载状态为false
      dispatch(setLoading(false));

      return accumulatedContent;

    } catch (error) {
      console.error('处理流消息时出错:', error);

      // 错误回调
      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }

      // 重置状态
      abortControllerRef.current = null;
      setIsProcessing(false);
      dispatch(setLoading(false));
      setStreamContent('');

      // 重新抛出错误，让调用者处理
      throw error;
    }
  }, [closeStream, dispatch, activeSessionId]);

  // 取消当前正在处理的消息
  const cancelGeneration = useCallback(() => {
    closeStream();
    dispatch(setLoading(false));
  }, [closeStream, dispatch]);

  return {
    streamContent,
    isProcessing,
    processStream,
    cancelGeneration
  };
};

export default useStreamMessage; 