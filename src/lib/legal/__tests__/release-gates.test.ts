import { describe, expect, it } from "vitest";
import {
  CREATOR_TRANSFER_LIVE_GATE_KEYS,
  PAYMENT_LIVE_GATE_KEYS,
  checkReleaseGates,
} from "../release-gates";

type Row = { key: string; enabled: boolean };

function clientFor(rows: Row[], shouldError = false) {
  return {
    from: (_t: "release_gates") => ({
      select: (_cols: string) => ({
        in: async (_col: string, vals: ReadonlyArray<string>) => {
          if (shouldError) return { data: null, error: { message: "boom" } };
          return {
            data: rows.filter((r) => vals.includes(r.key)),
            error: null,
          };
        },
      }),
    }),
  };
}

describe("checkReleaseGates", () => {
  it("ok=true when all required gates are enabled", async () => {
    const rows: Row[] = PAYMENT_LIVE_GATE_KEYS.map((k) => ({ key: k, enabled: true }));
    const res = await checkReleaseGates(clientFor(rows), PAYMENT_LIVE_GATE_KEYS);
    expect(res.ok).toBe(true);
    expect(res.missing).toEqual([]);
  });

  it("ok=false and lists missing gates when any is disabled", async () => {
    const rows: Row[] = PAYMENT_LIVE_GATE_KEYS.map((k, i) => ({
      key: k,
      enabled: i !== 0,
    }));
    const res = await checkReleaseGates(clientFor(rows), PAYMENT_LIVE_GATE_KEYS);
    expect(res.ok).toBe(false);
    expect(res.missing).toContain(PAYMENT_LIVE_GATE_KEYS[0]);
  });

  it("fail-closed when DB read errors", async () => {
    const res = await checkReleaseGates(clientFor([], true), PAYMENT_LIVE_GATE_KEYS);
    expect(res.ok).toBe(false);
    expect(res.missing.length).toBe(PAYMENT_LIVE_GATE_KEYS.length);
  });

  it("creator transfer gate set is a strict superset of payment gate set", () => {
    for (const k of PAYMENT_LIVE_GATE_KEYS) {
      expect(CREATOR_TRANSFER_LIVE_GATE_KEYS).toContain(k);
    }
    expect(CREATOR_TRANSFER_LIVE_GATE_KEYS.length).toBeGreaterThan(PAYMENT_LIVE_GATE_KEYS.length);
  });

  it("missing rows in DB are treated as disabled (no silent pass)", async () => {
    // DB only returns 2 of the required keys; rest absent → must be missing.
    const partial: Row[] = [
      { key: PAYMENT_LIVE_GATE_KEYS[0], enabled: true },
      { key: PAYMENT_LIVE_GATE_KEYS[1], enabled: true },
    ];
    const res = await checkReleaseGates(clientFor(partial), PAYMENT_LIVE_GATE_KEYS);
    expect(res.ok).toBe(false);
    expect(res.missing.length).toBe(PAYMENT_LIVE_GATE_KEYS.length - 2);
  });
});
