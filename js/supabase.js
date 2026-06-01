// ============================================
//  ZING BAI — Supabase Config
//  🔧 Cambia estos valores con los tuyos de:
//     https://app.supabase.com → Settings → API
// ============================================
 const SUPABASE_URL = 'https://xcldbsvxxcxfnbkpotzf.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxY2VwaHJnZ2t1aW9weHZxbmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjU0NTMsImV4cCI6MjA5NTg0MTQ1M30.sltHDd2yGzQgwKgG8ye5eZ3wI-H9r_oBMsQbVHZI2vw';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper: obtener usuario actual
async function getCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// Helper: obtener perfil del usuario
async function getProfile(userId) {
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
  return data;
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
