// apps/nx-ui/src/features/shared/address/AddressPicker.tsx
// 02 對齊第二批前端收尾軌 FE-CP1 2026-06-07：地址 picker 共用元件
//
// 國別分流：
//   countryId=null 或 TWN → 走字典（city→district 自動帶 postalCode + 結構化門牌欄）
//   countryId=非 TWN → 國家下拉 + postalCode 自填 + freeformAddress 自由填整段
//
// 用法：partner_address 衛星 / user 戶籍 / user 通訊 / SO 預設地址 都引用此元件
'use client';

import { useEffect, useMemo, useState } from 'react';

import { listCities, listDistricts, type CityRow, type DistrictRow } from './address-catalog-api';
import { fetchCountries, findTaiwanId, isTaiwan, type CountryRow } from './country-helper';

export type AddressValue = {
  countryId?: string | null;
  cityId?: string | null;
  districtId?: string | null;
  postalCode?: string | null;
  streetName?: string | null;
  lane?: string | null;
  alley?: string | null;
  buildingNo?: string | null;
  buildingSubNo?: string | null;
  floor?: string | null;
  roomNo?: string | null;
  freeformAddress?: string | null;
};

export type AddressPickerProps = {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  /** 顯示前綴（如「戶籍」「通訊」「收帳」「送貨」） */
  labelPrefix?: string;
  disabled?: boolean;
};

const fieldCls =
  'h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC] focus:border-[#22D88F]/40 focus:outline-none disabled:opacity-50';
const labelCls = 'block text-[10px] uppercase tracking-wider text-[#888892] mb-1';

