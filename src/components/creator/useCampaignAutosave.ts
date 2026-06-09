import { useCallback, useEffect, useRef, useState } from "react";
import { updateCampaignDraft, type CampaignDraftPatch, type CampaignRow } from "@/lib/campaigns/api";
import { mapCampaignError } from "@/lib/campaigns/errors";
import type { SaveStatus } from "@/components/creator/SaveStatusIndicator";

interface Options {
  campaign: CampaignRow;
  onSaved: (next: CampaignRow) => void;
  debounceMs?: number;
}

export function useCampaignAutosave({ campaign, onSaved, debounceMs = 800 }: Options) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);
  const latestPatchRef = useRef<CampaignDraftPatch | null>(null);
  const lockVersionRef = useRef(campaign.lock_version);

  useEffect(() => {
    lockVersionRef.current = campaign.lock_version;
  }, [campaign.lock_version]);

  const flush = useCallback(async () => {
    if (inflightRef.current) return;
    const patch = latestPatchRef.current;
    if (!patch || Object.keys(patch).length === 0) return;
    latestPatchRef.current = null;
    inflightRef.current = true;
    setStatus("saving");
    setErrorMessage(null);
    try {
      const next = await updateCampaignDraft({
        campaignId: campaign.id,
        lockVersion: lockVersionRef.current,
        patch,
      });
      lockVersionRef.current = next.lock_version;
      onSaved(next);
      setStatus("saved");
    } catch (err) {
      const mapped = mapCampaignError(err);
      if (mapped.code === "BFL_CONFLICT") {
        setStatus("conflict");
      } else {
        setStatus("error");
      }
      setErrorMessage(mapped.message);
      // Keep patch so user can retry
      latestPatchRef.current = { ...patch, ...(latestPatchRef.current ?? {}) };
    } finally {
      inflightRef.current = false;
    }
  }, [campaign.id, onSaved]);

  const schedule = useCallback(
    (patch: CampaignDraftPatch) => {
      latestPatchRef.current = { ...(latestPatchRef.current ?? {}), ...patch };
      setStatus("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, debounceMs);
    },
    [debounceMs, flush],
  );

  const saveNow = useCallback(
    async (patch?: CampaignDraftPatch) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (patch) {
        latestPatchRef.current = { ...(latestPatchRef.current ?? {}), ...patch };
      }
      await flush();
    },
    [flush],
  );

  const retry = useCallback(async () => {
    await flush();
  }, [flush]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { status, errorMessage, schedule, saveNow, retry };
}
