import request from '@/utils/request'

const api_key = 'sk-8da36f9b33494fdfa0ad4bfc52fdcfd3'

export function sendMessage(input) {
  return request({
    url: 'https://api.doubao.com/your-api-endpoint',
    headers: {
      'Authorization': api_key,
      'Content-Type': 'application/json'
    },
    responseType: 'json',
    method: 'post',
    data: JSON.stringify({
      // 根据接口要求，设置请求体参数，如文本输入等
      input: '你要发送的内容'
    })
  })
}
