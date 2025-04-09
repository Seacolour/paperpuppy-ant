import { memo, useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../styles/MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  isActiveStream?: boolean;
  theme?: 'light' | 'dark';
}



/**
 * 统一的 Markdown 渲染器组件
 */
/**
 * 创建基础的 markdown-it 实例
 */
const createMarkdownParser = () => {
  const md = new MarkdownIt({
    html: true,         // 允许 HTML 标签，以便于渲染 KaTeX 输出
    breaks: true,       // 转换 '\n' 为 <br>
    linkify: true,      // 自动转换 URL 为链接
    typographer: true,  // 启用一些语言中性的替换和引号美化
  });
  
  // 保留原始的有序列表序号
  const defaultRender = md.renderer.rules.list_item_open || function(tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };
  
  md.renderer.rules.list_item_open = function(tokens, idx, options, _env, self) {
    const token = tokens[idx];
    // 确保有序列表项的序号正确
    if (token.attrGet && token.attrGet('class') && token.attrGet('class').includes('task-list-item')) {
      token.attrJoin('class', 'task-list-item');
    }
    return defaultRender(tokens, idx, options, _env, self);
  };
  
  return md;
};

// 不再使用占位符方法，删除未使用的函数

// 不再使用占位符方法，删除未使用的函数

/**
 * 基础的 Markdown 渲染器组件
 */
const MarkdownRenderer = memo(({ content: originalContent, isActiveStream = false, theme = 'light' }: MarkdownRendererProps) => {
  // 添加测试用例，以便调试
  const testContent = "This is a test with inline formula: $E=mc^2$ and block formula: $$\\frac{d}{dx}e^x = e^x$$";
  const content = originalContent || testContent;
  
  const [renderedHTML, setRenderedHTML] = useState('');
  const mdParser = useRef<MarkdownIt | null>(null);

  // 初始化 markdown-it 解析器
  useEffect(() => {
    if (!mdParser.current) {
      mdParser.current = createMarkdownParser();
    }
  }, []);

  // 在渲染前预处理 LaTeX 公式
  const preprocessContent = (content: string) => {
    // 使用特殊标记占位公式，以避免 markdown-it 处理
    let counter = 0;
    const formulas: Array<{id: string, type: 'block' | 'inline', content: string}> = [];
    
    // 首先处理行内公式，避免干扰列表结构
    // 处理 \(...\) 格式的行内公式
    let processed = content.replace(/\\\((.*?)\\\)/gs, (_, formula) => {
      const id = `MATH_INLINE_${counter++}`;
      formulas.push({id, type: 'inline', content: formula});
      return `<span data-math-inline="${id}"></span>`;
    });
    
    // 处理 $...$ 格式的行内公式
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, formula) => {
      const id = `MATH_INLINE_${counter++}`;
      formulas.push({id, type: 'inline', content: formula});
      return `<span data-math-inline="${id}"></span>`;
    });
    
    // 然后处理块级公式
    // 处理 \[...\] 格式的块级公式
    processed = processed.replace(/\\\[(.*?)\\\]/gs, (_, formula) => {
      const id = `MATH_BLOCK_${counter++}`;
      formulas.push({id, type: 'block', content: formula});
      // 使用特殊的标记，保持在单独的段落中
      return `\n\n<div data-math-block="${id}"></div>\n\n`;
    });
    
    // 处理 $$...$$ 格式的块级公式
    processed = processed.replace(/\$\$(.*?)\$\$/gs, (_, formula) => {
      const id = `MATH_BLOCK_${counter++}`;
      formulas.push({id, type: 'block', content: formula});
      return `\n\n<div data-math-block="${id}"></div>\n\n`;
    });
    
    return { processed, formulas };
  };

  // 渲染 Markdown 内容
  useEffect(() => {
    if (!mdParser.current) {
      setRenderedHTML('');
      return;
    }

    try {
      // 先预处理内容，将公式替换为占位符
      const { processed, formulas } = preprocessContent(content);
      console.log('Preprocessed content:', processed);
      console.log('Extracted formulas:', formulas);
      
      // 然后渲染 Markdown
      let html = mdParser.current.render(processed);
      
      // 将占位符替换为渲染后的公式
      for (const formula of formulas) {
        try {
          const rendered = katex.renderToString(formula.content.trim(), {
            displayMode: formula.type === 'block',
            throwOnError: false
          });
          
          const wrapper = formula.type === 'block'
            ? `<div class="katex-display">${rendered}</div>`
            : `<span class="katex-inline">${rendered}</span>`;
          
          // 使用正则表达式替换占位符
          if (formula.type === 'block') {
            const regex = new RegExp(`<div data-math-block="${formula.id}"></div>`, 'g');
            html = html.replace(regex, wrapper);
          } else {
            const regex = new RegExp(`<span data-math-inline="${formula.id}"></span>`, 'g');
            html = html.replace(regex, wrapper);
          }
        } catch (err) {
          console.error('公式渲染错误:', formula.content, err);
          
          // 渲染失败时显示原始公式
          const errorWrapper = formula.type === 'block'
            ? `<div class="katex-error">$$${formula.content}$$</div>`
            : `<span class="katex-error">$${formula.content}$</span>`;
          
          if (formula.type === 'block') {
            const regex = new RegExp(`<div data-math-block="${formula.id}"></div>`, 'g');
            html = html.replace(regex, errorWrapper);
          } else {
            const regex = new RegExp(`<span data-math-inline="${formula.id}"></span>`, 'g');
            html = html.replace(regex, errorWrapper);
          }
        }
      }
      
      setRenderedHTML(html);
    } catch (err) {
      console.error('Markdown 渲染错误:', err);
      // 渲染失败时显示原始文本
      setRenderedHTML(`<div class="markdown-error">渲染错误</div><pre>${content}</pre>`);
    }
  }, [content]);

  return (
    <div className={`markdown-renderer ${theme}`}>
      {renderedHTML ? (
        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: renderedHTML }}
        />
      ) : (
        <div className="markdown-content">
          {content}
        </div>
      )}
      {isActiveStream && <span className="typing-cursor"/>}
    </div>
  );
});

export default MarkdownRenderer;
