import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../api';
import { FREE_SCAN_COUNT, getPackById } from '../lib/scanPacks';

const MOCK_CREDITS_KEY = 'hookline_mock_credits';

const CreditsContext = createContext(null);

function readMockCredits() {
  try {
    const raw = localStorage.getItem(MOCK_CREDITS_KEY);
    if (raw === null) return FREE_SCAN_COUNT;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, n) : FREE_SCAN_COUNT;
  } catch {
    return FREE_SCAN_COUNT;
  }
}

function writeMockCredits(n) {
  try {
    localStorage.setItem(MOCK_CREDITS_KEY, String(Math.max(0, n)));
  } catch {
    /* ignore */
  }
}

export function CreditsProvider({ children, user }) {
  const [scansRemaining, setScansRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [freeScanGranted, setFreeScanGranted] = useState(true);
  const isMockUser = Boolean(user && !user.uid);

  const refreshCredits = useCallback(async () => {
    if (!user) {
      setScansRemaining(null);
      setFreeScanGranted(false);
      return;
    }

    if (isMockUser) {
      setScansRemaining(readMockCredits());
      setFreeScanGranted(true);
      return;
    }

    setLoading(true);
    try {
      const data = await api.getCredits();
      setScansRemaining(data.scansRemaining ?? 0);
      setFreeScanGranted(Boolean(data.freeScanGranted));
    } catch {
      setScansRemaining(0);
    } finally {
      setLoading(false);
    }
  }, [user, isMockUser]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const purchasePack = useCallback(async (packId) => {
    if (!user) {
      throw new Error('Sign in to purchase scans');
    }

    if (isMockUser) {
      const pack = getPackById(packId);
      if (!pack) throw new Error('Unknown pack');
      const next = readMockCredits() + pack.scans;
      writeMockCredits(next);
      setScansRemaining(next);
      return { scansRemaining: next, scansAdded: pack.scans, packName: pack.name, demo: true };
    }

    const result = await api.purchaseScanPack(packId);
    setScansRemaining(result.scansRemaining ?? 0);
    return result;
  }, [user, isMockUser]);

  const applyLocalScanSpend = useCallback((remaining) => {
    if (typeof remaining === 'number') {
      setScansRemaining(remaining);
      if (isMockUser) writeMockCredits(remaining);
    } else if (isMockUser) {
      const next = Math.max(0, readMockCredits() - 1);
      writeMockCredits(next);
      setScansRemaining(next);
    }
  }, [isMockUser]);

  return (
    <CreditsContext.Provider
      value={{
        scansRemaining,
        freeScanGranted,
        loading,
        refreshCredits,
        purchasePack,
        applyLocalScanSpend,
        hasCredits: scansRemaining === null ? true : scansRemaining > 0,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider');
  return ctx;
}
