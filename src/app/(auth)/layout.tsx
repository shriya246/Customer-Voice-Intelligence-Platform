import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-primary-soft),transparent)] opacity-60"
      />
      <Link
        href="/"
        className="mb-8 animate-slide-up text-lg font-semibold tracking-tight text-foreground"
      >
        VoiceIQ Enterprise
      </Link>
      <div
        className="w-full max-w-sm animate-slide-up rounded-xl border border-border bg-surface p-8 shadow-sm"
        style={{ animationDelay: "60ms" }}
      >
        {children}
      </div>
    </div>
  );
}
