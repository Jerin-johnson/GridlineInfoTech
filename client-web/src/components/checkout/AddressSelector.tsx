"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Plus, Pencil, Check, AlertCircle } from "lucide-react";
import {
  createAddress,
  updateAddress,
  setDefaultAddress,
} from "@/lib/api/addresses.api";
import { ApiError } from "@/lib/api/client";
import type { CreateAddressPayload, UserAddress } from "@/types/address.types";

interface AddressSelectorProps {
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (addressId: string) => void;
  onAddressesChange: (addresses: UserAddress[]) => void;
  disabled?: boolean;
}

const EMPTY_FORM: CreateAddressPayload = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  isDefault: false,
};

export function AddressSelector({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddressesChange,
  disabled = false,
}: AddressSelectorProps) {
  const [formMode, setFormMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAddressPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddForm = () => {
    setFormMode("add");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, isDefault: addresses.length === 0 });
    setFormError(null);
  };

  const openEditForm = (addr: UserAddress) => {
    setFormMode("edit");
    setEditingId(addr._id);
    setForm({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || "US",
      isDefault: addr.isDefault,
    });
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError(null);

    try {
      const payload: CreateAddressPayload = {
        ...form,
        label: form.label.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2?.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country?.trim() || "US",
      };

      const updatedList =
        formMode === "edit" && editingId
          ? await updateAddress(editingId, payload)
          : await createAddress(payload);

      onAddressesChange(updatedList);
      if (formMode === "add" && updatedList.length > 0) {
        const newest = updatedList[updatedList.length - 1];
        onSelectAddress(newest._id);
      } else if (editingId) {
        onSelectAddress(editingId);
      }
      setFormMode("closed");
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Unable to save delivery address. Please check your details.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const updated = await setDefaultAddress(addressId);
      onAddressesChange(updated);
    } catch {
      // Non-blocking
    }
  };

  return (
    <section
      aria-labelledby="shipping-address-heading"
      className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-4 h-4 text-[#C81E1E]" aria-hidden="true" />
          <h2
            id="shipping-address-heading"
            className="font-serif text-xl sm:text-2xl font-normal text-[#F5F5F3]"
          >
            Shipping Address
          </h2>
        </div>

        {formMode === "closed" && !disabled && (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-3.5 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors cursor-pointer min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add Address
          </button>
        )}
      </div>

      {/* Saved Addresses List */}
      {addresses.length > 0 && formMode === "closed" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            const isSelected = addr._id === selectedAddressId;
            return (
              <div
                key={addr._id}
                className={`border p-4 transition-colors flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "border-[#C81E1E] bg-[#141417]"
                    : "border-white/10 bg-[#080808] hover:border-white/25"
                }`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectAddress(addr._id)}
                  className="text-left space-y-1.5 cursor-pointer disabled:cursor-default focus-visible:outline-1 focus-visible:outline-white/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
                      {addr.label}
                    </span>
                    {isSelected && (
                      <Check
                        className="w-4 h-4 text-[#C81E1E] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#F5F5F3]">
                    {addr.fullName}
                  </p>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}
                    <br />
                    {addr.city}, {addr.state} {addr.postalCode}
                    <br />
                    {addr.country} · {addr.phone}
                  </p>
                </button>

                {!disabled && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] tracking-[0.16em] uppercase">
                    {addr.isDefault ? (
                      <span className="text-[#A1A1AA]">Default</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSetDefault(addr._id)}
                        className="text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors cursor-pointer"
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditForm(addr)}
                      className="inline-flex items-center gap-1 text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addresses.length === 0 && formMode === "closed" && (
        <div className="border border-white/10 bg-[#080808] p-6 text-center space-y-3">
          <p className="text-sm text-[#A1A1AA]">
            No saved delivery addresses found. Add a shipping address to
            continue.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-2 bg-[#F5F5F3] text-[#080808] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add Delivery Address
          </button>
        </div>
      )}

      {/* Add / Edit Address Form */}
      {formMode !== "closed" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs tracking-[0.2em] uppercase text-[#F5F5F3]">
              {formMode === "edit" ? "Edit Address" : "New Delivery Address"}
            </h3>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setFormMode("closed")}
                className="text-[11px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {formError && (
            <div
              role="alert"
              className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#141417] p-3.5 flex items-start gap-2 text-xs text-[#F5F5F3]"
            >
              <AlertCircle
                className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                Label *
              </span>
              <input
                type="text"
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Home / Garage / Track"
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                Full Name *
              </span>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                Phone *
              </span>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                Street Address Line 1 *
              </span>
              <input
                type="text"
                required
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs sm:col-span-2">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                Address Line 2 (Optional)
              </span>
              <input
                type="text"
                value={form.line2 ?? ""}
                onChange={(e) => setForm({ ...form, line2: e.target.value })}
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                City *
              </span>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                State / Province *
              </span>
              <input
                type="text"
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                Postal Code *
              </span>
              <input
                type="text"
                required
                value={form.postalCode}
                onChange={(e) =>
                  setForm({ ...form, postalCode: e.target.value })
                }
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                Country
              </span>
              <input
                type="text"
                value={form.country ?? "US"}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2.5 text-xs text-[#A1A1AA] cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.isDefault)}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="accent-[#C81E1E]"
            />
            Set as default delivery address
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#F5F5F3] text-[#080808] px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-white transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Address"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
