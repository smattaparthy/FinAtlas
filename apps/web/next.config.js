/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@finatlas/engine", "@finatlas/schemas"],
  experimental: {
    serverComponentsExternalPackages: ["argon2"],
  },
};

module.exports = nextConfig;
