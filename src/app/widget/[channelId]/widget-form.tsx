"use client";

import { useState } from "react";

export function WidgetForm({ channelId }: { channelId: string }) {
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    try {
      const res = await fetch(`/api/widget/${channelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-gray-700">Thanks for the feedback!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={4}
        placeholder="What's on your mind?"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email (optional)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "submitting" ? "Sending..." : "Send feedback"}
      </button>
    </form>
  );
}
