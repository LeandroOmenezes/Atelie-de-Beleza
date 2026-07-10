import { useQuery } from "@tanstack/react-query";
import { SiteConfig } from "@shared/schema";

export function useSiteConfig() {
  return useQuery({
    queryKey: ["/api/site-config"],
    queryFn: async () => {
      const response = await fetch("/api/site-config");
      if (!response.ok) {
        throw new Error("Failed to fetch site configuration");
      }
      return response.json() as Promise<SiteConfig>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}