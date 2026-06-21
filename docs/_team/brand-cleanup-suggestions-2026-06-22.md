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

- 灌入 brand 總數：**522**
- 嚴格演算法疑似配對：**62** 對
- `-X` 字尾品牌（保留獨立、勿合）：**5** 個

## 二、疑似可合併配對（執行長 review）

| 配對 | 距離 | 比例 | 建議保留 | 建議合併入 |
|---|---|---|---|---|
| TOPRAN (2065) ⇄ TOPRAM (1) | 1 | 17% | **TOPRAN** (2065 件) | TOPRAM (1 件) |
| PORSCHE (1675) ⇄ BORSCHE (2) | 1 | 14% | **PORSCHE** (1675 件) | BORSCHE (2 件) |
| PORSCHE (1675) ⇄ PORESCHE (1) | 1 | 13% | **PORSCHE** (1675 件) | PORESCHE (1 件) |
| PORSCHE (1675) ⇄ PORCHE (1) | 1 | 14% | **PORSCHE** (1675 件) | PORCHE (1 件) |
| VOTEX (576) ⇄ VOTAX (2) | 1 | 20% | **VOTEX** (576 件) | VOTAX (2 件) |
| VOTEX (576) ⇄ V0TEX (1) | 1 | 20% | **VOTEX** (576 件) | V0TEX (1 件) |
| SEAT (451) ⇄ MEAT (1) | 1 | 25% | **SEAT** (451 件) | MEAT (1 件) |
| PIERBURG (388) ⇄ PIERPURG (5) | 1 | 13% | **PIERBURG** (388 件) | PIERPURG (5 件) |
| PIERBURG (388) ⇄ PUERBURG (1) | 1 | 13% | **PIERBURG** (388 件) | PUERBURG (1 件) |
| VW-一汽 (335) ⇄ VW- 一汽 (1) | 1 | 17% | **VW-一汽** (335 件) | VW- 一汽 (1 件) |
| VW-一汽 (335) ⇄ VW一汽 (1) | 1 | 20% | **VW-一汽** (335 件) | VW一汽 (1 件) |
| GATES (324) ⇄ GATE (4) | 1 | 20% | **GATES** (324 件) | GATE (4 件) |
| GATES (324) ⇄ GOTES (1) | 1 | 20% | **GATES** (324 件) | GOTES (1 件) |
| TEXTAR (246) ⇄ TRXTAR (2) | 1 | 17% | **TEXTAR** (246 件) | TRXTAR (2 件) |
| STABILUS (214) ⇄ STABIULUS (1) | 1 | 11% | **STABILUS** (214 件) | STABIULUS (1 件) |
| CONTI (181) ⇄ COTI (1) | 1 | 20% | **CONTI** (181 件) | COTI (1 件) |
| VW-瑕疵 (125) ⇄ VW-暇疵 (13) | 1 | 20% | **VW-瑕疵** (125 件) | VW-暇疵 (13 件) |
| ERNST (112) ⇄ ERNSA (1) | 1 | 20% | **ERNST** (112 件) | ERNSA (1 件) |
| BORGWARNER (91) ⇄ BORGARNER (1) | 1 | 10% | **BORGWARNER** (91 件) | BORGARNER (1 件) |
| CORTECO (76) ⇄ COTTECO (1) | 1 | 14% | **CORTECO** (76 件) | COTTECO (1 件) |
| DELPHI (60) ⇄ DELHI (1) | 1 | 17% | **DELPHI** (60 件) | DELHI (1 件) |
| BENTLEY (59) ⇄ BENTILEY (17) | 1 | 13% | **BENTLEY** (59 件) | BENTILEY (17 件) |
| BERU (53) ⇄ BRRU (1) | 1 | 25% | **BERU** (53 件) | BRRU (1 件) |
| CAFM (51) ⇄ CAMM (1) | 1 | 25% | **CAFM** (51 件) | CAMM (1 件) |
| ERA-TRW (36) ⇄ ERA/TRW (1) | 1 | 14% | **ERA-TRW** (36 件) | ERA/TRW (1 件) |
| O/VW (36) ⇄ O-VW (2) | 1 | 25% | **O/VW** (36 件) | O-VW (2 件) |
| O/VW (36) ⇄ 0/VW (1) | 1 | 25% | **O/VW** (36 件) | 0/VW (1 件) |
| OSRAM (27) ⇄ ORAM (1) | 1 | 20% | **OSRAM** (27 件) | ORAM (1 件) |
| GARRETT (22) ⇄ GARREET (1) | 1 | 14% | **GARRETT** (22 件) | GARREET (1 件) |
| MAN ZAI(萬在) (21) ⇄ MAN ZAI (萬在) (13) | 1 | 8% | **MAN ZAI(萬在)** (21 件) | MAN ZAI (萬在) (13 件) |
| ITALY (16) ⇄ ITALT (1) | 1 | 20% | **ITALY** (16 件) | ITALT (1 件) |
| GEMO (14) ⇄ VEMO (2) | 1 | 25% | **GEMO** (14 件) | VEMO (2 件) |
| PROSCHE (14) ⇄ PORESCHE (1) | 2 | 25% | **PROSCHE** (14 件) | PORESCHE (1 件) |
| HUTCHINSON (11) ⇄ HUTCHINS (1) | 2 | 20% | **HUTCHINSON** (11 件) | HUTCHINS (1 件) |
| HAGUS (10) ⇄ HAGNS (2) | 1 | 20% | **HAGUS** (10 件) | HAGNS (2 件) |
| FIFFT (9) ⇄ GFIFFT (1) | 1 | 17% | **FIFFT** (9 件) | GFIFFT (1 件) |
| GIEFFE (8) ⇄ GIFFE (1) | 1 | 17% | **GIEFFE** (8 件) | GIFFE (1 件) |
| PIERPURG (5) ⇄ PUERBURG (1) | 2 | 25% | **PIERPURG** (5 件) | PUERBURG (1 件) |
| GERMANY (5) ⇄ GERMAN (1) | 1 | 14% | **GERMANY** (5 件) | GERMAN (1 件) |
| 中古-VW (5) ⇄ 中古件-VW (1) | 1 | 17% | **中古-VW** (5 件) | 中古件-VW (1 件) |
| 瑕疵-VW (4) ⇄ 暇疵-VW (2) | 1 | 20% | **瑕疵-VW** (4 件) | 暇疵-VW (2 件) |
| VALEO-瑕疵 (4) ⇄ VALEO-中古 (1) | 2 | 25% | **VALEO-瑕疵** (4 件) | VALEO-中古 (1 件) |
| ANSA/PEDOL (3) ⇄ ANSA/PREDOL (1) | 1 | 9% | **ANSA/PEDOL** (3 件) | ANSA/PREDOL (1 件) |
| ELDOR (3) ⇄ ELDER (1) | 1 | 20% | **ELDOR** (3 件) | ELDER (1 件) |
| VW-XX (3) ⇄ VW-X> (1) | 1 | 20% | **VW-XX** (3 件) | VW-X> (1 件) |
| FUJIKOKI (2) ⇄ FUJIKO (1) | 2 | 25% | **FUJIKOKI** (2 件) | FUJIKO (1 件) |
| DSVAT (2) ⇄ OSVAT (1) | 1 | 20% | **DSVAT** (2 件) | OSVAT (1 件) |
| BORSCHE (2) ⇄ PORESCHE (1) | 2 | 25% | **BORSCHE** (2 件) | PORESCHE (1 件) |
| LAMBORGHINI (2) ⇄ LAMBORGHI (1) | 2 | 18% | **LAMBORGHINI** (2 件) | LAMBORGHI (1 件) |
| BOSCH-中古 (2) ⇄ BOSCH-瑕疵 (1) | 2 | 25% | **BOSCH-中古** (2 件) | BOSCH-瑕疵 (1 件) |
| IMALE (2) ⇄ IMHLE (1) | 1 | 20% | **IMALE** (2 件) | IMHLE (1 件) |
| VW-無包裝 (2) ⇄ VW-沒包裝 (1) | 1 | 17% | **VW-無包裝** (2 件) | VW-沒包裝 (1 件) |
| VW-無包裝 (2) ⇄ VW無包裝 (1) | 1 | 17% | **VW-無包裝** (2 件) | VW無包裝 (1 件) |
| 外匯-新 (1) ⇄ 外匯-A (1) | 1 | 25% | **外匯-新** (1 件) | 外匯-A (1 件) |
| VW(VW) (1) ⇄ VW(TW) (1) | 1 | 17% | **VW(VW)** (1 件) | VW(TW) (1 件) |
| 暇疵-VALEO (1) ⇄ 瑕疵-VALEO (1) | 1 | 13% | **暇疵-VALEO** (1 件) | 瑕疵-VALEO (1 件) |
| 暇疵-VALEO (1) ⇄ 中古-VALEO (1) | 2 | 25% | **暇疵-VALEO** (1 件) | 中古-VALEO (1 件) |
| PORECH (1) ⇄ PORESCHE (1) | 2 | 25% | **PORECH** (1 件) | PORESCHE (1 件) |
| 瑕疵-VALEO (1) ⇄ 中古-VALEO (1) | 2 | 25% | **瑕疵-VALEO** (1 件) | 中古-VALEO (1 件) |
| JOST (1) ⇄ JUST (1) | 1 | 25% | **JOST** (1 件) | JUST (1 件) |
| MASEERATI (1) ⇄ MASERATI (1) | 1 | 11% | **MASEERATI** (1 件) | MASERATI (1 件) |
| PORESCHE (1) ⇄ PORCHE (1) | 2 | 25% | **PORESCHE** (1 件) | PORCHE (1 件) |

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
| VW-ZZ | 30 |
| SKODA-ZZ | 4 |
| BOSCH-ZZ | 4 |
| PIERBURG-ZZ | 3 |
| MARELLI-ZZ | 2 |
| OZ-ZZ | 1 |
| VW-X-ZZ | 1 |
| HELLA-ZZ | 1 |
| VALEO-ZZ | 1 |

### 3.3 `-Z` 字尾（其他特殊分類、含義待執行長確認）

| 廠牌 | 件數 |
|---|---|
| AUDI-Z | 3 |
| VW-Z | 2 |
| T4-Z | 1 |
| BOSCH-Z | 1 |

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
| 4 | TOPRAN | 2065 |
| 5 | BOSCH | 1699 |
| 6 | PORSCHE | 1675 |
| 7 | ELRING | 1121 |
| 8 | LMI | 904 |
| 9 | HELLA | 891 |
| 10 | MARELLI | 834 |
| 11 | VALEO | 739 |
| 12 | VW-X | 737 |
| 13 | VOTEX | 576 |
| 14 | MAHLE | 574 |
| 15 | TRW | 554 |
| 16 | LUK | 468 |
| 17 | SEAT | 451 |
| 18 | PIERBURG | 388 |
| 19 | LOBRO | 366 |
| 20 | ATE | 360 |
| 21 | CAR-VAG | 359 |
| 22 | VIKA | 336 |
| 23 | VW-一汽 | 335 |
| 24 | GATES | 324 |
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
