"use client";

import { useActionState, useState } from "react";
import { createInvite } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/input";

export function InviteForm({ orgId }: { orgId: string }) {
  const [state, formAction, isPending] = useActionState(createInvite, undefined);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="orgId" value={orgId} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="teammate@company.com" />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="member">
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </Select>
        </div>
        <Button type="submit" loading={isPending}>
          {isPending ? "Creating…" : "Create invite link"}
        </Button>
      </form>
      <FieldError>{state?.error}</FieldError>
      {state?.link && (
        <div className="mt-3 flex animate-scale-in items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-foreground">{state.link}</code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(state.link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </div>
      )}
    </div>
  );
}
