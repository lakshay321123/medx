"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export type ProfileExtras = Record<string, unknown> | null | undefined;

export type AddonDefinition = {
  id: string;
  label: string;
  description?: string;
};

export type ProfileAddonModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (payload: Record<string, unknown>) => void;
  addons?: AddonDefinition[];
  currentExtras?: ProfileExtras;
};

const DEFAULT_ADDONS: AddonDefinition[] = [
  { id: "cardiology_bundle", label: "Cardiology bundle", description: "Risk calculators for heart health." },
  { id: "oncology_bundle", label: "Oncology bundle", description: "Tracks oncology staging summaries." },
  { id: "care_coordination", label: "Care coordination", description: "Enables case manager collaboration." },
];

function normaliseExtras(extras: ProfileExtras): Record<string, unknown> {
  if (!extras || typeof extras !== "object") return {};
  return { ...(extras as Record<string, unknown>) };
}

function deriveInitialAddons(extras: ProfileExtras): Set<string> {
  const raw = normaliseExtras(extras).addons;
  if (!raw) return new Set();
  if (Array.isArray(raw)) {
    return new Set(raw.map(String));
  }
  if (typeof raw === "object") {
    return new Set(Object.keys(raw as Record<string, unknown>));
  }
  if (typeof raw === "string") {
    return new Set(raw.split(",").map(part => part.trim()).filter(Boolean));
  }
  return new Set();
}

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const selectors = [
    "a[href]",
    "button",
    "textarea",
    "input",
    "select",
    "[tabindex]",
  ];
  const elements = root.querySelectorAll<HTMLElement>(selectors.join(","));
  return Array.from(elements).filter(el => {
    if (el.hasAttribute("disabled")) return false;
    return el.getAttribute("aria-hidden") !== "true";
  });
}

export default function ProfileAddonModal({
  open,
  onClose,
  onSave,
  addons = DEFAULT_ADDONS,
  currentExtras,
}: ProfileAddonModalProps) {
  const extras = useMemo(() => normaliseExtras(currentExtras), [currentExtras]);
  const [selection, setSelection] = useState<Set<string>>(() => deriveInitialAddons(currentExtras));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setSelection(deriveInitialAddons(currentExtras));
  }, [currentExtras, open]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    const nodes = getFocusable(containerRef.current);
    if (nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  }, []);

  const toggleAddon = useCallback((id: string) => {
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    const mergedAddons = Array.from(selection);
    const baseExtras = { ...extras };
    const addonsPayload = {
      ...baseExtras,
      addons: mergedAddons,
    };
    onSave?.(addonsPayload);
    onClose();
  }, [extras, onClose, onSave, selection]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Configure add-ons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which clinical add-ons to enable for this profile.
        </p>

        <ul className="mt-4 space-y-3">
          {addons.map(addon => {
            const checked = selection.has(addon.id);
            return (
              <li key={addon.id} className="flex items-start gap-3 rounded-xl border p-3">
                <input
                  id={`addon-${addon.id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAddon(addon.id)}
                  className="mt-1"
                />
                <label htmlFor={`addon-${addon.id}`} className="flex-1 space-y-1">
                  <div className="text-sm font-medium leading-none">{addon.label}</div>
                  {addon.description ? (
                    <p className="text-sm text-muted-foreground">{addon.description}</p>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={handleSave}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
