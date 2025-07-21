export type Chapter = {
  id: string;
  title: string;
  description?: string;
  shortDesc?: string;
  text?: string;
  type: "video" | "module" | "pdf";
  videoId?: string;
  pdfUrl?: string;
  image?: string;
  createdAt: Date | number;
};