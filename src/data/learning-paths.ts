import { type LucideIcon, Code2, Network, Palette, ServerCog } from "lucide-react"

export type LearningModule = {
  title: string
  summary: string
  topics: string[]
}

export type LearningPath = {
  slug: string
  title: string
  category: string
  duration: string
  level: string
  description: string
  outcomes: string[]
  modules: LearningModule[]
  icon: LucideIcon
  videoId?: string
}

export const learningPaths: LearningPath[] = [
  {
    slug: "laravel-12-fullstack",
    title: "Laravel 12 Fullstack",
    category: "Backend Development",
    duration: "12 minggu",
    level: "Intermediate",
    description:
      "Bangun aplikasi backend siap produksi dengan Laravel 12, mulai dari fundamental hingga deployment.",
    icon: ServerCog,
    videoId: "N-nNg6hFXck",
    modules: [
      {
        title: "Fondasi Laravel 12",
        summary: "Pahami struktur proyek modern dan praktik terbaik.",
        topics: [
          "Instalasi & konfigurasi environment",
          "Routing & controller pattern",
          "Blade component & templating",
          "Eloquent ORM & relasi lanjutan",
        ],
      },
      {
        title: "Membangun Fitur Inti",
        summary: "Rancang modul autentikasi dan manajemen bisnis.",
        topics: [
          "Authentication & authorization",
          "Modul manajemen user & role",
          "Validasi data & form request",
          "Testing feature & unit",
        ],
      },
      {
        title: "Integrasi & Automasi",
        summary: "Optimalkan aplikasi untuk skenario dunia nyata.",
        topics: [
          "Queue & job processing",
          "API RESTful & Laravel Sanctum",
          "Event, listener & notification",
          "Optimasi performa & caching",
        ],
      },
      {
        title: "Deployment & Monitoring",
        summary: "Siapkan aplikasi untuk dirilis dan terus dipantau.",
        topics: [
          "CI/CD workflow dasar",
          "Deployment ke VPS/cloud",
          "Logging & observability",
          "Hardening security & backup",
        ],
      },
    ],
    outcomes: [
      "Aplikasi bisnis modular",
      "REST API terstandarisasi",
      "Pipeline deployment otomatis",
    ],
  },
  {
    slug: "frontend-javascript-accelerator",
    title: "Frontend JavaScript Accelerator",
    category: "Frontend Engineering",
    duration: "10 minggu",
    level: "Intermediate",
    description:
      "Kuasai ekosistem JavaScript modern untuk membangun pengalaman frontend yang cepat dan aksesibel.",
    icon: Code2,
    modules: [
      {
        title: "Web Fundamental Refresh",
        summary: "Perdalam dasar HTML, CSS modern, dan ES2023.",
        topics: [
          "Progressive enhancement",
          "CSS utility & design system",
          "Module bundler & tooling",
          "Best practice accessibility",
        ],
      },
      {
        title: "Frontend Architecture",
        summary: "Susun arsitektur scalable dengan framework populer.",
        topics: [
          "State management terpadu",
          "Component driven development",
          "Routing & data fetching",
          "Testing React/Next.js",
        ],
      },
      {
        title: "Performance & Quality",
        summary: "Optimasi dan audit kualitas pengalaman pengguna.",
        topics: [
          "Performance budget & metrics",
          "Security di sisi frontend",
          "UX micro-interaction",
          "Automated testing pipeline",
        ],
      },
      {
        title: "Delivery & Collaboration",
        summary: "Kerja kolaboratif lintas tim produk.",
        topics: [
          "Design handoff & tooling",
          "Storybook & dokumentasi UI",
          "Release strategy & observability",
          "Maintenance & refactoring",
        ],
      },
    ],
    outcomes: [
      "Design system reusable",
      "Aplikasi SPA/SSR siap rilis",
      "Workflow kolaborasi tim",
    ],
  },
  {
    slug: "product-design-ui-ux",
    title: "Product Design & UI/UX",
    category: "Design Strategy",
    duration: "8 minggu",
    level: "Beginner - Intermediate",
    description:
      "Pelajari end-to-end proses desain produk digital dari riset hingga prototyping siap developer.",
    icon: Palette,
    modules: [
      {
        title: "Discovery & Research",
        summary: "Validasi masalah pengguna sejak awal.",
        topics: [
          "User research & interview",
          "Persona & customer journey",
          "Problem framing & HMW",
          "Competitive audit",
        ],
      },
      {
        title: "Ideation & Information Architecture",
        summary: "Strukturkan alur informasi dan ide solusi.",
        topics: [
          "Information architecture",
          "User flow & task analysis",
          "Low fidelity wireframing",
          "Design critique efektif",
        ],
      },
      {
        title: "Visual Design & Prototyping",
        summary: "Bangun UI systematis siap development.",
        topics: [
          "Design system & token",
          "High fidelity prototyping",
          "Interaction & motion principle",
          "Design accessibility",
        ],
      },
      {
        title: "Validation & Handoff",
        summary: "Uji solusi dan handoff ke tim tech.",
        topics: [
          "Usability testing",
          "Iteration roadmap",
          "Dev handoff & dokumentasi",
          "Stakeholder presentation",
        ],
      },
    ],
    outcomes: [
      "Portfolio studi kasus end-to-end",
      "Design system siap pakai",
      "Framework kolaborasi lintas fungsi",
    ],
  },
  {
    slug: "networking-infrastructure",
    title: "Networking & Infrastructure",
    category: "IT Operations",
    duration: "9 minggu",
    level: "Beginner - Intermediate",
    description:
      "Siapkan pondasi jaringan modern untuk mendukung kebutuhan operasional perusahaan dan cloud.",
    icon: Network,
    modules: [
      {
        title: "Dasar Jaringan",
        summary: "Kenali arsitektur jaringan dan protokol utama.",
        topics: [
          "Model OSI & TCP/IP",
          "Subnetting & IP planning",
          "Routing static & dynamic",
          "Monitoring dasar jaringan",
        ],
      },
      {
        title: "Keamanan & Infrastruktur",
        summary: "Bangun jaringan yang aman dan terkelola.",
        topics: [
          "Firewall & segmentation",
          "VPN & tunneling",
          "High availability & failover",
          "Automasi konfigurasi (Ansible)",
        ],
      },
      {
        title: "Cloud & Hybrid Deployment",
        summary: "Integrasikan jaringan dengan layanan cloud modern.",
        topics: [
          "Fundamental cloud networking",
          "Infrastructure as Code",
          "Container networking & service mesh",
          "Observability & incident response",
        ],
      },
      {
        title: "Operasional & Skalabilitas",
        summary: "Atur proses operasional harian yang adaptif.",
        topics: [
          "Capacity planning",
          "Disaster recovery",
          "Documentation & runbook",
          "Audit & compliance dasar",
        ],
      },
    ],
    outcomes: [
      "Blueprint jaringan perusahaan",
      "Standar security dasar",
      "Integrasi cloud siap produksi",
    ],
  },
]
