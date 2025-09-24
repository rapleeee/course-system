import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "fontkit"],
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
};


export default nextConfig;
