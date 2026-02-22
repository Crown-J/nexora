-- C:\nexora\packages\db-core\prisma\migrations\xxxx_nx00_user_v2\migration.sql
-- 目的：nx00_user 從舊欄位 uu_* 改成新規格欄位，並用 sequence+trigger 產生 15 碼 id：NX00USER0000001

BEGIN;

-- 1) 欄位 rename（舊 -> 新）
ALTER TABLE public.nx00_user RENAME COLUMN uu_uid TO id;
ALTER TABLE public.nx00_user RENAME COLUMN uu_acc TO username;
ALTER TABLE public.nx00_user RENAME COLUMN uu_pwd TO password_hash;
ALTER TABLE public.nx00_user RENAME COLUMN uu_nam TO display_name;
ALTER TABLE public.nx00_user RENAME COLUMN uu_act TO is_active;
-- uu_sta / uu_rmk 保留原名（Prisma 用 @map 對應）

-- 2) 調整型別/限制（依新規格）
ALTER TABLE public.nx00_user
  ALTER COLUMN id TYPE varchar(15),
  ALTER COLUMN username TYPE varchar(50),
  ALTER COLUMN password_hash TYPE varchar(255),
  ALTER COLUMN display_name TYPE varchar(50);

-- 3) 新增新規格欄位（若不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nx00_user' AND column_name='email'
  ) THEN
    ALTER TABLE public.nx00_user ADD COLUMN email varchar(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nx00_user' AND column_name='phone'
  ) THEN
    ALTER TABLE public.nx00_user ADD COLUMN phone varchar(30);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nx00_user' AND column_name='last_login_at'
  ) THEN
    ALTER TABLE public.nx00_user ADD COLUMN last_login_at timestamp(3);
  END IF;
END $$;

-- 4) NOT NULL / DEFAULT（依新規格）
ALTER TABLE public.nx00_user
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL,
  ALTER COLUMN display_name SET NOT NULL;

ALTER TABLE public.nx00_user
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

ALTER TABLE public.nx00_user
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- 5) username 唯一索引（若不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='nx00_user' AND indexname='nx00_user_username_key'
  ) THEN
    CREATE UNIQUE INDEX nx00_user_username_key ON public.nx00_user(username);
  END IF;
END $$;

-- 6) 15 碼 id 產生（NX00USER + 7 碼流水）
CREATE SEQUENCE IF NOT EXISTS public.nx00_user_seq START 1;

CREATE OR REPLACE FUNCTION public.nx00_user_next_id()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'NX00USER' || lpad(nextval('public.nx00_user_seq')::text, 7, '0');
$$;

CREATE OR REPLACE FUNCTION public.nx00_user_set_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := public.nx00_user_next_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nx00_user_set_id ON public.nx00_user;
CREATE TRIGGER trg_nx00_user_set_id
BEFORE INSERT ON public.nx00_user
FOR EACH ROW
EXECUTE FUNCTION public.nx00_user_set_id();

-- 7) created_by / updated_by 自關聯 FK（nullable）
ALTER TABLE public.nx00_user
  DROP CONSTRAINT IF EXISTS nx00_user_created_by_fkey,
  DROP CONSTRAINT IF EXISTS nx00_user_updated_by_fkey;

ALTER TABLE public.nx00_user
  ADD CONSTRAINT nx00_user_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.nx00_user(id),
  ADD CONSTRAINT nx00_user_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.nx00_user(id);

COMMIT;
