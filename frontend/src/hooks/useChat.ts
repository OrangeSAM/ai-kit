// 聊天逻辑 Hook - 支持 Function Calling

import { useState, useRef, useCallback } from 'react';
import { chat, streamChat, type Message, type ChatResponse } from '../services/api';

export interface DebugInfo {
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

export interface ToolCallEvent {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultEvent {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const [toolResults, setToolResults] = useState<ToolResultEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    model: string,
    systemPrompt?: string,
    useStream: boolean = true
  ) => {
    // 取消之前的请求
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // 添加用户消息
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setToolCalls([]);
    setToolResults([]);

    setIsLoading(true);
    setDebugInfo(null);

    try {
      if (useStream) {
        // 流式响应
        let fullContent = '';
        let pendingToolCalls: ToolCallEvent[] = [];

        for await (const event of streamChat({
          model,
          messages: [...messages, userMessage],
          system: systemPrompt,
        })) {
          if (event.type === 'start') {
            // 开始
          } else if (event.type === 'content') {
            const data = event.data as { text: string };
            fullContent += data.text;
            // 实时更新 AI 消息
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return [...prev.slice(0, -1), { ...last, content: fullContent }];
              }
              return [...prev, { role: 'assistant', content: fullContent }];
            });
          } else if (event.type === 'tool_call') {
            const data = event.data as ToolCallEvent;
            pendingToolCalls.push(data);
            setToolCalls([...pendingToolCalls]);
          } else if (event.type === 'tool_result') {
            const data = event.data as ToolResultEvent;
            setToolResults(prev => [...prev, data]);
          } else if (event.type === 'complete') {
            const data = event.data as DebugInfo;
            setDebugInfo(data);
          }
        }
      } else {
        // 非流式响应
        const response: ChatResponse = await chat({
          model,
          messages: [...messages, userMessage],
          system: systemPrompt,
        });

        setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
        setDebugInfo({
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          latencyMs: response.latencyMs,
        });

        if (response.toolCalls) {
          setToolCalls(response.toolCalls);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Chat error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setDebugInfo(null);
    setToolCalls([]);
    setToolResults([]);
  }, []);

  return {
    messages,
    isLoading,
    debugInfo,
    toolCalls,
    toolResults,
    sendMessage,
    stop,
    clear,
  };
}