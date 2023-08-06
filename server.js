const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const base = "https://api.prodia.com/v1";

const headers = {
  "X-Prodia-Key": process.env.PRODIA_API_KEY,
  "Content-Type": "application/json",
};

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
    res.status(500).send(error);
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
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
