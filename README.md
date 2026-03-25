# 🏛️ WaSiKa (Warisan Silsilah Keluarga)

**WaSiKa** adalah platform warisan keluarga modern berbasis web yang dirancang untuk menjaga, merayakan, dan mempererat silaturahmi keluarga besar Indonesia. Dengan estetika premium "Fajar Emas", WaSiKa menggabungkan teknologi silsilah interaktif dengan fitur gamifikasi realtime.

---

## ✨ Fitur Utama

- **🌳 Interactive Family Tree**: Visualisasi silsilah dinamis menggunakan `@xyflow/react` dengan layout otomatis (Dagre).
- **🎮 Activities Hub**: Fitur hiburan keluarga (Game Undercover, Gacha Hadiah).
- **🏆 Gamification**: Sistem poin (PTS) berdasarkan keaktifan (Check-in, Forum).
- **💬 Family Forum**: Ruang diskusi realtime untuk setiap "Bani".
- **📍 Map of Heritage**: Peta sebaran lokasi anggota keluarga di seluruh Nusantara.
- **🛡️ Secure Access**: Autentikasi Supabase dengan isolasi data antar keluarga (Bani Code).
- **📲 PWA Support**: Dapat diinstal di perangkat selular untuk akses cepat dan notifikasi.

---

## 🎨 Design System: "Fajar Emas"

WaSiKa menggunakan palet warna yang terinspirasi dari kemewahan budaya Nusantara:
- **Gold (#d4a843)**: Melambangkan kejayaan dan nilai luhur keluarga.
- **Copper (#cd7f32)**: Memberikan kesan hangat dan tradisional.
- **Dark Brown (#1c0e00)**: Dasar yang kokoh dan elegan.
- **Typography**: Playfair Display (Serif) untuk headlline yang berwibawa & Inter (Sans) untuk keterbacaan modern.

---

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Backend & Realtime**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Styling**: Tailwind CSS
- **Visualization**: @xyflow/react (React Flow), Dagre
- **Mapping**: React-Leaflet + Leaflet
- **Observability**: Sentry (Error Tracking)
- **Infrastructure**: Nginx (Reverse Proxy), PM2 (Process Management)

---

## 🛠️ Instalasi & Pengembangan

### 1. Prasyarat
- Node.js 18+
- Akun Supabase (untuk database dan auth)

### 2. Setup Lingkungan
Salin file `.env.example` ke `.env.local` dan lengkapi variabel berikut:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### 3. Jalankan Lokal
```bash
npm install
npm run dev
```

### 4. Supabase Storage Setup (Ekspresikan Harimu)
Untuk mengaktifkan unggahan media di fitur Cerita/Aktivitas:
1. Buka Supabase Dashboard → Storage
2. Create new bucket: `wasika-media`
3. Set bucket to **PUBLIC** (for easy URL access)
4. Add storage policy di SQL Editor:
```sql
create policy "authenticated upload" on storage.objects
  for insert with check (auth.role() = 'authenticated');
  
create policy "public read" on storage.objects
  for select using (bucket_id = 'wasika-media');
```

---

## 🚢 Panduan Deployment (VPS)

WaSiKa telah dioptimalkan untuk deployment pada VPS (Ubuntu 22.04+).

### 1. Build Proyek
```bash
npm run build
```

### 2. Konfigurasi PM2
Gunakan file `ecosystem.config.js` yang tersedia:
```bash
pm2 start ecosystem.config.js
```

### 3. Konfigurasi Nginx
Gunakan template `nginx.conf` sebagai referensi di `/etc/nginx/sites-available/wasika`. Pastikan SSL (Certbot) telah dikonfigurasi.

---

## 📂 Struktur Proyek

- `/app`: Rute aplikasi Next.js (App Router).
- `/components`: Komponen UI modular (Atomic Design).
- `/context`: State management (User context, Auth).
- `/lib`: Utilitas backend, klien Supabase, dan konfigurasi.
- `/public`: Aset statis, manifes PWA, dan ikon.
- `/types`: Definisi tipe data global.

---

## 📊 Roadmap & Optimalisasi

- [x] TypeScript Strict Mode Fixes
- [x] Realtime Game & Forum Integration
- [x] Environment Variable Validation
- [x] Global Error Boundaries & Skeletal Loading
- [ ] Multi-language Support (Indonesian/English)
- [ ] Export PDF Silsilah (High-res)
- [ ] Integrasi Pembayaran (Pro Plan)

---

Developed with ❤️ for Indonesian Families.
**WaSiKa Team** | © 2024
