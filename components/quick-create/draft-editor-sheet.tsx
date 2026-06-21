"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Car,
  FileText,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  buildIsoDateTimeFromLocalParts,
  canCreateRideFromDraft,
} from "@/lib/quick-create/draft-helpers";
import { formatNumberWithDots } from "@/lib/quick-create/formatters";
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
}): DraftUpsertPayload {
  const priceNum = parseInt(form.price.replace(/\./g, ""), 10) || 0;

  return {
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
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Khách hàng
            </h3>
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
                placeholder="Số điện thoại"
                className="w-full rounded-lg bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:bg-slate-50"
              />
              {showCustomerDropdown && customerSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-100 bg-white shadow-lg">
                  {customerSuggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50"
                    >
                      <div className="text-sm font-medium text-slate-800">
                        {customer.name}
                      </div>
                      <div className="text-xs text-slate-500">{customer.phone}</div>
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
              placeholder="Tên khách hàng"
              className="w-full rounded-lg bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lộ trình
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Điểm đón</label>
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
                  className="w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Điểm đến</label>
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
                  className="w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:bg-slate-50"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={swapRoute}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Đảo chiều
            </button>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Vị trí đón</label>
                <textarea
                  value={form.pickupLocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pickupLocation: event.target.value,
                    }))
                  }
                  placeholder="Địa chỉ đón..."
                  rows={2}
                  className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Vị trí trả</label>
                <textarea
                  value={form.dropoffLocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dropoffLocation: event.target.value,
                    }))
                  }
                  placeholder="Địa chỉ trả..."
                  rows={2}
                  className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Thời gian
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Ngày đi</label>
                <input
                  type="date"
                  value={form.departureDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departureDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg bg-transparent px-3 py-2.5 text-sm outline-none transition-colors focus:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Giờ đi</label>
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
                  className="w-full rounded-lg bg-transparent px-3 py-2.5 text-sm outline-none transition-colors focus:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Loại hình
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {(["ghep", "ghep_roundtrip", "bao", "bao_roundtrip"] as const).map(
                (type) => {
                  const labels: Record<TripType, string> = {
                    ghep: "Ghép",
                    ghep_roundtrip: "Ghép 2C",
                    bao: "Bao",
                    bao_roundtrip: "Bao 2C",
                  };

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, tripType: type }))
                      }
                      className={[
                        "rounded-lg py-2 text-xs font-medium transition-colors",
                        form.tripType === type
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
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
                <span className="text-sm font-medium text-slate-700">Số ghế</span>
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  -
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
                  className="w-16 rounded-lg bg-transparent px-3 py-2 text-center text-sm outline-none transition-colors focus:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      totalSeats: String(parseInt(current.totalSeats || "1", 10) + 1),
                    }))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Giá tiền
            </h3>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={(event) => {
                  const raw = event.target.value
                    .replace(/\./g, "")
                    .replace(/\D/g, "");
                  const formatted = raw ? formatNumberWithDots(parseInt(raw, 10)) : "";
                  setForm((current) => ({ ...current, price: formatted }));
                }}
                placeholder="150.000"
                className="w-full rounded-lg bg-transparent px-4 py-2.5 pr-12 text-sm outline-none transition-colors focus:bg-slate-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                VNĐ
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ghi chú
              </h3>
              {form.notes && (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, notes: "" }))}
                  className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                  Xóa ghi chú
                </button>
              )}
            </div>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Ghi chú nhanh..."
              rows={2}
              className="w-full resize-none rounded-lg bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:bg-slate-50"
            />
            <div className="flex flex-wrap gap-1.5">
              {["Cốp trống", "Khách quen", "Gọi trước", "Hẹn lại"].map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      notes: current.notes ? `${current.notes} • ${note}` : note,
                    }))
                  }
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <FileText className="mr-1 inline h-3 w-3" />
                  {note}
                </button>
              ))}
            </div>
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
