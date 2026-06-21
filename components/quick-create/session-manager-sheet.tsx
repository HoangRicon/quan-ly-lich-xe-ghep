"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, Star, Trash2, Edit2, Check } from "lucide-react";
import type { QuickEntrySession } from "@/lib/quick-create/types";

interface SessionManagerSheetProps {
  sessions: QuickEntrySession[];
  selectedId: number | null;
  onClose: () => void;
  onCreateSession?: (name: string) => Promise<void>;
  onUpdateSession?: (id: number, data: { name?: string; status?: "active" | "archived" }) => Promise<void>;
  onDeleteSession?: (id: number) => Promise<void>;
}

export function SessionManagerSheet({
  sessions,
  selectedId,
  onClose,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
}: SessionManagerSheetProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const handleCreate = async () => {
    if (!newName.trim() || !onCreateSession) return;
    setIsCreating(true);
    try {
      await onCreateSession(newName.trim());
      setNewName("");
      setCreating(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (session: QuickEntrySession) => {
    setEditingId(session.id);
    setEditName(session.name);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim() || !onUpdateSession) return;
    setIsSaving(true);
    try {
      await onUpdateSession(id, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!onDeleteSession) return;
    await onDeleteSession(id);
    setConfirmDeleteId(null);
  };

  const togglePin = (id: number) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sorted = [...sessions].sort((a, b) => {
    const pa = pinnedIds.has(a.id) ? -1 : 0;
    const pb = pinnedIds.has(b.id) ? -1 : 0;
    if (pa !== pb) return pa - pb;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Drag handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Quản lý phiên</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Create new */}
          <div className="px-4 py-3 border-b border-slate-100">
            {creating ? (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder="Tên phiên, ví dụ: Phiên sáng"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-400 outline-none"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || isCreating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? "..." : "Tạo"}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-3 py-2 text-slate-500 text-sm"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Tạo phiên mới
              </button>
            )}
          </div>

          {/* Session list */}
          <div className="py-1">
            {sorted.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Chưa có phiên nào
              </div>
            ) : (
              sorted.map((session) => (
                <div
                  key={session.id}
                  className={[
                    "flex items-center gap-2 px-4 py-3 border-b border-slate-50",
                    session.id === selectedId ? "bg-blue-50" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  {/* Pin */}
                  <button
                    type="button"
                    onClick={() => togglePin(session.id)}
                    className="p-1 flex-shrink-0"
                  >
                    <Star
                      className={`w-4 h-4 ${pinnedIds.has(session.id) ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
                    />
                  </button>

                  {/* Name / Edit */}
                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(session.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 px-2 py-1 rounded border border-slate-300 text-sm focus:border-blue-400 outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(session.id)}
                          disabled={isSaving}
                          className="p-1 text-blue-600"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-slate-800 truncate block">
                        {session.name}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {session.pendingCount > 0 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {session.pendingCount} chờ
                        </span>
                      )}
                      {session.errorCount > 0 && (
                        <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          {session.errorCount} lỗi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(session)}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-400"
                      title="Đổi tên"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteId === session.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(session.id)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded font-medium"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(session.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                        title="Xóa phiên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
