-- 2026-06-28 Hank：職務↔權限拆分軌 Step4（資料遷移、加性、冪等）
-- 1. 每租戶建內建 S 權限等級（全 229 權限 + 全畫面）
-- 2. 鏡像既有非系統 role → permission_level（複製 role_permission / role_view）
-- 3. 依使用者主要角色帶出 permission_level_id（超級用戶=S；其餘=對應鏡像等級；無角色=留空）
-- 只 insert + 補 permission_level_id 空欄、無刪除；可重複執行（IF NULL / ON CONFLICT 防呆）。

DO $$
DECLARE
  t RECORD;
  v_creator VARCHAR(15);
  v_s_id VARCHAR(15);
  r RECORD;
  v_level_id VARCHAR(15);
  u RECORD;
  v_primary_role_id VARCHAR(15);
  v_primary_code TEXT;
BEGIN
  FOR t IN SELECT id FROM nx99_tenant LOOP
    SELECT id INTO v_creator FROM nx01_user WHERE tenant_id = t.id ORDER BY created_at LIMIT 1;
    IF v_creator IS NULL THEN CONTINUE; END IF;

    -- 1. 內建 S（全權限）
    SELECT id INTO v_s_id FROM nx01_permission_level WHERE tenant_id = t.id AND code = 'S';
    IF v_s_id IS NULL THEN
      INSERT INTO nx01_permission_level (tenant_id, code, name, description, is_system, is_active, sort_no, created_by, updated_at, updated_by)
      VALUES (t.id, 'S', '系統管理員', '內建全權限等級（不可刪改代碼）', true, true, 0, v_creator, CURRENT_TIMESTAMP, v_creator)
      RETURNING id INTO v_s_id;
      INSERT INTO nx01_permission_level_permission (tenant_id, permission_level_id, permission_id, granted_by)
        SELECT t.id, v_s_id, p.id, v_creator FROM nx01_permission p WHERE p.is_active = true
        ON CONFLICT DO NOTHING;
      INSERT INTO nx01_permission_level_view (tenant_id, permission_level_id, view_id, can_read, can_create, can_update, can_delete, can_export, can_approve, granted_by)
        SELECT t.id, v_s_id, v.id, true, true, true, true, true, true, v_creator FROM nx01_view v
        ON CONFLICT DO NOTHING;
    END IF;

    -- 2. 鏡像非系統 role → permission_level
    FOR r IN SELECT * FROM nx01_role WHERE tenant_id = t.id AND is_system = false AND UPPER(code) NOT IN ('S','SYSADMIN','OWNER') LOOP
      SELECT id INTO v_level_id FROM nx01_permission_level WHERE tenant_id = t.id AND code = r.code;
      IF v_level_id IS NULL THEN
        INSERT INTO nx01_permission_level (tenant_id, code, name, description, is_system, is_active, sort_no, created_by, updated_at, updated_by)
        VALUES (t.id, r.code, r.name, r.description, false, r.is_active, r.sort_no, v_creator, CURRENT_TIMESTAMP, v_creator)
        RETURNING id INTO v_level_id;
        INSERT INTO nx01_permission_level_permission (tenant_id, permission_level_id, permission_id, granted_by)
          SELECT t.id, v_level_id, rp.permission_id, v_creator FROM nx01_role_permission rp WHERE rp.role_id = r.id
          ON CONFLICT DO NOTHING;
        INSERT INTO nx01_permission_level_view (tenant_id, permission_level_id, view_id, can_read, can_create, can_update, can_delete, can_export, can_approve, is_active, granted_by)
          SELECT t.id, v_level_id, rv.view_id, rv.can_read, rv.can_create, rv.can_update, rv.can_delete, rv.can_export, rv.can_approve, rv.is_active, v_creator FROM nx01_role_view rv WHERE rv.role_id = r.id
          ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- 3. 每使用者帶出 permission_level_id（只補目前為空者）
    FOR u IN SELECT id, role_id, is_tenant_owner FROM nx01_user WHERE tenant_id = t.id AND permission_level_id IS NULL LOOP
      SELECT ur.role_id INTO v_primary_role_id FROM nx01_user_role ur WHERE ur.user_id = u.id AND ur.is_active = true AND ur.is_primary = true LIMIT 1;
      IF v_primary_role_id IS NULL THEN v_primary_role_id := u.role_id; END IF;
      v_primary_code := NULL;
      IF v_primary_role_id IS NOT NULL THEN
        SELECT UPPER(code) INTO v_primary_code FROM nx01_role WHERE id = v_primary_role_id;
      END IF;
      IF u.is_tenant_owner = true OR v_primary_code IN ('SYSADMIN','OWNER') THEN
        UPDATE nx01_user SET permission_level_id = v_s_id WHERE id = u.id;
      ELSIF v_primary_role_id IS NOT NULL THEN
        SELECT id INTO v_level_id FROM nx01_permission_level
          WHERE tenant_id = t.id AND code = (SELECT code FROM nx01_role WHERE id = v_primary_role_id);
        IF v_level_id IS NOT NULL THEN
          UPDATE nx01_user SET permission_level_id = v_level_id WHERE id = u.id;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;
