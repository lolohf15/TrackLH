"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { SettingsGroup, SettingsRow } from "./SettingsList";

/** A setting with a few choices: a short list in a sheet, the current one ticked. */
export function OptionSheet<T extends string | number>({
  open,
  onClose,
  title,
  options,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: ReadonlyArray<{ value: T; label: string; detail?: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="pb-6">
        <SettingsGroup>
          {options.map((o) => (
            <SettingsRow
              key={String(o.value)}
              label={o.label}
              detail={o.detail}
              selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                onClose();
              }}
            />
          ))}
        </SettingsGroup>
      </div>
    </BottomSheet>
  );
}
