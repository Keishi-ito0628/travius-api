const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 会話履歴を要約する関数
 */
async function summarizeConversation(history) {
  const messages = history.map(entry => ({
    role: entry.role === 'user' ? 'user' : 'assistant',
    content: entry.text
  }));

  messages.push({
    role: 'system',
    content: '上記の会話の要点を簡潔にまとめてください。'
  });

  const chat = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 300
  });

  return chat.choices[0].message.content.trim();
}

/**
 * 対話ログ＋直近GPT応答＋（optional）思考モードに基づく次プロンプト生成
 */
async function generatePromptWithExplanation({ dialogLog, gptReply, selectedMode }) {
  const dialogText = dialogLog.map((line, idx) => `Q${idx + 1}: ${line}`).join('\n');

  // 🎯 selectedModeに応じて systemPrompt を分岐
  const thinkingModeDescriptions = {
    1: "状況や言葉の定義、事実の整理、背景条件の明確化に特化した問いを構成してください。",
    2: "他者や関係者の視点を想像し、それに基づく立場の変化や視点の転換を促す問いを構成してください。",
    3: "事象を要素に分解し、因果関係や構造的な仕組みを明らかにする問いを構成してください。",
    4: "目的や価値を再定義し、前提を問い直すような意味変容的な問いを構成してください。"
  };

  const modeInstruction = selectedMode && thinkingModeDescriptions[selectedMode]
    ? `あなたは「モード${selectedMode}」に従い、${thinkingModeDescriptions[selectedMode]}`
    : `あなたは、構造的思考を用いて「次にGPTに返すべき深い問い」を構成するアドバイザーです。`;

  const systemMessage = `
${modeInstruction}

【出力形式】
以下の形式で**JSONとしてのみ出力**してください。
{
  "prompt": "（あなたが構成したChatGPTへの問いをここに1文で記述）"
}

【会話ログ（要約＋直近）】
${dialogText}

【直前のGPT応答】
${gptReply}
`.trim();

  const chat = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: "上記の形式で出力してください。" }
    ],
    temperature: 0.8,
    max_tokens: 600
  });

  const rawText = chat.choices[0].message.content.trim();
  console.log("🔍 GPT rawText:", rawText);

  try {
    const cleaned = rawText.replace(/```(json)?\s*|\s*```/g, '');
    const parsed = JSON.parse(cleaned);

    let thinkingLevel = Number(selectedMode) || 1;

    return {
      prompt: parsed.prompt,
      explanation: {
        step: "(思考モードに基づく出力)",
        background: "このプロンプトは、指定された思考モードに沿って構成されています。",
        intention: "ユーザーの思考を特定の方向に深めることを意図しています。",
        usageHint: "モードに沿った問いとして、丁寧に提示してください。"
      },
      thinkingLevel
    };
  } catch (e) {
    console.error("⚠️ JSONパースエラー:", rawText);
    return {
      prompt: "（生成に失敗しました）",
      explanation: {
        step: "(不明)",
        background: "生成された応答が正しい形式ではありませんでした。",
        intention: "形式エラーのため狙いを取得できませんでした。",
        usageHint: "もう一度試すか、開発者に確認してください。"
      },
      thinkingLevel: Number(selectedMode) || 1
    };
  }
}

module.exports = {
  summarizeConversation,
  generatePromptWithExplanation
};
