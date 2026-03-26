import pg from 'pg'
import { readFileSync } from 'fs'

const connectionString = "postgresql://postgres:gPtOaF4dltmjLQXE@db.jevexrsstoatwdiqqudj.supabase.co:5432/postgres"

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

const sql = `
-- Tambah kolom parent_bani_id ke tabel banis
ALTER TABLE banis
  ADD COLUMN IF NOT EXISTS parent_bani_id uuid REFERENCES banis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bani_level integer DEFAULT 0;
-- bani_level: 0 = root/utama, 1 = sub-bani, 2 = sub-sub-bani, dst

-- Fungsi helper: dapatkan semua ancestor bani_id
CREATE OR REPLACE FUNCTION get_bani_ancestors(p_bani_id uuid)
RETURNS uuid[] AS $$
DECLARE
  result uuid[] := '{}';
  current_id uuid := p_bani_id;
  parent_id uuid;
BEGIN
  LOOP
    SELECT parent_bani_id INTO parent_id
    FROM banis WHERE id = current_id;
    EXIT WHEN parent_id IS NULL;
    result := array_append(result, parent_id);
    current_id := parent_id;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi helper: dapatkan semua descendant bani_id (bani utama + semua sub-baninya)
CREATE OR REPLACE FUNCTION get_bani_family(p_bani_id uuid)
RETURNS uuid[] AS $$
WITH RECURSIVE bani_tree AS (
  SELECT id FROM banis WHERE id = p_bani_id
  UNION ALL
  SELECT b.id FROM banis b
  INNER JOIN bani_tree bt ON b.parent_bani_id = bt.id
)
SELECT ARRAY_AGG(id) FROM bani_tree;
$$ LANGUAGE sql SECURITY DEFINER;

-- Tabel bani_memberships: user bisa punya akses ke beberapa bani
-- (primary bani + bani utama yang auto-join)
CREATE TABLE IF NOT EXISTS bani_memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bani_id uuid REFERENCES banis(id) ON DELETE CASCADE NOT NULL,
  membership_type text CHECK (membership_type IN (
    'primary',    -- bani tempat dia mendaftar langsung
    'inherited',  -- otomatis dapat akses karena sub-bani terdaftar ke parent
    'pengelola'   -- pengelola bani ini
  )) DEFAULT 'primary',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(user_id, bani_id)
);

ALTER TABLE bani_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own memberships" ON bani_memberships
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "system insert memberships" ON bani_memberships
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger: saat user join sub-bani, otomatis inherit ke bani parent
CREATE OR REPLACE FUNCTION auto_inherit_parent_banis()
RETURNS TRIGGER AS $$
DECLARE
  ancestor_ids uuid[];
  ancestor_id uuid;
BEGIN
  -- Dapat semua ancestor dari bani yang baru di-join
  ancestor_ids := get_bani_ancestors(NEW.bani_id);

  -- Insert inherited membership untuk setiap ancestor
  FOREACH ancestor_id IN ARRAY ancestor_ids LOOP
    INSERT INTO bani_memberships (user_id, bani_id, membership_type)
    VALUES (NEW.user_id, ancestor_id, 'inherited')
    ON CONFLICT (user_id, bani_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid error on multiple runs
DROP TRIGGER IF EXISTS on_bani_membership_created ON bani_memberships;

CREATE TRIGGER on_bani_membership_created
  AFTER INSERT ON bani_memberships
  FOR EACH ROW
  WHEN (NEW.membership_type = 'primary')
  EXECUTE FUNCTION auto_inherit_parent_banis();

-- Update profile: primary_bani_id tetap ada (bani tempat user daftar)
-- Tambah kolom root_bani_id untuk referensi ke bani utama
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS root_bani_id uuid REFERENCES banis(id);

-- Update RLS policies di tabel persons, posts, forum_messages, dll
-- agar bisa query lintas bani dalam satu family

-- Persons: bisa lihat semua orang dalam family (bani + semua sub-baninya)
DROP POLICY IF EXISTS "bani members can read persons" ON persons;
DROP POLICY IF EXISTS "family members can read persons" ON persons;
CREATE POLICY "family members can read persons" ON persons
  FOR SELECT USING (
    bani_id IN (
      SELECT bani_id FROM bani_memberships WHERE user_id = auth.uid()
    )
  );

-- Posts: bisa lihat post dari semua bani yang user adalah anggotanya
DROP POLICY IF EXISTS "bani members read posts" ON posts;
DROP POLICY IF EXISTS "family members read posts" ON posts;
CREATE POLICY "family members read posts" ON posts
  FOR SELECT USING (
    bani_id IN (
      SELECT bani_id FROM bani_memberships WHERE user_id = auth.uid()
    )
  );

-- Forum messages: sama
DROP POLICY IF EXISTS "bani members can read forum" ON forum_messages;
DROP POLICY IF EXISTS "bani members can post forum" ON forum_messages;
DROP POLICY IF EXISTS "family members read forum" ON forum_messages;
DROP POLICY IF EXISTS "family members post forum" ON forum_messages;
CREATE POLICY "family members read forum" ON forum_messages
  FOR SELECT USING (
    bani_id IN (
      SELECT bani_id FROM bani_memberships WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "family members post forum" ON forum_messages
  FOR INSERT WITH CHECK (
    bani_id IN (
      SELECT bani_id FROM bani_memberships WHERE user_id = auth.uid()
    )
  );

-- Relationships: lintas bani dalam satu family
DROP POLICY IF EXISTS "bani members can read relationships" ON relationships;
DROP POLICY IF EXISTS "family members read relationships" ON relationships;
CREATE POLICY "family members read relationships" ON relationships
  FOR SELECT USING (
    bani_id IN (
      SELECT bani_id FROM bani_memberships WHERE user_id = auth.uid()
    )
  );

-- Realtime untuk bani_memberships
-- We might get a warning if publication already contains table, but it's fine.
do $$ 
begin 
  ALTER PUBLICATION supabase_realtime ADD TABLE bani_memberships;
exception 
  when duplicate_object then null;
end $$;

`;

async function main() {
  const client = await pool.connect();
  try {
    console.log("Starting migration...");
    await client.query(sql);
    console.log("Migration finished successfully.");
  } catch (err) {
    console.error("Error running migration:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
