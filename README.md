# Community Animation Hub 🎬

Platform kolaborasi terpadu untuk komunitas animator Indonesia: kelola ide cerita, voting demokratis, pantau alur pipeline kanban, checklist scene realtime, relay render untuk perangkat spesifikasi rendah, katalog aset bersama, hingga generator credit roll otomatis.

---

## 🌟 Fitur Utama (7 Modul Lengkap)

1. **Idea Bank & Upvotes (`pages/ideas.html`):**
   - Idea Drop-Box tanpa login paksa (data tersimpan ke Google Sheets via Apps Script).
   - Voting 1-klik realtime (Supabase `idea_votes` dengan deduplikasi voter ID).
   - Banner tantangan mingguan/bulanan (*Challenge Board*).
2. **Pipeline Status Tracker (`pages/projects.html`):**
   - Kanban Board 6 tahap produksi (`Idea` ➔ `Storyboard` ➔ `Animating` ➔ `Render` ➔ `Review` ➔ `Released`).
   - Sinkronisasi realtime via Supabase WebSockets channel.
   - Modal tambah proyek baru dan pengubah status tahap.
3. **Scene Checklist Realtime (`pages/project-detail.html`):**
   - Checklist per-scene dengan auto-progress bar kalkulasi `(scene_selesai / total * 100)%`.
   - Manajemen anggota tim per peran/divisi.
4. **Relay Render Hub (`pages/project-detail.html#section-relay`):**
   - Bantuan render scene untuk kreator dengan spek laptop rendah oleh volunteer PC gaming/rendering.
   - Status antrean dengan **Atomic Claim** (`open` ➔ `claimed` ➔ `rendering` ➔ `done`).
5. **Asset Handoff System (`pages/project-detail.html#section-handoff`):**
   - Pencatatan transfer file mentah Google Drive (.blend, rig, texture) dengan status `sent` ➔ `received`.
6. **Timestamp Feedback Revisi (`pages/project-detail.html#section-feedback`):**
   - Catatan revisi video draft berbasis menit:detik (`mm:ss`) terurut kronologis dengan toggle *Resolved*.
7. **Auto-Credits Generator (`pages/project-detail.html` modal):**
   - Mengumpulkan data seluruh animator, rigger, dan render volunteer menjadi teks rolling credits siap pakai.
8. **Open Collab Board (`pages/collab.html`):**
   - Papan pencarian peran (Rigger, Modeler, Animator, Background Artist, Sound Designer).
9. **Katalog Aset & Tutorial Library (`pages/assets.html`):**
   - Filter format ekstensi (.blend, .obj/.fbx, .miobject Mine-imator, VFX green screen).
10. **Showcase Galeri Karya Selesai (`pages/gallery.html`):**
    - Etalase video 16:9 karya yang 100% selesai dengan video player modal embed.
11. **Bot Otomasi Termux & Discord (`automation/notifier.py`):**
    - Bot background yang mendeteksi ide baru, permintaan render, dan status rilis via Discord Webhook & HP Android.

---

## 📁 Struktur Direktori Proyek

```
community-animation-hub/
├── index.html                     # Beranda, Hero Section & Live Teasers
├── pages/
│   ├── ideas.html                 # Idea Drop-Box, Voting & Challenge Board
│   ├── projects.html              # Pipeline Kanban Tracker (Idea -> Done)
│   ├── project-detail.html        # Scene Checklist, Relay, Handoff & Feedback
│   ├── collab.html                # Open Collab Board (Pencarian Peran)
│   ├── assets.html                # Multi-Format Asset Catalog & Tutorial
│   └── gallery.html               # Showcase Galeri Karya 100% Selesai
├── src/
│   ├── css/custom.css             # Tema studio dark slate, glassmorphism & badges
│   ├── js/
│   │   ├── config.js              # Kredensial Supabase, Apps Script & Mock Mode
│   │   ├── main.js                # Controller Beranda
│   │   ├── api/                   # supabase.js, sheets.js
│   │   ├── components/            # toast.js, modal.js
│   │   ├── modules/               # ideas, pipeline, scenes, collab, handoff, relay, feedback, credits, assets, gallery
│   │   └── utils/                 # dom.js, format.js, storage.js, identity.js
├── google-apps-script/
│   └── Code.gs                    # Web App endpoint penampung data Google Sheets
├── supabase/
│   ├── schema.sql                 # Skema DDL tabel database PostgreSQL
│   └── policies.sql               # Row Level Security (RLS) & Realtime Publication
├── automation/
│   ├── notifier.py                # Script bot pemantau Termux / Discord Webhook
│   ├── run_notifier.sh            # Runner shell dengan termux-wake-lock
│   ├── config.example.json        # Template kredensial bot
│   └── README.md                  # Panduan setup bot di Android Termux
├── tests/
│   └── audit_system.py            # Suite pengujian & verifikasi performa produksi
├── vercel.json                    # Konfigurasi deployment Vercel dengan clean URLs
├── IMPLEMENTATION-PLAN.md         # Rencana implementasi 7 tahapan terstruktur
└── README.md
```

---

## 🛠️ Menjalankan Secara Lokal (Quick Start)

Aplikasi ini menggunakan arsitektur **Zero-Build Step** (HTML5 + Tailwind CDN + Modular ES6 JS) dengan bawaan **Mock Mode** aktif (`CONFIG.MOCK_MODE: true`), sehingga dapat langsung dicoba tanpa setup API key:

```bash
# Menggunakan Python
python -m http.server 3000

# Atau menggunakan Node
npx serve .
```
Buka browser di `http://localhost:3000`.

---

## 🚀 Panduan Deployment ke Publik (100% Gratis)

### Opsi 1: Deployment ke Vercel (Disarankan)
1. Push repositori ini ke GitHub / GitLab.
2. Buka [Vercel Dashboard](https://vercel.com/new).
3. Import repositori Anda, biarkan opsi build default (tidak perlu build command).
4. Klik **Deploy**! File `vercel.json` akan otomatis mengatur clean URLs dan security headers.

### Opsi 2: Deployment ke GitHub Pages
1. Masuk ke tab **Settings** repositori GitHub Anda.
2. Buka menu **Pages** di sidebar kiri.
3. Pada bagian **Build and deployment > Branch**, pilih branch `main` dan folder `/ (root)`.
4. Klik **Save**. Web Anda akan aktif di `https://<username>.github.io/<nama-repo>/`.

---

## ⚙️ Menghubungkan Backend Nyata (Supabase & Google Sheets)

Jika sudah siap menggunakan database live komunitas:

1. **Supabase:**
   - Jalankan `supabase/schema.sql` dan `supabase/policies.sql` di SQL Editor Supabase.
   - Salin URL & Anon Key ke `src/js/config.js`.
2. **Google Sheets & Apps Script:**
   - Siapkan sheet dengan 6 tab: `Ideas`, `Challenges`, `Collab`, `Assets`, `Tutorials`, `Gallery`.
   - Pasang kode `google-apps-script/Code.gs` dan deploy sebagai **Web app** (*Access: Anyone*).
   - Salin Web App URL ke `src/js/config.js`.
3. **Ubah Mock Mode:**
   - Di `src/js/config.js`, ubah `MOCK_MODE: false`.
