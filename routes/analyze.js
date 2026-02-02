const express = require('express');
const router = express.Router();
const { generatePromptWithExplanation } = require('../services/promptBuilder');

// ✅ ここはあなたの既存DB接続に合わせて読み替え
// 例）mysql2/promise の pool を export している想定
const { pool } = require('../db'); // ←パスは環境に合わせて調整

async function getOrgApiKey(orgId) {
  const [rows] = await pool.query(
    `
    SELECT
      org_openai_api_key_enc AS api_key_enc
    FROM M_org
    WHERE org_record_ID = ?
    LIMIT 1
    `,
    [orgId]
  );

  if (!rows || rows.length === 0) {
    const err = new Error('Organization not found');
    err.code = 'ORG_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const apiKeyEnc = rows[0].api_key_enc;

  if (!apiKeyEnc || typeof apiKeyEnc !== 'string' || apiKeyEnc.trim().length < 20) {
    const err = new Error('OpenAI API key is not registered for this organization');
    err.code = 'ORG_API_KEY_NOT_REGISTERED';
    err.status = 403;
    throw err;
  }

  // ★当面：enc列を「平文 or 復号済みキー」として扱う
  // ★暗号化しているならここで復号する（この関数だけ差し替えればOK）
  return apiKeyEnc.trim();
}

router.post('/', async (req, res) => {
  console.log("✅ /analyze endpoint hit");

  try {
    const { orgId, dialogLog, gptReply, selectedMode } = req.body;

    // ✅ orgId 必須
    if (!orgId) {
      return res.status(400).json({
        ok: false,
        code: 'ORG_ID_REQUIRED',
        error: 'Missing orgId in request body'
      });
    }

    if (!dialogLog || !gptReply) {
      return res.status(400).json({
        ok: false,
        code: 'MISSING_REQUIRED_FIELDS',
        error: 'Missing dialogLog or gptReply in request body'
      });
    }

    // ✅ orgId -> DBからAPIキー取得（未登録なら403）
    const apiKey = await getOrgApiKey(orgId);

    // dialogLogが文字列なら改行で分割
    const dialogLines = Array.isArray(dialogLog)
      ? dialogLog
      : String(dialogLog).split('\n').map(line => line.trim()).filter(Boolean);

    console.log("🧠 generatePromptWithExplanation 呼び出し開始");
    console.log("🏢 orgId:", orgId);
    console.log("📝 dialogLog:", dialogLines.slice(0, 2));
    console.log("📨 gptReply:", String(gptReply).slice(0, 100));
    console.log("🧭 selectedMode:", selectedMode);
    // 🔑 apiKeyログは出さない（漏洩リスク）

    const result = await generatePromptWithExplanation({
      dialogLog: dialogLines,
      gptReply,
      selectedMode,
      apiKey, // ✅ DBから注入
    });

    console.log("✅ generatePromptWithExplanation 結果: ok");

    return res.json({
      ok: true,
      result,
      tokenUsage: result.tokenUsage || 0
    });

  } catch (err) {
    // ✅ ここで “方針どおりの明示エラー” を返す
    if (err.code === 'ORG_API_KEY_NOT_REGISTERED') {
      return res.status(403).json({
        ok: false,
        code: 'ORG_API_KEY_NOT_REGISTERED',
        error: 'API key is required. Please register your API key in the portal.'
      });
    }

    if (err.code === 'ORG_NOT_FOUND') {
      return res.status(404).json({
        ok: false,
        code: 'ORG_NOT_FOUND',
        error: 'Organization not found'
      });
    }

    // promptBuilder/gptClient 側で code/status を付けている場合にも追従
    if (err.status && err.code) {
      return res.status(err.status).json({
        ok: false,
        code: err.code,
        error: err.message
      });
    }

    console.error('❌ Analyze error:', err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_ERROR',
      error: 'Internal server error'
    });
  }
});
console.log("🏢 orgId:", orgId);

module.exports = router;
