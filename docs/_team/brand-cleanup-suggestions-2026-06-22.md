<!-- docs/_team/brand-cleanup-suggestions-2026-06-22.md -->
# 恆迎廠牌清理建議（CYTIC 2026-06-22）

> 自動產出、給執行長 review 後決定是否要合併。
> 來源：恆迎舊 ERP 沒 brand master、人工輸入累積錯別字。
> Phase A 自動 normalize（trim/全形/大寫）已套用、本檔列出 normalize 後仍疑似的配對。

## 演算法規則（嚴格化、避免誤判）

- 雙方廠牌字數都 **≥ 4 字**（避免 VW / TRW / BMW 等 2~3 字大廠誤配）
- 編輯距離 ≤ 2 且 **距離 / max(len) ≤ 0.25**（4 字最多錯 1、8 字最多錯 2）
- 中文 vs 英文不交叉配對
- 特殊字尾保留獨立、不跨類配對：
  - `-X` = **中古件**（VW-X = VW 中古件）
  - `-ZZ` = **瑕疵件**（VW-ZZ = VW 瑕疵件）
  - `-Z` = **其他特殊分類**（含義待執行長確認）

## 一、總覽

- 灌入 brand 總數：**468**
- 嚴格演算法疑似配對：**5** 對
- `-X` 字尾品牌（保留獨立、勿合）：**5** 個

## 二、疑似可合併配對（執行長 review）

| 配對 | 距離 | 比例 | 建議保留 | 建議合併入 |
|---|---|---|---|---|
| ERA-TRW (36) ⇄ ERA/TRW (1) | 1 | 14% | **ERA-TRW** (36 件) | ERA/TRW (1 件) |
| HUTCHINSON (11) ⇄ HUTCHINS (1) | 2 | 20% | **HUTCHINSON** (11 件) | HUTCHINS (1 件) |
| FIFFT (9) ⇄ GFIFFT (1) | 1 | 17% | **FIFFT** (9 件) | GFIFFT (1 件) |
| GIEFFE (8) ⇄ GIFFE (1) | 1 | 17% | **GIEFFE** (8 件) | GIFFE (1 件) |
| FUJIKOKI (2) ⇄ FUJIKO (1) | 2 | 25% | **FUJIKOKI** (2 件) | FUJIKO (1 件) |

## 三、特殊字尾品牌（保留獨立、勿合）

### 3.1 `-X` 字尾（中古件）

| 廠牌 | 件數 |
|---|---|
| VW-X | 737 |
| ERNST-X | 3 |
| BOSCH-X | 1 |
| PORSCHE-X | 1 |
| TRW-X | 1 |

### 3.2 `-ZZ` 字尾（瑕疵件）

| 廠牌 | 件數 |
|---|---|
| VW-ZZ | 32 |
| BOSCH-ZZ | 5 |
| SKODA-ZZ | 4 |
| AUDI-ZZ | 3 |
| PIERBURG-ZZ | 3 |
| MARELLI-ZZ | 2 |
| T4-ZZ | 1 |
| OZ-ZZ | 1 |
| VW-X-ZZ | 1 |
| HELLA-ZZ | 1 |
| VALEO-ZZ | 1 |

### 3.3 `-Z` 字尾（其他特殊分類、含義待執行長確認）

| 廠牌 | 件數 |
|---|---|
| _（無）_ | _（無）_ |

### 3.4 `-X-ZZ` 字尾（中古件 + 瑕疵件 雙重標籤）

| 廠牌 | 件數 |
|---|---|
| VW-X-ZZ | 1 |

## 四、Top 30 廠牌（按件數）

| 排名 | 廠牌 | 件數 |
|---|---|---|
| 1 | VW | 65554 |
| 2 | SKODA | 3257 |
| 3 | FEBI | 2712 |
| 4 | TOPRAN | 2066 |
| 5 | BOSCH | 1699 |
| 6 | PORSCHE | 1679 |
| 7 | ELRING | 1121 |
| 8 | LMI | 904 |
| 9 | HELLA | 891 |
| 10 | MARELLI | 834 |
| 11 | VALEO | 739 |
| 12 | VW-X | 737 |
| 13 | VOTEX | 579 |
| 14 | MAHLE | 574 |
| 15 | TRW | 554 |
| 16 | LUK | 468 |
| 17 | SEAT | 452 |
| 18 | PIERBURG | 394 |
| 19 | LOBRO | 366 |
| 20 | ATE | 360 |
| 21 | CAR-VAG | 359 |
| 22 | VW-一汽 | 337 |
| 23 | VIKA | 336 |
| 24 | GATES | 329 |
| 25 | NISSENS | 322 |
| 26 | KS | 306 |
| 27 | BREMBO | 294 |
| 28 | T4 | 284 |
| 29 | SACHS | 270 |
| 30 | BILSTEIN | 260 |

## 五、執行長下一步

1. **看完疑似配對**、決定哪些要合
2. 想合就告訴 Hank：「合 BOSH → BOSCH」
3. Hank 寫 `merge-brand --from=X --to=Y` 一次清掉（reassign part.brand_id + 刪舊 brand）
4. `-X` (中古件) / `-ZZ` (瑕疵件) / `-Z` (其他) 字尾品牌**保留**、不要合
5. `-Z` 字尾品牌請告知 Hank 含義（中古件? 瑕疵件? 其他?）
