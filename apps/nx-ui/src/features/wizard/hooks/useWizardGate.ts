// apps/nx-ui/src/features/wizard/hooks/useWizardGate.ts
// v1.2 對齊軌 C：首次登入跳匯入精靈 hook

'use client';

import { useCallback, useEffect, useState } from 'react';

import { getWizardStatus } from '../api';
import { getToken } from '@/features/auth/token';

interface State {
  loading: boolean;
  showImportWizard: boolean;
}

export function useWizardGate() {
  const [state, setState] = useState<State>({ loading: true, showImportWizard: false });

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!getToken()) {
        if (alive) setState({ loading: false, showImportWizard: false });
        return;
      }
      try {
        const status = await getWizardStatus();
        if (!alive) return;
        setState({
          loading: false,
          showImportWizard: !status.importWizardCompleted,
        });
      } catch {
        if (alive) setState({ loading: false, showImportWizard: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, showImportWizard: false }));
  }, []);

  const reopen = useCallback(() => {
    setState((s) => ({ ...s, showImportWizard: true }));
  }, []);

  return { ...state, close, reopen };
}
