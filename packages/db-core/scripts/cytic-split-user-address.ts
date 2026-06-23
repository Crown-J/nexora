// packages/db-core/scripts/cytic-split-user-address.ts
//
// 員工地址正規化：把舊式自由文字 detail（如「台北市文山區萬美里萬寧街34號5樓」）
// 拆成 cityId / districtId / postalCode + 剩餘 detail。
//
// 2026-06-23 執行長拍板：恆迎匯入員工時整個地址塞進 detail、cityId/districtId 都空、
// 需正規化以便地址 picker 顯示。
//
// 解析規則：
//   1. 縣市同義詞：「台」↔「臺」雙向認（台北市/臺北市、台中市/臺中市、台南市/臺南市、台東縣/臺東縣）
//   2. 縣市改制歷史不認（桃園縣已升格桃園市 2014、不再 backfill 舊縣名稱）
//   3. 鄉鎮 match scope 到匹配的縣市底下、避免「中正區」跨多縣市撞名
//   4. 拆完剩下的字串作為新 detail；postalCode 從 district 自動帶
//
// 用法：
//   pnpm --filter db-core exec tsx scripts/cytic-split-user-address.ts            # dry-run 預覽
//   pnpm --filter db-core exec tsx scripts/cytic-split-user-address.ts --apply    # 實際 UPDATE

import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';
import { poolConfigFromDatabaseUrl } from './pgTlsPoolConfig';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');
const CYTIC_TENANT_CODE = 'TW-100001';

type City = { id: string; name: string };
type District = { id: string; cityId: string; name: string; postalCode: string | null };

type ParseResult = {
  cityId: string;
  cityName: string;
  districtId: string | null;
  districtName: string | null;
  postalCode: string | null;
  detail: string;
};

/** 改制前縣市 → 改制後直轄市 / 升格市（同時把後綴鎮/鄉/市改成區） */
const HISTORICAL_COUNTY_TO_CITY: Record<string, string> = {
  台北縣: '新北市',
  臺北縣: '新北市',
  桃園縣: '桃園市',
  台中縣: '臺中市',
  臺中縣: '臺中市',
  台南縣: '臺南市',
  臺南縣: '臺南市',
  高雄縣: '高雄市',
};

/** 對解析失敗的縮寫做最後一次補救：「北市」「中市」「南市」沒 city match、但鄉鎮唯一可推 */
const SHORT_CITY_ALIAS: Record<string, string> = {
  北市: '臺北市',
  中市: '臺中市',
  南市: '臺南市',
};

/** 預處理：縣升市、X市/X鎮/X鄉 → X區 */
function preNormalize(raw: string): string {
  let s = raw;
  for (const [old, neu] of Object.entries(HISTORICAL_COUNTY_TO_CITY)) {
    if (s.includes(old)) {
      s = s.replaceAll(old, neu);
      // 縣升市後、底下原本的 X市 / X鎮 / X鄉 通通改 X區（避免 X市 跟新直轄市名衝突）
      // 例：「新北市中和市...」 → 「新北市中和區...」、「桃園市大溪鎮」 → 「桃園市大溪區」
      // regex: (新城市名稱)(一-龥+?)(市|鎮|鄉) — 安全只在新城市名稱後面才轉
      const re = new RegExp(`(${neu})([\\u4e00-\\u9fa5]+?)(市|鎮|鄉)(?=[\\u4e00-\\u9fa5\\d])`, 'g');
      s = s.replaceAll(re, `$1$2區`);
    }
  }
  // 短縮寫補救
  for (const [old, neu] of Object.entries(SHORT_CITY_ALIAS)) {
    // 只在開頭出現才認、避免「中市區」誤動到內文
    if (s.startsWith(old)) s = neu + s.substring(old.length);
  }
  return s;
}

/** 找 raw 內第一個出現的縣市；長度長的優先（避免「新北市」被「北市」搶先） */
function matchCity(raw: string, cities: City[]): { city: City; matched: string; idx: number } | null {
  const sorted = [...cities].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    const variants = new Set<string>();
    variants.add(c.name);
    variants.add(c.name.replace(/臺/g, '台'));
    variants.add(c.name.replace(/台/g, '臺'));
    for (const v of variants) {
      const idx = raw.indexOf(v);
      if (idx >= 0) return { city: c, matched: v, idx };
    }
  }
  return null;
}

function matchDistrict(
  raw: string,
  cityId: string,
  districts: District[],
): { district: District; matched: string; idx: number } | null {
  const cityDistricts = districts.filter((d) => d.cityId === cityId);
  const sorted = [...cityDistricts].sort((a, b) => b.name.length - a.name.length);
  for (const d of sorted) {
    const variants = new Set<string>();
    variants.add(d.name);
    variants.add(d.name.replace(/臺/g, '台'));
    variants.add(d.name.replace(/台/g, '臺'));
    for (const v of variants) {
      const idx = raw.indexOf(v);
      if (idx >= 0) return { district: d, matched: v, idx };
    }
  }
  return null;
}

