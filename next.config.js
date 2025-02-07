/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        path: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        os: false,
        crypto: false,
        buffer: false,
        util: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
