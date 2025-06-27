const express = require('express');
const router = express.Router();
const {
  generatePromptWithExplanation
} = require('../services/promptBuilder');

router.post('/', async (req, res) => {
  console.log("✅ /analyze endpoint hit");

  try {
    const { dialogLog, gptReply, selectedMode } = req.body;  // 🆕 selectedMode を追加で受け取る

    if (!dialogLog || !gptReply) {
      return res.status(400).json({ error: 'Missing dialogLog or gptReply in request body' });
    }

    // dialogLogが文字列なら改行で分割
    const dialogLines = Array.isArray(dialogLog)
      ? dialogLog
      : dialogLog.split('\n').map(line => line.trim()).filter(Boolean);

    const result = await generatePromptWithExplanation(
      console.log("🚀 /analyze API起動: mode =", selectedMode);
      console.log("📄 dialogLog.length:", dialogLog?.length || 0);
      console.log("📎 lastReply:", gptReply.slice(0, 100));

      {
      dialogLog: dialogLines,
      gptReply,
      selectedMode  // 🆕 ここで渡す
    });

    res.json({ result });
  } catch (err) {
    console.error('❌ Analyze error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
