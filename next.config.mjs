/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel's build-time file tracer doesn't always follow the dynamic
  // `path.join(__dirname, ...)` these packages use to locate their bundled
  // ffmpeg/ffprobe binaries, which silently drops the binaries from the
  // deployed function and breaks lib/ffmpeg.ts at runtime — force-include
  // them for the route that runs the Inngest pipeline.
  experimental: {
    outputFileTracingIncludes: {
      "/api/inngest": ["./node_modules/ffmpeg-static/**", "./node_modules/ffprobe-static/**"],
    },
  },
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
