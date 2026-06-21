"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Plus,
  FolderArchive,
  Check,
  Loader2,
  Clipboard,
} from "lucide-react";
import type { QuickEntrySession } from "@/lib/quick-create/types";

interface SessionSwitcherProps {
  sessions: QuickEntrySession[];
  selectedId: number | null;
  isLoading?: boolean;
  onSelect: (session: QuickEntrySession) => void;
  onCreateSession?: () => void;
  onManageSessions?: () => void;
}

export function SessionSwitcher({
  sessions,
  selectedId,
  isLoading = false,
  onSelect,
  onCreateSession,
  onManageSessions,
}: SessionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = sessions.find((s) => s.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
          "border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
          "shadow-sm",
        ].join(" ")}
      >
        <Clipboard className="w-4 h-4 text-blue-500" />
        <span className="max-w-[120px] truncate text-slate-700">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang tải...
            </span>
          ) : (
            selected?.name ?? "Chọn phiên"
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <div
        role="listbox"
        aria-label="Danh sách phiên làm việc"
        className={[
          "absolute top-full right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] overflow-hidden",
          "transform origin-top-right transition-all duration-200",
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Phiên làm việc</span>
          {onCreateSession && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateSession();
              }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo mới
            </button>
          )}
        </div>

        {/* Sessions list */}
        <div className="max-h-60 overflow-y-auto py-1">
          {sessions.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              Chưa có phiên nào
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.id === selectedId;
              return (
                <button
                  key={session.id}
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => {
                    onSelect(session);
                    setOpen(false);
                  }}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    isCurrent
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-slate-50 text-slate-700",
                  ].join(" ")}
                >
                  <span className="w-5 flex-shrink-0 flex justify-center">
                    {isCurrent && <Check className="w-4 h-4 text-blue-500" />}
                  </span>
                  <span className="text-sm flex-1 truncate font-medium">{session.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {session.pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                        {session.pendingCount}
                      </span>
                    )}
                    {session.errorCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                        {session.errorCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {onManageSessions && (
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onManageSessions();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <FolderArchive className="w-4 h-4" />
              Quản lý phiên...
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
