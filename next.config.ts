import type { NextConfig } from "next";

/**
 * Configuración de Next.js para TSUNAMI ERP.
 * Las imágenes de productos se sirven desde Supabase Storage.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
