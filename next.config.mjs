/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.borls.com',
      },
    ],
  },
  allowedDevOrigins: [
    'agentic.borls.com',
    'apex-ai.borls.com',
    'apex.borls.com',
  ],
}

export default nextConfig
