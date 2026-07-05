"use client";

import { useRef } from "react";
import Link from "next/link";
import { updateRoadmapItemStatus } from "./actions";

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
    <div className="rounded-md border border-gray-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      {themeId && (
        <Link href={`/dashboard?theme=${themeId}`} className="mt-1 inline-block text-xs text-gray-500 underline">
          {themeName ?? "Unlabeled theme"}
        </Link>
      )}
      {canEdit && (
        <form ref={formRef} action={updateRoadmapItemStatus} className="mt-2">
          <input type="hidden" name="itemId" value={itemId} />
          <select
            name="status"
            defaultValue={status}
            onChange={() => formRef.current?.requestSubmit()}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </form>
      )}
    </div>
  );
}
