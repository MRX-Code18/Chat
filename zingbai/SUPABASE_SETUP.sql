-- ============================================
--  ZING BAI — Setup de Supabase
--  Ejecuta esto en: Supabase → SQL Editor → New query
-- ============================================

-- 1. PERFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  handle text unique not null,
  pronouns text,
  birthday date,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. CONVERSACIONES PRIVADAS
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references profiles(id) on delete cascade,
  user2_id uuid references profiles(id) on delete cascade,
  unread_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. MENSAJES PRIVADOS
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  type text default 'text',  -- 'text' | 'image'
  created_at timestamptz default now()
);

-- 4. GRUPOS
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 5. MIEMBROS DE GRUPOS
create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',  -- 'admin' | 'member'
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- 6. MENSAJES DE GRUPO
create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  type text default 'text',
  created_at timestamptz default now()
);

-- 7. SOLICITUDES DE CHAT
create table if not exists chat_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  status text default 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at timestamptz default now(),
  unique(sender_id, receiver_id)
);

-- 8. PUBLICACIONES
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  text text,
  media_url text,
  privacy text default 'public',  -- 'public' | 'friends' | 'only_me'
  likes_count int default 0,
  comments_count int default 0,
  created_at timestamptz default now()
);

-- 9. NOTIFICACIONES
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  from_user_id uuid references profiles(id),
  type text,  -- 'chat_request' | 'chat_accepted' | 'group_invite' | 'like'
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================
--  SEGURIDAD (Row Level Security)
-- ============================================

-- Activar RLS en todas las tablas
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_messages enable row level security;
alter table chat_requests enable row level security;
alter table posts enable row level security;
alter table notifications enable row level security;

-- Profiles: cualquiera puede ver, solo tú editas el tuyo
create policy "Ver perfiles" on profiles for select using (true);
create policy "Editar mi perfil" on profiles for update using (auth.uid() = id);
create policy "Insertar perfil propio" on profiles for insert with check (auth.uid() = id);

-- Conversations: solo los participantes
create policy "Ver mis conversaciones" on conversations for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Crear conversación" on conversations for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Actualizar conversación" on conversations for update
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Messages: participantes de la conversación
create policy "Ver mensajes" on messages for select
  using (exists (
    select 1 from conversations where id = conversation_id
    and (user1_id = auth.uid() or user2_id = auth.uid())
  ));
create policy "Enviar mensajes" on messages for insert
  with check (auth.uid() = sender_id);

-- Groups: miembros del grupo
create policy "Ver grupos" on groups for select
  using (exists (select 1 from group_members where group_id = id and user_id = auth.uid()));
create policy "Crear grupos" on groups for insert with check (auth.uid() = created_by);

-- Group members
create policy "Ver miembros" on group_members for select
  using (exists (select 1 from group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()));
create policy "Unirse a grupo" on group_members for insert with check (true);

-- Group messages
create policy "Ver mensajes de grupo" on group_messages for select
  using (exists (select 1 from group_members where group_id = group_messages.group_id and user_id = auth.uid()));
create policy "Enviar al grupo" on group_messages for insert
  with check (auth.uid() = sender_id and
    exists (select 1 from group_members where group_id = group_messages.group_id and user_id = auth.uid()));

-- Posts: público ve todos los públicos, amigos ven friends, solo yo veo only_me
create policy "Ver publicaciones" on posts for select
  using (privacy = 'public' or user_id = auth.uid());
create policy "Crear publicación" on posts for insert with check (auth.uid() = user_id);
create policy "Editar publicación" on posts for update using (auth.uid() = user_id);
create policy "Eliminar publicación" on posts for delete using (auth.uid() = user_id);

-- Chat requests
create policy "Ver solicitudes" on chat_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Enviar solicitud" on chat_requests for insert with check (auth.uid() = sender_id);
create policy "Actualizar solicitud" on chat_requests for update
  using (auth.uid() = receiver_id);

-- Notifications
create policy "Ver mis notificaciones" on notifications for select using (auth.uid() = user_id);
create policy "Crear notificación" on notifications for insert with check (true);
create policy "Marcar leída" on notifications for update using (auth.uid() = user_id);
create policy "Borrar notificación" on notifications for delete using (auth.uid() = user_id);

-- ============================================
--  REALTIME (para mensajes instantáneos)
--  Ir a: Supabase → Database → Replication
--  Activar Realtime en: messages, group_messages, notifications
-- ============================================

-- ============================================
--  STORAGE (para fotos y avatares)
--  Ir a: Supabase → Storage → Create bucket
--  Crear dos buckets:
--   - "avatars"    (público)
--   - "chat-media" (público)
-- ============================================
