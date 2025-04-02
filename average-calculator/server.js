const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
let numberWindow = [];

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQzNjAzOTQ3LCJpYXQiOjE3NDM2MDM2NDcsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjA5ZmVjNDRlLTUyNmItNDNlMy05ODI5LWE4YjI3ZjU5OGEyMiIsInN1YiI6IjIyMDUyODE2QGtpaXQuYWMuaW4ifSwiZW1haWwiOiIyMjA1MjgxNkBraWl0LmFjLmluIiwibmFtZSI6ImhhcnNoIGt1bWFyIiwicm9sbE5vIjoiMjIwNTI4MTYiLCJhY2Nlc3NDb2RlIjoibndwd3JaIiwiY2xpZW50SUQiOiIwOWZlYzQ0ZS01MjZiLTQzZTMtOTgyOS1hOGIyN2Y1OThhMjIiLCJjbGllbnRTZWNyZXQiOiJHWGNYYUhtUVFNVVFGQ2JZIn0.migeZWPxQW5MFthAVv42yS3GrZURgHprrRRrVVDCipw";

const urls = {
  'p': 'http://20.244.56.144/evaluation-service/primes',
  'f': 'http://20.244.56.144/evaluation-service/fibo',
  'e': 'http://20.244.56.144/evaluation-service/even',
  'r': 'http://20.244.56.144/evaluation-service/rand'
};

app.get('/numbers/:type', async (req, res) => {
  const type = req.params.type;
  
  if (!urls[type]) {
    return res.status(400).json({ error: "Invalid type parameter" });
  }

  try {
    const response = await axios.get(urls[type], {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      timeout: 5000,
    });

    const newNumbers = response.data.numbers;
    const windowPrevState = [...numberWindow];

    numberWindow = [...new Set([...numberWindow, ...newNumbers])].slice(-WINDOW_SIZE);
    const avg = numberWindow.reduce((a, b) => a + b, 0) / numberWindow.length;

    res.json({
      windowPrevState,
      windowCurrState: numberWindow,
      numbers: newNumbers,
      avg: parseFloat(avg.toFixed(2))
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch numbers", details: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
