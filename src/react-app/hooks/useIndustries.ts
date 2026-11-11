import { useQuery } from "@tanstack/react-query";
import { api, frontendDemo, demoMode } from "../lib/api";
import { industries } from "../../shared/config";
export function useIndustries(enabled = true) {
  return useQuery({
    queryKey: ["industries"],
    enabled,
    staleTime: 300000,
    queryFn: async () =>
      frontendDemo || demoMode
        ? industries.map((i) => ({ id: i.slug, name: i.name }))
        : api<{ id: string; name: string }[]>("/industries"),
  });
}
export function useProfessions(industry: string) {
  return useQuery({
    queryKey: ["professions", industry],
    enabled: !!industry,
    staleTime: 300000,
    queryFn: async () =>
      frontendDemo || demoMode
        ? (industries.find((i) => i.slug === industry)?.professions || []).map(
            (name) => ({ id: name, name }),
          )
        : api<{ id: string; name: string }[]>(
            "/industries/" + encodeURIComponent(industry) + "/professions",
          ),
  });
}
