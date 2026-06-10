/**
 * Yükleme güvenliği — sunucu tarafında MIME + magic byte doğrulaması.
 * Frontend yalnız hızlı UX feedback için kullanılabilir; gerçek karar
 * Edge / RPC tarafında verilmelidir.
 */

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_DIMENSION = 4096;

// İlk birkaç byte ile dosya türü tahmini.
function detectMagicMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // SVG ya da HTML — daima reddedilir
  const head = new TextDecoder().decode(bytes.slice(0, 64)).toLowerCase().trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<!doctype html") || head.startsWith("<html")) {
    return "blocked";
  }
  return null;
}

export interface UploadValidationOk {
  ok: true;
  mime: AllowedImageMime;
}
export interface UploadValidationError {
  ok: false;
  code: "too_large" | "mime_mismatch" | "not_image" | "blocked_type";
  message: string;
}

export function validateImageUpload(
  bytes: Uint8Array,
  declaredMime: string,
): UploadValidationOk | UploadValidationError {
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, code: "too_large", message: "Dosya 5 MB sınırını aşıyor." };
  }
  const detected = detectMagicMime(bytes);
  if (detected === "blocked") {
    return { ok: false, code: "blocked_type", message: "SVG ve HTML dosyalar kabul edilmez." };
  }
  if (detected === null) {
    return { ok: false, code: "not_image", message: "Geçerli bir görsel değil." };
  }
  if (detected !== declaredMime) {
    return { ok: false, code: "mime_mismatch", message: "Dosya türü içerik ile eşleşmiyor." };
  }
  if (!ALLOWED_IMAGE_MIME.includes(detected as AllowedImageMime)) {
    return { ok: false, code: "blocked_type", message: "Bu görsel türü desteklenmiyor." };
  }
  return { ok: true, mime: detected as AllowedImageMime };
}

/** Storage path için güvenli, çakışmasız bir ad üret. */
export function generateUploadFilename(userId: string, mime: AllowedImageMime): string {
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  const random = crypto.randomUUID();
  return `${userId}/${random}.${ext}`;
}
