/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: process.env.R2_PUBLIC_HOSTNAME || "pub-example.r2.dev",
      },
    ],
  },
};

export default nextConfig;
