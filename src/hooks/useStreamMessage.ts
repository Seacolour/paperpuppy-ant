import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  setLoading, 
  updateStreamMessage 
} from '../store/messageSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';

/**
 * 使用RTK Query流式更新模式的流处理钩子
 * 根据Redux文档: https://toolkit.redux.js.cn/rtk-query/usage/streaming-updates
 */
export const useStreamMessage = (activeSessionId: number | null = null) => {
  const [streamContent, setStreamContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const dispatch = useDispatch();
  
  // 用于跟踪当前活跃的流ID
  const activeStreamId = useSelector((state: RootState) => state.messages.activeStreamId);
  
  // 关闭当前流
  const closeStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    streamIdRef.current = null;
  }, []);

  // 处理流式消息 - 重写为使用增量更新模式
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
      
      // 创建流ID和累积内容变量
      const streamId = uuidv4();
      streamIdRef.current = streamId;
      let accumulatedContent = '';

      // 创建新的AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 设置加载状态
      dispatch(setLoading(true));

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

      console.log('开始读取响应流...', streamId);

      // 使用防抖更新UI，优化渲染性能
      let timeoutId: NodeJS.Timeout | null = null;
      let lastUpdateTime = Date.now();
      let bufferUpdates = false;
      
      // 内容更新函数
      const updateContent = (content: string, isComplete = false) => {
        // 如果流ID不再是当前流，表示已被新请求取代，直接返回
        if (streamIdRef.current !== streamId) {
          return;
        }
        
        // 设置本地状态，用于UI实时显示
        setStreamContent(content);
        
        // 更新Redux状态 - 使用增量更新模式
        const sessionId = options?.sessionId ?? activeSessionId;
        if (sessionId !== null) {
          dispatch(updateStreamMessage({
            sessionId,
            streamId,
            content,
            isComplete
          }));
        }
      };
      
      // 防抖更新UI
      const updateWithDebounce = (content: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // 如果在缓冲期，跳过UI更新，但保存最新内容供下次使用
        if (bufferUpdates) {
          accumulatedContent = content;
          return;
        }

        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - lastUpdateTime;
        
        // 内容越长，更新间隔越大，避免频繁重渲染大型内容
        const contentLength = content.length;
        const baseDelay = options?.debounceDelay || 80;
        const dynamicDelay = Math.min(
          baseDelay + Math.floor(contentLength / 1000) * 10, // 内容越长，延迟越大
          200 // 最大延迟200ms
        );
        
        // 如果距离上次更新时间太短，增加延迟
        const finalDelay = timeSinceLastUpdate < 50 ? dynamicDelay : baseDelay;

        timeoutId = setTimeout(() => {
          updateContent(content);
          lastUpdateTime = Date.now();
          timeoutId = null;
          
          // 防止过于频繁的Redux更新，更新后暂时进入缓冲期
          bufferUpdates = true;
          setTimeout(() => {
            bufferUpdates = false;
            // 如果缓冲期间有新内容，立即更新
            if (accumulatedContent !== content) {
              updateWithDebounce(accumulatedContent);
            }
          }, 100); // 100ms的缓冲期
        }, finalDelay);
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
        
        return processed;
      };

      let buffer = '';

      // 处理流数据
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
              extractedData = extractedData.replace(/\\\\/g, '\\'); // 转换\\为单个\
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

      // 清除可能存在的防抖定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // 流式传输完成，执行清理和收尾工作
      console.log('流式传输完成，内容长度:', accumulatedContent.length);
      
      // 释放资源
      reader.releaseLock();
      
      // 标记消息为完成状态
      updateContent(accumulatedContent, true);
      
      // 执行完成回调
      if (options?.onComplete) {
        options.onComplete(accumulatedContent);
      }
      
      // 重置处理状态和加载状态
      setIsProcessing(false);
      abortControllerRef.current = null;
      streamIdRef.current = null;
      
      // 设置加载为false
      setTimeout(() => {
        dispatch(setLoading(false));
      }, 100);

      return accumulatedContent;

    } catch (error) {
      console.error('处理流消息时出错:', error);

      // 错误回调
      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }

      // 更安全的错误恢复 - 在React组件可能重新渲染前进行清理
      const safeCleanup = () => {
        try {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
          streamIdRef.current = null;
          
          // 确保状态更新在同一个批处理中完成
          setIsProcessing(false);
          dispatch(setLoading(false));
        } catch (cleanupError) {
          console.error('清理资源时出错:', cleanupError);
        }
      };

      // 使用安全的方式执行清理
      safeCleanup();

      // 重新抛出错误，让调用者处理
      throw error;
    }
  }, [closeStream, dispatch, activeSessionId, activeStreamId]);

  // 取消当前正在处理的消息
  const cancelGeneration = useCallback(() => {
    closeStream();
    dispatch(setLoading(false));
  }, [closeStream, dispatch]);

  return {
    streamContent,
    isProcessing,
    processStream,
    cancelGeneration,
    activeStreamId
  };
};