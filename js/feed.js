// ============================================
//  ZING BAI — Feed (Publicaciones)
// ============================================

let feedUser, feedProfile;

async function loadFeed(user, profile) {
  feedUser = user; feedProfile = profile;
  const sec = document.getElementById('section-feed');
  sec.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;overflow-y:auto;max-width:640px;margin:0 auto;width:100%;">
      <div style="padding:16px;border-bottom:1px solid var(--border);">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div class="avatar avatar-sm">${profile.avatar_url ? `<img src="${profile.avatar_url}"/>` : initials(profile.name)}</div>
          <div style="flex:1;">
            <textarea id="new-post-text" class="input" placeholder="¿Qué quieres compartir?" style="resize:none;height:72px;"></textarea>
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
              <select id="post-privacy" class="input" style="width:auto;padding:5px 10px;font-size:12px;">
                <option value="public">🌐 Todos</option>
                <option value="friends">👥 Amigos</option>
                <option value="only_me">🔒 Solo yo</option>
              </select>
              <button class="btn btn-primary btn-sm ml-auto" onclick="createPost()"><i class="ti ti-send"></i> Publicar</button>
            </div>
          </div>
        </div>
      </div>
      <div id="posts-list"></div>
    </div>
  `;
  fetchPosts();
}

async function fetchPosts() {
  const { data: posts } = await sb.from('posts')
    .select('*, profiles(name, avatar_url, id)')
    .or(`privacy.eq.public,and(privacy.eq.friends),and(user_id.eq.${feedUser.id})`)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = document.getElementById('posts-list');
  if (!list) return;
  if (!posts?.length) { list.innerHTML = '<div class="empty-state" style="padding:40px 0;"><div class="empty-icon"><i class="ti ti-photo-off"></i></div><div class="empty-text">Aún no hay publicaciones</div></div>'; return; }

  list.innerHTML = posts.map(p => {
    const privacyLabels = { public: '🌐 Todos', friends: '👥 Amigos', only_me: '🔒 Solo yo' };
    const privacyClass = { public: 'all', friends: 'friends', only_me: 'only-me' };
    return `
      <div class="post-card">
        <div class="post-header">
          <div class="avatar avatar-sm">${p.profiles?.avatar_url ? `<img src="${p.profiles.avatar_url}"/>` : initials(p.profiles?.name || '?')}</div>
          <div>
            <div class="post-name">${p.profiles?.name || 'Usuario'}</div>
            <div class="post-time">${timeAgo(p.created_at)}</div>
          </div>
          <span class="privacy-tag ${privacyClass[p.privacy] || 'all'}">${privacyLabels[p.privacy] || '🌐'}</span>
          ${p.user_id === feedUser.id ? `<button class="icon-btn" onclick="deletePost('${p.id}')" style="margin-left:4px;"><i class="ti ti-trash" style="font-size:15px;color:var(--text3);"></i></button>` : ''}
        </div>
        ${p.text ? `<div class="post-text">${escHtml(p.text)}</div>` : ''}
        ${p.media_url ? `<img src="${p.media_url}" style="width:100%;border-radius:var(--radius-sm);margin-bottom:10px;max-height:300px;object-fit:cover;" />` : ''}
        <div class="post-actions">
          <div class="post-action" onclick="likePost('${p.id}',this)"><i class="ti ti-heart"></i> <span>${p.likes_count || 0}</span></div>
          <div class="post-action"><i class="ti ti-message-circle"></i> ${p.comments_count || 0}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function createPost() {
  const text = document.getElementById('new-post-text')?.value.trim();
  const privacy = document.getElementById('post-privacy')?.value || 'public';
  if (!text) return showToast('Escribe algo primero');

  await sb.from('posts').insert({
    user_id: feedUser.id, text, privacy,
    likes_count: 0, comments_count: 0, created_at: new Date().toISOString()
  });
  document.getElementById('new-post-text').value = '';
  showToast('Publicado ✓', 'var(--green)');
  fetchPosts();
}

async function deletePost(postId) {
  if (!confirm('¿Eliminar esta publicación?')) return;
  await sb.from('posts').delete().eq('id', postId).eq('user_id', feedUser.id);
  fetchPosts();
}

async function likePost(postId, el) {
  const countEl = el.querySelector('span');
  const curr = parseInt(countEl.textContent) || 0;
  countEl.textContent = curr + 1;
  el.style.color = 'var(--accent)';
  await sb.from('posts').update({ likes_count: curr + 1 }).eq('id', postId);
}
