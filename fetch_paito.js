/**
 * fetch_paito.js - Puppeteer version
 * Menggunakan headless browser agar JavaScript ter-render
 */

const puppeteer = require('puppeteer-core');
const fs        = require('fs');
const path      = require('path');

const PASARAN = [
  { key: 'sgp',  nama: 'SGP | Singapore',    url: 'https://www.angkanet.com/singapore/'      },
  { key: 'hkg',  nama: 'Hongkong Pools',     url: 'https://www.angkanet.com/hongkong/'       },
  { key: 'syd',  nama: 'Sydneypools',        url: 'https://www.angkanet.com/sydney/'         },
  { key: 'sdlt', nama: 'Sydney Lotto',       url: 'https://www.angkanet.com/sydney-lotto/'   },
  { key: 'hklt', nama: 'Hongkong Lotto',     url: 'https://www.angkanet.com/hongkong-lotto/' },
  { key: 'chn',  nama: 'Chinapools',         url: 'https://www.angkanet.com/china/'          },
  { key: 'jpn',  nama: 'Japan',              url: 'https://www.angkanet.com/japan/'          },
  { key: 'cmb2', nama: 'Magnum Cambodia',    url: 'https://www.angkanet.com/cambodia/'       },
  { key: 'ncd',  nama: 'North Carolina Day', url: 'https://www.angkanet.com/north-carolina/' },
  { key: 'twn',  nama: 'Taiwan',             url: 'https://www.angkanet.com/taiwan/'         },
];

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function hariIndo(dateStr) {
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : hari[d.getDay()];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPasaran(browser, p) {
  console.log(`\n→ Fetching: ${p.nama} ...`);
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8' });

    await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Tunggu tabel muncul
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});
    await sleep(2000);

    const rows = await page.evaluate(() => {
      const results = [];
      // Coba berbagai selector tabel
      const selectors = [
        'table tbody tr',
        '.table-paito tbody tr',
        '.table-bordered tbody tr',
        '.paito-table tr',
      ];
      let trs = [];
      for (const sel of selectors) {
        trs = Array.from(document.querySelectorAll(sel));
        if (trs.length > 0) break;
      }

      trs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 2) return;
        const col0 = tds[0]?.innerText?.trim() || '';
        const col1 = tds[1]?.innerText?.trim() || '';
        if (!col0 || !col1) return;

        // Cari angka 4 digit di kolom-kolom
        const digits = col1.replace(/\D/g, '');
        const result4 = digits.substring(0, 4);
        if (result4.length < 4) return;

        results.push({
          tanggal: col0,
          result4,
          as    : result4[0] || '',
          cop   : result4[1] || '',
          kepala: result4[2] || '',
          ekor  : result4[3] || '',
        });
      });
      return results;
    });

    if (!rows.length) {
      console.log(`  ⚠ Tidak ada data: ${p.nama}`);
      return { key: p.key, nama: p.nama, status: 'no_data', data: [], updatedAt: new Date().toISOString() };
    }

    // Tambah field hari
    const rowsWithHari = rows.map(r => ({ ...r, hari: hariIndo(r.tanggal) }));

    console.log(`  ✓ ${rowsWithHari.length} baris berhasil diambil`);
    return {
      key      : p.key,
      nama     : p.nama,
      status   : 'ok',
      total    : rowsWithHari.length,
      data     : rowsWithHari.slice(0, 60),
      updatedAt: new Date().toISOString(),
    };

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return { key: p.key, nama: p.nama, status: 'error', error: err.message, data: [], updatedAt: new Date().toISOString() };
  } finally {
    await page.close();
  }
}

(async () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   AUTO FETCH PAITO – PUPPETEER       ║');
  console.log(`║   ${new Date().toLocaleString('id-ID').padEnd(35)}║`);
  console.log('╚══════════════════════════════════════╝');

  // Cari path Chromium di GitHub Actions
  const chromePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  const chromePath = chromePaths.find(p => fs.existsSync(p));
  if (!chromePath) throw new Error('Chrome/Chromium tidak ditemukan!');
  console.log(`\n🌐 Menggunakan browser: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });

  const allData = {};
  for (const p of PASARAN) {
    allData[p.key] = await fetchPasaran(browser, p);
    await sleep(2000);
  }

  await browser.close();

  // Simpan per pasaran
  for (const [key, val] of Object.entries(allData)) {
    const filePath = path.join(DATA_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(val, null, 2));
    console.log(`  💾 Saved: data/${key}.json`);
  }

  // Simpan index
  const index = {
    updatedAt: new Date().toISOString(),
    pasaran  : Object.values(allData).map(d => ({
      key       : d.key,
      nama      : d.nama,
      status    : d.status,
      total     : d.data?.length || 0,
      lastResult: d.data?.[0]?.result4 || '-',
      updatedAt : d.updatedAt,
    }))
  };
  fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 2));

  console.log('\n✅ SELESAI — semua data tersimpan di folder /data/');
})();
