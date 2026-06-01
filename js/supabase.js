// ============================================
//  ZING BAI — Supabase Config
// ============================================
const SUPABASE_URL = 'https://xcldbsvxxcxfnbkpotzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6..."'; // Tu llave completa aquí

const { createClient } = supabase;
// CORREGIDO: Ahora sí usa SUPABASE_ANON_KEY en lugar de SUPABASE_KEY
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: obtener usuario actual
async function getCurrentUser() {
  try {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  } catch (e) {
    console.error("Error al obtener usuario:", e);
    return null;
  }
}

// Helper: obtener perfil del usuario
async function getProfile(userId) {
  try {
    const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
    return data;
  } catch (e) {
    console.error("Error al obtener perfil:", e);
    return null;
  }
}

// Helper: iniciales de un nombre
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
}

// Helper: tiempo relativo
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff/60)} min`;
  if (diff < 86400) return `${Math.floor(diff/3600)} h`;
  if (diff < 604800) return `${Math.floor(diff/86400)} d`;
  return new Date(dateStr).toLocaleDateString('es-MX', { day:'numeric', month:'short' });
}