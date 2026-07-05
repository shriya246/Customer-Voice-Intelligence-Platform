import { WidgetForm } from "./widget-form";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  return (
    <div className="p-4">
      <WidgetForm channelId={channelId} />
    </div>
  );
}
