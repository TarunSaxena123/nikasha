/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static files only: Vercel serves the app and receives no user content (architecture.md §5.1).
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    // No console output of strategies, uploads or reports in production builds (REQ-PRV-28).
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
