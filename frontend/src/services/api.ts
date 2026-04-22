// API 调用封装

const API_BASE = '/api';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'minimax';
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  maxTokens?: number;
  system?: string;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  latencyMs: number;
}

export type SSEEventType = 'start' | 'content' | 'complete' | 'error' | 'tool_call' | 'tool_result';

// 获取模型列表
export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API_BASE}/models`);
  const data = await res.json();
  return data.models;
}

// 获取工具列表
export async function fetchTools(): Promise<Array<{ name: string; description: string; parameters: unknown }>> {
  const res = await fetch(`${API_BASE}/chat/tools`);
  const data = await res.json();
  return data.tools;
}

// 普通聊天
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: false }),
  });
  return res.json();
}

// SSE 流式聊天
export async function* streamChat(request: ChatRequest): AsyncGenerator<{
  type: SSEEventType;
  data: unknown;
}> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // 解析 SSE: event: TYPE\ndata: JSON\n\n
    const lines = chunk.split('\n');
    let eventType = '';
    let eventData = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        eventData = line.slice(5).trim();
        // 如果有完整的 data，yield 出去
        if (eventData) {
          try {
            yield { type: eventType as SSEEventType, data: JSON.parse(eventData) };
          } catch {
            // 忽略解析错误
          }
        }
      } else if (line === '') {
        // 空行表示一个事件的结束
        eventType = '';
        eventData = '';
      }
    }
  }
}