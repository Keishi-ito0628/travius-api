const express = require('express');
const router = express.Router();
const {
  generatePromptWithExplanation
} = require('../services/promptBuilder');

router.post('/', async (req, res) => {
  console.log("✅ /analyze endpoint hit");

  try {
    const { dialogLog, gptReply, selectedMode } = req.body;

    if (!dialogLog || !gptReply) {
      return res.status(400).json({ error: 'Missing dialogLog or gptReply in request body' });
    }

    // dialogLogが文字列なら改行で分割
    const dialogLines = Array.isArray(dialogLog)
      ? dialogLog
      : dialogLog.split('\n').map(line => line.trim()).filter(Boolean);

      console.log("🧠 generatePromptWithExplanation 呼び出し開始");
      console.log("📝 dialogLog:", dialogLines.slice(0, 2)); // 一部だけ
      console.log("📨 gptReply:", gptReply.slice(0, 100));  // 先頭だけ
      console.log("🧭 selectedMode:", selectedMode);

    const result = await generatePromptWithExplanation({
      dialogLog: dialogLines,
      gptReply,
      selectedMode
    });

    console.log("✅ generatePromptWithExplanation 結果:", result);

    res.json({
      result,
      tokenUsage: result.tokenUsage || 0   // ← ここを追加！
    });

  } catch (err) {
    console.error('❌ Analyze error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
