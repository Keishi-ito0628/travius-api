const express = require('express');
const router = express.Router();
const { callGPT } = require('../services/gptClient');

router.post('/', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const messages = [{ role: "user", content: prompt }];
    const reply = await callGPT(messages);

    res.json({ result: reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
