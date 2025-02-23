/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'gateway.pinata.cloud',
      'ipfs.io',
      'cloudflare-ipfs.com',
      'dweb.link'
    ]
  },
  async rewrites() {
    return [
      {
        source: '/ipfs/:path*',
        destination: 'https://gateway.pinata.cloud/ipfs/:path*'
      },
      {
        source: '/ipfs-alt1/:path*',
        destination: 'https://ipfs.io/ipfs/:path*'
      },
      {
        source: '/ipfs-alt2/:path*',
        destination: 'https://cloudflare-ipfs.com/ipfs/:path*'
      },
      {
        source: '/ipfs-alt3/:path*',
        destination: 'https://dweb.link/ipfs/:path*'
      }
    ];
  },
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