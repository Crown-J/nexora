/**
 * Brand code rule options for part form (GET /brand-code-rule).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

export type BrandCodeRuleOption = { value: string; label: string };

export function useBrandCodeRuleLookup() {
    const [options, setOptions] = useState<BrandCodeRuleOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await apiFetch('/brand-code-rule?page=1&pageSize=500&isActive=true', { method: 'GET' });
                await assertOk(res, 'nxui_lookup_brand_code_rule');
                const data = (await res.json()) as {
                    items: { id: string; name: string; partBrandCode: string | null; partBrandName: string | null }[];
                };
                if (cancelled) return;
                setOptions(
                    (data.items ?? []).map((r) => {
                        const bc = (r.partBrandCode ?? '').trim();
                        const nm = (r.name ?? '').trim();
                        const label = [bc || null, nm || null].filter(Boolean).join(' · ') || r.id;
                        return { value: r.id, label };
                    }),
                );
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : '載入失敗');
                    setOptions([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return useMemo(() => ({ options, loading, error }), [options, loading, error]);
}
