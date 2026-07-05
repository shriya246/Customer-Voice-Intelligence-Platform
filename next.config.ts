import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.groq.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const widgetContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // No frame-ancestors restriction -- this route exists specifically to be
  // embedded on arbitrary external sites.
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const widgetHeaders = [
  { key: "Content-Security-Policy", value: widgetContentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Next.js applies every matching rule's headers, not just the most
        // specific one -- "/:path*" would still match "/widget/*" and its
        // X-Frame-Options: DENY would persist alongside the widget rule's
        // (deliberately absent) one. Excluding /widget here, rather than
        // trying to override a header from a broader rule, is what actually
        // works.
        source: "/((?!widget/).*)",
        headers: securityHeaders,
      },
      {
        // Deliberately excludes X-Frame-Options and CSP frame-ancestors,
        // both set for everything else above -- this is the one route meant
        // to be iframed from a customer's own site.
        source: "/widget/:path*",
        headers: widgetHeaders,
      },
    ];
  },
};

export default nextConfig;
