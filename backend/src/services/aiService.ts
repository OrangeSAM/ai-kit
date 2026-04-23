/**
 * AI Service - 封装多家 AI 提供商，支持 Function Calling
 * 支持：Anthropic (Claude)、MiniMax（兼容 OpenAI 格式）
 */

import { config } from '../config/index.js';
import type { Message, ChatResponse, ToolCall } from '../types/index.js';
import { executeTool, toMiniMaxToolsFormat, parseMiniMaxToolCalls } from './tools.js';

// MiniMax 模型列表
export const MINIMAX_MODELS = [
  { id: 'm27', name: 'MiniMax M2.7', provider: 'minimax' as const },
  { id: 'm2.5', name: 'MiniMax M2.5', provider: 'minimax' as const },
  { id: 'm2-her', name: 'MiniMax M2-Her', provider: 'minimax' as const },
];

// 短 ID -> API 模型名 映射
const MODEL_NAME_MAP: Record<string, string> = {
  'm27': 'MiniMax-M2.7',
  'm2.5': 'MiniMax-M2.5',
  'm2-her': 'MiniMax-M2-Her',
};

function getApiModelName(shortId: string): string {
  return MODEL_NAME_MAP[shortId] || shortId;
}

// 可用模型列表
export const ALL_MODELS = [...MINIMAX_MODELS];

// ============ MiniMax OpenAI 兼容接口 ============

interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

interface MiniMaxToolCallResult {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

interface MiniMaxStreamChunk {
  id: string;
  choices: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{ index: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }>;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 内部：发送请求到 MiniMax API
 */
async function sendMinimaxRequest(
  modelShortId: string,
  messages: Message[],
  stream: boolean,
  maxTokens?: number
): Promise<Response> {
  const apiModelName = getApiModelName(modelShortId);
  console.log(`[MiniMax Request] modelShortId=${modelShortId} -> apiModel=${apiModelName} messages=${messages.length} stream=${stream}`);

  const apiMessages: MiniMaxMessage[] = messages.map(msg => {
    const m: MiniMaxMessage = { role: msg.role, content: msg.content };
    if (msg.tool_calls) m.tool_calls = msg.tool_calls;
    if (msg.tool_call_id) m.tool_call_id = msg.tool_call_id;
    return m;
  });

  const body = JSON.stringify({
    model: apiModelName,
    messages: apiMessages,
    tools: toMiniMaxToolsFormat(),
    max_tokens: maxTokens || 1024,
    stream,
  });
  console.log(`[MiniMax Request Body]`, body);

  const response = await fetch(`${config.miniMaxApiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.miniMaxApiKey}`,
    },
    body,
  });

  console.log(`[MiniMax Response] status=${response.status}`);
  return response;
}

/**
 * MiniMax 非流式聊天
 */
async function chatMinimax(request: {
  model: string;
  messages: Message[];
  maxTokens?: number;
}): Promise<ChatResponse> {
  const startTime = Date.now();

  const response = await sendMinimaxRequest(
    request.model,
    request.messages,
    false,
    request.maxTokens
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content?: string;
        tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
      };
    }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  const choice = data.choices[0];
  const toolCalls = parseMiniMaxToolCalls(choice);

  return {
    id: `mm_${Date.now()}`,
    model: request.model,
    content: choice.message?.content || '',
    toolCalls,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
    latencyMs: Date.now() - startTime,
  };
}

/**
 * MiniMax 流式聊天
 */
