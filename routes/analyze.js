const express = require('express');
const router = express.Router();
const { generatePromptWithExplanation } = require('../services/promptBuilder');

// ✅ ここはあなたの既存DB接続に合わせて読み替え

async function getOrgApiKey(orgId) {
  const url = process.env.ORG_KEY_API_URL;
  const token = process.env.INTERNAL_API_TOKEN;

  if (!url) {
    const err = new Error("ORG_KEY_API_URL is missing");
    err.code = "CONFIG_MISSING_ORG_KEY_API_URL";
    err.status = 500;
    throw err;
  }
  if (!token) {
    const err = new Error("INTERNAL_API_TOKEN is missing");
    err.code = "CONFIG_MISSING_INTERNAL_API_TOKEN";
    err.status = 500;
    throw err;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Internal-Token": token,
    },
    body: new URLSearchParams({ orgId: String(orgId) }),
  });

  const data = await res.json().catch(() => ({}));

  // HTTP失敗
  if (!res.ok) {
    const err = new Error(data.error || data.code || "ORG_KEY_API_ERROR");
    err.code = data.code || "ORG_KEY_API_ERROR";
    err.status = res.status;
    throw err;
  }

  // HTTPは200でも、アプリとして失敗
  if (data.ok === false) {
    const err = new Error(data.error || data.code || "ORG_KEY_API_ERROR");
    err.code = data.code || "ORG_KEY_API_ERROR";
    err.status = 400;
    throw err;
  }

  if (!data.apiKey) {
    const err = new Error("API key not returned");
    err.code = "ORG_KEY_API_EMPTY";
    err.status = 500;
    throw err;
  }

  return data.apiKey;
}


router.post('/', async (req, res) => {
  console.log("✅ /analyze endpoint hit");

  try {
    const { orgId, dialogLog, gptReply, selectedMode } = req.body;
    console.log("🏢 orgId:", orgId);

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

module.exports = router;
