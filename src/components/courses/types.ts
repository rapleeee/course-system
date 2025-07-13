export type Chapter = {
  id: string;
  title: string;
  description?: string;
  shortDesc?: string; // ✅ Tambahkan ini
  type: "video" | "module" | "pdf";
  videoUrl?: string;
  image?: string;
  pdfUrl?: string;
  text?: string;
};