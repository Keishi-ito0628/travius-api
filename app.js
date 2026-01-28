const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
console.log('=== ENV CHECK START ===');
console.log('DB_HOST:', process.env.DB_HOST ? 'OK' : 'NG');
console.log('DB_USER:', process.env.DB_USER ? 'OK' : 'NG');
console.log('DB_NAME:', process.env.DB_NAME ? 'OK' : 'NG');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'OK' : 'NG');
console.log('=== ENV CHECK END ===');

const app = express();

// ルートファイルを読み込み
const analyzeRoute = require('./routes/analyze');
const suggestRoute = require('./routes/suggest');
const chatRoute = require('./routes/chat');
const summarizeRoute = require('./routes/summarize');

// ミドルウェア設定
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// APIルート定義
app.use('/analyze', analyzeRoute);
app.use('/suggest', suggestRoute);
app.use('/chat', chatRoute);
app.use('/summarize', summarizeRoute);

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
