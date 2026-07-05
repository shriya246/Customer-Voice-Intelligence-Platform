import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryProcessFeedbackItem } from "@/lib/clustering";

const widgetSchema = z.object({
  content: z.string().trim().min(1, "Feedback content is required").max(5000),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await checkRateLimit(`widget:${ip}`);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a bit." },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, widgetSchema);
  if (!parsed.success) return parsed.response;

  const supabase = createAdminClient();

  // Never trust the URL alone -- confirm the channel exists and get its org.
  const { data: channel } = await supabase
    .from("channels")
    .select("id, org_id")
    .eq("id", channelId)
    .maybeSingle();

  if (!channel) {
    return NextResponse.json(
      { error: "This feedback form is no longer available." },
      { status: 404 }
    );
  }

  let customerId: string | null = null;
  if (parsed.data.email) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("org_id", channel.org_id)
      .ilike("email", parsed.data.email)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({ org_id: channel.org_id, email: parsed.data.email })
        .select("id")
        .single();
      customerId = newCustomer?.id ?? null;
    }
  }

  const { data: feedbackItem, error: insertError } = await supabase
    .from("feedback_items")
    .insert({
      org_id: channel.org_id,
      channel_id: channel.id,
      customer_id: customerId,
      content: parsed.data.content,
      source: "widget",
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  // No authenticated user here at all -- actor_user_id is null (an
  // anonymous, external submission), so this goes straight through the
  // service-role client rather than log_audit_event (which requires a real
  // auth.uid() and would just reject this the same way create_organization
  // does for an unauthenticated caller).
  await supabase.from("audit_log").insert({
    org_id: channel.org_id,
    actor_user_id: null,
    action: "feedback.created",
    target_type: "feedback_item",
    target_id: feedbackItem.id,
    metadata: { source: "widget" },
  });

  await tryProcessFeedbackItem(supabase, channel.org_id, feedbackItem.id, parsed.data.content);

  return NextResponse.json({ ok: true });
}
