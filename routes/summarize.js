const express = require('express');
const router = express.Router();
const { summarizeConversation } = require('../services/promptBuilder'); // 必要に応じて調整

router.post('/', async (req, res) => {
  try {
    console.log('📥 /summarize リクエスト受信:', JSON.stringify(req.body).slice(0, 500)); // ログ出力追加

    // フロント側が { messages: text } と送っている想定に変更
    const { messages } = req.body;
    if (!messages || typeof messages !== 'string') {
      return res.status(400).json({ error: 'messages が存在しないか文字列ではありません' });
    }

    // 必要なら文字列 → 行ごとに分割 → role/textのオブジェクト配列に変換
    const lines = messages
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^(GPT|ユーザー):\s*(.*)$/);
        if (!match) return null;
        return {
          role: match[1] === 'GPT' ? 'assistant' : 'user',
          text: match[2],
        };
      })
      .filter(Boolean);

    if (lines.length === 0) {
      return res.status(400).json({ error: '変換後の会話履歴が空です' });
    }

    const summary = await summarizeConversation(lines);
    res.json({ result: summary });

  } catch (err) {
    console.error('❌ summarize API error:', err);
    res.status(500).json({ error: '内部サーバーエラー' });
  }
});

module.exports = router;
