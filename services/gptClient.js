const axios = require('axios');

const defaultOptions = {
  model: 'gpt-4o',
  temperature: 0.8,
  max_tokens: 1000
};

/**
 * OpenAI(Chat Completions) 呼び出し
 * @param {Array} messages - OpenAI形式のmessages配列
 * @param {string} apiKey - 組織ごとのOpenAI APIキー
 * @param {Object} options - model / temperature / max_tokens の上書き
 */
async function callGPT(messages, apiKey, options = {}) {

  if (!apiKey) {
    throw new Error('❌ OpenAI API key is not provided for this organization');
  }

  console.log('[API KEY]', apiKey.slice(0, 7) + '...');

  const { model, temperature, max_tokens } = {
    ...defaultOptions,
    ...options
  };

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        temperature,
        max_tokens
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[GPT Response Raw]', JSON.stringify(response.data, null, 2));

    return response.data.choices[0].message.content.trim();

  } catch (error) {
    console.error(
      '[GPT呼び出し失敗]',
      error.response?.data || error.message
    );
    throw new Error('GPT呼び出しに失敗しました');
  }
}

module.exports = { callGPT };
