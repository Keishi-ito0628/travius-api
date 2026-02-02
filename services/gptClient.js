const axios = require('axios');

const defaultOptions = {
  model: 'gpt-4o',
  temperature: 0.8,
  max_tokens: 1000
};

function createOrgKeyError(message) {
  const err = new Error(message);
  err.code = 'ORG_API_KEY_NOT_REGISTERED'; // analyze側で403にする用
  err.status = 403;
  return err;
}

function createOpenAIError(message, detail) {
  const err = new Error(message);
  err.code = 'OPENAI_API_ERROR';
  err.status = 502; // upstream error
  err.detail = detail;
  return err;
}

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

    // ★本番で raw 全ログは重いので必要なら env で制御
    if (process.env.DEBUG_GPT === '1') {
      console.log('[GPT Response Raw]', JSON.stringify(response.data, null, 2));
    }

    const content = response?.data?.choices?.[0]?.message?.content;
    return (content ?? '').trim();

  } catch (error) {
    const detail = error.response?.data || error.message;

    console.error('[GPT呼び出し失敗]', detail);

    // OpenAI側のエラー内容を握りつぶさず “detail” に保持（レスポンスには出さない運用推奨）
    throw createOpenAIError('GPT呼び出しに失敗しました', detail);
  }
}

module.exports = { callGPT };
