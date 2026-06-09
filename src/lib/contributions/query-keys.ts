export const contributionsQueryKeys = {
  checkout: (slug: string) => ["contributions", "checkout", slug] as const,
  status: (id: string) => ["contributions", "status", id] as const,
  mine: () => ["contributions", "mine"] as const,
  progress: (campaignId: string) => ["contributions", "progress", campaignId] as const,
} as const;
