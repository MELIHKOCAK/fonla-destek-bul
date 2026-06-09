import type { Creator } from "@/types/campaign";

/**
 * Avatar URL'leri DiceBear initials API'sini kullanır — kişiye ait
 * fotoğraf değildir, lisans riski yoktur. Görsel yüklenemezse
 * CreatorBadge fallback initials gösterir.
 */
const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;

export const creators: readonly Creator[] = [
  { id: "cr-1", displayName: "Ayşe Demir", avatarUrl: avatar("Ayşe Demir"), verified: true },
  { id: "cr-2", displayName: "Mehmet Kaya", avatarUrl: avatar("Mehmet Kaya"), verified: false },
  { id: "cr-3", displayName: "Zeynep Yıldız", avatarUrl: avatar("Zeynep Yıldız"), verified: true },
  { id: "cr-4", displayName: "Can Aydın", avatarUrl: avatar("Can Aydın"), verified: false },
  { id: "cr-5", displayName: "Elif Şahin", avatarUrl: avatar("Elif Şahin"), verified: true },
  { id: "cr-6", displayName: "Burak Öztürk", avatarUrl: avatar("Burak Öztürk"), verified: false },
  { id: "cr-7", displayName: "Selin Arslan", avatarUrl: avatar("Selin Arslan"), verified: true },
  { id: "cr-8", displayName: "Deniz Korkmaz", avatarUrl: avatar("Deniz Korkmaz"), verified: false },
] as const;
