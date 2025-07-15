import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
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
};

export default nextConfig;
