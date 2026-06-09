import type { Creator } from "@/types/campaign";

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;

export const creators: readonly Creator[] = [
  {
    id: "cr-1",
    username: "aysedemir",
    displayName: "Ayşe Demir",
    avatarUrl: avatar("Ayşe Demir"),
    verified: true,
    bio: "Endüstriyel tasarımcı. Küçük yaşam alanları için modüler ürünler üretiyorum.",
    location: "İstanbul",
    website: "https://example.com/aysedemir",
  },
  {
    id: "cr-2",
    username: "mehmetkaya",
    displayName: "Mehmet Kaya",
    avatarUrl: avatar("Mehmet Kaya"),
    verified: false,
    bio: "Üç kişilik bağımsız bir oyun stüdyosunun kurucusuyum.",
    location: "Ankara",
  },
  {
    id: "cr-3",
    username: "zeynepyildiz",
    displayName: "Zeynep Yıldız",
    avatarUrl: avatar("Zeynep Yıldız"),
    verified: true,
    bio: "Seramik sanatçısı ve illüstratör. Anadolu motiflerinden besleniyorum.",
    location: "İzmir",
    website: "https://example.com/zeynepyildiz",
  },
  {
    id: "cr-4",
    username: "canaydin",
    displayName: "Can Aydın",
    avatarUrl: avatar("Can Aydın"),
    verified: false,
    bio: "Bilim kurgu yazarı. İlk romanım için topluluğumun desteğini bekliyorum.",
    location: "İstanbul",
  },
  {
    id: "cr-5",
    username: "elifsahin",
    displayName: "Elif Şahin",
    avatarUrl: avatar("Elif Şahin"),
    verified: true,
    bio: "Müzisyen ve festival organizatörü. Bağımsız müzik ekosistemini büyütmeye çalışıyorum.",
    location: "Eskişehir",
  },
  {
    id: "cr-6",
    username: "burakozturk",
    displayName: "Burak Öztürk",
    avatarUrl: avatar("Burak Öztürk"),
    verified: false,
    bio: "Mahalle topluluğu gönüllüsü. Komşuluk projeleri tasarlıyorum.",
    location: "Bursa",
  },
  {
    id: "cr-7",
    username: "selinarslan",
    displayName: "Selin Arslan",
    avatarUrl: avatar("Selin Arslan"),
    verified: true,
    bio: "Eğitimci ve dijital illüstratör. Çocuklara üretim sevgisi aşılamak için içerik tasarlıyorum.",
    location: "İstanbul",
    website: "https://example.com/selinarslan",
  },
  {
    id: "cr-8",
    username: "denizkorkmaz",
    displayName: "Deniz Korkmaz",
    avatarUrl: avatar("Deniz Korkmaz"),
    verified: false,
    bio: "Hayvan hakları gönüllüsü. Sokak hayvanları için sürdürülebilir çözümler üretiyorum.",
    location: "Antalya",
  },
] as const;

export function findCreatorByUsername(username: string): Creator | undefined {
  return creators.find((c) => c.username === username);
}
