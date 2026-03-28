'use client';

import { useCallback, useEffect, useState } from 'react';

export type NxThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'nx-ui-theme-mode';

function applyMode(m: NxThemeMode) {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: light)');
  if (m === 'light') {
    root.classList.add('light');
    return;
  }
  if (m === 'dark') {
    root.classList.remove('light');
    return;
  }
  root.classList.toggle('light', media.matches);
}

export function useNxThemeMode() {
  const [themeMode, setThemeModeState] = useState<NxThemeMode>('system');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const mode: NxThemeMode =
      saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system';
    applyMode(mode);
    queueMicrotask(() => setThemeModeState(mode));
  }, []);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      root.classList.toggle('light', media.matches);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themeMode]);

  const setThemeMode = useCallback((next: NxThemeMode) => {
    setThemeModeState(next);
    applyMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const cycleThemeMode = useCallback(() => {
    const cycle: NxThemeMode[] = ['system', 'dark', 'light'];
    const idx = cycle.indexOf(themeMode);
    const next = cycle[(idx + 1) % cycle.length];
    setThemeMode(next);
  }, [themeMode, setThemeMode]);

  return { themeMode, setThemeMode, cycleThemeMode };
}
