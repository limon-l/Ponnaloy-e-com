const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Baseline Content Security Policy.
 *
 * Next.js injects inline bootstrap/hydration scripts, so `'unsafe-inline'` is
 * required until a nonce-based policy is wired through middleware. The policy
 * still blocks third-party script origins, objects, and framing. `unsafe-eval`
 * is limited to development for React Fast Refresh.
 */
function buildContentSecurityPolicy() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  let apiOrigin = "http://localhost:3001";
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    // Keep the local default when the environment value is malformed.
  }

  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.com"
      : "'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.com";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://*.clerk.accounts.dev https://api.clerk.com wss://*.clerk.accounts.dev`,
    "frame-src 'self' https://*.clerk.accounts.dev https://js.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const contentSecurityPolicy = buildContentSecurityPolicy();
const securedHeaders = [
  ...securityHeaders,
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    minimumCacheTTL: 60 * 60 * 24,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securedHeaders,
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