export function AddressPicker({ value, onChange, labelPrefix, disabled }: AddressPickerProps) {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);

  useEffect(() => {
    void fetchCountries().then(setCountries);
  }, []);

  // 02 真正完工軌 2026-06-07：TW id 動態從 country lookup 取
  const twnId = useMemo(() => findTaiwanId(countries), [countries]);
  const isTW = isTaiwan(value.countryId, countries);

  useEffect(() => {
    if (!twnId) return;
    void listCities({ countryId: twnId }).then(setCities).catch(() => setCities([]));
  }, [twnId]);

  useEffect(() => {
    if (!isTW || !value.cityId) {
      setDistricts([]);
      return;
    }
    void listDistricts(value.cityId).then(setDistricts).catch(() => setDistricts([]));
  }, [isTW, value.cityId]);

  // 選 district 自動帶 postalCode
  const districtMap = useMemo(() => new Map(districts.map((d) => [d.id, d] as const)), [districts]);

  const update = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch });

  const onCityChange = (cityId: string) => {
    // 變 city 清 district + postalCode
    update({ cityId: cityId || null, districtId: null, postalCode: null });
  };

  const onDistrictChange = (districtId: string) => {
    const d = districtMap.get(districtId);
    update({
      districtId: districtId || null,
      postalCode: d?.postalCode ?? null,
    });
  };

  const onCountryChange = (countryId: string) => {
    // 國別改變、清字典 + freeform
    update({
      countryId: countryId || null,
      cityId: null,
      districtId: null,
      postalCode: null,
      freeformAddress: null,
    });
  };

  const prefix = labelPrefix ? `${labelPrefix}-` : '';

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{prefix}國別</label>
        <select
          className={fieldCls}
          value={value.countryId ?? ''}
          onChange={(e) => onCountryChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">台灣（預設）</option>
          {countries
            .filter((c) => c.code !== 'TWN')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
        </select>
      </div>

      {isTW ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{prefix}縣市</label>
              <select
                className={fieldCls}
                value={value.cityId ?? ''}
                onChange={(e) => onCityChange(e.target.value)}
                disabled={disabled}
              >
                <option value="">未選</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{prefix}鄉鎮市區</label>
              <select
                className={fieldCls}
                value={value.districtId ?? ''}
                onChange={(e) => onDistrictChange(e.target.value)}
                disabled={disabled || !value.cityId}
              >
                <option value="">未選</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.postalCode ?? ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>{prefix}郵遞區號（選鄉鎮自動帶）</label>
            <input
              type="text"
              className={fieldCls}
              value={value.postalCode ?? ''}
              readOnly
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{prefix}路街</label>
              <input
                type="text"
                className={fieldCls}
                value={value.streetName ?? ''}
                onChange={(e) => update({ streetName: e.target.value || null })}
                disabled={disabled}
              />
            </div>
            <div>
              <label className={labelCls}>{prefix}巷</label>
              <input
                type="text"
                className={fieldCls}
                value={value.lane ?? ''}
                onChange={(e) => update({ lane: e.target.value || null })}
                disabled={disabled}
              />
            </div>
            <div>
              <label className={labelCls}>{prefix}弄</label>
              <input
                type="text"
                className={fieldCls}
                value={value.alley ?? ''}
                onChange={(e) => update({ alley: e.target.value || null })}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>{prefix}號</label>
              <input
                type="text"
                className={fieldCls}
                value={value.buildingNo ?? ''}
                onChange={(e) => update({ buildingNo: e.target.value || null })}
                disabled={disabled}
              />
            </div>
            <div>
              <label className={labelCls}>{prefix}之</label>
              <input
                type="text"
                className={fieldCls}
                value={value.buildingSubNo ?? ''}
                onChange={(e) => update({ buildingSubNo: e.target.value || null })}
                disabled={disabled}
              />
            </div>
            <div>
              <label className={labelCls}>{prefix}樓</label>
              <input
                type="text"
                className={fieldCls}
                value={value.floor ?? ''}
                onChange={(e) => update({ floor: e.target.value || null })}
                disabled={disabled}
              />
            </div>
            <div>
              <label className={labelCls}>{prefix}室</label>
              <input
                type="text"
                className={fieldCls}
                value={value.roomNo ?? ''}
                onChange={(e) => update({ roomNo: e.target.value || null })}
                disabled={disabled}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={labelCls}>{prefix}郵遞區號（自由填）</label>
            <input
              type="text"
              className={fieldCls}
              value={value.postalCode ?? ''}
              onChange={(e) => update({ postalCode: e.target.value || null })}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelCls}>{prefix}完整地址（國外自由填）</label>
            <textarea
              className={`${fieldCls} h-20 py-2`}
              value={value.freeformAddress ?? ''}
              onChange={(e) => update({ freeformAddress: e.target.value || null })}
              disabled={disabled}
              placeholder="例：123 Main Street, Apt 4B, New York, NY 10001"
            />
          </div>
        </>
      )}
    </div>
  );
}

/** 把 AddressValue 組成單行字串顯示（與 backend composePartnerDefaultShippingAddress 對齊）
 *  02 真正完工軌：判斷 TW 改靠 ctx.countryCode（caller 傳）、不依賴 hard-code id */
export function formatAddressOneLine(
  v: AddressValue,
  ctx?: { countryName?: string | null; countryCode?: string | null; cityName?: string | null; districtName?: string | null },
): string {
  const isTW = !v.countryId || ctx?.countryCode === 'TWN' || !ctx?.countryCode;
  if (!isTW && v.freeformAddress) {
    return [ctx?.countryName, v.postalCode, v.freeformAddress].filter(Boolean).join(' ').trim();
  }
  const parts: string[] = [];
  if (v.postalCode) parts.push(v.postalCode);
  if (ctx?.cityName) parts.push(ctx.cityName);
  if (ctx?.districtName) parts.push(ctx.districtName);
  if (v.streetName) parts.push(v.streetName);
  if (v.lane) parts.push(`${v.lane}巷`);
  if (v.alley) parts.push(`${v.alley}弄`);
  if (v.buildingNo) {
    let bn = `${v.buildingNo}號`;
    if (v.buildingSubNo) bn += `之${v.buildingSubNo}`;
    parts.push(bn);
  }
  if (v.floor) parts.push(`${v.floor}樓`);
  if (v.roomNo) parts.push(`${v.roomNo}室`);
  return parts.join('').trim();
}
