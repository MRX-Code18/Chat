# Zing Bai 🚀
**Tu app de mensajería y red social privada**

---

## Estructura de archivos

```
zingbai/
├── index.html              ← App principal (shell con navegación)
├── css/
│   └── style.css           ← Todos los estilos
├── js/
│   ├── supabase.js         ← Config de Supabase + helpers
│   ├── chats.js            ← Chats privados y grupos (tiempo real)
│   ├── feed.js             ← Publicaciones con privacidad
│   └── groups.js           ← Grupos, notificaciones, búsqueda y perfil
├── pages/
│   └── auth.html           ← Login y registro
└── SUPABASE_SETUP.sql      ← Script SQL para configurar la base de datos
```

---

## Pasos para activarlo

### 1. Crear proyecto en Supabase
- Ve a https://app.supabase.com
- Crea un proyecto nuevo (gratis)
- Guarda tu **Project URL** y **anon public key**

### 2. Configurar la base de datos
- En Supabase → **SQL Editor** → New query
- Pega todo el contenido de `SUPABASE_SETUP.sql`
- Clic en **Run** ✓

### 3. Activar Realtime
- Supabase → **Database** → **Replication**
- Activa las tablas: `messages`, `group_messages`, `notifications`

### 4. Crear Storage buckets
- Supabase → **Storage** → **New bucket**
  - Nombre: `avatars` → marcar como **Public**
  - Nombre: `chat-media` → marcar como **Public**

### 5. Pon tus credenciales en supabase.js
```js
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_KEY = 'TU_ANON_PUBLIC_KEY';
```

### 6. Subir a GitHub Pages
- Sube toda la carpeta `zingbai/` a un repositorio en GitHub
- Ve a **Settings → Pages → Deploy from branch → main / root**
- ¡Tu app estará en `https://tu-usuario.github.io/zingbai/`!

---

## Funciones incluidas ✅

| Función | Estado |
|---|---|
| Registro con nombre, pronombres, fecha de nac. | ✅ |
| Login / Logout | ✅ |
| Foto de perfil editable | ✅ |
| Alias/handle editable sin recargar | ✅ |
| Enlace único de perfil | ✅ |
| Publicaciones con privacidad (todos/amigos/solo yo) | ✅ |
| Chat privado en tiempo real | ✅ |
| Solicitud de permiso para chatear | ✅ |
| Grupos con PIN de 4 dígitos | ✅ |
| Mensajes en grupos en tiempo real | ✅ |
| Enviar fotos en chats | ✅ |
| Notificaciones en tiempo real | ✅ |
| Notificaciones push al celular | ✅ |
| Buscar personas por nombre o @alias | ✅ |
| Ver perfil público de otros usuarios | ✅ |

---

## ¿Dudas?
Si algo no funciona o quieres agregar más funciones, pregúntame. ¡Suerte! 💜
