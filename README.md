# 🔄 Proxy Paito Scanner Pro – Auto Update Harian

Sistem ini mengambil data result togel otomatis setiap hari menggunakan **GitHub Actions** (gratis) dan menyimpannya sebagai file JSON publik di **GitHub Pages** (gratis).

---

## 📁 Struktur File

```
proxy_paito/
├── .github/
│   └── workflows/
│       └── update.yml       ← Jadwal auto-fetch (setiap hari jam 23.00 WIB)
├── data/
│   ├── index.json           ← Daftar semua pasaran + status
│   ├── sgp.json             ← Data SGP
│   ├── hkg.json             ← Data HK Pools
│   └── ... (per pasaran)
├── fetch_paito.js           ← Script fetcher utama (Node.js)
├── cf_worker.js             ← Cloudflare Worker CORS proxy (opsional)
├── package.json
└── README.md
```

---

## 🚀 Cara Setup (GitHub Actions + Pages)

### Langkah 1 — Buat Repo di GitHub
1. Buka [github.com](https://github.com) → Login
2. Klik **New Repository**
3. Nama repo: `proxy-paito` (atau bebas)
4. Pilih **Public**
5. Klik **Create repository**

### Langkah 2 — Upload Semua File
Upload semua file dari folder ini ke repo yang baru dibuat:
- Drag & drop lewat GitHub web, ATAU
- Gunakan GitHub Desktop, ATAU
- `git push` dari terminal

### Langkah 3 — Aktifkan GitHub Pages
1. Di repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Klik **Save**

Setelah beberapa menit, data Anda akan bisa diakses di:
```
https://USERNAME.github.io/proxy-paito/data/index.json
https://USERNAME.github.io/proxy-paito/data/sgp.json
https://USERNAME.github.io/proxy-paito/data/hkg.json
```

### Langkah 4 — Jalankan Pertama Kali (Manual)
1. Di repo → Tab **Actions**
2. Pilih workflow **Update Paito Data Harian**
3. Klik **Run workflow** → **Run workflow**
4. Tunggu ~2 menit → data/\*.json akan terisi

---

## ⏰ Jadwal Auto-Update

File `.github/workflows/update.yml` sudah dikonfigurasi:
```
cron: '0 16 * * *'   →  setiap hari jam 23.00 WIB (16.00 UTC)
```
Ubah waktu sesuai kebutuhan di file tersebut.

---

## 🌐 Cara Pakai di index.html Scanner Pro

Tambahkan fungsi ini di `index.html`:

```javascript
const BASE_URL = 'https://USERNAME.github.io/proxy-paito/data';

async function fetchPaitoOnline(market) {
  try {
    const res  = await fetch(`${BASE_URL}/${market}.json`);
    const data = await res.json();
    return data.data || [];   // array hasil
  } catch(e) {
    console.error('Gagal fetch:', e);
    return [];
  }
}

// Contoh pakai:
// const hasil = await fetchPaitoOnline('sgp');
// console.log(hasil[0]); // { tanggal, hari, result4, as, cop, kepala, ekor }
```

---

## ☁️ Cloudflare Worker (Opsional – CORS Proxy)

Jika ingin proxy langsung ke sumber data tanpa GitHub:

1. Buka [workers.cloudflare.com](https://workers.cloudflare.com) → Login gratis
2. Buat Worker baru → paste isi `cf_worker.js`
3. Deploy
4. URL Worker Anda: `https://nama-worker.nama.workers.dev`

Pakai di index.html:
```javascript
const PROXY = 'https://nama-worker.nama.workers.dev';
const res   = await fetch(`${PROXY}/?url=https://www.angkanet.com/singapore/`);
```

---

## 📊 Format Data JSON

```json
{
  "key"      : "sgp",
  "nama"     : "SGP | Singapore",
  "status"   : "ok",
  "total"    : 60,
  "updatedAt": "2026-05-14T16:00:00.000Z",
  "data": [
    {
      "tanggal" : "2026-05-14",
      "hari"    : "Kamis",
      "result4" : "5678",
      "as"      : "5",
      "cop"     : "6",
      "kepala"  : "7",
      "ekor"    : "8"
    }
  ]
}
```

---

## ✅ Ringkasan Biaya

| Komponen         | Biaya  |
|-----------------|--------|
| GitHub Actions  | GRATIS (2000 menit/bulan) |
| GitHub Pages    | GRATIS |
| Cloudflare Worker | GRATIS (100k req/hari) |

**Total: Rp 0 / bulan** 🎉
