-- LITE 預設據點正名：HQ/總公司 → M/主要倉庫
-- 理由：LITE 為單據點、沒有「總公司」概念，預設據點即「主要倉庫」。
-- 只動前一個 migration seed 出來的預設據點（code=HQ + name=總公司），不影響用戶自建據點。
UPDATE "nx01_site"
SET "code" = 'M', "name" = '主要倉庫', "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'HQ' AND "name" = '總公司';
