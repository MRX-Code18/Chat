// ============================================
//  ZING BAI — Grupos
// ============================================

let groupsUser, groupsProfile;

async function loadGroups(user, profile) {
  groupsUser = user; groupsProfile = profile;
  const sec = document.getElementById('section-groups');
  sec.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;overflow-y:auto;max-width:640px;margin:0 auto;width:100%;">
      <div class="panel-header" style="padding:16px;">
        <span class="panel-title">Mis Grupos</span>
        <button class="btn btn-primary btn-sm" onclick="showCreateGroupModal()"><i class="ti ti-plus"></i> Crear grupo</button>
      </div>
      <div id="groups-list" style="padding:12px;display:flex;flex-direction:column;gap:10px;"></div>
    </div>
  `;
  fetchGroups();
}

async function fetchGroups() {
  const { data } = await sb.from('groups')
    .select('*, group_members!inner(user_id, role)')
    .eq('group_members.user_id', groupsUser.id);

  const list = document.getElementById('groups-list');
  if (!list) return;
  if (!data?.length) {
    list.innerHTML = '<div class="empty-state" style="padding:40px 0;"><div class="empty-icon"><i class="ti ti-users"></i></div><div class="empty-text">No perteneces a ningún grupo</div></div>';
    return;
  }

  list.innerHTML = data.map(g => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:12px;">
      <div class="avatar avatar-md" style="border-radius:10px;background:var(--bg3);">
        <i class="ti ti-users" style="font-size:20px;color:var(--text2);"></i>
      </div>
      <div style="flex:1;">
        <div style="font-family:var(--font-head);font-weight:700;font-size:15px;">${g.name}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px;">
          <i class="ti ti-lock" style="font-size:11px;"></i> PIN protegido
        </div>
      </div>
      ${g.group_members[0]?.role === 'admin' ? `
        <button class="btn btn-ghost btn-sm" onclick="manageGroup('${g.id}','${g.pin}')"><i class="ti ti-settings"></i> Admin</button>
      ` : ''}
      <button class="btn btn-ghost btn-sm" onclick="goTo('chats');openGroupChat('${g.id}','${g.pin}')">
        <i class="ti ti-message-circle"></i> Abrir
      </button>
    </div>
  `).join('');
}

function showCreateGroupModal() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;';
  modal.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--radius);padding:26px;width:340px;max-width:95vw;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div class="panel-title">Crear grupo</div>
        <button class="icon-btn" onclick="this.closest('[style*=fixed]').remove()"><i class="ti ti-x"></i></button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <div class="input-label">Nombre del grupo</div>
          <input class="input" id="new-group-name" placeholder="Ej: Zona Norte 🏠" />
        </div>
        <div class="form-group">
          <div class="input-label">PIN de acceso (4 dígitos)</div>
          <input class="input" id="new-group-pin" type="text" maxlength="4" placeholder="1234" />
        </div>
        <button class="btn btn-primary" style="width:100%;" onclick="createGroup()">
          <i class="ti ti-plus"></i> Crear grupo
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function createGroup() {
  const name = document.getElementById('new-group-name')?.value.trim();
  const pin = document.getElementById('new-group-pin')?.value.trim();
  if (!name) return showToast('Ponle un nombre al grupo');
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return showToast('El PIN debe ser de 4 dígitos');

  const { data: group } = await sb.from('groups').insert({
    name, pin, created_by: groupsUser.id, created_at: new Date().toISOString()
  }).select().single();

  await sb.from('group_members').insert({
    group_id: group.id, user_id: groupsUser.id, role: 'admin', joined_at: new Date().toISOString()
  });

  document.querySelector('[style*=fixed]')?.remove();
  showToast('Grupo creado ✓ PIN: ' + pin, 'var(--green)');
  fetchGroups();
}

