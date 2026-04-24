/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // MarketTime product images
        protocol: 'https',
        hostname: '**.markettime.com',
      },
      {
        protocol: 'http',
        hostname: '**.markettime.com',
      },
    ],
  },
};

export default nextConfig;