function parseAddress(raw: string, cities: City[], districts: District[]): ParseResult | null {
  const trimmed = preNormalize(raw.trim());
  if (!trimmed) return null;

  const cityHit = matchCity(trimmed, cities);
  if (!cityHit) return null;

  // 拆出 city 之後的部分當作 districtsearch + detail
  const afterCity =
    trimmed.substring(0, cityHit.idx) + trimmed.substring(cityHit.idx + cityHit.matched.length);

  const distHit = matchDistrict(afterCity, cityHit.city.id, districts);
  if (!distHit) {
    return {
      cityId: cityHit.city.id,
      cityName: cityHit.city.name,
      districtId: null,
      districtName: null,
      postalCode: null,
      detail: afterCity.trim(),
    };
  }

  const detail =
    afterCity.substring(0, distHit.idx) + afterCity.substring(distHit.idx + distHit.matched.length);

  return {
    cityId: cityHit.city.id,
    cityName: cityHit.city.name,
    districtId: distHit.district.id,
    districtName: distHit.district.name,
    postalCode: distHit.district.postalCode,
    detail: detail.trim(),
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 未設');
  const pool = new pg.Pool(poolConfigFromDatabaseUrl(url));
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const tenant = await prisma.nx99Tenant.findFirst({ where: { code: CYTIC_TENANT_CODE } });
    if (!tenant) throw new Error(`tenant ${CYTIC_TENANT_CODE} 不存在`);

    const cities = await prisma.nx01City.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const districts = await prisma.nx01District.findMany({
      where: { isActive: true },
      select: { id: true, cityId: true, name: true, postalCode: true },
    });

    console.log(`[ADDR] cities=${cities.length}, districts=${districts.length}`);

    const users = await prisma.nx01User.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { householdCityId: null, householdDetail: { not: null } },
          { mailingCityId: null, mailingDetail: { not: null } },
        ],
      },
      select: {
        id: true,
        userAccount: true,
        userName: true,
        householdCityId: true,
        householdDetail: true,
        mailingCityId: true,
        mailingDetail: true,
      },
    });

    console.log(`[ADDR] 待處理員工=${users.length}`);

    let parsedHousehold = 0;
    let parsedMailing = 0;
    let failedHousehold = 0;
    let failedMailing = 0;
    const failures: Array<{ user: string; type: 'household' | 'mailing'; raw: string }> = [];

    let previewCount = 0;
    const PREVIEW_LIMIT = 10;

    for (const u of users) {
      const updateData: Record<string, unknown> = {};

      // 戶籍
      if (!u.householdCityId && u.householdDetail) {
        const r = parseAddress(u.householdDetail, cities, districts);
        if (r) {
          parsedHousehold++;
          updateData.householdCityId = r.cityId;
          if (r.districtId) updateData.householdDistrictId = r.districtId;
          if (r.postalCode) updateData.householdPostalCode = r.postalCode;
          updateData.householdDetail = r.detail || null;
          if (previewCount < PREVIEW_LIMIT) {
            console.log(
              `  [戶籍] ${u.userAccount} ${u.userName}: 「${u.householdDetail}」 → ${r.cityName}/${r.districtName ?? '(無)'} 郵${r.postalCode ?? '?'} | 「${r.detail}」`,
            );
            previewCount++;
          }
        } else {
          failedHousehold++;
          failures.push({ user: `${u.userAccount} ${u.userName}`, type: 'household', raw: u.householdDetail });
        }
      }

      // 通訊
      if (!u.mailingCityId && u.mailingDetail) {
        const r = parseAddress(u.mailingDetail, cities, districts);
        if (r) {
          parsedMailing++;
          updateData.mailingCityId = r.cityId;
          if (r.districtId) updateData.mailingDistrictId = r.districtId;
          if (r.postalCode) updateData.mailingPostalCode = r.postalCode;
          updateData.mailingDetail = r.detail || null;
        } else {
          failedMailing++;
          failures.push({ user: `${u.userAccount} ${u.userName}`, type: 'mailing', raw: u.mailingDetail });
        }
      }

      if (APPLY && Object.keys(updateData).length > 0) {
        await prisma.nx01User.update({
          where: { id: u.id },
          data: updateData,
        });
      }
    }

    console.log('');
    console.log(`[ADDR] 戶籍成功 ${parsedHousehold} / 失敗 ${failedHousehold}`);
    console.log(`[ADDR] 通訊成功 ${parsedMailing} / 失敗 ${failedMailing}`);

    if (failures.length > 0) {
      console.log('');
      console.log(`[ADDR] 失敗清單（前 20 筆）:`);
      for (const f of failures.slice(0, 20)) {
        console.log(`  [${f.type}] ${f.user} → 「${f.raw}」`);
      }
      if (failures.length > 20) {
        console.log(`  ... 還有 ${failures.length - 20} 筆`);
      }
    }

    if (APPLY) {
      console.log('');
      console.log('[ADDR] ✅ 已寫回 DB');
    } else {
      console.log('');
      console.log('[ADDR] ℹ️ 預覽模式、未寫 DB；確認後加 --apply 實際執行');
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ 失敗:', e);
  process.exit(1);
});
