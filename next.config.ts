import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/pdf.worker.min.mjs',
        headers: [{ key: 'Content-Type', value: 'application/javascript' }],
      },
    ];
  },
};

export default nextConfig;
