"use client";

import { memo } from "react";
import type { DraftItem } from "@/lib/quick-create/types";
import { DraftCard } from "./draft-card";

interface DraftListProps {
  drafts: DraftItem[];
  isLoading?: boolean;
  creatingItemId?: number | null;
  deletingItemId?: number | null;
  onCreateRide?: (item: DraftItem) => void;
  onEdit?: (item: DraftItem) => void;
  onUpdatePrompt?: (item: DraftItem, rawText: string) => Promise<void>;
  onDelete?: (item: DraftItem) => void;
  onDuplicate?: (item: DraftItem) => void;
}

export const DraftList = memo(function DraftList({
  drafts,
  isLoading = false,
  creatingItemId = null,
  deletingItemId = null,
  onCreateRide,
  onEdit,
  onUpdatePrompt,
  onDelete,
  onDuplicate,
}: DraftListProps) {
  return (
    <div className="px-3 py-2 space-y-1">
      {isLoading && drafts.length === 0 ? (
        <DraftListSkeleton />
      ) : drafts.length === 0 ? (
        <EmptyDraftList />
      ) : (
        drafts.map((item) => (
          <DraftCard
            key={item.id}
            item={item}
            isCreating={creatingItemId === item.id}
            isDeleting={deletingItemId === item.id}
            onCreateRide={onCreateRide}
            onEdit={onEdit}
            onUpdatePrompt={onUpdatePrompt}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))
      )}
    </div>
  );
});

function DraftListSkeleton() {
  return (
    <div className="space-y-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-slate-200 p-3 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-12 bg-slate-200 rounded" />
            <div className="h-3 w-10 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded ml-auto" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-3 w-20 bg-slate-200 rounded" />
          </div>
          <div className="h-3 w-32 bg-slate-200 rounded" />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-20 bg-blue-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyDraftList() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <svg
        className="w-12 h-12 text-slate-300 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-slate-500 text-sm font-medium mb-1">Chưa có bản nháp nào</p>
      <p className="text-slate-400 text-xs">Trò chuyện với AI bên dưới để tạo bản nháp đầu tiên</p>
    </div>
  );
}
