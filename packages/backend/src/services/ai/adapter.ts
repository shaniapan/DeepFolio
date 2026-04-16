export type AIModel = 'openai' | 'deepseek' | 'qwen' | 'claude' | 'kimi' | 'minimax';

export interface AICallParams {
  model: AIModel;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
}

export async function callAI(params: AICallParams): Promise<string> {
  const { model, apiKey, systemPrompt, userPrompt, jsonMode } = params;

  let url = '';
  let payload: any = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3
  };

  if (model === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    payload.model = 'gpt-4o-mini';
    if (jsonMode) payload.response_format = { type: 'json_object' };
  } else if (model === 'deepseek') {
    url = 'https://api.deepseek.com/chat/completions';
    payload.model = 'deepseek-chat';
    if (jsonMode) payload.response_format = { type: 'json_object' };
  } else if (model === 'qwen') {
    url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    payload.model = 'qwen-plus';
    if (jsonMode) payload.response_format = { type: 'json_object' };
  } else if (model === 'kimi') {
    url = 'https://api.moonshot.cn/v1/chat/completions';
    payload.model = 'moonshot-v1-8k';
    if (jsonMode) payload.response_format = { type: 'json_object' };
  } else if (model === 'minimax') {
    url = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
    payload.model = 'abab6.5s-chat';
    if (jsonMode) payload.response_format = { type: 'json_object' };
  } else {
    throw new Error(`Model ${model} not implemented`);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API Error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
