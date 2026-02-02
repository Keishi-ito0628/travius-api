const { OpenAI } = require('openai');

/**
 * OpenAIクライアントをリクエスト毎に作る（顧客APIキー対応）
 */
function createOpenAIClient(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 20) {
    const err = new Error('API key is missing or invalid');
    err.code = 'ORG_API_KEY_NOT_REGISTERED';
    err.status = 403;
    throw err;
  }
  return new OpenAI({ apiKey: apiKey.trim() });
}

/**
 * 会話履歴を要約する関数
 */
async function summarizeConversation(history, apiKey) {
  try {
    console.log('🧪 [summarizeConversation] 受信件数:', history.length);
    if (history.length > 0) {
      console.log('📝 最初の発言:', history[0]);
    }

    const openai = createOpenAIClient(apiKey);

    const messages = history.map(entry => ({
      role: entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text
    }));

    messages.push({
      role: 'system',
      content: '上記の会話の要点を簡潔にまとめてください。'
    });

    console.log('📤 送信メッセージ数（含system）:', messages.length);

    const chat = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 300
    });

    const summary = chat.choices?.[0]?.message?.content?.trim() || '';
    console.log('📥 要約結果（先頭300字）:', summary.slice(0, 300));

    return summary;

  } catch (err) {
    console.error('❌ [summarizeConversation] エラー:', err);
    throw err;
  }
}

/**
 * 対話ログ＋直近GPT応答＋（optional）思考モードに基づく次プロンプト生成
 */
async function generatePromptWithExplanation({ dialogLog, gptReply, selectedMode, apiKey }) {
  console.log("🚀 [generatePromptWithExplanation] 開始");
  console.log("🧾 dialogLog（先頭2件）:", dialogLog?.slice?.(0, 2));
  console.log("📌 gptReply（先頭100字）:", String(gptReply || '').slice(0, 100));
  console.log("🎯 selectedMode:", selectedMode);

  const openai = createOpenAIClient(apiKey);

  const dialogText = (dialogLog || []).map((line, idx) => `Q${idx + 1}: ${line}`).join('\n');

  // 🎯 selectedModeに応じて systemPrompt を分岐
  const thinkingModeDescriptions = {
    1: "現在の状況や用語の意味、事実を簡潔に整理する問いを作成してください。立場・構造・因果・目的などの深掘りや分析は行わず、表面的な情報整理にとどめてください。誰がどう考えるか、なぜそうなるか、何のためにという問いは含めないでください。",
    2: "関係者や立場の異なる人物の視点を明示的に取り入れ、それぞれの立場での解釈の違いや優先事項に焦点を当てた問いを構成してください。",
    3: "問題や状況を構成する要素に分解し、それらの因果関係・構造的仕組みに焦点を当て、背後にあるメカニズムを明らかにする問いを構成してください。",
    4: "目的や前提となっている価値観を改めて問い直し、そもそも何のために行うのか、どんな意味を持たせるべきかといった観点から、新しい視点を引き出す問いを構成してください。"
  };

  const modeInstruction = selectedMode && thinkingModeDescriptions[selectedMode]
    ? `
    【指示】
    今回は「モード${selectedMode}」を使用してください。
    ${thinkingModeDescriptions[selectedMode]}
    このモードに従い、次にChatGPTに返すべき深く構造的な問いを1つ構成してください。
    `
    : "";  // ← fallbackも入れておくと安全！

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

  ４.仮説の立て方（Integral Profile）
  思考の出発点や意味の仮定を置く際に、以下のような仮説傾向を持つ

  - 【内因探求／外因仮説】のどちらを起点とするか
  - 【構造モデル／象徴解釈】のどちらで仮説を組み立てるか

  この2軸により、仮説傾向は以下の4タイプのいずれかに分類される：

  ---

  自己構造仮説型（Internal × Structural）
  - 内面の因果構造や行動原理を明確にしようとする傾向
  - 「なぜそうしたのか」「自分の判断基準とは何か」などを因果的に問い直す
  - → 構造化された自己分析やOS系の問いかけが有効

  自己象徴仮説型（Internal × Symbolic）
  - 感情・記憶・夢などの象徴を通じて自分の意味を掘り下げる傾向
  - 「この出来事は何を象徴しているか？」「なぜこの表現に惹かれたのか？」
  - → メタファー、感覚的接続、コアに近づくプロンプトが有効

  社会構造仮説型（External × Structural）
  - 社会的背景や他者との関係構造から仮説を立てる傾向
  - 「この構造が影響したのでは？」「関係性の配置によって意味が変わるのでは？」
  - → 因果関係・フレームワーク・社会的力学への言及が有効

  意味現象仮説型（External × Symbolic）
  - 出来事や発言の背後にある“象徴的な意味”を読み取ろうとする傾向
  - 「この偶然には意味がある気がする」「これは流れの兆候では？」
  - → 直観・共時性・意味連想を引き出す問いが有効

  ${modeInstruction}

  以下のChatGPTの回答（左側の応答）を踏まえて、ユーザーが次にChatGPTへ投げるべき「一歩踏み込んだ、思考を深めるための問い」を1文で構成してください。

  【制約】
  - 出力する問いは、人間がChatGPTに対してそのまま自然に使えるような、わかりやすく親しみやすい言葉で構成してください。
  - ユーザーには一切問いかけないでください。
  - ChatGPTに返す1つの問いのみを出力してください。

  【出力形式】
  以下の形式で**JSONとしてのみ出力**してください。また、**直前のChatGPTが使用した言語（日本語、英語など）を検出し、その言語で出力してください。混在している場合は、最も多く使われている言語に従ってください。**

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

  const rawText = chat.choices?.[0]?.message?.content?.trim() || '';
  if (process.env.DEBUG_GPT === '1') {
    console.log("🔍 GPT rawText:", rawText);
  }

  try {
    const cleaned = rawText.replace(/```(json)?\s*|\s*```/g, '');
    const parsed = JSON.parse(cleaned);
    const totalTokens = chat.usage?.total_tokens || 0;
    let thinkingLevel = Number(selectedMode) || 1;

    return {
      prompt: parsed.prompt,
      explanation: {
        step: "(思考モードに基づく出力)",
        background: "このプロンプトは、指定された思考モードに沿って構成されています。",
        intention: "ユーザーの思考を特定の方向に深めることを意図しています。",
        usageHint: "モードに沿った問いとして、丁寧に提示してください。"
      },
      thinkingLevel,
      tokenUsage: totalTokens

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
      thinkingLevel: Number(selectedMode) || 1,
      tokenUsage: 0
    };
  }
}

module.exports = {
  summarizeConversation,
  generatePromptWithExplanation
};
