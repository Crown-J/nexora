-- 主檔正式路徑：part / brand / part-group(無 view code) / location / partner

UPDATE nx00_view SET path = '/base/part' WHERE code = 'NX00_PART';
UPDATE nx00_view SET path = '/base/brand' WHERE code = 'NX00_BRAND';
UPDATE nx00_view SET path = '/base/location' WHERE code IN ('NX00_WAREHOUSE', 'NX00_LOCATION');
UPDATE nx00_view SET path = '/base/partner' WHERE code = 'NX00_PARTNER';
