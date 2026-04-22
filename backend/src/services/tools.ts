/**
 * 内置工具注册表 - Function Calling Demo
 * 提供天气查询等示例工具
 */

import type { Tool, ToolCall, ToolResult } from '../types/index.js';

// ============ 工具定义 ============

export const AVAILABLE_TOOLS: Tool[] = [
  {
    name: 'get_weather',
    description: '查询指定城市的天气信息',
    inputSchema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称（中文），如"北京"、"上海"',
        },
        unit: {
          type: 'string',
          description: '温度单位：celsius（摄氏度）或 fahrenheit（华氏度）',
          enum: ['celsius', 'fahrenheit'],
        },
      },
      required: ['city'],
    },
  },
  {
    name: 'get_time',
    description: '获取当前时间',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: '时区名称，如 "Asia/Shanghai"、"America/New_York"',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_code',
    description: '搜索代码片段或文档',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
        language: {
          type: 'string',
          description: '编程语言，如 "python", "javascript"',
        },
      },
      required: ['query'],
    },
  },
];

// ============ 工具执行器 ============

async function executeGetWeather(args: { city: string; unit?: string }): Promise<unknown> {
  // 模拟天气数据
  const weatherData: Record<string, { temp: number; condition: string; humidity: number }> = {
    '北京': { temp: 22, condition: '晴', humidity: 45 },
    '上海': { temp: 25, condition: '多云', humidity: 60 },
    '深圳': { temp: 28, condition: '阵雨', humidity: 75 },
    '杭州': { temp: 24, condition: '阴', humidity: 55 },
    '广州': { temp: 27, condition: '晴', humidity: 50 },
  };

  const unit = args.unit === 'fahrenheit' ? '°F' : '°C';
  const data = weatherData[args.city];

  if (!data) {
    return { error: `未找到城市 "${args.city}" 的天气数据`, available: Object.keys(weatherData) };
  }

  const tempC = data.temp;
  const temp = unit === '°F' ? (tempC * 9 / 5) + 32 : tempC;

  return {
    city: args.city,
    temperature: `${temp.toFixed(1)}${unit}`,
    condition: data.condition,
    humidity: `${data.humidity}%`,
  };
}

async function executeGetTime(args: { timezone?: string }): Promise<unknown> {
  const now = new Date();
  const timezone = args.timezone || 'Asia/Shanghai';

  try {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';

    return {
      timezone,
      datetime: `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`,
      unix: now.getTime(),
    };
  } catch {
    return { error: `无效的时区: ${timezone}` };
  }
}

async function executeSearchCode(args: { query: string; language?: string }): Promise<unknown> {
  // 模拟代码搜索结果
  const results = [
    {
      title: `实现 ${args.query} 的示例`,
      language: args.language || 'python',
      code: `def ${args.query.replace(/\s+/g, '_')}():\n    # TODO: 实现逻辑\n    pass`,
    },
  ];

  return {
    query: args.query,
    results,
    total: results.length,
  };
}

// ============ 执行工具 ============

export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { name, arguments: args, id } = toolCall;

  try {
    let result: unknown;

    switch (name) {
      case 'get_weather':
        result = await executeGetWeather(args as { city: string; unit?: string });
        break;
      case 'get_time':
        result = await executeGetTime(args as { timezone?: string });
        break;
      case 'search_code':
        result = await executeSearchCode(args as { query: string; language?: string });
        break;
      default:
        result = { error: `未知工具: ${name}` };
    }

    return {
      toolCallId: id,
      name,
      result,
    };
  } catch (error) {
    return {
      toolCallId: id,
      name,
      result: { error: error instanceof Error ? error.message : 'Unknown error' },
      isError: true,
    };
  }
}

// 解析 MiniMax 的 tool_calls 格式
export function parseMiniMaxToolCalls(choice: {
  message?: { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> };
  finish_reason?: string;
}): ToolCall[] {
  const toolCalls = choice.message?.tool_calls;
  if (!toolCalls) return [];

  return toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments || '{}'),
  }));
}

// 转换为 OpenAI tools 格式
export function toMiniMaxToolsFormat(): Array<{ type: string; function: { name: string; description: string; parameters: Tool['inputSchema'] } }> {
  return AVAILABLE_TOOLS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}