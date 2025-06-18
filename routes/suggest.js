const express = require('express');
const router = express.Router();
const {
  buildPromptForSuggestion,
  buildPromptFromDialog
} = require('../services/promptBuilder');
const { callGPT } = require('../services/gptClient');

router.post('/', async (req, res) => {
  try {
    const { prompt, gptReply, talce } = req.body;

    if (!prompt || !talce) {
      return res.status(400).json({ error: 'Missing prompt or talce in request body' });
    }

    let messages;
    if (gptReply) {
      messages = buildPromptFromDialog({ prompt, gptReply, talce });
      console.log('[Suggest] Using dialog-based prompt:', JSON.stringify(messages, null, 2));
    } else {
      messages = buildPromptForSuggestion({ prompt, talce });
      console.log('[Suggest] Using standalone prompt:', JSON.stringify(messages, null, 2));
    }

    const gptResponse = await callGPT(messages);

    res.json({ result: gptResponse });
  } catch (err) {
    console.error('Suggest error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
