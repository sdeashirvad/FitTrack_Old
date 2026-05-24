/**
 * useReports
 * ----------
 * Fetches and caches the authenticated user's InBody reports.
 * Wraps listInbodyReports with loading/error/refresh state.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { listInbodyReports, type InBodyReport } from "./useInbodyService";

const CACHE_TTL_MS = 30_000; // 30 seconds

export function useReports(token: string | null) {
  const [reports, setReports] = useState<InBodyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAt = useRef<number>(0);

  const fetchReports = useCallback(
    async (force = false) => {
      if (!token) return;
      const now = Date.now();
      if (!force && now - lastFetchAt.current < CACHE_TTL_MS) return;

      setLoading(true);
      setError(null);
      try {
        const data = await listInbodyReports(token);
        // Show newest first
        setReports([...data].reverse());
        lastFetchAt.current = Date.now();
      } catch (err: any) {
        setError(err?.message ?? "Failed to load reports");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const refresh = useCallback(() => fetchReports(true), [fetchReports]);

  return { reports, loading, error, refresh };
}