async function* streamMinimax(request: {
  model: string;
  messages: Message[];
  maxTokens?: number;
}): AsyncGenerator<{
  type: 'start' | 'content' | 'complete' | 'error' | 'tool_call' | 'tool_result';
  data: unknown;
}> {
  const startTime = Date.now();

  try {
    const response = await sendMinimaxRequest(
      request.model,
      request.messages,
      true,
      request.maxTokens
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${error}`);
    }

    // 发送开始事件
    yield { type: 'start', data: { id: `mm_${Date.now()}`, model: request.model } };

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let fullContent = '';
    let pendingToolCalls: Array<{ index: number; id?: string; name?: string; arguments: string }> = [];
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const chunk = JSON.parse(dataStr) as MiniMaxStreamChunk;
            const delta = chunk.choices[0]?.delta;

            // 内容片段
            if (delta?.content) {
              fullContent += delta.content;
              yield { type: 'content', data: { text: delta.content } };
            }

            // Tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = pendingToolCalls[tc.index];
                if (existing) {
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name = tc.function.name;
                  if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                } else {
                  pendingToolCalls[tc.index] = {
                    index: tc.index,
                    id: tc.id || '',
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  };
                }
              }
            }

            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens;
              outputTokens = chunk.usage.completion_tokens;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    // 如果有 tool_calls，发送它们
    if (pendingToolCalls.length > 0) {
      for (const tc of pendingToolCalls) {
        if (tc.id && tc.name) {
          yield {
            type: 'tool_call',
            data: {
              id: tc.id,
              name: tc.name,
              arguments: JSON.parse(tc.arguments || '{}'),
            },
          };
        }
      }
    }

    // 完成
    yield {
      type: 'complete',
      data: {
        fullContent,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
      },
    };

  } catch (error) {
    yield {
      type: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// ============ 带工具调用的聊天 ============

/**
 * 非流式 + Function Calling（自动执行工具）
 */
export async function chatWithTools(request: {
  model: string;
  messages: Message[];
  maxTokens?: number;
  system?: string;
}): Promise<ChatResponse> {
  const startTime = Date.now();
  let currentMessages = [...request.messages];

  // 如果有 system prompt，添加到首部
  if (request.system) {
    currentMessages = [{ role: 'system', content: request.system } as Message, ...currentMessages];
  }

  // 第一轮：发送请求
  let response = await chatMinimax({ model: request.model, messages: currentMessages });

  // 如果模型请求了工具调用，执行它们并继续
  if (response.toolCalls && response.toolCalls.length > 0) {
    const toolResults = await Promise.all(
      response.toolCalls.map(tc =>
        executeTool({ id: tc.id, name: tc.name, arguments: tc.arguments })
      )
    );

    // 添加助手消息（包含 tool_calls）
    currentMessages.push({
      role: 'assistant',
      content: response.content,
      tool_calls: response.toolCalls!.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    } as Message);

    // 添加工具结果消息
    for (const result of toolResults) {
      currentMessages.push({
        role: 'tool',
        content: JSON.stringify(result.result),
        tool_call_id: result.toolCallId,
      } as Message);
    }

    // 继续对话获取最终回复
    const finalResponse = await chatMinimax({
      model: request.model,
      messages: currentMessages,
    });

    finalResponse.latencyMs = Date.now() - startTime;
    return finalResponse;
  }

  response.latencyMs = Date.now() - startTime;
  return response;
}

/**
 * 流式 + Function Calling（支持多轮工具调用）
 */
export async function* streamChatWithTools(request: {
  model: string;
  messages: Message[];
  maxTokens?: number;
  system?: string;
}): AsyncGenerator<{
  type: 'start' | 'content' | 'complete' | 'error' | 'tool_call' | 'tool_result';
  data: unknown;
}> {
  let currentMessages = [...request.messages];

  if (request.system) {
    currentMessages = [{ role: 'system', content: request.system } as Message, ...currentMessages];
  }

  // 用于累积完整内容
  let fullContent = '';
  let pendingToolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];

  // 多轮循环：最多支持 5 轮工具调用
  for (let round = 0; round < 5; round++) {
    let streamEnded = false;
    let inputTokens = 0;
    let outputTokens = 0;

    // 流式请求
    for await (const event of streamMinimax({
      model: request.model,
      messages: currentMessages,
      maxTokens: request.maxTokens,
    })) {
      if (event.type === 'start') {
        yield event;
      } else if (event.type === 'content') {
        const data = event.data as { text: string };
        fullContent += data.text;
        yield event;
      } else if (event.type === 'tool_call') {
        pendingToolCalls.push(event.data as { id: string; name: string; arguments: Record<string, unknown> });
        yield event;
      } else if (event.type === 'complete') {
        const data = event.data as { fullContent: string; inputTokens: number; outputTokens: number; latencyMs: number };
        inputTokens = data.inputTokens;
        outputTokens = data.outputTokens;
        streamEnded = true;

        // 如果没有 tool_calls，这就是最终回复
        if (pendingToolCalls.length === 0) {
          yield {
            type: 'complete',
            data: {
              content: data.fullContent || fullContent,
              inputTokens,
              outputTokens,
              latencyMs: data.latencyMs,
            },
          };
          return;
        }
      } else if (event.type === 'error') {
        yield event;
        return;
      }
    }

    if (!streamEnded || pendingToolCalls.length === 0) {
      break;
    }

    // 执行工具调用
    const toolResults = await Promise.all(
      pendingToolCalls.map(tc => executeTool(tc))
    );

    // 发送工具执行结果
    for (const result of toolResults) {
      yield { type: 'tool_result', data: result };
    }

    // 添加助手消息和工具结果到对话历史
    currentMessages.push({
      role: 'assistant',
      content: fullContent,
      tool_calls: pendingToolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    } as Message);

    for (const result of toolResults) {
      currentMessages.push({
        role: 'tool',
        content: JSON.stringify(result.result),
        tool_call_id: result.toolCallId,
      } as Message);
    }

    // 重置，准备下一轮
    fullContent = '';
    pendingToolCalls = [];
  }

  // 达到最大轮次
  yield {
    type: 'error',
    data: { message: 'Maximum tool call rounds reached' },
  };
}

// ============ 统一入口（兼容旧接口）============

/**
 * 非流式聊天（无工具）
 */
export async function chat(request: {
  model: string;
  messages: Message[];
  maxTokens?: number;
  system?: string;
}): Promise<ChatResponse> {
  let messages = [...request.messages];
  if (request.system) {
    messages = [{ role: 'system', content: request.system } as Message, ...messages];
  }
  return chatMinimax({ model: request.model, messages, maxTokens: request.maxTokens });
}

/**
 * 流式聊天（无工具）
 */
export async function* streamChat(request: {
  model: string;
  messages: Message[];
  maxTokens?: number;
  system?: string;
}): AsyncGenerator<{
  type: 'start' | 'content' | 'complete' | 'error' | 'tool_call' | 'tool_result';
  data: unknown;
}> {
  yield* streamMinimax(request);
}