import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Field, Input, Sheet, SheetContent } from "@/components/ui";
import { StaysSelect } from "../StaysForm";
import { STAYS_KEYS, updateProperty } from "../../api";
import { getErrorMessage } from "@/lib/errorHandler";
import type { Property, ValueAdd } from "@/types/stays";

const UNITS = [
  { value: "stay", label: "Per stay" },
  { value: "night", label: "Per night" },
  { value: "guest", label: "Per guest" },
];

/** Compact "create a value add without leaving the rate wizard" sheet. */
export default function ValueAddCreateSheet({
  open,
  onOpenChange,
  property,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onCreated: (valueAdd: ValueAdd) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [unit, setUnit] = useState("stay");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Name the value add");
      return;
    }
    const valueAdd: ValueAdd = {
      id: `value-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      description: description.trim(),
      price: Math.max(0, Number(price) || 0),
      unit,
      active: true,
    };
    setSaving(true);
    try {
      await updateProperty(property.id, {
        valueAdds: [...(property.valueAdds || []), valueAdd],
      });
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property.id) });
      toast.success("Value add created");
      onCreated(valueAdd);
      setName("");
      setDescription("");
      setPrice("0");
      setUnit("stay");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not create the value add");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="New value add"
        description="Extra guests can include with this rate plan."
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="new-value-add" loading={saving}>
              Create value add
            </Button>
          </div>
        }
      >
        <form id="new-value-add" onSubmit={submit} className="grid gap-4">
          <Field label="Name">
            <Input value={name} placeholder="e.g. Airport pickup" onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              placeholder="What is included?"
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (USD)">
              <Input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} />
            </Field>
            <Field label="Charged">
              <StaysSelect options={UNITS} value={unit} onChange={(event) => setUnit(event.target.value)} />
            </Field>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
