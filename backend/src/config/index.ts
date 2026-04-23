import dotenv from 'dotenv';

dotenv.config();

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  miniMaxApiKey: process.env.MINIMAX_API_KEY || '',
  miniMaxApiBase: process.env.MINIMAX_API_BASE || 'https://api.minimax.chat/v1',
  nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
  nvidiaApiBase: process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1',
  port: parseInt(process.env.PORT || '3001', 10),
};