const dotenv = require('dotenv');
dotenv.config();
const axios = require('axios');

const defaultOptions = {
model: 'gpt-4o',
temperature: 0.8,
max_tokens: 1000
};

async function callGPT(messages, options = {}) {
const apiKey = process.env.OPENAI_API_KEY;

console.log('[API KEY]', apiKey);

if (!apiKey) throw new Error('❌ OPENAI_API_KEY is missing in .env file');

const { model, temperature, max_tokens } = { ...defaultOptions, ...options };

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
'Authorization': `Bearer ${apiKey}`,
'Content-Type': 'application/json'
}
}
);

console.log('[GPT Response Raw]', JSON.stringify(response.data, null, 2));



return response.data.choices[0].message.content.trim();
} catch (error) {
console.error('[GPT呼び出し失敗]', error.response?.data || error.message);
throw new Error('GPT呼び出しに失敗しました');
}
}

module.exports = { callGPT };
