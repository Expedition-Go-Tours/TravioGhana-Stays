import { CircleNotch, FloppyDisk } from "@/features/stays/icons";

type SaveBarProps = {
  /** Show only while the form has unsaved changes. */
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  label?: string;
};

/**
 * Sticky mobile save bar for long settings forms.
 *
 * On a phone the Save button at the bottom of a 200-row form is off-screen for
 * most of the edit, so the action follows the thumb instead. Hidden from `lg`
 * up, where the form's own footer button is always close enough.
 */
export function SaveBar({ visible, saving = false, onSave, label = "Save changes" }: SaveBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <CircleNotch size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

export default SaveBar;
