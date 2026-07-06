import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in — VoiceIQ Enterprise" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Sign in</h1>
      <LoginForm next={next} />
    </>
  );
}
