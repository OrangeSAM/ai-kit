import { useState, useEffect, useRef, FormEvent } from 'react';
import { useChat } from '../hooks/useChat';
import type { ModelInfo } from '../services/api';
import './ChatWindow.css';

interface Props {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ChatWindow({ models, selectedModel, onModelChange }: Props) {
  const [input, setInput] = useState('');
  const [useStream, setUseStream] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, debugInfo, toolCalls, toolResults, sendMessage, stop, clear } = useChat();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, toolCalls, toolResults]);

  // Handle send
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await sendMessage(input.trim(), selectedModel, systemPrompt || undefined, useStream);
    setInput('');
  };

  // Toggle stream mode
  const toggleStream = () => {
    setUseStream(!useStream);
  };

  // Format tool result for display
  const formatToolResult = (result: unknown): string => {
    if (typeof result === 'string') return result;
    return JSON.stringify(result, null, 2);
  };

  return (
    <div className="chat-window">
      {/* Toolbar: Model selector + controls */}
      <div className="toolbar">
        <select
          value={selectedModel}
          onChange={e => onModelChange(e.target.value)}
          className="model-select"
        >
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>

        <label className="stream-toggle">
          <input
            type="checkbox"
            checked={useStream}
            onChange={toggleStream}
          />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
          <span>流式</span>
        </label>

        <button onClick={clear} className="btn-clear">
          清空
        </button>
      </div>

      {/* System prompt */}
      <div className="system-prompt">
        <input
          type="text"
          placeholder="系统提示词（可选）"
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          className="system-input"
        />
      </div>

      {/* Messages */}
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>开始对话吧</p>
            <p className="hint">SSE 流式输出 · 实时响应</p>
            <p className="hint">支持 Function Calling · 工具调用</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? '我' : 'AI'}
            </div>
            <div className="message-content">
              {msg.content || '...'}
            </div>
          </div>
        ))}

        {/* Tool Calls Display */}
        {toolCalls.map((tc, i) => (
          <div key={`tc-${i}`} className="message-tool-call">
            <div className="tool-call-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div className="tool-call-content">
              <div className="tool-call-name">{tc.name}</div>
              <div className="tool-call-args">
                {Object.entries(tc.arguments).map(([key, value]) => (
                  <span key={key} className="tool-arg">
                    <span className="tool-arg-key">{key}:</span>
                    <span className="tool-arg-value">{String(value)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Tool Results Display */}
        {toolResults.map((tr, i) => (
          <div key={`tr-${i}`} className={`tool-result ${tr.isError ? 'error' : ''}`}>
            <div className="tool-result-header">
              <span className="tool-result-icon">{tr.isError ? '✗' : '✓'}</span>
              <span className="tool-result-name">{tr.name}</span>
            </div>
            <pre className="tool-result-content">{formatToolResult(tr.result)}</pre>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">AI</div>
            <div className="message-content loading">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Debug info */}
      {debugInfo && (
        <div className="debug-panel">
          <span>输入 {debugInfo.inputTokens} tokens</span>
          <span>输出 {debugInfo.outputTokens} tokens</span>
          <span>延迟 {debugInfo.latencyMs}ms</span>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入消息..."
          className="input"
          disabled={isLoading}
        />
        {isLoading ? (
          <button type="button" onClick={stop} className="btn-stop">
            停止
          </button>
        ) : (
          <button type="submit" className="btn-send" disabled={!input.trim()}>
            发送
          </button>
        )}
      </form>
    </div>
  );
}