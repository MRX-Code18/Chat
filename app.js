// ⚠️ CAMBIA ESTOS VALORES por los de tu Supabase ⚠️
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_CLAVE_ANONIMA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentChat = { type: null, id: null, name: null };
let currentProfile = null;
let pendingImage = null;

window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = session.user;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    currentProfile = profile;
    document.getElementById('userAlias').innerText = profile.alias;
    document.getElementById('userPronouns').innerText = profile.pronombres;
    
    loadContacts();
    loadGroups();
    loadFriendRequests();
    subscribeToMessages();
});

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('chatsList').style.display = 'none';
    document.getElementById('groupsList').style.display = 'none';
    document.getElementById('requestsList').style.display = 'none';
    
    if (tab === 'chats') {
        document.querySelector('.tab').classList.add('active');
        document.getElementById('chatsList').style.display = 'block';
        loadContacts();
    } else if (tab === 'groups') {
        document.querySelectorAll('.tab')[1].classList.add('active');
        document.getElementById('groupsList').style.display = 'block';
        loadGroups();
    } else if (tab === 'requests') {
        document.querySelectorAll('.tab')[2].classList.add('active');
        document.getElementById('requestsList').style.display = 'block';
        loadFriendRequests();
    }
}

async function loadContacts() {
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id);
    
    const container = document.getElementById('chatsList');
    if (!users || users.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center;">No hay otros usuarios aún</div>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="contact-item" onclick="openPrivateChat('${user.id}', '${user.alias}')">
            <div class="contact-name">${user.alias}</div>
            <div class="contact-pronouns">${user.pronombres}</div>
            <button style="margin-top:5px; background:#667eea; color:white; border:none; padding:5px 10px; border-radius:5px;" onclick="event.stopPropagation(); sendFriendRequest('${user.id}')">➕ Enviar solicitud</button>
        </div>
    `).join('');
}

async function loadGroups() {
    const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', currentUser.id);
    
    const container = document.getElementById('groupsList');
    if (!memberships || memberships.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center;">No estás en ningún grupo aún<br><button onclick="showCreateGroupModal()" style="margin-top:10px;">Crear grupo</button></div>';
        return;
    }
    
    container.innerHTML = memberships.map(m => `
        <div class="group-item" onclick="openGroupChat(${m.group_id}, '${m.groups.name}')">
            <div class="group-name"># ${m.groups.name}</div>
        </div>
    `).join('');
}

async function loadFriendRequests() {
    const { data: requests } = await supabase
        .from('friend_requests')
        .select('*, from_user:profiles!friend_requests_from_user_fkey(*)')
        .eq('to_user', currentUser.id)
        .eq('status', 'pending');
    
    const container = document.getElementById('requestsList');
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center;">No hay solicitudes pendientes</div>';
        return;
    }
    
    container.innerHTML = requests.map(req => `
        <div class="contact-item">
            <div class="contact-name">${req.from_user.alias}</div>
            <div class="contact-pronouns">Quiere ser tu amigo</div>
            <button onclick="acceptFriendRequest(${req.id})" style="margin-top:10px; background:#25d366; color:white; border:none; padding:8px 15px; border-radius:5px; margin-right:5px;">Aceptar</button>
            <button onclick="rejectFriendRequest(${req.id})" style="margin-top:10px; background:#dc3545; color:white; border:none; padding:8px 15px; border-radius:5px;">Rechazar</button>
        </div>
    `).join('');
}

async function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value;
    if (searchTerm.length < 2) {
        loadContacts();
        return;
    }
    
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .ilike('alias', `%${searchTerm}%`);
    
    const container = document.getElementById('chatsList');
    if (!users || users.length === 0) {
        container.innerHTML = '<div style="padding:20px;">No se encontraron usuarios</div>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="contact-item">
            <div class="contact-name">${user.alias}</div>
            <div class="contact-pronouns">${user.pronombres}</div>
            <button onclick="sendFriendRequest('${user.id}')" style="margin-top:5px; background:#667eea; color:white; border:none; padding:5px 10px; border-radius:5px;">➕ Enviar solicitud</button>
        </div>
    `).join('');
}

async function sendFriendRequest(toUserId) {
    const { error } = await supabase
        .from('friend_requests')
        .insert([{ from_user: currentUser.id, to_user: toUserId }]);
    
    if (error) {
        alert('Error al enviar solicitud: ' + error.message);
    } else {
        alert('Solicitud enviada');
    }
}

