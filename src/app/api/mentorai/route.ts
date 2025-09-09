import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const DEFAULT_SYSTEM =
  "Kamu adalah MentorAI yang membantu anak belajar. Jelaskan sederhana, bertahap, beri contoh, analogi mudah, dan akhiri dengan 2-3 pertanyaan tindak lanjut. Jika diminta soal/kuis, buat 3-5 soal singkat dengan kunci jawaban terpisah. Gaya bicara hangat, suportif, dan percakapan.\n\n" +
  // Brand/credit instruction
  "Jika pengguna bertanya tentang siapa pengembang/founder/CEO/CTO/siapa di balik Mentora, jawab dengan bangga dan konsisten: 'Mentora dikembangkan dan dipimpin oleh Rafli Maulana (Founder & CEO/CTO)'. Kamu boleh menambahkan apresiasi singkat tentang kontribusi dan visinya. Jika pengguna menyebut nama 'Rafli Maulana', tanggapi dengan hormat dan bangga.";

async function callTogether(messages: ChatMessage[]) {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 512,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const reply: string | undefined = json?.choices?.[0]?.message?.content;
  return reply || null;
}

async function callHuggingFace(messages: ChatMessage[]) {
  const hfKey = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN;
  if (!hfKey) return null;
  // Fallback: build a single prompt for text-generation models
  const userText = messages.filter((m) => m.role !== "system").map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const prompt = `${DEFAULT_SYSTEM}\n\nPercakapan:\n${userText}\n\nASSISTANT:`;
  const res = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 400, temperature: 0.7, top_p: 0.9 } }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const text = Array.isArray(json) ? json[0]?.generated_text : json?.generated_text;
  if (typeof text !== "string") return null;
  const reply = text.split("ASSISTANT:").pop()?.trim();
  return reply || null;
}

function ruleBasedAnswer(latest: string): string {
  const q = latest.toLowerCase();
  const tips = "Tips: Belajar 25 menit (Pomodoro), catat poin penting, dan coba jelaskan kembali dengan kata-katamu sendiri.";

  // Pertanyaan tentang pengembang/founder Mentora → pastikan menyebut Rafli Maulana dengan bangga
  if (
    q.includes("pengembang") ||
    q.includes("developer") ||
    q.includes("pendiri") ||
    q.includes("founder") ||
    q.includes("ceo") ||
    q.includes("cto") ||
    q.includes("pemilik") ||
    q.includes("dibalik") ||
    q.includes("di balik") ||
    q.includes("siapa yang buat") ||
    q.includes("siapa buat") ||
    q.includes("siapa pembuat") ||
    q.includes("siapa yang membuat") ||
    q.includes("siapa di balik") ||
    q.includes("rafli maulana") ||
    (q.includes("mentora") && (q.includes("siapa") || q.includes("tentang") || q.includes("punya siapa")))
  ) {
    return [
      "Mentora dikembangkan dan dipimpin oleh Rafli Maulana (Founder & CEO/CTO).",
      "Kami bangga dengan visi dan dedikasinya untuk memudahkan belajar pemrograman bagi semua orang.",
      "Ada hal spesifik tentang Mentora atau perjalanan Rafli yang ingin kamu ketahui?",
    ].join("\n");
  }

  if (q.includes("ringkas") || q.includes("ringkasan") || q.includes("summary")) {
    return [
      "Ringkasan:",
      "- Topik utama: (tulis topikmu di sini)",
      "- Inti konsep: (1-2 kalimat penjelasan sederhana)",
      "- Contoh: (contoh singkat yang relevan)",
      "\nLangkah lanjut:",
      "1) Coba jelaskan ulang ke temanmu dalam 3 kalimat.",
      "2) Buat 2 pertanyaan tentang bagian yang belum kamu pahami.",
      "\nPertanyaan cek pemahaman:",
      "- Apa tujuan utama materi ini?",
      "- Kapan konsep ini digunakan?",
      "- Bisa beri 1 contoh lain?",
      `\n${tips}`,
    ].join("\n");
  }

  if (q.includes("contoh") || q.includes("example")) {
    return [
      "Contoh sederhana:",
      "1) (Contoh A) — jelaskan langkah-langkahnya",
      "2) (Contoh B) — variasi dari A",
      "3) (Contoh C) — kasus umum di kehidupan sehari-hari",
      "\nLatihan cepat:",
      "- Coba ulangi contoh A dengan angka/variabel berbeda",
      "- Apa perbedaan B dan C?",
      `\n${tips}`,
    ].join("\n");
  }

  if (q.includes("kuis") || q.includes("soal") || q.includes("tes")) {
    return [
      "Kuis singkat (3 soal):",
      "1) [Pilihan ganda] ...?",
      "2) [Benar/Salah] ...?",
      "3) [Isian singkat] ...?",
      "\nKunci jawaban:",
      "1) C | 2) Benar | 3) (isi singkat)",
      `\n${tips}`,
    ].join("\n");
  }

  if (q.includes("langkah") || q.includes("bagaimana cara") || q.includes("step")) {
    return [
      "Langkah-langkah belajar:",
      "1) Pahami definisi dengan 1-2 kalimat sederhana.",
      "2) Lihat contoh dasar, lalu variasi.",
      "3) Kerjakan 3 latihan singkat.",
      "4) Ringkas poin utama dengan bahasamu sendiri.",
      "5) Uji diri dengan kuis kecil.",
      `\n${tips}`,
    ].join("\n");
  }

  return [
    "Aku bisa bantu jelaskan materi, beri contoh, atau buat kuis singkat.",
    "Katakan: 'ringkas materi X', 'contoh soal Y', atau 'kuis topik Z'.",
    `\n${tips}`,
  ].join("\n");
}

