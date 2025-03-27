/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NOTION_KEY: process.env.NOTION_KEY,
  },
};

module.exports = nextConfig;
