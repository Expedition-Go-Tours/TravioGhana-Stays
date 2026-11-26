import { Check } from "@/features/stays/icons";

const STEPS = ["Promotion settings", "Select properties", "Check and confirm"];

export default function PromotionStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mt-5 flex items-center gap-2 sm:mt-6 sm:gap-4">
      {STEPS.map((step, index) => {
        const number = index + 1;
        const active = number === current;
        const complete = number < current;
        return (
          <li
            key={step}
            className={`flex min-w-0 items-center gap-2 ${index === 0 ? "shrink-0" : "flex-1"}`}
          >
            {index > 0 && <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-hairline-strong" />}
            <span
              aria-current={active ? "step" : undefined}
              className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                active || complete
                  ? "bg-brand text-on-brand"
                  : "border border-hairline-strong bg-surface text-muted"
              }`}
            >
              {complete ? <Check size={14} weight="bold" aria-hidden="true" /> : number}
            </span>
            <span
              className={`${active ? "inline" : "hidden sm:inline"} truncate text-xs font-semibold sm:text-sm ${
                active || complete ? "text-ink" : "text-muted"
              }`}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