async function acceptFriendRequest(requestId) {
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Amigo agregado');
        loadFriendRequests();
        loadContacts();
    }
}

async function rejectFriendRequest(requestId) {
    const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);
    
    if (!error) {
        loadFriendRequests();
    }
}

function openPrivateChat(userId, userName) {
    currentChat = { type: 'private', id: userId, name: userName };
    document.getElementById('chatHeader').innerHTML = `<span>💬 ${userName}</span>`;
    document.getElementById('chatInput').style.display = 'flex';
    loadMessages();
}

async function openGroupChat(groupId, groupName) {
    const { data: isMember } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)
        .single();
    
    if (!isMember) {
        const pin = prompt(`El grupo "${groupName}" requiere PIN. Ingresa el PIN:`);
        const { data: group } = await supabase
            .from('groups')
            .select('pin')
            .eq('id', groupId)
            .single();
        
        if (pin !== group.pin) {
            alert('PIN incorrecto');
            return;
        }
        
        await supabase
            .from('group_members')
            .insert([{ group_id: groupId, user_id: currentUser.id }]);
    }
    
    currentChat = { type: 'group', id: groupId, name: groupName };
    document.getElementById('chatHeader').innerHTML = `<span>👥 ${groupName}</span>`;
    document.getElementById('chatInput').style.display = 'flex';
    loadMessages();
}

async function createGroup() {
    const name = document.getElementById('groupName').value;
    const pin = document.getElementById('groupPin').value;
    
    if (!name || !pin) {
        alert('Completa todos los campos');
        return;
    }
    
    const { data: group, error } = await supabase
        .from('groups')
        .insert([{ name, pin, created_by: currentUser.id }])
        .select()
        .single();
    
    if (error) {
        alert('Error: ' + error.message);
        return;
    }
    
    await supabase
        .from('group_members')
        .insert([{ group_id: group.id, user_id: currentUser.id }]);
    
    alert(`Grupo "${name}" creado. PIN: ${pin}`);
    closeModal();
    loadGroups();
}

function showCreateGroupModal() {
    document.getElementById('groupModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('groupModal').style.display = 'none';
}

async function loadMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div>Cargando mensajes...</div>';
    
    let query = supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(alias)')
        .order('created_at', { ascending: true });
    
    if (currentChat.type === 'private') {
        query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChat.id}),and(sender_id.eq.${currentChat.id},receiver_id.eq.${currentUser.id})`);
    } else {
        query = query.eq('group_id', currentChat.id);
    }
    
    const { data: messages } = await query;
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div style="text-align:center;">No hay mensajes aún. ¡Envía el primero!</div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender_id === currentUser.id ? 'sent' : 'received'}">
            ${msg.image_url ? `<img src="${msg.image_url}" class="message-image" onclick="window.open('${msg.image_url}')">` : ''}
            <div>${msg.content}</div>
            <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const content = document.getElementById('messageInput').value;
    if (!content && !pendingImage) return;
    
    const messageData = {
        content: content || '(imagen)',
        sender_id: currentUser.id,
        created_at: new Date()
    };
    
    if (currentChat.type === 'private') {
        messageData.receiver_id = currentChat.id;
    } else {
        messageData.group_id = currentChat.id;
    }
    
    if (pendingImage) {
        const fileExt = pendingImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`chat_images/${fileName}`, pendingImage);
        
        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(`chat_images/${fileName}`);
            messageData.image_url = publicUrl;
        }
        pendingImage = null;
    }
    
    const { error } = await supabase.from('messages').insert([messageData]);
    
    if (error) {
        alert('Error al enviar: ' + error.message);
    } else {
        document.getElementById('messageInput').value = '';
        loadMessages();
    }
}

document.getElementById('imageUploadBtn')?.addEventListener('click', () => {
    document.getElementById('imageFile').click();
});

document.getElementById('imageFile')?.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        pendingImage = e.target.files[0];
        alert('Imagen lista para enviar. Escribe un mensaje o presiona Enviar');
    }
});

function subscribeToMessages() {
    supabase
        .channel('messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            if (currentChat.type === 'private' && 
                ((payload.new.sender_id === currentChat.id && payload.new.receiver_id === currentUser.id) ||
                 (payload.new.sender_id === currentUser.id && payload.new.receiver_id === currentChat.id))) {
                loadMessages();
            } else if (currentChat.type === 'group' && payload.new.group_id === currentChat.id) {
                loadMessages();
            }
        })
        .subscribe();
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}