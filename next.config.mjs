/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Vercel's build-time file tracer doesn't always follow the dynamic
    // `path.join(__dirname, ...)` these packages use to locate their
    // bundled ffmpeg/ffprobe binaries, which silently drops the binaries
    // from the deployed function and breaks lib/ffmpeg.ts at runtime —
    // force-include them for the route that runs the Inngest pipeline.
    outputFileTracingIncludes: {
      "/api/inngest": ["./node_modules/ffmpeg-static/**", "./node_modules/ffprobe-static/**"],
    },
    // Without this, webpack inlines ffmpeg-static/ffprobe-static's own
    // code into the compiled route bundle — which breaks the `__dirname`
    // they use internally to locate their binary (it resolves to the
    // bundle's own directory instead of the real node_modules folder the
    // include above ships), producing "spawn .../bin/linux/x64/ffprobe
    // ENOENT" even though the binary really is in the deployment. Keeping
    // them external leaves a real `require()` that Node resolves against
    // the actual, shipped node_modules folder at runtime.
    serverComponentsExternalPackages: ["ffmpeg-static", "ffprobe-static", "fluent-ffmpeg"],
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
