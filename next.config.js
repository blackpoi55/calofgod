/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

const nextConfig = {
  // your other config
  turbopack: {},
}

module.exports = withPWA(nextConfig)
