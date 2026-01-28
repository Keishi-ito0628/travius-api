const express = require('express');
const router = express.Router();
const { generatePromptWithExplanation } = require('../services/promptBuilder');

router.post('/', async (req, res) => {
  console.log("✅ /analyze endpoint hit");

  try {
    const { dialogLog, gptReply, selectedMode, apiKey } = req.body;

    if (!dialogLog || !gptReply) {
      return res.status(400).json({ error: 'Missing dialogLog or gptReply in request body' });
    }

    // ★ BtoB: APIキー必須（未登録なら使用不可）
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 20) {
      return res.status(403).json({ error: 'API key is required. Please register your API key in the portal.' });
    }

    // dialogLogが文字列なら改行で分割
    const dialogLines = Array.isArray(dialogLog)
      ? dialogLog
      : dialogLog.split('\n').map(line => line.trim()).filter(Boolean);

    console.log("🧠 generatePromptWithExplanation 呼び出し開始");
    console.log("📝 dialogLog:", dialogLines.slice(0, 2));
    console.log("📨 gptReply:", String(gptReply).slice(0, 100));
    console.log("🧭 selectedMode:", selectedMode);
    console.log("🔑 apiKey:", apiKey ? apiKey.slice(0, 7) + '...' : 'none');

    const result = await generatePromptWithExplanation({
      dialogLog: dialogLines,
      gptReply,
      selectedMode,
      apiKey, // ★ 追加
    });

    console.log("✅ generatePromptWithExplanation 結果: ok");

    res.json({
      result,
      tokenUsage: result.tokenUsage || 0
    });

  } catch (err) {
    console.error('❌ Analyze error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
