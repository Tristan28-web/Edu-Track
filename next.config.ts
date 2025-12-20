
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: 'public',
  disable: false,
  register: true,
  skipWaiting: true,
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    // Due to how Next.js router works, this is over-generous.
    // Ideally, we would dynamically generate this.
    // But for now, this is a good starting point.
    document: "/~offline",
  },
  workboxOptions: {
    // Workbox-related options.
    // For example, to add custom runtime caching rules.
  },
});

const securityHeaders = [
  // Prevent content type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Enforce HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
   // Enable XSS protection in older browsers
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Enhanced Content Security Policy with CSRF protection
  {
      key: 'Content-Security-Policy',
      value: "default-src 'self' *; form-action 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googleapis.com; style-src 'self' 'unsafe-inline' *.googleapis.com; img-src * blob: data:; media-src 'none'; connect-src *; font-src 'self' *.gstatic.com;"
  }
];


const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  devIndicators: false,
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
