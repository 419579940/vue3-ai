import request from '@/utils/request'
import OpenAI from "openai";

const api_key = ''
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: api_key,
  dangerouslyAllowBrowser: true,
});

export function sendMessage(input) {
  return request({
    url: 'https://api.deepseek.com/v1/chat/completions',
    headers: {
      'Authorization': `Bearer ${api_key}`,
      'Content-Type': 'application/json'
    },
    responseType: 'json',
    method: 'post',
    data: {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: input
        }
      ],
    }
  })
}

// 查询余额
export function getBalanceApi() {
  return request({
    url: 'https://api.deepseek.com/user/balance',
    headers: {
      'Authorization': `Bearer ${api_key}`,
      'Content-Type': 'application/json'
    },
    responseType: 'json',
    method: 'get',
    data: {}
  })
}

export function useOpneai(messages, model = 'deepseek-chat') {
  return openai.chat.completions.create({
    model, // DeepSeek-R1: deepseek-reasoner(深度思考)，每百万输入 tokens 1 元（缓存命中）/ 4 元（缓存未命中），每百万输出 tokens 16 元
    messages,
    stream: true,
  })
}
