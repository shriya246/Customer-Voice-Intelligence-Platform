"use client";

import { useActionState } from "react";
import { createFeedback } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function FeedbackForm({
  channelNames,
  customerNames,
}: {
  channelNames: string[];
  customerNames: string[];
}) {
  const [state, formAction, isPending] = useActionState(createFeedback, undefined);

  return (
    <Card className="max-w-lg animate-slide-up p-6">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="content">Feedback</Label>
          <Textarea id="content" name="content" required rows={5} placeholder="What did the customer say?" />
        </div>

        <div>
          <Label htmlFor="channelName">Channel</Label>
          <Input
            id="channelName"
            name="channelName"
            type="text"
            required
            list="channel-suggestions"
            placeholder="e.g. Support Tickets"
          />
          <datalist id="channel-suggestions">
            {channelNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Pick an existing channel or type a new one — it&apos;ll be created automatically.
          </p>
        </div>

        <div>
          <Label htmlFor="customerName">
            Customer <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="customerName" name="customerName" type="text" list="customer-suggestions" placeholder="Who said this?" />
          <datalist id="customer-suggestions">
            {customerNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="tags">
            Tags <span className="font-normal text-muted-foreground">(optional, comma-separated)</span>
          </Label>
          <Input id="tags" name="tags" type="text" placeholder="bug, pricing, onboarding" />
        </div>

        {state?.error && <FieldError>{state.error}</FieldError>}

        <Button type="submit" loading={isPending}>
          {isPending ? "Saving…" : "Log feedback"}
        </Button>
      </form>
    </Card>
  );
}
