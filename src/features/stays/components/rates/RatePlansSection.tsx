import { useMutation, useQueryClient } from "@tanstack/react-query";
import StaysCard from "../StaysCard";
import StaysEmptyState from "../StaysEmptyState";
import RatePlanCards from "../RatePlanCards";
import AvailabilityPropertyBar from "../availability/AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { STAYS_KEYS, deleteRatePlan, saveRatePlan } from "../../api";

/**
 * Existing rate plans, shown on the Rates page's “Current rate plans” view.
 * Reuses the same cards and API as the builder, so there is one implementation
 * of plan editing.
 */
export default function RatePlansSection({ showPropertyBar = true }: { showPropertyBar?: boolean }) {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property?.id) });
  };

  const saveMutation = useMutation({
    mutationFn: (plan: any) => saveRatePlan(property.id, plan),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (plan: any) => deleteRatePlan(property.id, plan.id),
    onSuccess: invalidate,
  });

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <div>
      {showPropertyBar && (
        <AvailabilityPropertyBar properties={properties} property={property} onSelect={selectProperty} />
      )}

      {property ? (
        <RatePlanCards
          property={property}
          onSavePlan={(plan: any) => saveMutation.mutateAsync(plan)}
          onDeletePlan={(plan: any) => deleteMutation.mutateAsync(plan)}
          emptyState={
            <StaysCard>
              <StaysEmptyState title="Add a room before creating rate plans">
                Rooms &amp; units live under Properties → Edit listing.
              </StaysEmptyState>
            </StaysCard>
          }
        />
      ) : (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add your first listing.
          </StaysEmptyState>
        </StaysCard>
      )}
    </div>
  );
}
