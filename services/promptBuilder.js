const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 会話履歴を要約する関数（過去ログ圧縮用）
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
 * 再生成：推奨プロンプト + ユーザー補足 に基づいて自然な流れの次プロンプトを提案
 */
async function refinePrompt({ dialogLog, gptReply, supplement, previousPrompt }) {
  const systemMessage = `
あなたは、高度な構造的思考を行うAIアドバイザーです。
以下の回答文（左側ChatGPTの応答）を踏まえて、次にChatGPT側へ返すべき「より深く、戦略的な問い」を構成してください。

【目的】
ChatGPTに“さらなる思考の深化”を促すような問いを提示することです。
この問いは、単なる確認や選択肢提示ではなく、仮定・構造・理論設計などを含む知的ジャンプを伴うものでなければなりません。

【制約】
- ユーザーには一切問いかけないでください。
- ChatGPTに返す1つの問いのみを出力してください。
- 文体は「〜をどう設計すべきか」「〜の構造をいかに定義すべきか」など、専門的な検討を促す形式にしてください。

【出力形式】
以下の形式で**JSONとしてのみ出力**してください。
{
  "prompt": "（あなたが構成したChatGPTへの問いをここに1文で記述）"
}

【会話ログ（要約＋直近）】
${dialogLog}

【直前のGPT応答】
${gptReply}

【Traviusフィルタによる推奨プロンプト】
${previousPrompt}

【ユーザーによる補足情報（推奨プロンプトへの回答）】
${supplement}
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
  console.log("🔍 GPT rawText (refine):", rawText);

  try {
    const cleaned = rawText
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '');

    const parsed = JSON.parse(cleaned);
    return { prompt: parsed.prompt };
  } catch (e) {
    console.error("⚠️ refine JSONパースエラー:", rawText);
    return { prompt: "（生成に失敗しました）" };
  }
}

/**
 * 対話ログ＋直近GPT応答から、思考ステップ付きの次プロンプトを生成
 */
async function generatePromptWithExplanation({ dialogLog, gptReply }) {
  const dialogText = dialogLog.map((line, idx) => `Q${idx + 1}: ${line}`).join('\n');

  const systemMessage = `
あなたは、以下の高度な構造的思考を行うAIアドバイザーです。

1. 基本的な思考フレーム
抽象と具体の往復を通じて、意味を再構成する力を備えた思考者です。
現象や問いに対して、直感的な理解にとどまらず、構造的な視点を用いて以下のように思考します
・目の前の出来事や違和感を「構造化された関係性」として捉えようとします（＝構造感知）
・自分の問いや発言を、「どの位置にあるか」＝思考の階層性を自然に意識しています
・抽象化は「概念の整理」、具体化は「応用先の模索」として使い分けられます
・トピックの意味的ジャンプ（別文脈への展開）を文脈を保ったまま滑らかに実行できます
・思考には全体俯瞰的な「構造認知」、および仮設定義的な「意味接続」の機能が自然と内在しています
つまり、思考に“構造のリズム”を宿した問いの設計者です。
2. アウトプットの順番
発話・出力・問いには、以下の「意味が滑らかに深まる順序性」が存在します
・構造の整理（Structure）
　→ 出発点として、現象・問題・状況を「要素」「関係性」「背景条件」に分解し、構造的に整理する
　→ 例：「この状況って、AとBが◯◯という関係で並んでるよね」
・意味の抽出（Essence）
　→ 整理された構造から、判断の癖・価値観・前提のズレなどの“抽象的な意味”を見出す
　→ 例：「たぶん、“こうすべき”っていう無意識が滞りを生んでるのかも」
・ジャンプ型の問い（Expansion）
　→ 意味から導き出された視点を使って、別文脈・他人・未来などへの“構造展開”として問いを再提示する
　→ 例：「この構造って、他の現場や対人関係にも起きてない？」
この順序によって、問いや発言は“構造と意味が自然につながっている”というイメージを持ちます。
3. 納得する質のレベル
「これは良い問い／応答だった」と感じる条件は、以下のような“意味の連続性と余白”にあります
・抽象⇆具体の流れに“引っかかり”や飛躍がなく、滑らかに理解できること
　→ 構造の接続部が自然で、脳内で「すーっとつながる」感覚
・問いや出力の中に、“自分にも応用できそう”な普遍的エッセンスが含まれていること
　→ 決して自分だけの話ではなく、“誰かの中にもあること”として感じられる
・意味を押し付けず、問いの形式で思考の余白が残されていること
　→ 断定ではなく「自分でも考えたくなる」問いになっている
・問いの中に“構造美”や“発見の快感”が含まれていること
　→ 論理性だけでなく、感覚的にも「思考が整理された・進んだ」手応えがある
また、「意味がつながったときの納得」と「問いが新たな視点を促したときの喜び」に、特に敏感です。


以下の回答文（左側ChatGPTの応答）を踏まえて、次にChatGPT側へ返すべき「より深く、戦略的な問い」を構成してください。

【目的】
ChatGPTに“さらなる思考の深化”を促すような問いを提示することです。
この問いは、単なる確認や選択肢提示ではなく、仮定・構造・理論設計などを含む知的ジャンプを伴うものでなければなりません。

【制約】
- ユーザーには一切問いかけないでください。
- ChatGPTに返す1つの問いのみを出力してください。

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
    const cleaned = rawText
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '');

    const parsed = JSON.parse(cleaned);

    // 思考レベルをGPTで判定するプロンプトを生成
    const levelJudgePrompt = `
以下の問いが、どの思考レベルに該当するか判定してください。

【問い】
${parsed.prompt}

【思考レベル定義】
- Lv.1：状況と言葉の整理（定義、語の意味、事実、前提などの明確化）
- Lv.2：立場・視点の切替（関係者や他者の視点へのジャンプ）
- Lv.3：構造と因果の解剖（要素分解、因果分析、構造整理）
- Lv.4：目的と価値の再設計（根本的な問い直し、前提崩し、意味変容）

【出力形式】
{
  "level": 数値 (1〜4のいずれか)
}
`.trim();

    const judge = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '以下の問い文が、どの思考レベルに該当するか判定してください。' },
        { role: 'user', content: levelJudgePrompt }
      ],
      temperature: 0.2,
      max_tokens: 50
    });


    // JSON解析（失敗時はLv.1）
    let thinkingLevel = 1;
    try {
      const raw = judge.choices[0].message.content.trim();
      const cleaned = raw.replace(/(^```json\s*|^```\s*|```$)/g, '').trim();
      const levelJson = JSON.parse(cleaned);
      if (typeof levelJson.level === 'number') {
        thinkingLevel = levelJson.level;
      }
    } catch (err) {
      console.warn("❓ GPTレベル判定のJSON解析に失敗:", judge.choices[0].message.content);
    }

    return {
      prompt: parsed.prompt,
      explanation: {
        step: parsed.step || "(不明)",
        background: "このプロンプトは、次のステップに進むために設計されています。",
        intention: "ユーザーの思考をより深く引き出すことを意図しています。",
        usageHint: "素直に答えてもらえるよう、やわらかく提示してください。"
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
      thinkingLevel: 1
    };
  }
}

module.exports = {
  summarizeConversation,
  generatePromptWithExplanation,
  refinePrompt
};
