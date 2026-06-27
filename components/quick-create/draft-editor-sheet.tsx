"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Car,
  Loader2,
  Save,
  X,
} from "lucide-react";

import {
  buildIsoDateTimeFromLocalParts,
  canCreateRideFromDraft,
} from "@/lib/quick-create/draft-helpers";
import { formatNumberWithDots } from "@/lib/quick-create/formatters";
import { generateAutoNote } from "@/lib/quick-create/auto-note";
import type { DraftItem, DraftUpsertPayload } from "@/lib/quick-create/types";

interface DraftEditorSheetProps {
  item: DraftItem | null;
  onClose: () => void;
  onSave?: (itemId: number, parsedData: DraftUpsertPayload) => Promise<void>;
  onCreateRide?: (itemId: number, parsedData: DraftUpsertPayload) => Promise<void>;
}

type TripType = "ghep" | "ghep_roundtrip" | "bao" | "bao_roundtrip";

function toEditorTripType(item: DraftItem): TripType {
  const parsed = item.parsedData;
  const isRoundtrip = parsed?.tripDirection === "roundtrip";

  if (parsed?.tripType === "bao") {
    return isRoundtrip ? "bao_roundtrip" : "bao";
  }

  return isRoundtrip ? "ghep_roundtrip" : "ghep";
}

