import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/tailoring-ms',
  images: { unoptimized: true },
};

export default nextConfig;
