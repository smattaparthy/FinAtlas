/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@finatlas/engine", "@finatlas/schemas"],
  serverExternalPackages: ["argon2"],
};

module.exports = nextConfig;