async function manageGroup(groupId, pin) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;';
  const { data: members } = await sb.from('group_members')
    .select('*, profiles(name, avatar_url)')
    .eq('group_id', groupId);

  modal.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--radius);padding:26px;width:360px;max-width:95vw;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div class="panel-title">Administrar grupo</div>
        <button class="icon-btn" onclick="this.closest('[style*=fixed]').remove()"><i class="ti ti-x"></i></button>
      </div>
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:16px;font-size:13px;">
        🔑 PIN actual: <strong style="color:var(--accent);font-family:var(--font-head);">${pin}</strong>
        <span style="font-size:11px;color:var(--text3);margin-left:6px;">(compártelo para invitar)</span>
      </div>
      <div style="margin-bottom:12px;">
        <div class="input-label" style="margin-bottom:8px;">Miembros (${members?.length || 0})</div>
        ${(members||[]).map(m => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
            <div class="avatar avatar-xs">${m.profiles?.avatar_url ? `<img src="${m.profiles.avatar_url}"/>` : initials(m.profiles?.name||'?')}</div>
            <span style="font-size:13px;flex:1;">${m.profiles?.name||'?'}</span>
            <span style="font-size:10px;color:var(--accent);">${m.role}</span>
          </div>
        `).join('')}
      </div>
      <div>
        <div class="input-label" style="margin-bottom:8px;">Añadir miembro por @alias</div>
        <div style="display:flex;gap:8px;">
          <input class="input" id="invite-handle" placeholder="@alias" style="flex:1;" />
          <button class="btn btn-primary btn-sm" onclick="inviteToGroup('${groupId}')"><i class="ti ti-user-plus"></i></button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function inviteToGroup(groupId) {
  const handle = document.getElementById('invite-handle')?.value.replace('@','').trim();
  if (!handle) return;
  const { data: user } = await sb.from('profiles').select('id,name').eq('handle', handle).single();
  if (!user) return showToast('Usuario no encontrado');

  const { error } = await sb.from('group_members').insert({
    group_id: groupId, user_id: user.id, role: 'member', joined_at: new Date().toISOString()
  });
  if (error) return showToast('Ya es miembro del grupo');

  await sb.from('notifications').insert({
    user_id: user.id, type: 'group_invite', from_user_id: groupsUser.id,
    message: `${groupsProfile.name} te añadió a un grupo`, read: false, created_at: new Date().toISOString()
  });
  showToast(`${user.name} añadido ✓`, 'var(--green)');
  document.querySelector('[style*=fixed]')?.remove();
}


// ============================================
//  ZING BAI — Notificaciones
// ============================================

async function loadNotifs(user, profile) {
  const sec = document.getElementById('section-notifs');
  sec.innerHTML = `
    <div class="panel-header"><span class="panel-title">Notificaciones</span>
      <button class="btn btn-ghost btn-sm" onclick="markAllRead()">Marcar todo como leído</button>
    </div>
    <div id="notifs-list" style="flex:1;overflow-y:auto;max-width:640px;width:100%;margin:0 auto;"></div>
  `;

  const { data: notifs } = await sb.from('notifications')
    .select('*, profiles:from_user_id(name, avatar_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = document.getElementById('notifs-list');
  if (!list) return;
  if (!notifs?.length) {
    list.innerHTML = '<div class="empty-state" style="padding:40px 0;"><div class="empty-icon"><i class="ti ti-bell-off"></i></div><div class="empty-text">Sin notificaciones</div></div>';
    return;
  }

  // Marcar como leídas
  await sb.from('notifications').update({ read: true }).eq('user_id', user.id);
  document.getElementById('badge-notifs')?.classList.add('hidden');

  list.innerHTML = notifs.map(n => `
    <div class="notif-row ${!n.read ? 'unread' : ''}">
      <div class="avatar avatar-sm">${n.profiles?.avatar_url ? `<img src="${n.profiles.avatar_url}"/>` : initials(n.profiles?.name||'?')}</div>
      <div style="flex:1;">
        <div class="notif-text">${n.message}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
        ${n.type === 'chat_request' ? `
          <div class="notif-actions">
            <button class="btn btn-primary btn-sm" onclick="acceptChatRequest('${n.from_user_id}','${n.id}',this.closest('.notif-row'))">Aceptar</button>
            <button class="btn btn-danger btn-sm" onclick="declineChatRequest('${n.id}',this.closest('.notif-row'))">Rechazar</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function acceptChatRequest(fromUserId, notifId, row) {
  // Actualizar solicitud
  await sb.from('chat_requests').update({ status: 'accepted' })
    .eq('sender_id', fromUserId).eq('receiver_id', currentUser.id);

  // Crear conversación
  const { data: conv } = await sb.from('conversations').insert({
    user1_id: currentUser.id, user2_id: fromUserId,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).select().single();

  // Notificar al solicitante
  await sb.from('notifications').insert({
    user_id: fromUserId, type: 'chat_accepted', from_user_id: currentUser.id,
    message: `${currentProfile.name} aceptó tu solicitud de chat`, read: false, created_at: new Date().toISOString()
  });

  row.innerHTML = '<div style="padding:4px 0;font-size:12px;color:var(--green);">✓ Solicitud aceptada — ahora pueden chatear</div>';
  showToast('Solicitud aceptada ✓', 'var(--green)');
}

async function declineChatRequest(notifId, row) {
  await sb.from('notifications').delete().eq('id', notifId);
  row.remove();
}

async function markAllRead() {
  await sb.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
  document.querySelectorAll('.notif-row.unread').forEach(r => r.classList.remove('unread'));
  document.getElementById('badge-notifs')?.classList.add('hidden');
}


// ============================================
//  ZING BAI — Buscar personas
// ============================================

async function loadSearch(user, profile) {
  const sec = document.getElementById('section-search');
  sec.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;overflow-y:auto;max-width:640px;margin:0 auto;width:100%;">
      <div style="padding:16px;border-bottom:1px solid var(--border);">
        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:12px;">Buscar personas</div>
        <input class="input" id="people-search" placeholder="Nombre o @alias..." oninput="searchPeople(this.value)" />
      </div>
      <div id="people-results" style="padding:12px;"></div>
    </div>
  `;
}

async function searchPeople(q) {
  const res = document.getElementById('people-results');
  if (!res) return;
  if (q.length < 2) { res.innerHTML = ''; return; }

  const { data } = await sb.from('profiles').select('*')
    .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
    .neq('id', currentUser.id).limit(10);

  if (!data?.length) { res.innerHTML = '<div class="text-muted" style="font-size:13px;padding:10px 0;">Sin resultados</div>'; return; }

  res.innerHTML = data.map(p => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:12px;margin-bottom:8px;cursor:pointer;" onclick="showPublicProfile('${p.id}')">
      <div class="avatar avatar-md">${p.avatar_url ? `<img src="${p.avatar_url}"/>` : initials(p.name)}</div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:14px;">${p.name}</div>
        <div style="font-size:12px;color:var(--text3);">@${p.handle} · ${p.pronouns || ''}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();startPrivateChat('${p.id}')">
        <i class="ti ti-message-circle"></i>
      </button>
    </div>
  `).join('');
}

async function showPublicProfile(userId) {
  const { data: p } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (!p) return;
  const { data: posts } = await sb.from('posts').select('*').eq('user_id', userId).eq('privacy', 'public').order('created_at', { ascending: false }).limit(5);

  const sec = document.getElementById('section-search');
  sec.innerHTML = `
    <div style="flex:1;overflow-y:auto;max-width:640px;margin:0 auto;width:100%;">
      <div style="padding:14px;border-bottom:1px solid var(--border);">
        <button class="btn btn-ghost btn-sm" onclick="loadSearch(currentUser,currentProfile)"><i class="ti ti-arrow-left"></i> Volver</button>
      </div>
      <div class="profile-header">
        <div class="profile-avatar-wrap">
          <div class="avatar avatar-lg">${p.avatar_url ? `<img src="${p.avatar_url}"/>` : initials(p.name)}</div>
        </div>
        <div class="profile-name-display">${p.name}</div>
        <div class="profile-handle">@${p.handle}</div>
        <div class="pronouns-pill">${p.pronouns || ''}</div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
          <button class="btn btn-primary btn-sm" onclick="startPrivateChat('${p.id}');goTo('chats')"><i class="ti ti-message-circle"></i> Mensaje</button>
        </div>
        <div class="profile-link" onclick="copyLink('${p.handle}')"><i class="ti ti-link"></i> zingbai.app/@${p.handle}</div>
      </div>
      <div class="section-label">Publicaciones públicas</div>
      ${(posts||[]).length === 0 ? '<div class="text-muted" style="padding:20px;font-size:13px;">Sin publicaciones públicas</div>' :
        posts.map(po => `
          <div class="post-card">
            <div class="post-header">
              <div class="avatar avatar-sm">${p.avatar_url ? `<img src="${p.avatar_url}"/>` : initials(p.name)}</div>
              <div><div class="post-name">${p.name}</div><div class="post-time">${timeAgo(po.created_at)}</div></div>
            </div>
            <div class="post-text">${escHtml(po.text || '')}</div>
          </div>
        `).join('')}
      }
    </div>
  `;
}

function copyLink(handle) {
  navigator.clipboard.writeText(`https://zingbai.app/@${handle}`);
  showToast('Enlace copiado ✓', 'var(--green)');
}


// ============================================
//  ZING BAI — Mi Perfil
// ============================================

async function loadProfile(user, profile) {
  const sec = document.getElementById('section-profile');
  const { data: posts } = await sb.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

  sec.innerHTML = `
    <div style="max-width:640px;margin:0 auto;width:100%;">
      <div class="profile-header">
        <div class="profile-avatar-wrap">
          <div class="avatar avatar-lg" id="my-avatar">${profile.avatar_url ? `<img src="${profile.avatar_url}"/>` : initials(profile.name)}</div>
          <div class="profile-edit-btn" onclick="changeAvatar()" title="Cambiar foto"><i class="ti ti-camera"></i></div>
        </div>
        <div class="profile-name-display" id="my-name" contenteditable="false">${profile.name}</div>
        <div class="profile-handle">@<span id="my-handle" contenteditable="false">${profile.handle}</span></div>
        <div class="pronouns-pill">${profile.pronouns || ''}</div>
        <div class="profile-stats">
          <div class="stat"><div class="stat-num">${posts?.length || 0}</div><div class="stat-lbl">publicaciones</div></div>
          <div class="stat"><div class="stat-num">${profile.birthday ? calcAge(profile.birthday) : '—'}</div><div class="stat-lbl">años</div></div>
        </div>
        <div class="profile-link" onclick="copyLink('${profile.handle}')"><i class="ti ti-link"></i> zingbai.app/@${profile.handle}</div>
        <div style="display:flex;gap:8px;margin-top:14px;justify-content:center;">
          <button class="btn btn-ghost btn-sm" id="edit-btn" onclick="startEditProfile()"><i class="ti ti-edit"></i> Editar perfil</button>
          <button class="btn btn-danger btn-sm" onclick="doLogout()"><i class="ti ti-logout"></i> Salir</button>
        </div>
        <div id="edit-form" class="hidden" style="margin-top:14px;width:100%;max-width:300px;display:flex;flex-direction:column;gap:8px;">
          <input class="input" id="edit-name" placeholder="Nombre" value="${profile.name}" />
          <input class="input" id="edit-handle" placeholder="@alias" value="${profile.handle}" />
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="saveProfile()">Guardar</button>
            <button class="btn btn-ghost btn-sm" onclick="cancelEdit()">Cancelar</button>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div class="tab active" onclick="switchProfileTab('posts',this)">Publicaciones</div>
        <div class="tab" onclick="switchProfileTab('settings',this)">Configuración</div>
      </div>

      <div id="profile-tab-posts">
        ${(posts||[]).length === 0 ? '<div class="empty-state" style="padding:40px 0;"><div class="empty-icon"><i class="ti ti-photo-off"></i></div><div class="empty-text">Aún no tienes publicaciones</div></div>' :
          posts.map(p => {
            const privacyLabels = { public:'🌐 Todos', friends:'👥 Amigos', only_me:'🔒 Solo yo' };
            const privacyClass = { public:'all', friends:'friends', only_me:'only-me' };
            return `
              <div class="post-card">
                <div class="post-header">
                  <div class="avatar avatar-sm">${profile.avatar_url ? `<img src="${profile.avatar_url}"/>` : initials(profile.name)}</div>
                  <div><div class="post-name">${profile.name}</div><div class="post-time">${timeAgo(p.created_at)}</div></div>
                  <span class="privacy-tag ${privacyClass[p.privacy]||'all'}">${privacyLabels[p.privacy]||'🌐'}</span>
                </div>
                <div class="post-text">${escHtml(p.text||'')}</div>
                <div class="post-actions">
                  <div class="post-action"><i class="ti ti-heart"></i> ${p.likes_count||0}</div>
                  <div class="post-action"><i class="ti ti-message-circle"></i> ${p.comments_count||0}</div>
                  <div class="post-action" onclick="deletePost('${p.id}')"><i class="ti ti-trash"></i></div>
                </div>
              </div>
            `;
          }).join('')}
      </div>

      <div id="profile-tab-settings" class="hidden" style="padding:20px;">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="font-size:13px;color:var(--text2);font-weight:500;">Cuenta</div>
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-size:12px;color:var(--text3);">Correo</div>
            <div style="font-size:14px;margin-top:2px;">${user.email}</div>
          </div>
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-size:12px;color:var(--text3);">Cumpleaños</div>
            <div style="font-size:14px;margin-top:2px;">${profile.birthday || 'No especificado'}</div>
          </div>
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-size:12px;color:var(--text3);margin-bottom:6px;">Notificaciones push</div>
            <button class="btn btn-ghost btn-sm" onclick="requestNotifPermission()"><i class="ti ti-bell"></i> Activar notificaciones</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function switchProfileTab(tab, el) {
  document.querySelectorAll('#section-profile .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('profile-tab-posts').classList.toggle('hidden', tab !== 'posts');
  document.getElementById('profile-tab-settings').classList.toggle('hidden', tab !== 'settings');
}

function startEditProfile() {
  document.getElementById('edit-form').classList.remove('hidden');
  document.getElementById('edit-btn').classList.add('hidden');
}
function cancelEdit() {
  document.getElementById('edit-form').classList.add('hidden');
  document.getElementById('edit-btn').classList.remove('hidden');
}

async function saveProfile() {
  const name = document.getElementById('edit-name')?.value.trim();
  const handle = document.getElementById('edit-handle')?.value.replace('@','').trim().toLowerCase().replace(/\s+/g,'_');
  if (!name || !handle) return showToast('Llena ambos campos');

  const { error } = await sb.from('profiles').update({ name, handle }).eq('id', currentUser.id);
  if (error) return showToast('Error: ese alias ya está en uso');

  currentProfile.name = name; currentProfile.handle = handle;
  showToast('Perfil actualizado ✓', 'var(--green)');

  // Actualizar sidebar avatar
  const av = document.getElementById('sidebar-avatar');
  if (!currentProfile.avatar_url) av.textContent = initials(name);

  loadProfile(currentUser, currentProfile);
}

async function changeAvatar() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    showToast('Subiendo foto...');
    const path = `avatars/${currentUser.id}`;
    await sb.storage.from('avatars').remove([path]);
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) return showToast('Error al subir la imagen');
    const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
    await sb.from('profiles').update({ avatar_url: publicUrl + '?t=' + Date.now() }).eq('id', currentUser.id);
    currentProfile.avatar_url = publicUrl;
    showToast('Foto actualizada ✓', 'var(--green)');
    loadProfile(currentUser, currentProfile);
    const av = document.getElementById('sidebar-avatar');
    av.innerHTML = `<img src="${publicUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  };
  input.click();
}

function calcAge(birthday) {
  const diff = Date.now() - new Date(birthday).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

async function doLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  await sb.auth.signOut();
  window.location.href = 'pages/auth.html';
}

function requestNotifPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(p => {
      showToast(p === 'granted' ? 'Notificaciones activadas ✓' : 'Permiso denegado', p === 'granted' ? 'var(--green)' : '');
    });
  }
}
