/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@finatlas/engine", "@finatlas/schemas"],
  serverExternalPackages: ["argon2"],
};

module.exports = nextConfig;
