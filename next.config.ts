import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Exclude test files and scripts from the build
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx)$/,
      loader: 'ignore-loader'
    });
    
    // Exclude specific directories
    config.resolve.alias = {
      ...config.resolve.alias,
      'src/__tests__': false,
      'src/scripts': false,
    };
    
    return config;
  },
  // Ensure static assets are properly handled
  experimental: {
    optimizePackageImports: ['next-auth']
  },
  // Add headers for static assets
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
