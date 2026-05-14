/**
 * fetch_paito.js
 * Auto-fetch data result togel dari berbagai sumber.
 * Repo: alifavif-cmd/WONGBAGUS-PREDICTION
 * Data publik: https://alifavif-cmd.github.io/WONGBAGUS-PREDICTION/data/
 * Jalankan: node fetch_paito.js
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

// ─── KONFIGURASI PASARAN ──────────────────────────────────────────
const PASARAN = [
  {
    key   : 'sgp',
    nama  : 'SGP | Singapore',
    url   : 'https://www.angkanet.com/singapore/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'hkg',
    nama  : 'Hongkong Pools',
    url   : 'https://www.angkanet.com/hongkong/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'syd',
    nama  : 'Sydneypools',
    url   : 'https://www.angkanet.com/sydney/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'sdlt',
    nama  : 'Sydney Lotto',
    url   : 'https://www.angkanet.com/sydney-lotto/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'hklt',
    nama  : 'Hongkong Lotto',
    url   : 'https://www.angkanet.com/hongkong-lotto/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'chn',
    nama  : 'Chinapools',
    url   : 'https://www.angkanet.com/china/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'jpn',
    nama  : 'Japan',
    url   : 'https://www.angkanet.com/japan/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'cmb2',
    nama  : 'Magnum Cambodia',
    url   : 'https://www.angkanet.com/cambodia/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'ncd',
    nama  : 'North Carolina Day',
    url   : 'https://www.angkanet.com/north-carolina/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
  {
    key   : 'twn',
    nama  : 'Taiwan',
    url   : 'https://www.angkanet.com/taiwan/',
    sel   : { tanggal: '.result-date', result: '.result-number' }
  },
];

const HEADERS = {
  'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept'         : 'text/html,application/xhtml+xml',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
  'Referer'        : 'https://www.google.com/',
};

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── HELPER ───────────────────────────────────────────────────────
function hariIndo(dateStr) {
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : hari[d.getDay()];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── FETCH SATU PASARAN ───────────────────────────────────────────
async function fetchPasaran(p) {
  console.log(`\n→ Fetching: ${p.nama} ...`);
  try {
    const res = await axios.get(p.url, { headers: HEADERS, timeout: 15000 });
    const $   = cheerio.load(res.data);

    // Coba parse tabel result (umum di angkanet)
    const rows = [];
    $('table tbody tr, .paito-row, .result-row').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length < 2) return;
      const tanggal = $(tds[0]).text().trim();
      const result  = $(tds[1]).text().trim().replace(/\s+/g, ' ');
      if (!tanggal || !result) return;
      const parts = result.split(' ');
      rows.push({
        tanggal,
        hari   : hariIndo(tanggal),
        result4: parts[0] || '',
        as     : parts[0]?.[0] || '',
        cop    : parts[0]?.[1] || '',
        kepala : parts[0]?.[2] || '',
        ekor   : parts[0]?.[3] || '',
      });
    });

    // Fallback: coba selector spesifik
    if (!rows.length) {
      $(p.sel.result).each((i, el) => {
        const txt = $(el).text().trim();
        if (txt.length >= 4) {
          rows.push({
            tanggal: $(el).closest('tr').find(p.sel.tanggal).text().trim() || new Date().toISOString().split('T')[0],
            hari   : '-',
            result4: txt.substring(0, 4),
            as     : txt[0] || '',
            cop    : txt[1] || '',
            kepala : txt[2] || '',
            ekor   : txt[3] || '',
          });
        }
      });
    }

    if (!rows.length) {
      console.log(`  ⚠ Tidak ada data ditemukan untuk ${p.nama}`);
      return { key: p.key, nama: p.nama, status: 'no_data', data: [], updatedAt: new Date().toISOString() };
    }

    console.log(`  ✓ ${rows.length} baris berhasil diambil`);
    return {
      key      : p.key,
      nama     : p.nama,
      status   : 'ok',
      total    : rows.length,
      data     : rows.slice(0, 60),   // simpan 60 result terakhir
      updatedAt: new Date().toISOString(),
    };

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return { key: p.key, nama: p.nama, status: 'error', error: err.message, data: [], updatedAt: new Date().toISOString() };
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────
(async () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   AUTO FETCH PAITO – SCANNER PRO     ║');
  console.log(`║   ${new Date().toLocaleString('id-ID').padEnd(35)}║`);
  console.log('╚══════════════════════════════════════╝');

  const allData = {};
  for (const p of PASARAN) {
    allData[p.key] = await fetchPasaran(p);
    await sleep(1500); // jeda antar request biar tidak kena block
  }

  // Simpan per pasaran
  for (const [key, val] of Object.entries(allData)) {
    const filePath = path.join(DATA_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(val, null, 2));
    console.log(`  💾 Saved: data/${key}.json`);
  }

  // Simpan index semua pasaran
  const index = {
    updatedAt: new Date().toISOString(),
    pasaran  : Object.values(allData).map(d => ({
      key      : d.key,
      nama     : d.nama,
      status   : d.status,
      total    : d.data?.length || 0,
      lastResult: d.data?.[0]?.result4 || '-',
      updatedAt: d.updatedAt,
    }))
  };
  fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 2));

  console.log('\n✅ SELESAI — semua data tersimpan di folder /data/');
})();
