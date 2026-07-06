"use client";

import { useRef } from "react";
import Link from "next/link";
import { updateRoadmapItemStatus } from "./actions";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";

const STATUS_OPTIONS = [
  { value: "under_review", label: "Under review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
  { value: "declined", label: "Declined" },
];

export function RoadmapItemCard({
  itemId,
  title,
  description,
  status,
  themeId,
  themeName,
  canEdit,
}: {
  itemId: string;
  title: string;
  description: string | null;
  status: string;
  themeId: string | null;
  themeName: string | null;
  canEdit: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card interactive className="p-3 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {themeId && (
        <Link
          href={`/dashboard?theme=${themeId}`}
          className="mt-1 inline-block text-xs text-primary hover:text-primary-hover"
        >
          {themeName ?? "Unlabeled theme"}
        </Link>
      )}
      {canEdit && (
        <form ref={formRef} action={updateRoadmapItemStatus} className="mt-2">
          <input type="hidden" name="itemId" value={itemId} />
          <Select
            name="status"
            defaultValue={status}
            onChange={() => formRef.current?.requestSubmit()}
            className="py-1 text-xs"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </form>
      )}
    </Card>
  );
}
