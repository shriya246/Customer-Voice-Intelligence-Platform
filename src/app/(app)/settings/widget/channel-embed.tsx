"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ChannelEmbed({ name, snippet }: { name: string; snippet: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Card interactive className="p-4">
      <p className="text-sm font-medium text-foreground">{name}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md bg-muted px-2 py-1.5 text-xs text-foreground">
          {snippet}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </Button>
      </div>
    </Card>
  );
}
