import { describe, it, expect } from "vitest";
import {
  AI_CHAT_DEFAULT_MODEL,
  AI_CHAT_PROMPT_VERSION,
  buildAiChatSystemInstruction,
} from "../prompt.server";

describe("buildAiChatSystemInstruction", () => {
  it("Türkçe davranış kurallarını içerir", () => {
    const out = buildAiChatSystemInstruction("/");
    expect(out).toContain("BeniFonla AI Asistanı");
    expect(out).toContain("Türkçe");
    expect(out).toContain("kitle fonlama");
  });

  it("yatırım/finansal tavsiye yasağını içerir", () => {
    const out = buildAiChatSystemInstruction("/");
    expect(out).toMatch(/yatırım|finansal/i);
  });

  it("verilen pathname'i prompt'a yerleştirir", () => {
    const out = buildAiChatSystemInstruction("/creator/campaigns/new");
    expect(out).toContain("/creator/campaigns/new");
  });

  it("geçersiz pathname'i '/' olarak normalleştirir", () => {
    const out = buildAiChatSystemInstruction("creator/campaigns");
    expect(out).toContain("Kullanıcı şu an: `/`");
  });

  it("sürüm ve model sabitlerini dışa aktarır", () => {
    expect(AI_CHAT_PROMPT_VERSION).toMatch(/^chat-v1\+kb-/);
    expect(AI_CHAT_DEFAULT_MODEL).toMatch(/^google\//);
  });
});
