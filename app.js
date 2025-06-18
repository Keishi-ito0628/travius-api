const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// ルートファイルを読み込み
const analyzeRoute = require('./routes/analyze');
const suggestRoute = require('./routes/suggest');
const chatRoute = require('./routes/chat');
const summarizeRoute = require('./routes/summarize'); // 🆕 ここを追加！

// ミドルウェア設定
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// APIルート定義
app.use('/analyze', analyzeRoute);
app.use('/suggest', suggestRoute);
app.use('/chat', chatRoute);
app.use('/summarize', summarizeRoute); // 🆕 ここを追加！

// ヘルスチェック
app.get('/', (req, res) => {
  res.send('✅ Travius API is running.');
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Travius API running at http://localhost:${PORT}`);
  console.log(`🔑 OPENAI_API_KEY = ${process.env.OPENAI_API_KEY?.slice(0, 10)}...`);
});
