import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up — VoiceIQ Enterprise" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">Create your account</h1>
      <SignupForm next={next} />
    </>
  );
}
