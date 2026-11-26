// @ts-nocheck
// Migration marker: the plan template catalogue is a new, section-shaped page.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysButton from "../components/StaysButton";
import StaysEmptyState from "../components/StaysEmptyState";
import StaysPropertySelect from "../components/StaysPropertySelect";
import RatePlanWizard from "../components/rates/RatePlanWizard";
import RatePlansSection from "../components/rates/RatePlansSection";
import { RATE_PLAN_GROUPS, RATE_PLAN_TEMPLATES } from "../config/ratePlanTemplates";
import { usePropertyContext } from "../hooks/usePropertyContext";
import { STAYS_KEYS, saveRatePlan } from "../api";
import { getErrorMessage } from "@/lib/errorHandler";

/**
 * The Rates page — a catalogue of Booking.com-style rate-plan templates. Each
 * card expands into its own numbered wizard, and a plan is only written after
 * the Review step. `?tab=current` switches to managing the plans that exist.
 */
export default function StaysRatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [openTemplate, setOpenTemplate] = useState(null);
  const [creating, setCreating] = useState(false);
  const showingCurrent = searchParams.get("tab") === "current";

  const switchView = (tab: "catalogue" | "current") =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (tab === "catalogue") next.delete("tab");
        else next.set("tab", "current");
        return next;
      },
      { replace: true },
    );

  const createPlans = async (plans) => {
    if (!property) return;
    if (!plans.length) {
      toast.error("Choose at least one room type");
      return;
    }
    setCreating(true);
    try {
      for (const plan of plans) {
        await saveRatePlan(property.id, plan);
      }
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property.id) });
      toast.success(
        plans.length === 1 ? "Rate plan created" : `${plans.length} rate plans created`,
      );
      setOpenTemplate(null);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not create the rate plan");
      throw error;
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <StaysPageHeader
        title={showingCurrent ? "Current rate plans" : "Add a new rate plan"}
        subtitle={
          showingCurrent
            ? "Manage the bookable rate plans for each room type."
            : "Increase bookings and reduce cancellations. These rate plans will give you a solid foundation for your pricing strategy."
        }
        actions={
          <>
            <StaysPropertySelect
              properties={properties}
              value={property?.id}
              onChange={selectProperty}
              className="w-auto min-w-[200px] py-2 text-sm"
            />
            <StaysButton onClick={() => switchView(showingCurrent ? "catalogue" : "current")}>
              {showingCurrent ? "Add a rate plan" : "Current rate plans"}
            </StaysButton>
          </>
        }
      />

      {showingCurrent ? (
        <RatePlansSection showPropertyBar={false} />
      ) : isLoading ? (
        <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />
      ) : !property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add your first listing, then create rate plans.
          </StaysEmptyState>
        </StaysCard>
      ) : !property.rooms?.length ? (
        <StaysCard>
          <StaysEmptyState title="Add a room before creating rate plans">
            Rooms &amp; units live under Properties → Edit listing.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <div className="space-y-7">
          {RATE_PLAN_GROUPS.map((group) => {
            const templates = RATE_PLAN_TEMPLATES.filter((template) => template.group === group.id);
            return (
              <section key={group.id}>
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-slate-900">{group.title}</h2>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{group.description}</p>
                </div>

                <div className="space-y-3">
                  {templates.map((template) => {
                    const open = openTemplate === template.key;
                    return (
                      <div
                        key={template.key}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
                          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-8">
                            <h3 className="shrink-0 text-base font-semibold text-slate-900 sm:w-44">
                              {template.name}
                            </h3>
                            <p className="min-w-0 text-sm leading-relaxed text-slate-600">{template.tagline}</p>
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => setOpenTemplate(open ? null : template.key)}
                            aria-expanded={open}
                            aria-controls={`rate-wizard-${template.key}`}
                            className="w-full shrink-0 sm:w-auto"
                          >
                            {open ? "Close" : "Add rate plan"}
                          </Button>
                        </div>

                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              id={`rate-wizard-${template.key}`}
                              key={template.key}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <RatePlanWizard
                                template={template}
                                property={property}
                                onClose={() => setOpenTemplate(null)}
                                onCreate={createPlans}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {creating && (
        <span className="sr-only" role="status">
          Creating rate plan
        </span>
      )}
    </div>
  );
}
