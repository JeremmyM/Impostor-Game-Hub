import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

// Create a schema for the response type based on the routes definition
const StatsResponseSchema = api.stats.get.responses[200];
export type StatsResponse = z.infer<typeof StatsResponseSchema>;

export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      return StatsResponseSchema.parse(data);
    },
    // Refresh stats every 30 seconds for live-ish leaderboard
    refetchInterval: 30000, 
  });
}
