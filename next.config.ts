import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  matcher: ['/admin/:path*'],
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
};


export default nextConfig;