function toLocalDateInputValue(value: string | undefined) {
  if (!value) return new Date().toISOString().split("T")[0];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeInputValue(value: string | undefined) {
  if (!value) return new Date().toTimeString().slice(0, 5);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toTimeString().slice(0, 5);

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildParsedDataFromForm(form: {
  customerPhone: string;
  customerName: string;
  departure: string;
  destination: string;
  pickupLocation: string;
  dropoffLocation: string;
  departureDate: string;
  departureTime: string;
  price: string;
  totalSeats: string;
  tripType: TripType;
  notes: string;
  analysisSource?: "ai" | "rule";
  analysisMessage?: string;
}): DraftUpsertPayload {
  const priceNum = parseInt(form.price.replace(/\./g, ""), 10) || 0;

  return {
    analysisSource: form.analysisSource,
    analysisMessage: form.analysisMessage || undefined,
    customerPhone: form.customerPhone || undefined,
    customerName: form.customerName || undefined,
    departure: form.departure || undefined,
    destination: form.destination || undefined,
    pickupLocation: form.pickupLocation || undefined,
    dropoffLocation: form.dropoffLocation || undefined,
    departureTime: buildIsoDateTimeFromLocalParts(
      form.departureDate,
      form.departureTime,
    ),
    price: priceNum || undefined,
    totalSeats: parseInt(form.totalSeats, 10) || 1,
    tripType: form.tripType.replace("_roundtrip", "") as "ghep" | "bao",
    tripDirection: form.tripType.includes("roundtrip") ? "roundtrip" : "oneway",
    notes: form.notes || undefined,
  };
}

export function DraftEditorSheet({
  item,
  onClose,
  onSave,
  onCreateRide,
}: DraftEditorSheetProps) {
  const [form, setForm] = useState({
    customerPhone: "",
    customerName: "",
    departure: "",
    destination: "",
    pickupLocation: "",
    dropoffLocation: "",
    departureDate: new Date().toISOString().split("T")[0],
    departureTime: new Date().toTimeString().slice(0, 5),
    price: "",
    totalSeats: "1",
    tripType: "ghep" as TripType,
    notes: "",
    analysisSource: undefined as "ai" | "rule" | undefined,
    analysisMessage: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<
    Array<{ id: number; name: string; phone: string }>
  >([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!item?.parsedData) return;
    const parsed = item.parsedData;

    setForm({
      customerPhone: parsed.customerPhone ?? "",
      customerName: parsed.customerName ?? "",
      departure: parsed.departure ?? "",
      destination: parsed.destination ?? "",
      pickupLocation: parsed.pickupLocation ?? "",
      dropoffLocation: parsed.dropoffLocation ?? "",
      departureDate: toLocalDateInputValue(parsed.departureTime),
      departureTime: toLocalTimeInputValue(parsed.departureTime),
      price: parsed.price != null ? formatNumberWithDots(parsed.price) : "",
      totalSeats: String(parsed.totalSeats ?? 1),
      tripType: toEditorTripType(item),
      notes: parsed.notes ?? "",
      analysisSource: parsed.analysisSource,
      analysisMessage: parsed.analysisMessage ?? "",
    });
  }, [item]);

  useEffect(() => {
    const search = async () => {
      if (form.customerPhone.length < 2) {
        setCustomerSuggestions([]);
        setShowCustomerDropdown(false);
        return;
      }

      try {
        const response = await fetch(`/api/customers?search=${form.customerPhone}`);
        const data = await response.json();
        const customers = data.data ?? [];
        setCustomerSuggestions(customers);
        setShowCustomerDropdown(customers.length > 0);
      } catch {
        setCustomerSuggestions([]);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [form.customerPhone]);

  if (!item) return null;

  const selectCustomer = (customer: { name: string; phone: string }) => {
    setForm((current) => ({
      ...current,
      customerPhone: customer.phone,
      customerName: customer.name,
    }));
    setShowCustomerDropdown(false);
  };

  const swapRoute = () => {
    setForm((current) => ({
      ...current,
      departure: current.destination,
      destination: current.departure,
      pickupLocation: current.dropoffLocation,
      dropoffLocation: current.pickupLocation,
    }));
  };

  const buildGeneratedNote = () => {
    // Xác định giờ thực tế: nếu giờ đã qua trong ngày, dùng giờ hiện tại
    const now = new Date();
    const [hours, minutes] = form.departureTime.split(":").map(Number);
    const [year, month, day] = form.departureDate.split("-").map(Number);
    const tripDate = new Date(year, month - 1, day, hours, minutes);
    const nowWithBuffer = new Date(now.getTime() + 60 * 1000);
    const actualTime = tripDate < nowWithBuffer
      ? now.toTimeString().slice(0, 5)
      : form.departureTime;
    const direction = form.tripType.includes("roundtrip") ? "roundtrip" : "oneway";
    const rawType = form.tripType.replace("_roundtrip", "") as "ghep" | "bao";

    return generateAutoNote({
      departureTime: actualTime,
      departure: form.departure,
      destination: form.destination,
      price: form.price,
      phone: form.customerPhone,
      seats: parseInt(form.totalSeats) || 1,
      tripType: rawType,
      tripDirection: direction,
      pickupLocation: form.pickupLocation,
      dropoffLocation: form.dropoffLocation,
    });
  };

  const appendGeneratedNote = () => {
    const generatedNote = buildGeneratedNote();
    setForm((current) => {
      const existing = current.notes.trim();
      const combined = existing ? `${existing} ${generatedNote}` : generatedNote;
      return { ...current, notes: combined };
    });
  };

  const clearAllNotes = () => {
    setForm((current) => ({ ...current, notes: "" }));
  };

  const parsedData = buildParsedDataFromForm(form);
  const draftPreview: DraftItem = {
    ...item,
    parsedData: {
      ...(item.parsedData ?? {
        confidence: 0,
        missingFields: [],
        warnings: [],
      }),
      ...parsedData,
      confidence: item.parsedData?.confidence ?? 0.9,
      missingFields: [],
      warnings: item.warnings,
    },
    missingFields: [],
    warnings: item.warnings,
  };
  const canCreateRide = canCreateRideFromDraft(draftPreview);
  const tripTypeBase = form.tripType.replace("_roundtrip", "") as "ghep" | "bao";
  const isGhep = tripTypeBase === "ghep";

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(item.id, parsedData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRide = async () => {
    if (!onCreateRide) return;
    setIsCreatingRide(true);
    try {
      await onCreateRide(item.id, parsedData);
      onClose();
    } finally {
      setIsCreatingRide(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-2xl animate-slide-up">
        <div className="flex items-center justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <div>
            <h2 className="font-semibold text-slate-800">Chỉnh sửa bản nháp</h2>
            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
              {item.rawText}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-full p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {/* Section 1: Khách hàng */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <h3 className="font-semibold text-slate-800">Thông tin khách hàng</h3>
            <div className="space-y-3">
              <div className="relative">
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  value={form.customerPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customerPhone: event.target.value,
                    }))
                  }
                  placeholder="Nhập số điện thoại"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                />
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-100 bg-white shadow-lg">
                    {customerSuggestions.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {customer.name}
                          </div>
                          <div className="text-xs text-slate-500">{customer.phone}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={form.customerName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customerName: event.target.value,
                  }))
                }
                placeholder="Nhập tên khách"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              />
            </div>
          </div>

          {/* Section 2: Lộ trình */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Lộ trình</h3>
              <button
                type="button"
                onClick={swapRoute}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Đảo chiều
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={form.departure}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departure: event.target.value,
                    }))
                  }
                  placeholder="Hà Nội"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      destination: event.target.value,
                    }))
                  }
                  placeholder="Hải Phòng"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <textarea
                  value={form.pickupLocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pickupLocation: event.target.value,
                    }))
                  }
                  placeholder="Dán địa chỉ đón từ Zalo Map"
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base resize-none"
                />
              </div>
              <div>
                <textarea
                  value={form.dropoffLocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dropoffLocation: event.target.value,
                    }))
                  }
                  placeholder="Dán địa chỉ trả từ Zalo Map"
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base resize-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={form.departureDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departureDate: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                />
              </div>
              <div>
                <input
                  type="time"
                  step="300"
                  value={form.departureTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departureTime: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Loại hình + Giá */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <h3 className="font-semibold text-slate-800">Loại hình</h3>
            <div className="grid grid-cols-4 gap-2">
              {(["ghep", "ghep_roundtrip", "bao", "bao_roundtrip"] as const).map(
                (type) => {
                  const labels: Record<TripType, string> = {
                    ghep: "Ghép",
                    ghep_roundtrip: "Ghép 2C",
                    bao: "Bao",
                    bao_roundtrip: "Bao 2C",
                  };
                  const isBao = type === "bao" || type === "bao_roundtrip";

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, tripType: type }))
                      }
                      className={[
                        "px-3 py-2.5 rounded-lg border-2 text-center text-sm font-medium transition-colors",
                        form.tripType === type
                          ? isBao
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {labels[type]}
                    </button>
                  );
                },
              )}
            </div>

            {isGhep && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 shrink-0">Số ghế</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      totalSeats: String(
                        Math.max(1, parseInt(current.totalSeats || "1", 10) - 1),
                      ),
                    }))
                  }
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-base font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.totalSeats}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      totalSeats: event.target.value,
                    }))
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      totalSeats: String(parseInt(current.totalSeats || "1", 10) + 1),
                    }))
                  }
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-base font-bold"
                >
                  +
                </button>
              </div>
            )}

            <div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/\./g, "").replace(/\D/g, "");
                    setForm((current) => ({ ...current, price: raw }));
                  }}
                  placeholder="150.000"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">VNĐ</span>
              </div>
            </div>
          </div>

          {/* Section 4: Ghi chú */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Ghi chú</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={appendGeneratedNote}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-md font-medium transition-colors"
                >
                  ✨ Tạo thêm ghi chú
                </button>
                <button
                  type="button"
                  onClick={clearAllNotes}
                  className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-md font-medium transition-colors"
                >
                  Xoá tất cả ghi chú
                </button>
              </div>
            </div>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Nhập ghi chú cho chuyến xe..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base resize-none"
            />
            {form.departureTime && form.departure && form.destination && form.price && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                  {buildGeneratedNote()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-3 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Hủy
          </button>
          {onSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-600 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu
            </button>
          )}
          {onCreateRide && (
            <button
              type="button"
              onClick={handleCreateRide}
              disabled={isCreatingRide || !canCreateRide}
              className="flex-[2] rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              title={canCreateRide ? "Tạo cuốc xe" : "Dữ liệu hiện tại chưa đủ để tạo cuốc xe"}
            >
              <span className="flex items-center justify-center gap-2">
                {isCreatingRide ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Car className="h-4 w-4" />
                )}
                Tạo cuốc xe
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
