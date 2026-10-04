# Panduan Otomasi & Bot Notifikasi (Termux / Server) 🤖

Modul ini menjalankan bot pemantau latar belakang otonom di HP Android (Termux) atau server/PC. Bot akan secara berkala mengecek data komunitas di Google Sheets dan Supabase, lalu mengirimkan notifikasi saat:
1. **Ada ide baru yang diajukan** di Idea Drop-Box.
2. **Ada permohonan Render Relay baru** (`status: open`) yang butuh bantuan render.
3. **Proyek berpindah ke tahap Review atau Selesai (Rilis)**.

---

## 📱 Panduan Setup di Android Termux

### 1. Install Aplikasi yang Dibutuhkan
Dari F-Droid (sangat disarankan, hindari versi Play Store yang sudah usang):
- [Termux (F-Droid)](https://f-droid.org/en/packages/com.termux/)
- [Termux:API (F-Droid)](https://f-droid.org/en/packages/com.termux.api/) (Opsional, agar HP Android dapat memunculkan popup notifikasi suara/getar).

### 2. Setup Lingkungan Termux
Buka Termux di HP Anda, jalankan perintah berikut:
```bash
# Update repository & install python + git + termux-api
pkg update && pkg upgrade -y
pkg install python git termux-api -y

# Clone atau copy repositori proyek
cd ~
git clone <URL_REPO_ANDA>
cd animation/automation

# Install library Python
pip install -r requirements.txt
```

### 3. Konfigurasi Kredensial
Salin file `config.example.json` menjadi `config.json`:
```bash
cp config.example.json config.json
nano config.json
```
Isi bagian:
- `discord_webhook_url`: URL Webhook channel Discord komunitas Anda (Server Settings > Integrations > Webhooks).
- `apps_script_url`: URL hasil deploy Google Apps Script.
- `supabase`: URL dan anon_key proyek Supabase Anda.

### 4. Uji Coba Pengiriman Notifikasi
```bash
python3 notifier.py --test
```
Jika berhasil, pesan uji coba akan langsung muncul di Discord Webhook dan notifikasi HP Android.

### 5. Menjalankan Bot di Background
Agar script tetap berjalan meskipun layar HP dimatikan:
```bash
chmod +x run_notifier.sh
./run_notifier.sh
```
*(Script ini otomatis memanggil `termux-wake-lock` agar prosesor Android tidak masuk deep sleep).*

---

## 💻 Menjalankan di Komputer / Windows / Linux

Anda juga bisa menjalankan bot ini di PC/Laptop atau server VPS:
```bash
cd automation
pip install -r requirements.txt
python notifier.py --once       # Menjalankan 1 kali pengecekan
python notifier.py --test       # Menguji coba notifikasi
python notifier.py              # Berjalan terus setiap interval
```
