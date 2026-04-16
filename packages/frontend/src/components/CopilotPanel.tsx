import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { api } from '../api/client';

import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  bookId: string;
  bookSummary?: string;
  selectedText?: string;
  initialAction?: string;
  paragraphAnnotations: import('../api/client').ParagraphAnnotation[];
  onClose?: () => void;
}

// 模拟打字机效果显示的包裹器
function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        // Fast forward chunks to not make Markdown look broken
        const jump = i < 100 ? 1 : 3; 
        setDisplayed(text.substring(0, i + jump));
        i += jump;
      } else {
        clearInterval(timer);
      }
    }, 15);
    return () => clearInterval(timer);
  }, [text]);

  return <div className="copilot-md"><ReactMarkdown>{displayed}</ReactMarkdown></div>;
}

export default function CopilotPanel({ bookId, bookSummary, selectedText, initialAction, paragraphAnnotations = [], onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [isOverviewOpen, setIsOverviewOpen] = useState(false); // 控制全览展开
  const chatEndRef = useRef<HTMLDivElement>(null);
  const session = useRef(crypto.randomUUID());
  // 追踪最后一次处理的 action，防止重复触发
  const lastActionRef = useRef<string>('');

  // 加载历史对话（仅在 bookId 变化时执行一次）
  useEffect(() => {
    setHistoryLoaded(false);
    api.conversations.list(bookId).then(history => {
      setMessages(history.map(h => ({ role: h.role, content: h.content })));
      setHistoryLoaded(true);
    }).catch(() => setHistoryLoaded(true));
  }, [bookId]);

  // 滚动到最新消息（仅在消息真正变化时）
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // 监听划词动作：仅在 historyLoaded 之后，且 action 未被处理过时触发
  useEffect(() => {
    if (!historyLoaded || !selectedText || !initialAction) return;
    const actionKey = `${initialAction}::${selectedText.slice(0, 50)}`;
    if (lastActionRef.current === actionKey) return; // 防重复
    lastActionRef.current = actionKey;
    
    // 如果是定向提问指令，不自动触发 AI 回复，仅留存上下文等用户输入
    if (initialAction === 'ask') {
      return;
    }
    
    triggerAI(initialAction, selectedText);
  }, [selectedText, initialAction, historyLoaded]);

  async function saveMessage(role: 'user' | 'assistant', content: string) {
    try {
      await api.conversations.create(bookId, { session_id: session.current, role, content });
    } catch (e) {
      console.error('Save message failed', e);
    }
  }

  async function triggerAI(act: string, text: string) {
    setLoading(true);
    const actionLabels: Record<string, string> = { feynman: '费曼对讲', flashcard: '结构卡片', actionlist: '行动清单' };
    const isGlobal = !!actionLabels[act];
    const userPrompt = isGlobal 
      ? `[启动全局功能：${actionLabels[act]}]`
      : `[针对划线内容进行 ${act}] "${text}"`;
    
    const newContext = [...messages, { role: 'user', content: userPrompt } as Message];
    setMessages(newContext);
    saveMessage('user', userPrompt);

    try {
      const res = await api.ai.ask(bookId, act, isGlobal ? '' : text, messages);
      setMessages([...newContext, { role: 'assistant', content: res.reply }]);
      saveMessage('assistant', res.reply);
    } catch (err: any) {
      setMessages([...newContext, { role: 'assistant', content: `❌ 请求失败: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);      // 先展示用户消息
    saveMessage('user', userMsg.content);
    setInput('');
    setLoading(true);
    try {
      // 把含有新消息的 newHistory 传给 AI 以便它拥有最新上下文。如果是挂载着段落进行提问，指定 action 为 ask 帮助后端精细化组装 prompt。
      const currentAction = selectedText ? 'ask' : '';
      const res = await api.ai.ask(bookId, currentAction, selectedText || '', newHistory);
      const reply = { role: 'assistant' as const, content: res.reply };
      setMessages([...newHistory, reply]);
      saveMessage('assistant', res.reply);
    } catch (err: any) {
      setMessages([...newHistory, { role: 'assistant', content: `❌ 请求失败: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0f172a', borderLeft: '1px solid #1e293b', color: '#f8fafc'
    }}>
      <style>{`
        .copilot-md p { margin: 0 0 8px 0; }
        .copilot-md p:last-child { margin-bottom: 0; }
        .copilot-md ul, .copilot-md ol { margin: 4px 0 8px 0; padding-left: 20px; }
        .copilot-md li { margin-bottom: 4px; }
        .copilot-md strong { font-weight: 600; color: #bae6fd; }
        .copilot-md h1, .copilot-md h2, .copilot-md h3 { margin: 16px 0 8px 0; font-weight: 600; color: #e0f2fe; line-height: 1.3; }
        .copilot-md h1 { font-size: 1.2rem; border-bottom: 1px solid #334155; padding-bottom: 4px; }
        .copilot-md h2 { font-size: 1.1rem; }
        .copilot-md h3 { font-size: 1rem; }
        .copilot-md pre { background: #0f172a; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; border: 1px solid #334155; }
        .copilot-md code { font-family: monospace; background: #0f172a; padding: 2px 4px; border-radius: 4px; color: #93c5fd; }
        .copilot-md pre code { padding: 0; background: transparent; border: none; color: inherit; }
        .overview-scroll::-webkit-scrollbar { width: 6px; }
        .overview-scroll::-webkit-scrollbar-track { background: transparent; }
        .overview-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .overview-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
        .overview-item:hover { background: rgba(51, 65, 85, 0.4); color: #e2e8f0; }
      `}</style>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✨</span> AI Copilot
        </h3>
        {onClose && (
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>
            ×
          </button>
        )}
      </div>



      {/* 段落预生成角标摘要区 -- 改为可展开折叠的 UI */}
      {paragraphAnnotations.length > 0 && (
        <div style={{ background: '#020617', borderBottom: '1px solid #1e293b', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', position: 'relative', zIndex: 10, flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: '45vh' }}>
          <div 
            onClick={() => setIsOverviewOpen(!isOverviewOpen)}
            style={{ 
              padding: '10px 20px', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', flexShrink: 0
            }}
          >
            <span>✨ AI 已生成 <strong>{Array.from(new Map(paragraphAnnotations.map(p => [p.paragraph_text, p])).values()).length}</strong> 个洞见并在文中标出</span>
            <span style={{ marginLeft: 'auto', transform: isOverviewOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: 10 }}>▼</span>
          </div>
          
          {isOverviewOpen && (
            <div className="overview-scroll" style={{ padding: '0 20px 16px 20px', overflowY: 'auto', overscrollBehavior: 'contain', flex: 1 }}>
              {bookSummary && (
                <div style={{ marginBottom: 16, background: 'rgba(51, 65, 85, 0.4)', padding: 12, borderRadius: 6, border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em' }}>📚 全书前置概要</div>
                  <div style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.6 }}>
                    {(() => {
                       const isGarbled = bookSummary.includes('%%EOF') || bookSummary.includes('obj') || bookSummary.includes('stream') || bookSummary.replace(/[a-zA-Z0-9\s.,\u4e00-\u9fa5]/g, '').length > bookSummary.length * 0.3;
                       return isGarbled ? 
                         <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>💡 当前文档提取全书大纲受限，但您仍可通过划词框选文本，随时召唤我深度解读。</span> : 
                         bookSummary;
                    })()}
                  </div>
                </div>
              )}
              
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', borderTop: bookSummary ? '1px dashed #1e293b' : 'none', paddingTop: bookSummary ? 8 : 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>📖 全文洞见概览</span>
                <span style={{ color: '#cbd5e1', fontWeight: 'normal', scale: 0.9, opacity: 0.8 }}>🔑 核心 ❓ 难点 💡 联结 🌉 跨界</span>
              </div>
              {/* 这里使用段落内容本身作为去重依据，彻底解决 AI 多次生成相似内容导致的面板重复 */}
              {Array.from(new Map(paragraphAnnotations.map(p => [p.paragraph_text, p])).values()).map((p, i) => {
                const icons: Record<string, string> = { KEY: '🔑', HARD: '❓', LINK: '💡', BRIDGE: '🌉' };
                return (
                  <div key={i} 
                       className="overview-item"
                       onClick={() => {
                         const el = document.getElementById(`badge-${p.id}`);
                         if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                       }}
                       style={{ 
                         fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', gap: 6, 
                         cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'background 0.2s'
                       }}>
                    <span style={{ flexShrink: 0 }} title={p.type}>{icons[p.type] ?? '•'}</span>
                    <span style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>{p.insight}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '12px 16px', borderRadius: 12,
              background: msg.role === 'user' ? '#3b82f6' : '#1e293b',
              color: msg.role === 'user' ? '#fff' : '#cbd5e1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              lineHeight: 1.6,
              fontSize: '14px'
            }}>
              {msg.role === 'assistant' && i === messages.length - 1 ? (
                <TypewriterText text={msg.content} />
              ) : (
                msg.role === 'assistant' ? <div className="copilot-md"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              )}
            </div>
            {msg.role === 'assistant' && (
              <button
                onMouseDown={async (e) => {
                  const btn = e.currentTarget;
                  try {
                    await api.highlights.create(bookId, {
                      type: 'note',
                      position: 'copilot',
                      selected_text: selectedText ? selectedText.slice(0, 200) : '',
                      color: 'blue',
                      note_content: msg.content,
                    });
                    btn.textContent = '✅ 已存入笔记';  // 内联反馈，不打断阅读
                    btn.style.color = '#22c55e';
                  } catch {
                    btn.textContent = '❌ 存入失败';
                    btn.style.color = '#ef4444';
                  }
                }}
                style={{
                  marginTop: 4, background: 'transparent', border: 'none',
                  color: '#475569', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px', borderRadius: 4
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
              >
                🌟 存为笔记卡片
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#1e293b', color: '#64748b', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span className="dot-anim">思考中...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div style={{ padding: '0 20px 10px', display: 'flex', flexWrap: 'wrap', gap: 8, overflowX: 'auto', flexShrink: 0, paddingBottom: selectedText ? 0 : 10 }}>
        {[
          { id: 'feynman', icon: '🎓', label: '费曼对讲' },
          { id: 'flashcard', icon: '📇', label: '结构卡片' },
          { id: 'actionlist', icon: '🧗', label: '行动清单' }
        ].map(btn => (
          <button 
             key={btn.id}
             onClick={() => triggerAI(btn.id, '')} 
             style={{ 
               padding: '4px 10px', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(71, 85, 105, 0.6)', 
               borderRadius: 16, color: '#cbd5e1', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', 
               transition: 'all 0.2s ease', backdropFilter: 'blur(4px)' 
             }} 
             onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#60a5fa'; }} 
             onMouseLeave={e => { e.currentTarget.style.background = 'rgba(51, 65, 85, 0.5)'; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.6)'; }}
          >
            {btn.icon} {btn.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #1e293b', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* 当前语境：作为附着在输入框上方的微缩标识 */}
        {selectedText && (
          <div style={{ fontSize: 12, color: '#94a3b8', background: '#1e293b', padding: '8px 12px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid #334155' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✍️</span> <span>当前语境</span>
            </div>
            <div style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic', opacity: 0.9 }}>
              「{selectedText}」
            </div>
          </div>
        )}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="继续追问..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 8,
            border: '1px solid #334155', background: '#1e293b', color: '#f8fafc',
            outline: 'none', boxSizing: 'border-box'
          }}
          disabled={loading}
        />
      </div>
    </div>
  );
}
