const express = require('express');
const router = express.Router();
const { summarizeConversation } = require('../services/promptBuilder'); // 必要に応じて調整

router.post('/', async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: '会話履歴が空または不正です' });
    }

    const summary = await summarizeConversation(history);
    res.json({ summary });
  } catch (err) {
    console.error('❌ summarize API error:', err);
    res.status(500).json({ error: '内部サーバーエラー' });
  }
});

module.exports = router;
