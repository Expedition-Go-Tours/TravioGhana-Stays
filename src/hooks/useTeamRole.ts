import { useContext } from "react";
import { TeamRoleContext, type TeamRoleContextValue } from "@/contexts/teamRoleContext";

export function useTeamRole(): TeamRoleContextValue {
  const context = useContext(TeamRoleContext);
  if (!context) {
    throw new Error("useTeamRole must be used within a TeamRoleProvider");
  }
  return context;
}
