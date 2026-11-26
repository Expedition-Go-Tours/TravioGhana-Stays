import { useState } from "react";
import { Button, Dialog, DialogContent, DialogFooter, Field, Input } from "@/components/ui";
import { Info } from "@/features/stays/icons";

export type LengthOfStayValue = "rate-plans" | "minimum";

export default function LengthOfStayDialog({
  initialValue,
  initialNights,
  onCancel,
  onSave,
}: {
  initialValue: LengthOfStayValue;
  initialNights: string;
  onCancel: () => void;
  onSave: (value: LengthOfStayValue, nights: string) => void;
}) {
  const [value, setValue] = useState<LengthOfStayValue>(initialValue);
  const [nights, setNights] = useState(initialNights);
  const dirty = value !== initialValue || (value === "minimum" && nights !== initialNights);
  const valid = value === "rate-plans" || Math.max(1, Number(nights) || 1) >= 1;

  return (
    <Dialog open onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent
        size="md"
        title="Length of stay"
        footer={
          <DialogFooter>
            <Button
              type="button"
              variant="primary"
              disabled={!dirty || !valid}
              onClick={() => onSave(value, nights)}
              className="disabled:bg-surface-strong disabled:text-muted disabled:opacity-100 disabled:shadow-none"
            >
              Save changes
            </Button>
            <Button type="button" onClick={onCancel}>
              Cancel
            </Button>
          </DialogFooter>
        }
      >
        <h3 className="text-sm font-semibold text-ink">
          What is the minimum length of stay for this promotion?
        </h3>
        <div className="mt-3 grid gap-1" role="radiogroup" aria-label="Minimum length of stay">
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-body">
            <input
              type="radio"
              name="length-of-stay"
              value="rate-plans"
              checked={value === "rate-plans"}
              onChange={() => setValue("rate-plans")}
              className="size-4 shrink-0 accent-brand"
            />
            <span>Match to rate plans</span>
            <span title="The promotion follows each rate plan's existing minimum stay.">
              <Info size={16} className="text-muted" aria-hidden="true" />
            </span>
          </label>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-body">
            <input
              type="radio"
              name="length-of-stay"
              value="minimum"
              checked={value === "minimum"}
              onChange={() => setValue("minimum")}
              className="size-4 shrink-0 accent-brand"
            />
            <span>Select minimum length of stay</span>
          </label>
        </div>
        {value === "minimum" && (
          <div className="mt-4 max-w-[10rem]">
            <Field label="Minimum nights">
              <Input
                type="number"
                min="1"
                value={nights}
                onChange={(event) => setNights(event.target.value)}
              />
            </Field>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
