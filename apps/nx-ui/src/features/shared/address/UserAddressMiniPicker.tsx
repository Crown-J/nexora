// apps/nx-ui/src/features/shared/address/UserAddressMiniPicker.tsx
// 02 對齊第二批前端收尾軌 FE-CP3 2026-06-07：user 兩組地址簡版 picker
//
// 對應 user schema 4 欄：household_city_id / household_district_id / household_postal_code / household_detail
// （mailing 同範式）。國別由 user.countryId 統一控制（戶籍+通訊同國別）。
'use client';

import { useEffect, useMemo, useState } from 'react';

import { listCities, listDistricts, type CityRow, type DistrictRow } from './address-catalog-api';
import { fetchCountries, findTaiwanId, isTaiwan, type CountryRow } from './country-helper';

export type UserMiniAddressValue = {
  cityId?: string | null;
  districtId?: string | null;
  postalCode?: string | null;
  detail?: string | null;
};
const fieldCls =
  'h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC] focus:border-[#22D88F]/40 focus:outline-none disabled:opacity-50';

export function UserAddressMiniPicker({
  value,
  onChange,
  countryId,
  disabled,
}: {
  value: UserMiniAddressValue;
  onChange: (next: UserMiniAddressValue) => void;
  countryId?: string | null;
  disabled?: boolean;
}) {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);

  useEffect(() => {
    void fetchCountries().then(setCountries);
  }, []);

  const isTW = isTaiwan(countryId, countries);
  const twnId = useMemo(() => findTaiwanId(countries), [countries]);

  useEffect(() => {
    if (!isTW || !twnId) return;
    void listCities({ countryId: twnId }).then(setCities).catch(() => setCities([]));
  }, [isTW, twnId]);

  useEffect(() => {
    if (!isTW || !value.cityId) {
      setDistricts([]);
      return;
    }
    void listDistricts(value.cityId).then(setDistricts).catch(() => setDistricts([]));
  }, [isTW, value.cityId]);

  const districtMap = useMemo(() => new Map(districts.map((d) => [d.id, d] as const)), [districts]);

  const update = (patch: Partial<UserMiniAddressValue>) => onChange({ ...value, ...patch });

  if (!isTW) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          className={fieldCls}
          value={value.postalCode ?? ''}
          onChange={(e) => update({ postalCode: e.target.value || null })}
          placeholder="郵遞區號（自由填）"
          disabled={disabled}
        />
        <textarea
          className={`${fieldCls} h-16 py-2`}
          value={value.detail ?? ''}
          onChange={(e) => update({ detail: e.target.value || null })}
          placeholder="完整地址（國外自由填）"
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          className={fieldCls}
          value={value.cityId ?? ''}
          onChange={(e) =>
            update({ cityId: e.target.value || null, districtId: null, postalCode: null })
          }
          disabled={disabled}
        >
          <option value="">縣市</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={fieldCls}
          value={value.districtId ?? ''}
          onChange={(e) => {
            const d = districtMap.get(e.target.value);
            update({ districtId: e.target.value || null, postalCode: d?.postalCode ?? null });
          }}
          disabled={disabled || !value.cityId}
        >
          <option value="">鄉鎮市區</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} {d.postalCode ?? ''}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        className={fieldCls}
        value={value.postalCode ?? ''}
        readOnly
        placeholder="郵遞區號（選鄉鎮自動帶）"
        disabled={disabled}
      />
      <textarea
        className={`${fieldCls} h-16 py-2`}
        value={value.detail ?? ''}
        onChange={(e) => update({ detail: e.target.value || null })}
        placeholder="路 / 巷 / 弄 / 號 / 樓 / 室"
        disabled={disabled}
      />
    </div>
  );
}
