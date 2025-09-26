import { NextResponse } from "next/server"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type ProviderMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

const SYSTEM_PROMPT = `Kamu adalah MentorAI dari Mentora. Gaya bicaramu hangat dan suportif seperti mentor yang sabar. Jelaskan langkah belajar teknologi sejelas mungkin, dengan bahasa Indonesia yang sederhana dan analogi sehari-hari agar mudah dimengerti bahkan oleh pemula.`

const FEW_SHOT_DIALOGUES: ChatMessage[] = [
  { role: "user", content: "Aku pengin belajar jadi frontend developer tapi masih nol. Mulai dari mana ya?" },
  {
    role: "assistant",
    content:
      "Seru banget mau mulai frontend! Yuk kita pecah gampang:\n\n1. Pahami dasar HTML & CSS buat bikin kerangka dan styling halaman. Ibarat membangun rumah, ini fondasinya.\n2. Lanjut ke JavaScript dasar supaya halaman bisa interaktif. Fokus ke variabel, fungsi, dan manipulasi DOM.\n3. Setelah nyaman, coba framework populer kayak React atau Next.js. Pelajari komponen, routing, dan cara ambil data.\n4. Latihan bikin proyek kecil, misalnya landing page portofolio, to-do list, atau dashboard sederhana.\n\nKalau kamu mau, aku bisa bantu susun roadmap mingguan atau rekomendasi kursus Mentora yang pas. Mau lanjut ke situ?"
  },
  { role: "user", content: "Bedanya backend sama frontend apa?" },
  {
    role: "assistant",
    content:
      "Frontend itu bagian yang dilihat dan disentuh user—HTML, CSS, JavaScript, komponen UI. Backend itu dapur di balik layar: ngolah data, autentikasi, integrasi database, biasanya pakai Laravel, Node.js, atau sejenisnya.\n\nKalau kamu suka desain + interaksi langsung dengan user, frontend cocok. Kalau lebih suka logika, struktur data, dan mikirin alur bisnis, backend lebih pas. Kita bisa bahas jalur belajar masing-masing kalau kamu mau."
  },
  { role: "user", content: "Aku stuck belajar Laravel di bagian autentikasi. Gimana lanjutnya?" },
  {
    role: "assistant",
    content:
      "Oke, kalau mentok di autentikasi Laravel, coba langkah ini:\n\n1. Pastikan kamu pakai starter kit yang sesuai (Laravel Breeze atau Jetstream) biar struktur auth-nya rapi.\n2. Pelajari alur login-register-nya: route → controller → guard → blade. Coba jelasin ke aku bagian mana yang bikin bingung.\n3. Bikin catatan flow login (input email/password, validasi, cek user, redirect). Dengan begitu kamu bisa debug lebih mudah.\n4. Setelah paham, latihan nambah fitur seperti reset password atau role-based access.\n\nCeritain bagian yang bikin bingung ya, nanti aku bantu bongkar satu-satu."
  },
]

function toHistory(messages: ChatMessage[]) {
  return messages
    .map((message) => {
      const prefix = message.role === "assistant" ? "MentorAI" : "Siswa"
      return `${prefix}: ${message.content}`
    })
    .join("\n")
}

async function callTogether(messages: ProviderMessage[]) {
  const apiKey = process.env.TOGETHER_API_KEY
  if (!apiKey) return null

  const response = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages,
      temperature: 0.65,
      top_p: 0.9,
      max_tokens: 600,
    }),
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[]
  }

  return payload.choices?.[0]?.message?.content?.trim() ?? null
}

async function callHuggingFace(systemPrompt: string, history: string) {
  const hfKey = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN
  if (!hfKey) return null

  const prompt = `${systemPrompt}\n\nContoh dan percakapan terbaru:\n${history}\n\nMentorAI:`

  const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 400,
        temperature: 0.7,
        top_p: 0.9,
      },
    }),
  })

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as
    | { generated_text?: string }
    | Array<{ generated_text?: string }>

  const text = Array.isArray(json) ? json[0]?.generated_text : json?.generated_text
  if (!text) return null

  const parts = text.split("MentorAI:")
  const reply = parts.length > 1 ? parts.pop() : text
  return reply?.trim() || null
}

function buildFallback(messages: ChatMessage[]): string {
  const lastUserMessage = messages.filter((msg) => msg.role === "user").at(-1)?.content ?? ""
  const cleaned = lastUserMessage.trim().replace(/\s+/g, " ")

  if (!cleaned) {
    return "Halo! Aku MentorAI. Ceritakan tujuan belajar kamu ya, biar aku bantu susun langkah yang gampang diikuti."
  }

  const lower = cleaned.toLowerCase()

  if (["halo", "hai", "haii", "haiii", "hello", "helo", "hi"].some((greet) => lower.startsWith(greet))) {
    return "Hai juga! Ceritain ya kamu kepengin belajar apa atau lagi bingung di bagian mana, nanti aku bantu jelasin pelan-pelan."
  }

  if (cleaned.length < 25 && !cleaned.includes("?")) {
    return `Menarik nih tentang "${cleaned}". Boleh ceritain lebih detail kamu ingin ngerti apa atau mau diarahkan ke jalur belajar tertentu?`
  }

  const previous = messages
    .slice(-2)
    .filter((msg) => msg.role === "assistant")
    .map((msg) => msg.content)
    .join("\n")

  return [
    `Aku dengar kamu lagi ngebahas: "${cleaned.slice(0, 240)}".`,
    "Yuk kita pecah jadi langkah gampang:",
    "1. Sebutkan bagian yang mau kamu kuasai atau bikin bingung.",
    "2. Coba jelasin dengan bahasamu sendiri, nanti aku bantu perbaiki kalau kurang pas.",
    "3. Kita susun latihan kecil atau roadmap belajarnya bareng-bareng.",
    previous ? `Tadi aku sempat sampaikan: ${previous}` : undefined,
    "Kalau mau lanjut, tinggal ketik aja pertanyaan atau kendalanya ya!"
  ]
    .filter(Boolean)
    .join("\n\n")
}

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Body harus berupa JSON" }, { status: 400 })
  }

  const messages = Array.isArray((payload as { messages?: ChatMessage[] })?.messages)
    ? ((payload as { messages: ChatMessage[] }).messages || []).filter((message) =>
        message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string"
      )
    : []

  if (messages.length === 0) {
    return NextResponse.json({ error: "Kirim minimal satu pesan" }, { status: 400 })
  }

  try {
    const trimmedMessages = messages.slice(-12)
    const providerMessages: ProviderMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...FEW_SHOT_DIALOGUES,
      ...trimmedMessages,
    ]

    const historyForPrompt = toHistory([...FEW_SHOT_DIALOGUES, ...trimmedMessages])

    const reply =
      (await callTogether(providerMessages)) || (await callHuggingFace(SYSTEM_PROMPT, historyForPrompt))

    if (reply) {
      return NextResponse.json({ role: "assistant", content: reply })
    }
  } catch (error) {
    console.error("MentorAI unhandled error", error)
  }

  return NextResponse.json({ role: "assistant", content: buildFallback(messages) })
}
