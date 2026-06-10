import { describe, expect, it } from "vitest";
import { generateUploadFilename, validateImageUpload } from "../upload-validation";

function bytes(arr: number[]): Uint8Array {
  return new Uint8Array(arr);
}

describe("validateImageUpload", () => {
  it("accepts JPEG with matching declared MIME", () => {
    const res = validateImageUpload(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]), "image/jpeg");
    expect(res.ok).toBe(true);
  });

  it("accepts PNG", () => {
    const res = validateImageUpload(
      bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
      "image/png",
    );
    expect(res.ok).toBe(true);
  });

  it("accepts WEBP", () => {
    const res = validateImageUpload(
      bytes([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      "image/webp",
    );
    expect(res.ok).toBe(true);
  });

  it("rejects MIME mismatch (PNG bytes, JPEG declared)", () => {
    const res = validateImageUpload(
      bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
      "image/jpeg",
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("mime_mismatch");
  });

  it("blocks SVG even if declared as image/svg+xml", () => {
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    const padded = new Uint8Array(64);
    padded.set(svg);
    const res = validateImageUpload(padded, "image/svg+xml");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("blocked_type");
  });

  it("blocks HTML polyglot", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html><body>x</body></html>");
    const padded = new Uint8Array(64);
    padded.set(html);
    const res = validateImageUpload(padded, "image/png");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("blocked_type");
  });

  it("rejects unknown bytes", () => {
    const res = validateImageUpload(bytes(new Array(16).fill(0)), "image/png");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("not_image");
  });

  it("rejects oversized", () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big[0] = 0xff;
    big[1] = 0xd8;
    big[2] = 0xff;
    const res = validateImageUpload(big, "image/jpeg");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("too_large");
  });
});

describe("generateUploadFilename", () => {
  it("produces user-scoped path with allowed extension", () => {
    const name = generateUploadFilename("user-123", "image/webp");
    expect(name.startsWith("user-123/")).toBe(true);
    expect(name.endsWith(".webp")).toBe(true);
  });
});
