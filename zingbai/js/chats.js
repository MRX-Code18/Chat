// ============================================
//  ZING BAI — Módulo de Chats
// ============================================

let chatUser, chatProfile;
let activeConversation = null;
let realtimeChannel = null;

function loadChats(user, profile) {
  chatUser = user;
  chatProfile = profile;
  renderChatShell();
  fetchConversations();
  subscribeToMessages();
}

function renderChatShell() {
  const sec = document.getElementById('section-chats');
  sec.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Mensajes</span>
        <button class="icon-btn" onclick="showNewChatModal()" title="Nuevo chat privado">
          <i class="ti ti-edit"></i>
        </button>
      </div>
      <div class="search-icon" style="padding:10px 12px;">
        <i class="ti ti-search" style="position:absolute;left:22px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--text3);pointer-events:none;z-index:1;margin-top:5px;"></i>
        <input class="input" id="chat-search" placeholder="Buscar conversación..." style="padding-left:34px;" oninput="filterConvs(this.value)" />
      </div>
      <div class="panel-body" id="conv-list"></div>
    </div>
    <div class="main" id="chat-main" style="flex:1;display:flex;flex-direction:column;">
      <div class="empty-state">
        <div class="empty-icon"><i class="ti ti-message-circle"></i></div>
        <div class="empty-text">Selecciona un chat para empezar</div>
      </div>
    </div>
  `;
}

let allConvs = [];

async function fetchConversations() {
  const { data: convos } = await sb.from('conversations')
    .select(`
      *,
      messages(content, created_at, sender_id)
    `)
    .or(`user1_id.eq.${chatUser.id},user2_id.eq.${chatUser.id}`)
    .order('updated_at', { ascending: false });

  const { data: groups } = await sb.from('groups')
    .select('*, group_members!inner(user_id)')
    .eq('group_members.user_id', chatUser.id);

  allConvs = [];

  // Privados
  if (convos) {
    for (const c of convos) {
      const otherId = c.user1_id === chatUser.id ? c.user2_id : c.user1_id;
      const { data: other } = await sb.from('profiles').select('*').eq('id', otherId).single();
      if (other) {
        const lastMsg = c.messages?.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
        allConvs.push({ type: 'private', id: c.id, other, lastMsg, unread: c.unread_count || 0, updated_at: c.updated_at });
      }
    }
  }

  // Grupos
  if (groups) {
    for (const g of groups) {
      allConvs.push({ type: 'group', id: g.id, name: g.name, pin: g.pin, updated_at: g.updated_at });
    }
  }

  renderConvList(allConvs);
}

function renderConvList(convs) {
  const list = document.getElementById('conv-list');
  if (!list) return;
  if (!convs.length) { list.innerHTML = '<div class="empty-state" style="padding:30px 0;"><div class="empty-text text-muted" style="font-size:13px;">Sin conversaciones aún</div></div>'; return; }

  const privates = convs.filter(c => c.type === 'private');
  const groups = convs.filter(c => c.type === 'group');

  let html = '';
  if (privates.length) {
    html += '<div class="section-label">Privados</div>';
    html += privates.map(c => `
      <div class="chat-row ${activeConversation?.id === c.id ? 'active' : ''}" onclick="openChat('private','${c.id}','${c.other.id}')">
        <div class="avatar avatar-sm">${c.other.avatar_url ? `<img src="${c.other.avatar_url}"/>` : initials(c.other.name)}</div>
        <div class="chat-row-info">
          <div class="chat-row-name">${c.other.name}</div>
          <div class="chat-row-preview">${c.lastMsg ? (c.lastMsg.sender_id === chatUser.id ? 'Tú: ' : '') + c.lastMsg.content : 'Di hola 👋'}</div>
        </div>
        <div class="chat-row-meta">
          <div class="chat-row-time">${c.lastMsg ? timeAgo(c.lastMsg.created_at) : ''}</div>
          ${c.unread > 0 ? `<div class="unread-badge">${c.unread}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  if (groups.length) {
    html += '<div class="section-label">Grupos</div>';
    html += groups.map(g => `
      <div class="chat-row ${activeConversation?.id === g.id ? 'active' : ''}" onclick="openGroupChat('${g.id}','${g.pin}')">
        <div class="avatar avatar-sm" style="border-radius:10px;background:var(--bg3);">
          <i class="ti ti-users" style="font-size:16px;color:var(--text2);"></i>
        </div>
        <div class="chat-row-info">
          <div class="chat-row-name">${g.name} <span style="font-size:9px;color:var(--text3);margin-left:3px;"><i class="ti ti-lock"></i></span></div>
          <div class="chat-row-preview">Grupo privado con PIN</div>
        </div>
      </div>
    `).join('');
  }

  list.innerHTML = html;
}

function filterConvs(q) {
  const filtered = allConvs.filter(c => {
    const name = c.type === 'private' ? c.other.name : c.name;
    return name.toLowerCase().includes(q.toLowerCase());
  });
  renderConvList(filtered);
}

async function openChat(type, convId, otherId) {
  activeConversation = { type, id: convId, otherId };
  const { data: other } = await sb.from('profiles').select('*').eq('id', otherId).single();
  renderChatView(other, convId);
  loadMessages(convId);
  subscribeToConv(convId);
}

function openGroupChat(groupId, pin) {
  // Mostrar modal de PIN
  const main = document.getElementById('chat-main');
  main.innerHTML = `
    <div class="pin-overlay" style="position:relative;flex:1;min-height:400px;">
      <div class="pin-box">
        <div class="pin-icon"><i class="ti ti-lock"></i></div>
        <div class="pin-title">Ingresa el PIN del grupo</div>
        <div class="pin-sub">Este grupo está protegido por su administrador</div>
        <div class="pin-inputs">
          <input class="pin-digit" maxlength="1" type="password" oninput="nextPin(this,1)" id="p0" />
          <input class="pin-digit" maxlength="1" type="password" oninput="nextPin(this,2)" id="p1" />
          <input class="pin-digit" maxlength="1" type="password" oninput="nextPin(this,3)" id="p2" />
          <input class="pin-digit" maxlength="1" type="password" oninput="nextPin(this,4)" id="p3" />
        </div>
        <button class="btn btn-primary" style="width:100%;" onclick="verifyPin('${groupId}','${pin}')">
          <i class="ti ti-door-enter"></i> Entrar
        </button>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;">¿No tienes el PIN? Pídelo al admin del grupo</div>
      </div>
    </div>
  `;
  document.getElementById('p0').focus();
}

function nextPin(input, next) {
  if (input.value && next <= 3) document.getElementById('p' + (next - 1 + 1)).focus();
}

function verifyPin(groupId, correctPin) {
  const entered = [0,1,2,3].map(i => document.getElementById('p'+i)?.value || '').join('');
  if (entered === correctPin) {
    activeConversation = { type: 'group', id: groupId };
    renderGroupChatView(groupId);
    loadGroupMessages(groupId);
    subscribeToConv(groupId);
  } else {
    showToast('PIN incorrecto ❌', 'var(--red)');
    [0,1,2,3].forEach(i => { const el = document.getElementById('p'+i); if(el) el.value=''; });
    document.getElementById('p0')?.focus();
  }
}

function renderChatView(other, convId) {
  const main = document.getElementById('chat-main');
  main.innerHTML = `
    <div class="chat-topbar">
      <div class="avatar avatar-sm">${other.avatar_url ? `<img src="${other.avatar_url}"/>` : initials(other.name)}</div>
      <div class="chat-topbar-info">
        <div class="chat-topbar-name">${other.name}</div>
        <div class="chat-topbar-status" id="other-status">En línea</div>
      </div>
      <button class="icon-btn" title="Ver perfil" onclick="viewUserProfile('${other.id}')"><i class="ti ti-user"></i></button>
      <button class="icon-btn" title="Más opciones"><i class="ti ti-dots-vertical"></i></button>
    </div>
    <div class="messages-area" id="messages-area"></div>
    <div class="input-bar">
      <button class="icon-btn" onclick="pickFile('${convId}')"><i class="ti ti-paperclip"></i></button>
      <input class="msg-input" id="msg-input" placeholder="Escribe un mensaje..." onkeydown="if(event.key==='Enter')sendMessage('${convId}')" />
      <button class="send-btn" onclick="sendMessage('${convId}')"><i class="ti ti-send"></i></button>
    </div>
  `;
  fetchConversations(); // refrescar lista
}

function renderGroupChatView(groupId) {
  const main = document.getElementById('chat-main');
  main.innerHTML = `
    <div class="chat-topbar">
      <div class="avatar avatar-sm" style="border-radius:10px;background:var(--bg3);">
        <i class="ti ti-users" style="font-size:16px;color:var(--text2);"></i>
      </div>
      <div class="chat-topbar-info">
        <div class="chat-topbar-name" id="group-name-head">Grupo</div>
        <div style="font-size:11px;color:var(--text3);">Grupo con PIN</div>
      </div>
      <button class="icon-btn"><i class="ti ti-dots-vertical"></i></button>
    </div>
    <div class="messages-area" id="messages-area"></div>
    <div class="input-bar">
      <input class="msg-input" id="msg-input" placeholder="Escribe un mensaje..." onkeydown="if(event.key==='Enter')sendGroupMessage('${groupId}')" />
      <button class="send-btn" onclick="sendGroupMessage('${groupId}')"><i class="ti ti-send"></i></button>
    </div>
  `;
  // cargar nombre del grupo
  sb.from('groups').select('name').eq('id', groupId).single().then(({data}) => {
    if (data) { const el = document.getElementById('group-name-head'); if(el) el.textContent = data.name; }
  });
}

async function loadMessages(convId) {
  const area = document.getElementById('messages-area');
  if (!area) return;
  area.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px;">Cargando...</div>';

  const { data: msgs } = await sb.from('messages')
    .select('*, profiles(name, avatar_url)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });

  renderMessages(msgs || []);
}

async function loadGroupMessages(groupId) {
  const area = document.getElementById('messages-area');
  if (!area) return;

  const { data: msgs } = await sb.from('group_messages')
    .select('*, profiles(name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  renderMessages(msgs || [], true);
}

function renderMessages(msgs, isGroup = false) {
  const area = document.getElementById('messages-area');
  if (!area) return;
  area.innerHTML = '';

  msgs.forEach(m => {
    const mine = m.sender_id === chatUser.id;
    const div = document.createElement('div');
    div.className = `msg-group ${mine ? 'mine' : 'theirs'}`;
    div.innerHTML = `
      ${!mine ? `<div class="avatar avatar-xs">${m.profiles?.avatar_url ? `<img src="${m.profiles.avatar_url}"/>` : initials(m.profiles?.name || '?')}</div>` : ''}
      <div>
        ${isGroup && !mine ? `<div style="font-size:10px;color:var(--accent);margin-bottom:2px;font-weight:600;">${m.profiles?.name || '?'}</div>` : ''}
        <div class="msg-bubbles">
          ${m.type === 'image' ? `<div class="msg-bubble"><img src="${m.content}" style="max-width:200px;border-radius:8px;" /></div>` :
            `<div class="msg-bubble">${escHtml(m.content)}</div>`}
        </div>
        <div class="msg-meta">${timeAgo(m.created_at)}${mine ? ' ✓✓' : ''}</div>
      </div>
      ${mine ? `<div class="avatar avatar-xs">${chatProfile.avatar_url ? `<img src="${chatProfile.avatar_url}"/>` : initials(chatProfile.name)}</div>` : ''}
    `;
    area.appendChild(div);
  });
  area.scrollTop = area.scrollHeight;
}

async function sendMessage(convId) {
  const input = document.getElementById('msg-input');
  const content = input?.value.trim();
  if (!content) return;
  input.value = '';

  const { data: msg } = await sb.from('messages').insert({
    conversation_id: convId,
    sender_id: chatUser.id,
    content,
    type: 'text',
    created_at: new Date().toISOString()
  }).select('*, profiles(name, avatar_url)').single();

  // Actualizar timestamp de conversación
  await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);

  if (msg) appendMessage(msg);
}

async function sendGroupMessage(groupId) {
  const input = document.getElementById('msg-input');
  const content = input?.value.trim();
  if (!content) return;
  input.value = '';

  const { data: msg } = await sb.from('group_messages').insert({
    group_id: groupId,
    sender_id: chatUser.id,
    content,
    type: 'text',
    created_at: new Date().toISOString()
  }).select('*, profiles(name, avatar_url)').single();

  if (msg) appendMessage(msg, true);
}

function appendMessage(msg, isGroup = false) {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const mine = msg.sender_id === chatUser.id;
  const div = document.createElement('div');
  div.className = `msg-group ${mine ? 'mine' : 'theirs'}`;
  div.innerHTML = `
    ${!mine ? `<div class="avatar avatar-xs">${msg.profiles?.avatar_url ? `<img src="${msg.profiles.avatar_url}"/>` : initials(msg.profiles?.name || '?')}</div>` : ''}
    <div>
      ${isGroup && !mine ? `<div style="font-size:10px;color:var(--accent);margin-bottom:2px;font-weight:600;">${msg.profiles?.name || '?'}</div>` : ''}
      <div class="msg-bubbles"><div class="msg-bubble">${escHtml(msg.content)}</div></div>
      <div class="msg-meta">${timeAgo(msg.created_at)}${mine ? ' ✓✓' : ''}</div>
    </div>
    ${mine ? `<div class="avatar avatar-xs">${chatProfile.avatar_url ? `<img src="${chatProfile.avatar_url}"/>` : initials(chatProfile.name)}</div>` : ''}
  `;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function subscribeToMessages() {
  sb.channel('all-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new;
      if (activeConversation && msg.conversation_id === activeConversation.id) {
        sb.from('profiles').select('name,avatar_url').eq('id', msg.sender_id).single().then(({data}) => {
          appendMessage({ ...msg, profiles: data });
        });
      }
      fetchConversations();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, payload => {
      const msg = payload.new;
      if (activeConversation?.type === 'group' && msg.group_id === activeConversation.id) {
        sb.from('profiles').select('name,avatar_url').eq('id', msg.sender_id).single().then(({data}) => {
          appendMessage({ ...msg, profiles: data }, true);
        });
      }
    }).subscribe();
}

function subscribeToConv(convId) {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
}

async function pickFile(convId) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    showToast('Subiendo imagen...');
    const path = `${chatUser.id}/${Date.now()}_${file.name}`;
    const { error } = await sb.storage.from('chat-media').upload(path, file);
    if (error) return showToast('Error al subir ❌');
    const { data: { publicUrl } } = sb.storage.from('chat-media').getPublicUrl(path);
    await sb.from('messages').insert({
      conversation_id: convId, sender_id: chatUser.id,
      content: publicUrl, type: 'image', created_at: new Date().toISOString()
    });
    showToast('Imagen enviada ✓');
  };
  input.click();
}

async function showNewChatModal() {
  // Buscar usuarios con quienes iniciar chat
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;';
  modal.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--radius);padding:24px;width:340px;max-width:95vw;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div class="panel-title">Nuevo mensaje privado</div>
        <button class="icon-btn" onclick="this.closest('[style*=fixed]').remove()"><i class="ti ti-x"></i></button>
      </div>
      <input class="input" id="modal-search" placeholder="Buscar por nombre o @alias..." oninput="searchForChat(this.value)" />
      <div id="modal-results" style="margin-top:10px;max-height:240px;overflow-y:auto;"></div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function searchForChat(q) {
  if (q.length < 2) return;
  const { data } = await sb.from('profiles').select('*')
    .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
    .neq('id', chatUser.id).limit(8);

  const res = document.getElementById('modal-results');
  if (!res) return;
  if (!data?.length) { res.innerHTML = '<div class="text-muted" style="padding:10px;font-size:13px;">Sin resultados</div>'; return; }

  res.innerHTML = data.map(p => `
    <div class="chat-row" style="border-radius:var(--radius-sm);" onclick="startPrivateChat('${p.id}')">
      <div class="avatar avatar-sm">${p.avatar_url ? `<img src="${p.avatar_url}"/>` : initials(p.name)}</div>
      <div class="chat-row-info">
        <div class="chat-row-name">${p.name}</div>
        <div class="chat-row-preview">@${p.handle}</div>
      </div>
    </div>
  `).join('');
}

async function startPrivateChat(otherId) {
  document.querySelector('[style*=fixed]')?.remove();

  // Buscar conversación existente
  let { data: conv } = await sb.from('conversations')
    .select('id')
    .or(`and(user1_id.eq.${chatUser.id},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${chatUser.id})`)
    .single();

  if (!conv) {
    // Verificar si tiene solicitud pendiente o si ya son amigos
    const { data: req } = await sb.from('chat_requests')
      .select('*')
      .or(`and(sender_id.eq.${chatUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${chatUser.id})`)
      .single();

    if (!req) {
      await sb.from('chat_requests').insert({
        sender_id: chatUser.id, receiver_id: otherId, status: 'pending', created_at: new Date().toISOString()
      });
      await sb.from('notifications').insert({
        user_id: otherId, type: 'chat_request', from_user_id: chatUser.id,
        message: `${chatProfile.name} quiere enviarte mensajes privados`, read: false, created_at: new Date().toISOString()
      });
      showToast('Solicitud enviada ✓', 'var(--green)');
      return;
    }
    if (req.status === 'pending') { showToast('Ya enviaste una solicitud'); return; }

    // Crear conversación
    const { data: newConv } = await sb.from('conversations').insert({
      user1_id: chatUser.id, user2_id: otherId, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).select().single();
    conv = newConv;
  }

  await openChat('private', conv.id, otherId);
  fetchConversations();
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function viewUserProfile(userId) {
  goTo('search');
  setTimeout(() => showPublicProfile(userId), 100);
}
