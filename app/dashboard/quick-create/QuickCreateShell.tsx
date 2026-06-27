"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AIComposer } from "@/components/quick-create/ai-composer";
import { ConfirmDialog } from "@/components/quick-create/confirm-dialog";
import { DraftEditorSheet } from "@/components/quick-create/draft-editor-sheet";
import { DraftList } from "@/components/quick-create/draft-list";
import { SessionManagerSheet } from "@/components/quick-create/session-manager-sheet";
import { SessionSwitcher } from "@/components/quick-create/session-switcher";
import { useAIComposer } from "@/hooks/use-ai-composer";
import { useDrafts } from "@/hooks/use-quick-create-drafts";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useRecentPrompts } from "@/hooks/use-recent-prompts";
import { useSessions } from "@/hooks/use-quick-create-sessions";
import type {
  DraftItem,
  DraftUpsertPayload,
  QuickEntrySession,
} from "@/lib/quick-create/types";
import { inferExpectedDraftCount } from "@/lib/quick-create/draft-helpers";

export default function QuickCreateShell() {
  const router = useRouter();
  const {
    sessions,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
    createSession,
    updateSession,
    deleteSession,
  } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedSessionId === null && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  const {
    drafts,
    isLoading: draftsLoading,
    mutate: mutateDrafts,
    createDrafts,
    updateDraft,
    updateDraftPrompt,
    saveDraft,
    saveDraftWithParsedData,
    discardDraft,
    duplicateDraft,
  } = useDrafts(selectedSessionId);
  const composer = useAIComposer();
  const { addPrompt } = useRecentPrompts();

  const [editingItem, setEditingItem] = useState<DraftItem | null>(null);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [creatingItemId, setCreatingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ item: DraftItem } | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const { pullState, handlers } = usePullToRefresh({
    threshold: 72,
    isRefreshing,
    onRefresh: async () => {
      setIsRefreshing(true);
      try {
        await Promise.all([mutateDrafts(), mutateSessions()]);
      } finally {
        setIsRefreshing(false);
      }
    },
  });

  const showToast = useCallback((text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleSelectSession = useCallback((session: QuickEntrySession) => {
    setSelectedSessionId(session.id);
  }, []);

  const handleCreateSession = useCallback(
    async (name?: string) => {
      try {
        const defaultName = name ?? `Phiên ${new Date().toLocaleDateString("vi-VN")}`;
        const session = await createSession(defaultName);
        setSelectedSessionId(session.id);
        await mutateSessions();
      } catch {
        showToast("Tạo phiên thất bại", "error");
      }
    },
    [createSession, mutateSessions, showToast],
  );

  const handleSubmitPrompt = useCallback(
    async (text: string) => {
      composer.setAnalyzing();
      try {
        composer.setGenerating();
        const items = await createDrafts(text);
        composer.setDone();
        addPrompt(text);
        await Promise.all([mutateDrafts(), mutateSessions()]);
        if (items.length === 0) {
          showToast("Không nhận diện được cuốc xe nào", "error");
        } else {
          const expectedDraftCount = inferExpectedDraftCount(text);
          showToast(
            expectedDraftCount
              ? `Đang tạo ${expectedDraftCount} bản nháp`
              : "Đang tạo bản nháp",
            "success",
          );
        }
      } catch (error) {
        composer.setError(error instanceof Error ? error.message : "Lỗi khi tạo bản nháp");
        showToast("Tạo bản nháp thất bại", "error");
      }
    },
    [addPrompt, composer, createDrafts, mutateDrafts, mutateSessions, showToast],
  );

  const handleCreateRide = useCallback(
    async (item: DraftItem) => {
      setCreatingItemId(item.id);
      try {
        const result = await saveDraft(item.id);
        if (result.success) {
          showToast("Đã tạo cuốc xe!", "success");
          await Promise.all([mutateDrafts(), mutateSessions()]);
          return;
        }
        showToast(result.error ?? "Tạo cuốc xe thất bại", "error");
      } catch {
        showToast("Tạo cuốc xe thất bại", "error");
      } finally {
        setCreatingItemId(null);
      }
    },
    [mutateDrafts, mutateSessions, saveDraft, showToast],
  );

  const handleDeleteDraft = useCallback((item: DraftItem) => {
    setDeleteConfirm({ item });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    const item = deleteConfirm.item;
    setDeleteConfirm(null);
    setDeletingItemId(item.id);
    try {
      await discardDraft(item.id);
      await Promise.all([mutateDrafts(), mutateSessions()]);
      showToast("Đã xóa bản nháp", "success");
    } catch {
      showToast("Xóa bản nháp thất bại", "error");
    } finally {
      setDeletingItemId(null);
    }
  }, [deleteConfirm, discardDraft, mutateDrafts, mutateSessions, showToast]);

  const handleDuplicateDraft = useCallback(
    async (item: DraftItem) => {
      try {
        await duplicateDraft(item.id);
        showToast("Đã nhân đôi bản nháp", "success");
      } catch {
        showToast("Nhân đôi bản nháp thất bại", "error");
      }
    },
    [duplicateDraft, showToast],
  );

  const handleUpdateDraftPrompt = useCallback(
    async (item: DraftItem, rawText: string) => {
      try {
        await updateDraftPrompt(item.id, { rawText, reparse: true });
        await Promise.all([mutateDrafts(), mutateSessions()]);
        showToast("Đã phân tích lại bản nháp", "success");
      } catch {
        showToast("Phân tích lại thất bại", "error");
      }
    },
    [mutateDrafts, mutateSessions, showToast, updateDraftPrompt],
  );

  const handleSaveDraft = useCallback(
    async (itemId: number, parsedData: DraftUpsertPayload) => {
      try {
        await updateDraft(itemId, parsedData);
        await Promise.all([mutateDrafts(), mutateSessions()]);
        showToast("Đã lưu bản nháp", "success");
      } catch {
        showToast("Lưu bản nháp thất bại", "error");
      }
    },
    [mutateDrafts, mutateSessions, showToast, updateDraft],
  );

  const handleCreateRideFromEditor = useCallback(
    async (itemId: number, parsedData: DraftUpsertPayload) => {
      setCreatingItemId(itemId);
      try {
        const result = await saveDraftWithParsedData(itemId, parsedData);
        if (result.success) {
          showToast("Đã tạo cuốc xe!", "success");
          await Promise.all([mutateDrafts(), mutateSessions()]);
          return;
        }
        showToast(result.error ?? "Tạo cuốc xe thất bại", "error");
      } catch {
        showToast("Tạo cuốc xe thất bại", "error");
      } finally {
        setCreatingItemId(null);
      }
    },
    [mutateDrafts, mutateSessions, saveDraftWithParsedData, showToast],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingItem) setEditingItem(null);
        if (showSessionManager) setShowSessionManager(false);
        if (deleteConfirm) setDeleteConfirm(null);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteConfirm, editingItem, showSessionManager]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        document.getElementById("ai-composer-input")?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const unsavedDrafts = drafts.filter(
    (draft) =>
      draft.status !== "saved" &&
      draft.status !== "auto_saved" &&
      draft.status !== "discarded",
  );

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
            title="Quay lại"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">Tạo nhanh</h1>
        </div>
        <SessionSwitcher
          sessions={sessions}
          selectedId={selectedSessionId}
          isLoading={sessionsLoading}
          onSelect={handleSelectSession}
          onCreateSession={handleCreateSession}
          onManageSessions={() => setShowSessionManager(true)}
        />
      </header>

      <div
        className={[
          "pointer-events-none absolute left-0 right-0 z-10 flex items-center justify-center transition-all duration-200",
          pullState.pulling ? "opacity-100 -top-2" : "opacity-0 -top-8",
        ].join(" ")}
      >
        <div className="flex flex-col items-center gap-1">
          <div
            className={[
              "h-5 w-5 rounded-full border-2 border-blue-200",
              isRefreshing
                ? "animate-spin border-t-blue-600"
                : pullState.progress >= 1
                  ? "animate-pulse border-blue-600"
                  : "border-blue-300",
            ].join(" ")}
            style={{
              transform:
                pullState.pulling && !isRefreshing
                  ? `rotate(${pullState.progress * 360}deg)`
                  : undefined,
              transition:
                pullState.pulling && !isRefreshing ? "none" : "transform 0.2s",
            }}
          />
          {!isRefreshing && pullState.pulling && (
            <div className="h-1 w-10 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(pullState.progress, 1) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-20"
        style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("[data-prevent-pull]")) return;
          const element = mainRef.current;
          if (element && element.scrollTop <= 2) handlers.onPointerDown(event);
        }}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
      >
        {!selectedSessionId && !sessionsLoading && sessions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <svg
              className="mb-3 h-12 w-12 text-slate-300"
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
            <p className="mb-1 text-sm font-medium text-slate-500">
              Chưa có phiên làm việc nào
            </p>
            <p className="mb-4 text-xs text-slate-400">
              Tạo phiên đầu tiên để bắt đầu
            </p>
            <button
              onClick={() => void handleCreateSession()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Tạo phiên mới
            </button>
          </div>
        ) : (
          <DraftList
            drafts={unsavedDrafts}
            isLoading={draftsLoading && drafts.length === 0}
            creatingItemId={creatingItemId}
            deletingItemId={deletingItemId}
            onCreateRide={handleCreateRide}
            onEdit={(item) => setEditingItem(item)}
            onUpdatePrompt={handleUpdateDraftPrompt}
            onDelete={handleDeleteDraft}
            onDuplicate={handleDuplicateDraft}
          />
        )}
      </main>

      <div className="sticky bottom-0 z-40">
        <AIComposer
          state={composer.state}
          text={composer.text}
          errorMessage={composer.errorMessage}
          onTextChange={composer.setText}
          onSubmit={handleSubmitPrompt}
          onCancel={composer.reset}
          onSuggestionClick={(text) => composer.setText(text)}
        />
      </div>

      {editingItem && (
        <DraftEditorSheet
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveDraft}
          onCreateRide={async (itemId, parsedData) => {
            setEditingItem(null);
            await handleCreateRideFromEditor(itemId, parsedData);
          }}
        />
      )}

      {showSessionManager && (
        <SessionManagerSheet
          sessions={sessions}
          selectedId={selectedSessionId}
          onClose={() => setShowSessionManager(false)}
          onCreateSession={handleCreateSession}
          onUpdateSession={async (id, data) => {
            await updateSession(id, data);
          }}
          onDeleteSession={async (id) => {
            await deleteSession(id);
            await mutateSessions();
            if (selectedSessionId === id) {
              setSelectedSessionId(
                sessions.find((session) => session.id !== id)?.id ?? null,
              );
            }
          }}
        />
      )}

      {toastMessage && (
        <div
          className={[
            "fixed bottom-24 left-1/2 z-[200] max-w-xs -translate-x-1/2 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg",
            toastMessage.type === "success" ? "bg-green-600" : "bg-red-600",
          ].join(" ")}
        >
          {toastMessage.text}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Xóa bản nháp?"
        message="Hành động này không thể hoàn tác. Bản nháp sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
