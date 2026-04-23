// 聊天消息格式（OpenAI 风格）
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
}

// 请求格式
export interface ChatRequest {
  model: string;
  messages: Message[];
  maxTokens?: number;
  stream?: boolean;
  system?: string; // Anthropic 风格的系统提示
}

// 流式事件类型
export type SSEEventType =
  | 'start'
  | 'content'
  | 'complete'
  | 'error'
  | 'ping'
  | 'tool_call'
  | 'tool_result';

// 工具定义
export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

// 工具调用
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// 工具结果
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

// 非流式响应
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

// 模型信息
export interface ModelInfo {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'minimax';
}