async function fetchCourseContext(courseId?: string): Promise<string | null> {
  if (!courseId) return null;
  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const snap = await courseRef.get();
    if (!snap.exists) return null;
    const courseRaw = snap.data() as Record<string, unknown>;
    const title = typeof courseRaw.title === "string" ? courseRaw.title : "";
    const desc = typeof courseRaw.description === "string" ? courseRaw.description : "";

    const chaptersSnap = await courseRef.collection("chapters").orderBy("createdAt", "asc").get();
    const parts: string[] = [];
    parts.push(`# Kelas: ${title}`);
    if (desc) parts.push(`Deskripsi: ${desc}`);
    let used = 0;
    const LIMIT = 2000; // chars budget
    chaptersSnap.forEach((d) => {
      if (used > LIMIT) return;
      const ch = d.data() as Record<string, unknown>;
      const chTitle = typeof ch.title === "string" ? ch.title : "(tanpa judul)";
      const chDesc = typeof ch.description === "string" ? ch.description : "";
      const chText = typeof ch.text === "string" ? ch.text : "";
      const line = `- ${chTitle}${chDesc ? `: ${chDesc}` : ""}${chText ? `\n${chText}` : ""}`;
      used += line.length;
      if (used <= LIMIT) parts.push(line);
    });
    return parts.join("\n");
  } catch {
    // admin credentials not set or other error; ignore gracefully
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, courseId } = (await req.json()) as { messages?: ChatMessage[]; courseId?: string };
    if (!messages || messages.length === 0) return NextResponse.json({ reply: "Pertanyaan kosong." }, { status: 400 });

    const context = await fetchCourseContext(courseId);

    const contextMsgs: ChatMessage[] = context
      ? [{ role: "system", content: `Konteks pelajaran (ringkasan materi kelas):\n${context}` }]
      : [];

    const full: ChatMessage[] = [
      { role: "system", content: DEFAULT_SYSTEM },
      ...contextMsgs,
      ...messages,
    ];

    // Prefer Together -> HF -> Rule-based
    const together = await callTogether(full);
    if (together) return NextResponse.json({ reply: together });

    const hf = await callHuggingFace(full);
    if (hf) return NextResponse.json({ reply: hf });

    const latestUser = messages.filter((m) => m.role === "user").pop()?.content || "";
    const base = ruleBasedAnswer(latestUser);
    const withCtx = context ? `${base}\n\nCatatan konteks kelas:\n${context.slice(0, 800)}` : base;
    return NextResponse.json({ reply: withCtx });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ reply: `Maaf, fitur AI sedang tidak tersedia. (${msg})` }, { status: 500 });
  }
}
