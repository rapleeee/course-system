export async function generateLlamaResponse(messages: { role: string; content: string }[]) {
  const lastUserMessage = messages[messages.length - 1]?.content.toLowerCase();

  if (!lastUserMessage) {
    return "Saya tidak yakin kamu nanya apa 🤔";
  }

  // --- Web development basics
  if (lastUserMessage.includes("halo") || lastUserMessage.includes("hai") || lastUserMessage.includes("apa kabar") || lastUserMessage.includes("selamat pagi") || lastUserMessage.includes("selamat siang") || lastUserMessage.includes("selamat sore") || lastUserMessage.includes("selamat malam") || lastUserMessage.includes("selamat datang") || lastUserMessage.includes("selamat datang di mentora") || lastUserMessage.includes("selamat datang di mentorai")) {
    return "Halo! 👋 Ada yang bisa saya bantu hari ini?";
  }
  if (lastUserMessage.includes("html")) {
    return "HTML (HyperText Markup Language) adalah bahasa markup untuk membuat struktur halaman web.";
  }

  if (lastUserMessage.includes("css")) {
    return "CSS digunakan untuk memperindah tampilan HTML seperti warna, font, dan layout.";
  }

  if (lastUserMessage.includes("javascript")) {
    return "JavaScript adalah bahasa pemrograman yang digunakan untuk membuat halaman web menjadi interaktif.";
  }

  if (lastUserMessage.includes("react")) {
    return "React adalah library JavaScript buatan Meta untuk membangun antarmuka pengguna yang responsif dan modular.";
  }

  if (lastUserMessage.includes("node")) {
    return "Node.js memungkinkan kamu menjalankan JavaScript di luar browser, biasanya untuk backend aplikasi web.";
  }

  if (lastUserMessage.includes("tailwind")) {
    return "Tailwind CSS adalah framework utility-first untuk membuat UI yang konsisten dan cepat.";
  }

  if (lastUserMessage.includes("github")) {
    return "GitHub adalah platform untuk menyimpan dan mengelola proyek coding menggunakan Git. Cocok buat kerja kolaboratif.";
  }

  if (lastUserMessage.includes("version control") || lastUserMessage.includes("git")) {
    return "Version Control seperti Git membantu kamu melacak perubahan kode, kolaborasi tim, dan rollback error dengan mudah.";
  }

  // --- Tentang Mentora
  if (lastUserMessage.includes("mentora")) {
    return `Mentora adalah platform belajar coding santai dan praktis. Cocok buat pelajar, mahasiswa, hingga pemula yang ingin belajar pemrograman dari dasar dengan modul interaktif dan bimbingan langsung.`;
  }

  if (lastUserMessage.includes("apakah mentora gratis") || lastUserMessage.includes("mentora gratis")) {
    return "Sebagian konten Mentora bisa kamu akses gratis. Untuk kelas lanjutan dan fitur eksklusif, kamu bisa upgrade ke premium.";
  }

  if (lastUserMessage.includes("kursus mentora") || lastUserMessage.includes("kelas mentora")) {
    return "Kelas Mentora meliputi Web Development, Git & GitHub, React Native, hingga persiapan skripsi dan karier IT.";
  }

  if (lastUserMessage.includes("mentor mentora")) {
    return "Mentor di Mentora adalah praktisi industri dan pengajar SMK berpengalaman, siap membimbing kamu sampai paham!";
  }

  // --- Tentang SMK Pesat
  if (lastUserMessage.includes("smk pesat")) {
    return "SMK Pesat IT XPro adalah sekolah kejuruan berbasis teknologi yang membekali siswa dengan keahlian di bidang Software Engineering, TKJ, dan Desain Komunikasi Visual.";
  }

  if (lastUserMessage.includes("jurusan smk pesat")) {
    return "Jurusan di SMK Pesat meliputi: RPL (Rekayasa Perangkat Lunak), TKJ (Teknik Komputer dan Jaringan), dan DKV (Desain Komunikasi Visual).";
  }

  if (lastUserMessage.includes("kegiatan di smk pesat")) {
    return "SMK Pesat punya banyak kegiatan seperti project-based learning, internship industri, classmeeting, dan program 'Bekerja'.";
  }

  if (lastUserMessage.includes("program bekerja")) {
    return "Program 'Bekerja' dari SMK Pesat membantu siswa lulus dan langsung siap kerja dengan pelatihan interview, CV coaching, dan bimbingan portofolio industri.";
  }

  if (lastUserMessage.includes("kelas industri")) {
    return "SMK Pesat menjalin kolaborasi dengan industri agar siswa mendapat pengalaman dunia kerja sejak dini melalui proyek dan kelas industri.";
  }

  // --- Fallback / default
  return "Pertanyaan menarik! Tapi aku belum cukup pintar jawabannya hehe... 😄";
}