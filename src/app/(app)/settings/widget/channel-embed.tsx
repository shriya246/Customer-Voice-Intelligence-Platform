"use client";

import { useState } from "react";

export function ChannelEmbed({ name, snippet }: { name: string; snippet: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-md border border-gray-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-medium">{name}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded bg-gray-50 px-2 py-1 text-xs dark:bg-neutral-800">
          {snippet}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
