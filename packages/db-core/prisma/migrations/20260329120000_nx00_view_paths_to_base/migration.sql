-- 主檔由 /dashboard/nx00/* 遷至 /base/*：同步 nx00_view.path（權限矩陣／選單對照用）

UPDATE nx00_view SET path = '/base/user' WHERE code = 'NX00_USER';
UPDATE nx00_view SET path = '/base/role' WHERE code = 'NX00_ROLE';
UPDATE nx00_view SET path = '/base/user-role' WHERE code = 'NX00_USER_ROLE';
UPDATE nx00_view SET path = '/base/role-view' WHERE code = 'NX00_ROLE_VIEW';
UPDATE nx00_view SET path = '/base/parts' WHERE code = 'NX00_PART';
UPDATE nx00_view SET path = '/base/brands' WHERE code = 'NX00_BRAND';
UPDATE nx00_view SET path = '/base/warehouse' WHERE code = 'NX00_WAREHOUSE';
UPDATE nx00_view SET path = '/base/location' WHERE code = 'NX00_LOCATION';
UPDATE nx00_view SET path = '/base/partners' WHERE code = 'NX00_PARTNER';
