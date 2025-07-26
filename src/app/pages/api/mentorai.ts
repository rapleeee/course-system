// pages/api/llama.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;

  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3-8b-instruct",
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 512,
      }),
    });

    const json = await response.json();

    const reply = json.choices?.[0]?.message?.content ?? "AI tidak memberikan jawaban.";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("API llama error:", error);
    res.status(500).json({ reply: "Maaf, terjadi kesalahan saat menghubungi AI." });
  }
}