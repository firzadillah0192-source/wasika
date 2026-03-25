-- WaSiKa (Warisan Silsilah Keluarga) Database Schema
-- Last Updated: 2026-03-25

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------------
-- 1. TABLES DEFINITION
---------------------------------------------------------

-- BANIS table (family rooms)
CREATE TABLE IF NOT EXISTS banis (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  location text,
  bani_code text UNIQUE NOT NULL,
  status text CHECK (status IN ('pending','active','suspended')) DEFAULT 'pending',
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- USER PROFILES table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text CHECK (role IN ('anggota','panitia','superadmin')) DEFAULT 'anggota',
  bani_id uuid REFERENCES banis(id),
  created_at timestamptz DEFAULT now()
);

-- EVENTS table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  date date NOT NULL,
  bani_id uuid REFERENCES banis(id) ON DELETE CASCADE,
  qr_code text UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- PERSONS table (family members)
CREATE TABLE IF NOT EXISTS persons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  gender text CHECK (gender IN ('male','female','unknown')) DEFAULT 'unknown',
  birth_date date,
  full_address text,
  phone text,
  city text,
  province text,
  latitude numeric,
  longitude numeric,
  points integer DEFAULT 0,
  photo_url text,
  user_id uuid REFERENCES auth.users(id),
  bani_id uuid REFERENCES banis(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RELATIONSHIPS table
CREATE TABLE IF NOT EXISTS relationships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES persons(id) ON DELETE CASCADE,
  related_person_id uuid REFERENCES persons(id) ON DELETE CASCADE,
  type text CHECK (type IN ('parent','child','spouse')) NOT NULL,
  bani_id uuid REFERENCES banis(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(person_id, related_person_id, type)
);

-- ATTENDANCES table
CREATE TABLE IF NOT EXISTS attendances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES persons(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  UNIQUE(person_id, event_id)
);

-- MOOD CHECKINS table
CREATE TABLE IF NOT EXISTS mood_checkins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES persons(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  mood_id text NOT NULL,
  mood_emoji text NOT NULL,
  mood_label text NOT NULL,
  mood_category text CHECK (mood_category IN ('positif','netral','berat')) NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- FORUM MESSAGES table
CREATE TABLE IF NOT EXISTS forum_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bani_id uuid REFERENCES banis(id) ON DELETE CASCADE,
  person_id uuid REFERENCES persons(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- POINTS HISTORY table
CREATE TABLE IF NOT EXISTS points_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES persons(id) ON DELETE CASCADE,
  points integer NOT NULL,
  activity_type text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- SUPER ADMINS table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  created_at timestamptz DEFAULT now()
);

---------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
---------------------------------------------------------

-- Enable RLS
ALTER TABLE banis ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- 2.1 Profiles Policies
DROP POLICY IF EXISTS "authenticated can read all profiles" ON profiles;
CREATE POLICY "authenticated can read all profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
CREATE POLICY "users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "authenticated can insert profile" ON profiles;
CREATE POLICY "authenticated can insert profile" ON profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2.2 Banis Policies
DROP POLICY IF EXISTS "authenticated can read bani" ON banis;
CREATE POLICY "authenticated can read bani" ON banis FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated can create bani" ON banis;
CREATE POLICY "authenticated can create bani" ON banis FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "owner can update bani" ON banis;
CREATE POLICY "owner can update bani" ON banis FOR UPDATE USING (owner_id = auth.uid());

-- 2.3 Persons Policies
DROP POLICY IF EXISTS "authenticated can read persons" ON persons;
CREATE POLICY "authenticated can read persons" ON persons FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated can insert person" ON persons;
CREATE POLICY "authenticated can insert person" ON persons FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "creator can update person" ON persons;
CREATE POLICY "creator can update person" ON persons FOR UPDATE USING (created_by = auth.uid());

-- 2.4 Relationships Policies
DROP POLICY IF EXISTS "authenticated can read relationships" ON relationships;
CREATE POLICY "authenticated can read relationships" ON relationships FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated can insert relationship" ON relationships;
CREATE POLICY "authenticated can insert relationship" ON relationships FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2.5 Events & Attendances
DROP POLICY IF EXISTS "authenticated can read events" ON events;
CREATE POLICY "authenticated can read events" ON events FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "panitia can insert events" ON events;
CREATE POLICY "panitia can insert events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated can read attendances" ON attendances;
CREATE POLICY "authenticated can read attendances" ON attendances FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated can insert attendance" ON attendances;
CREATE POLICY "authenticated can insert attendance" ON attendances FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2.6 Forum & Mood
DROP POLICY IF EXISTS "authenticated can read forum" ON forum_messages;
CREATE POLICY "authenticated can read forum" ON forum_messages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated can post forum" ON forum_messages;
CREATE POLICY "authenticated can post forum" ON forum_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated can read mood" ON mood_checkins;
CREATE POLICY "authenticated can read mood" ON mood_checkins FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated can insert mood" ON mood_checkins;
CREATE POLICY "authenticated can insert mood" ON mood_checkins FOR INSERT WITH CHECK (auth.role() = 'authenticated');

---------------------------------------------------------
-- 3. TRIGGERS & FUNCTIONS
---------------------------------------------------------

-- Handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'anggota')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

---------------------------------------------------------
-- 4. REALTIME & GRANTS
---------------------------------------------------------

-- Enable Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE persons, relationships, forum_messages, mood_checkins, attendances;
COMMIT;

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

---------------------------------------------------------
-- 5. EKSPRESIKAN HARIMU (SOCIAL FEED PER BANI)
---------------------------------------------------------

-- POSTS table
create table posts (
  id uuid primary key default uuid_generate_v4(),
  bani_id uuid references banis(id) on delete cascade not null,
  person_id uuid references persons(id) on delete cascade not null,
  content text,
  media_urls text[] default '{}',
  media_types text[] default '{}',  -- 'image' | 'video' per item
  post_type text check (post_type in ('post','repost','quote')) default 'post',
  quoted_post_id uuid references posts(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint content_or_media check (
    content is not null or array_length(media_urls, 1) > 0
  )
);

-- REACTIONS table (like + emoji reactions)
create table reactions (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade not null,
  person_id uuid references persons(id) on delete cascade not null,
  emoji text not null default '❤️',
  created_at timestamptz default now(),
  unique(post_id, person_id, emoji)
);

-- COMMENTS table
create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade not null,
  person_id uuid references persons(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- SAVED POSTS table
create table saved_posts (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade not null,
  person_id uuid references persons(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, person_id)
);

-- RLS
alter table posts enable row level security;
alter table reactions enable row level security;
alter table comments enable row level security;
alter table saved_posts enable row level security;

-- Policies: bani members can read all posts in their bani
create policy "bani members read posts" on posts
  for select using (
    bani_id in (select bani_id from profiles where id = auth.uid())
  );
create policy "authenticated insert post" on posts
  for insert with check (auth.role() = 'authenticated');
create policy "owner delete post" on posts
  for delete using (person_id in (
    select id from persons where user_id = auth.uid()
  ));

create policy "bani members read reactions" on reactions
  for select using (
    post_id in (select id from posts where bani_id in (
      select bani_id from profiles where id = auth.uid()
    ))
  );
create policy "authenticated manage reactions" on reactions
  for all using (auth.role() = 'authenticated');

create policy "bani members read comments" on comments
  for select using (
    post_id in (select id from posts where bani_id in (
      select bani_id from profiles where id = auth.uid()
    ))
  );
create policy "authenticated insert comment" on comments
  for insert with check (auth.role() = 'authenticated');

create policy "owner manage saved" on saved_posts
  for all using (
    person_id in (select id from persons where user_id = auth.uid())
  );

-- Realtime
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table comments;

-- API Grants
GRANT ALL ON TABLE posts, reactions, comments, saved_posts TO authenticated, anon;
