const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const base = "https://api.prodia.com/v1";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const headers = {
  "X-Prodia-Key": process.env.PRODIA_API_KEY,
  "Content-Type": "application/json",
};

function generatePrompt(theme, genre) {
  return `Write a song lyric about the theme "${theme} in the genre of ${genre}". Feel free to be creative and expressive. `;
}

app.use(express.json());
app.use(cors());

let counter = 0;
let timestamp = Date.now();

app.use((req, res, next) => {
  const currentTimestamp = Date.now();

  if (currentTimestamp - timestamp > 3600000) {
    counter = 0;
    timestamp = currentTimestamp;
  }

  if (counter >= 50) {
    return res
      .status(429)
      .send("You have exceeded the limit of 50 generations per hour.");
  }

  next();
});

//PRODIA
app.post("/job", async (req, res) => {
  try {
    counter++;
    console.log(`Incrementing counter to: ${counter}`);

    const params = req.body;
    const response = await fetch(`${base}/job`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    if (response.status !== 200) {
      throw new Error(`Bad Prodia Response: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

app.get("/job/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const response = await fetch(`${base}/job/${jobId}`, {
      headers,
    });

    if (response.status !== 200) {
      throw new Error(`Bad Prodia Response: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

// OPENAI
app.post("/generate-lyrics", async (req, res) => {
  const theme = req.body.theme || "";
  const genre = req.body.genre || "no specific genre";

  if (theme.trim().length === 0) {
    return res.status(400).json({
      error: {
        message: "Please enter a valid theme for the song.",
      },
    });
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant. upon each verse or chorus, create a large space between the verse/chorus and the lyrics.",
    },
    {
      role: "user",
      content: generatePrompt(theme),
    },
  ];

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.6,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Response: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json({ result: data.choices[0].message.content.trim() });
  } catch (error) {
    console.error(`Error with OpenAI API request: ${error.message}`);
    res.status(500).json({
      error: {
        message: "An error occurred during your request.",
      },
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
