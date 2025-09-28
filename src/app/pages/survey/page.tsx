"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

const interestOptions = [
  { value: "frontend", label: "Frontend Web" },
  { value: "backend", label: "Backend / API" },
  { value: "fullstack", label: "Fullstack" },
  { value: "design", label: "Desain Produk / UI/UX" },
  { value: "networking", label: "Jaringan & Infrastruktur" },
  { value: "unsure", label: "Belum yakin, minta rekomendasi" },
] as const;

type InterestValue = (typeof interestOptions)[number]["value"];

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type GoalValue = "career-switch" | "upskill" | "freelance" | "build-product" | "explore";

type SurveyResponses = {
  primaryInterest: InterestValue;
  experienceLevel: ExperienceLevel;
  weeklyTime: "lt5" | "5-10" | "gt10";
  careerGoal: GoalValue;
  notes: string;
};

const recommendedTracks: Record<string, { slug: string; title: string; description: string }> = {
  frontend: {
    slug: "frontend-javascript-accelerator",
    title: "Frontend JavaScript Accelerator",
    description: "Fokus ke React/Next.js, desain system UI, dan kolaborasi produk.",
  },
  backend: {
    slug: "laravel-12-fullstack",
    title: "Laravel 12 Fullstack",
    description: "Bangun layanan backend modern, API, dan deployment produksi.",
  },
  fullstack: {
    slug: "laravel-12-fullstack",
    title: "Laravel 12 Fullstack",
    description: "Mulai dari backend solid, lalu tingkatkan ke fullstack dengan Next.js sebagai lanjutan.",
  },
  design: {
    slug: "product-design-ui-ux",
    title: "Product Design & UI/UX",
    description: "Pelajari riset pengguna, sistem desain, hingga handoff ke developer.",
  },
  networking: {
    slug: "networking-infrastructure",
    title: "Networking & Infrastructure",
    description: "Bangun dasar jaringan modern, keamanan, dan kesiapan cloud.",
  },
  explorer: {
    slug: "frontend-javascript-accelerator",
    title: "Frontend JavaScript Accelerator",
    description: "Jalur general yang cepat terasa hasilnya — mudah buat validasi minat awal.",
  },
};

function getRecommendation(responses: SurveyResponses) {
  if (responses.primaryInterest !== "unsure") {
    return recommendedTracks[responses.primaryInterest];
  }

  if (responses.experienceLevel === "advanced" && responses.weeklyTime === "gt10") {
    return recommendedTracks.backend;
  }

  if (responses.careerGoal === "freelance" || responses.careerGoal === "build-product") {
    return recommendedTracks.frontend;
  }

  if (responses.careerGoal === "upskill" && responses.experienceLevel !== "beginner") {
    return recommendedTracks.fullstack;
  }

  if (responses.careerGoal === "career-switch" && responses.experienceLevel === "beginner") {
    return recommendedTracks.frontend;
  }

  return recommendedTracks.explorer;
}

