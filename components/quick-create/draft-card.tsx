"use client";

import { memo, useEffect, useState } from "react";
import {
  ArrowRight,
  Car,
  ChevronDown,
  Copy,
  Loader2,
  MessageCircle,
  Sparkles,
  Trash2,
} from "lucide-react";

import { DRAFT_STATUS_CONFIG } from "@/lib/quick-create/constants";
import {
  canCreateRideFromDraft,
  getDraftAnalysisBadge,
  getDraftFieldIssueCards,
  getDraftUncertaintyNotes,
} from "@/lib/quick-create/draft-helpers";
import {
  formatCurrency,
  formatFullDate,
  formatPhoneLink,
  formatTime,
  formatZaloLink,
} from "@/lib/quick-create/formatters";
import type { DraftItem } from "@/lib/quick-create/types";

interface DraftCardProps {
  item: DraftItem;
  onCreateRide?: (item: DraftItem) => void;
  onEdit?: (item: DraftItem) => void;
  onUpdatePrompt?: (item: DraftItem, rawText: string) => Promise<void>;
  onDelete?: (item: DraftItem) => void;
  onDuplicate?: (item: DraftItem) => void;
  isCreating?: boolean;
  isDeleting?: boolean;
}

export const DraftCard = memo(function DraftCard({
  item,
  onCreateRide,
  onEdit,
  onUpdatePrompt,
  onDelete,
  onDuplicate,
  isCreating = false,
  isDeleting = false,
}: DraftCardProps) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState(item.rawText);
  const [isPromptSaving, setIsPromptSaving] = useState(false);

  const parsed = item.parsedData;
  const statusCfg = DRAFT_STATUS_CONFIG[item.status] ?? DRAFT_STATUS_CONFIG.pending;
  const analysisBadge = getDraftAnalysisBadge(item);
  const issueCards = getDraftFieldIssueCards(item);
  const uncertaintyNotes = getDraftUncertaintyNotes(item);
  const isRoundtrip = parsed?.tripDirection === "roundtrip";
  const isSaved =
    item.status === "saved" || item.status === "auto_saved" || !!item.createdTripId;
  const isFailed = item.status === "failed";
  const isPending = item.status === "pending";
  const isIncomplete = issueCards.length > 0;
  const canCreateRide = canCreateRideFromDraft(item);
  const promptChanged = promptText.trim() !== item.rawText.trim();
  const canUpdatePrompt =
    Boolean(onUpdatePrompt) && promptText.trim().length > 0 && promptChanged;

  useEffect(() => {
    setPromptText(item.rawText);
  }, [item.rawText]);

  const cardClasses = [
    "cursor-pointer select-none rounded-lg border bg-white p-2.5 transition-all",
    isFailed ? "border-red-300" : isIncomplete ? "border-amber-200" : "border-slate-200",
    isCreating || isDeleting ? "pointer-events-none opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = () => {
    if (isPending) return;
    onEdit?.(item);
  };

  const shouldIgnoreCardKeyDown = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("button,a,textarea,input,select"));
  };

  const handlePromptSave = async () => {
    if (!onUpdatePrompt || !canUpdatePrompt) return;

    setIsPromptSaving(true);
    try {
      await onUpdatePrompt(item, promptText.trim());
    } finally {
      setIsPromptSaving(false);
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (shouldIgnoreCardKeyDown(event.target)) return;
        if (event.key === "Enter" || event.key === " ") {
          handleClick();
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isRoundtrip && (
            <span className="flex-shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
              2C
            </span>
          )}
          <span className="flex-shrink-0 text-base font-bold text-slate-800">
            {formatTime(parsed?.departureTime)}
          </span>
          <span className="text-[11px] font-semibold text-slate-800">
            {formatFullDate(parsed?.departureTime)}
          </span>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
          {analysisBadge && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${analysisBadge.className}`}
              title={analysisBadge.title}
            >
              {analysisBadge.label}
            </span>
          )}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {isPending && (
        <div className="mb-1.5 space-y-1">
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      )}

      {!isPending && (parsed?.departure || parsed?.destination) && (
        <div className="mb-0.5 flex items-center gap-2">
          <span className="max-w-[44%] truncate text-sm font-medium text-slate-800">
            {parsed?.departure || "-"}
          </span>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="max-w-[44%] truncate text-sm font-medium text-slate-800">
            {parsed?.destination || "-"}
          </span>
        </div>
      )}

      {!isPending && (parsed?.pickupLocation || parsed?.dropoffLocation) && (
        <div className="mb-1 space-y-0.5">
          {parsed?.pickupLocation && (
            <div className="truncate text-[11px] text-slate-500">
              Đón: {parsed.pickupLocation}
            </div>
          )}
          {parsed?.dropoffLocation && (
            <div className="truncate text-[11px] text-slate-500">
              Trả: {parsed.dropoffLocation}
            </div>
          )}
        </div>
      )}

      {!isPending && parsed?.customerPhone && (
        <div className="mb-0.5 flex items-center gap-2">
          <a
            href={formatPhoneLink(parsed.customerPhone)}
            className="shrink-0 text-xs text-blue-600 hover:underline"
            onClick={(event) => event.stopPropagation()}
            title="Gọi"
          >
            {parsed.customerPhone}
          </a>
          <a
            href={formatZaloLink(parsed.customerPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
            onClick={(event) => event.stopPropagation()}
            title="Nhắn Zalo"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {issueCards.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {issueCards.map((issue) => (
            <span
              key={issue.key}
              className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"
              title={issue.description}
            >
              {issue.label}
            </span>
          ))}
        </div>
      )}

      <div
        className="mb-1.5 rounded-md border border-slate-100 bg-slate-50"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsPromptOpen((current) => !current)}
          className="flex min-h-10 w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
          aria-expanded={isPromptOpen}
        >
          <span className="min-w-0 truncate text-[11px] font-medium text-slate-600">
            Prompt gốc: {item.rawText}
          </span>
          <ChevronDown
            className={[
              "h-4 w-4 flex-shrink-0 text-slate-400 transition-transform",
              isPromptOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        {isPromptOpen && (
          <div className="space-y-2 border-t border-slate-100 p-2">
            <textarea
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
            {issueCards.length > 0 && (
              <div className="space-y-1">
                {issueCards.map((issue) => (
                  <p key={`${issue.key}:detail`} className="text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-600">
                      {issue.label}:
                    </span>{" "}
                    {issue.description}
                  </p>
                ))}
              </div>
            )}
            {uncertaintyNotes.length > 0 && (
              <div className="space-y-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  Lưu ý thông tin chưa rõ
                </p>
                {uncertaintyNotes.map((note) => (
                  <div key={note.key} className="text-[10px] text-blue-700">
                    <span className="font-semibold">{note.title}:</span>{" "}
                    <span className="text-blue-600">{note.description}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                Bổ sung thông tin còn thiếu rồi phân tích lại bản nháp này.
              </span>
              {onUpdatePrompt && (
                <button
                  type="button"
                  onClick={() => void handlePromptSave()}
                  disabled={!canUpdatePrompt || isPromptSaving}
                  className="flex min-h-8 flex-shrink-0 items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    canUpdatePrompt
                      ? "Phân tích lại prompt"
                      : "Sửa prompt trước khi phân tích lại"
                  }
                >
                  {isPromptSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Phân tích lại
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          {isPending ? (
            <span className="text-xs font-medium text-slate-400">
              Đang xử lý bản nháp
            </span>
          ) : (
            <span className="text-sm font-bold text-slate-800">
              {formatCurrency(parsed?.price)}
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {!isSaved && !isFailed && !isPending && onDuplicate && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate(item);
              }}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Nhân đôi bản nháp"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}

          {!isSaved && !isFailed && !isPending && onCreateRide && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onCreateRide(item);
              }}
              disabled={isCreating || !canCreateRide}
              className="flex min-h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                canCreateRide
                  ? "Tạo cuốc xe"
                  : "Bản nháp chưa sẵn sàng để tạo cuốc xe"
              }
            >
              {isCreating ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-white" />
              ) : (
                <Car className="h-3.5 w-3.5" />
              )}
              Tạo cuốc xe
            </button>
          )}

          {!isSaved && !isFailed && !isPending && onDelete && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item);
              }}
              disabled={isDeleting}
              className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 disabled:opacity-50"
              title="Xóa bản nháp"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isFailed && item.errorMessage && (
        <div className="mt-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-500">
          {item.errorMessage}
        </div>
      )}
    </div>
  );
});