export default function SurveyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [responses, setResponses] = useState<SurveyResponses>({
    primaryInterest: "frontend",
    experienceLevel: "beginner",
    weeklyTime: "5-10",
    careerGoal: "career-switch",
    notes: "",
  });

  const recommendation = useMemo(() => getRecommendation(responses), [responses]);

  const loadExistingSurvey = useCallback(async () => {
    if (!user?.uid) {
      setInitializing(false);
      return;
    }
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data?.surveyResponses) {
          setResponses({
            primaryInterest: data.surveyResponses.primaryInterest ?? "frontend",
            experienceLevel: data.surveyResponses.experienceLevel ?? "beginner",
            weeklyTime: data.surveyResponses.weeklyTime ?? "5-10",
            careerGoal: data.surveyResponses.careerGoal ?? "career-switch",
            notes: data.surveyResponses.notes ?? "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load survey responses", error);
    } finally {
      setInitializing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadExistingSurvey();
  }, [loadExistingSurvey]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.uid) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    try {
      const recommendationPayload = getRecommendation(responses);
      await setDoc(
        doc(db, "users", user.uid),
        {
          surveyCompleted: true,
          surveyCompletedAt: serverTimestamp(),
          surveyResponses: responses,
          recommendedTrack: recommendationPayload.title,
          recommendedTrackSlug: recommendationPayload.slug,
          recommendedTrackDescription: recommendationPayload.description,
        },
        { merge: true }
      );

      toast.success("Terima kasih! Kami sudah menyiapkan rekomendasi belajarmu.");
      router.replace("/pages/dashboard");
    } catch (error) {
      console.error("Failed to submit survey", error);
      toast.error("Gagal menyimpan survei. Coba lagi ya.");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <Layout pageTitle="Preferensi Belajar">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Memuat survei preferensimu...
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Preferensi Belajar">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="space-y-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-primary dark:border-primary/30 dark:bg-primary/10">
          <h1 className="text-2xl font-bold text-primary dark:text-primary-foreground">
            Tentukan Jalur Belajarmu 🎯
          </h1>
          <p className="text-primary/80 dark:text-primary-foreground/80">
            Jawabanmu bantu MentorAI bikin roadmap paling relevan. Kamu tetap bisa ubah preferensi kapan pun.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Bidang utama yang kamu minati</Label>
              <p className="text-sm text-muted-foreground">
                Pilih jalur yang paling bikin kamu penasaran saat ini. MentorAI bakal tetap kasih insight ekstra.
              </p>
            </div>
            <Select
              value={responses.primaryInterest}
              onValueChange={(value: InterestValue) =>
                setResponses((prev) => ({ ...prev, primaryInterest: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih minat utama" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {interestOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Pengalaman saat ini</Label>
              <p className="text-sm text-muted-foreground">Biar tahu seberapa dasar MentorAI harus mulai menjelaskan.</p>
            </div>
            <RadioGroup
              value={responses.experienceLevel}
              onValueChange={(value) =>
                setResponses((prev) => ({ ...prev, experienceLevel: value as ExperienceLevel }))
              }
              className="grid gap-3 sm:grid-cols-3"
            >
              <Label
                htmlFor="exp-beginner"
                className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm transition hover:border-primary ${
                  responses.experienceLevel === "beginner" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem id="exp-beginner" value="beginner" className="sr-only" />
                <span className="font-semibold">Pemula</span>
                <span className="text-muted-foreground">Belum pernah belajar atau baru mulai.</span>
              </Label>
              <Label
                htmlFor="exp-intermediate"
                className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm transition hover:border-primary ${
                  responses.experienceLevel === "intermediate" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem id="exp-intermediate" value="intermediate" className="sr-only" />
                <span className="font-semibold">Menengah</span>
                <span className="text-muted-foreground">Sudah pernah buat proyek sederhana.</span>
              </Label>
              <Label
                htmlFor="exp-advanced"
                className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm transition hover:border-primary ${
                  responses.experienceLevel === "advanced" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem id="exp-advanced" value="advanced" className="sr-only" />
                <span className="font-semibold">Lanjutan</span>
                <span className="text-muted-foreground">Sudah terbiasa mengerjakan proyek nyata.</span>
              </Label>
            </RadioGroup>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Tujuan belajar utama</Label>
              <p className="text-sm text-muted-foreground">MentorAI bakal atur fokus materi sesuai tujuanmu.</p>
            </div>
            <RadioGroup
              value={responses.careerGoal}
              onValueChange={(value) =>
                setResponses((prev) => ({ ...prev, careerGoal: value as GoalValue }))
              }
              className="space-y-3"
            >
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 transition hover:border-primary ${responses.careerGoal === "career-switch" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem id="goal-switch" value="career-switch" className="sr-only" />
                <span className="font-semibold">Switch karier ke dunia teknologi</span>
                <span className="text-sm text-muted-foreground">Butuh jalur jelas untuk siap kerja.</span>
              </Label>
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 transition hover:border-primary ${responses.careerGoal === "upskill" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem id="goal-upskill" value="upskill" className="sr-only" />
                <span className="font-semibold">Upskill di bidang yang sudah digeluti</span>
                <span className="text-sm text-muted-foreground">Kamu ingin naik level di pekerjaan sekarang.</span>
              </Label>
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 transition hover:border-primary ${responses.careerGoal === "freelance" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem id="goal-freelance" value="freelance" className="sr-only" />
                <span className="font-semibold">Fokus proyek freelance</span>
                <span className="text-sm text-muted-foreground">Ingin cepat punya portofolio & klien.</span>
              </Label>
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 transition hover:border-primary ${responses.careerGoal === "build-product" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem id="goal-product" value="build-product" className="sr-only" />
                <span className="font-semibold">Bangun produk/pribadi startup</span>
                <span className="text-sm text-muted-foreground">Butuh skill untuk mengeksekusi ide sendiri.</span>
              </Label>
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 transition hover:border-primary ${responses.careerGoal === "explore" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem id="goal-explore" value="explore" className="sr-only" />
                <span className="font-semibold">Eksplor bidang teknologi</span>
                <span className="text-sm text-muted-foreground">Masih mencari jalur yang paling cocok.</span>
              </Label>
            </RadioGroup>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Komitmen waktu per minggu</Label>
              <p className="text-sm text-muted-foreground">Semakin konsisten, semakin cepat progresmu.</p>
            </div>
            <RadioGroup
              value={responses.weeklyTime}
              onValueChange={(value) =>
                setResponses((prev) => ({ ...prev, weeklyTime: value as SurveyResponses["weeklyTime"] }))
              }
              className="grid gap-3 sm:grid-cols-3"
            >
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm transition hover:border-primary ${responses.weeklyTime === "lt5" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="lt5" className="sr-only" />
                <span className="font-semibold">&lt; 5 jam</span>
                <span className="text-muted-foreground">Belajar ringan, fokus ke konsep inti.</span>
              </Label>
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm transition hover:border-primary ${responses.weeklyTime === "5-10" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="5-10" className="sr-only" />
                <span className="font-semibold">5 – 10 jam</span>
                <span className="text-muted-foreground">Belajar reguler + mini project.</span>
              </Label>
              <Label className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm transition hover:border-primary ${responses.weeklyTime === "gt10" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="gt10" className="sr-only" />
                <span className="font-semibold">&gt; 10 jam</span>
                <span className="text-muted-foreground">Siap program intensif dan proyek kompleks.</span>
              </Label>
            </RadioGroup>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Ceritakan singkat kebutuhanmu</Label>
              <p className="text-sm text-muted-foreground">MentorAI pakai ini untuk rekomendasi personal.</p>
            </div>
            <Textarea
              value={responses.notes}
              onChange={(event) =>
                setResponses((prev) => ({ ...prev, notes: event.target.value.slice(0, 500) }))
              }
              placeholder="Contoh: Aku mahasiswa semester 3 ingin siap magang tahun depan."
              className="min-h-[120px]"
            />
          </Card>

          <Card className="space-y-4 p-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Rekomendasi Jalur Belajar</h2>
              <p className="text-sm text-muted-foreground">
                Berdasarkan jawabanmu, kami sarankan mulai dari jalur berikut. Kamu tetap bisa eksplor roadmap lain kapan pun.
              </p>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-primary dark:border-primary/30 dark:bg-primary/10 dark:text-primary-foreground">
                <p className="text-xs uppercase tracking-wide text-primary/70 dark:text-primary-foreground/70">Rekomendasi</p>
                <h3 className="text-xl font-bold text-primary dark:text-primary-foreground">{recommendation.title}</h3>
                <p className="mt-2 text-primary/80 dark:text-primary-foreground/80">{recommendation.description}</p>
                <Button asChild variant="link" className="px-0 text-primary dark:text-primary-foreground">
                  <a href={`/roadmap/${recommendation.slug}`} target="_blank" rel="noopener noreferrer">
                    Buka roadmap &rarr;
                  </a>
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-[#1B3C53] text-white hover:bg-[#234d66]" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan & Mulai Belajar"}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
