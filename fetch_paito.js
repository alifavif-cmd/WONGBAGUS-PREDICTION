/**
 * fetch_paito.js v3.0
 * Sumber: IP server live draw (HTML statis, bisa diakses GitHub Actions)
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function hariIndo(d){ const dt=new Date(d); return isNaN(dt.getTime())?'-':HARI[dt.getDay()]; }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

const HEADERS = {
  'User-Agent'    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept'        : 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
  'Cache-Control' : 'no-cache',
};

// Sumber: IP langsung — serve HTML statis, tidak perlu JS render
const PASARAN = [
  { key:'sgp',  nama:'SGP | Singapore',    url:'http://157.245.204.87/'  },
  { key:'hkg',  nama:'Hongkong Pools',     url:'http://152.42.209.210/'  },
  { key:'syd',  nama:'Sydneypools',        url:'http://159.223.90.241/'  },
  { key:'sdlt', nama:'Sydney Lotto',       url:'http://128.199.64.12/'   },
  { key:'hklt', nama:'Hongkong Lotto',     url:'http://178.128.30.60/'   },
  { key:'chn',  nama:'Chinapools',         url:'http://178.128.17.42/'   },
  { key:'jpn',  nama:'Japan',              url:'http://157.245.204.87/japan/' },
  { key:'cmb2', nama:'Magnum Cambodia',    url:'http://159.223.90.241/cambodia/' },
  { key:'ncd',  nama:'North Carolina Day', url:'http://157.245.204.87/ncd/' },
  { key:'twn',  nama:'Taiwan',             url:'http://159.223.90.241/taiwan/' },
];

function convertDate(str){
  // "14-05-2026" → "2026-05-14"
  if(!str) return '';
  const m = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if(m) return `${m[3]}-${m[2]}-${m[1]}`;
  return str;
}

async function fetchPasaran(p){
  console.log(`\n→ [${p.key.toUpperCase()}] ${p.nama}`);
  try{
    const res = await axios.get(p.url, { headers:HEADERS, timeout:20000, maxRedirects:5 });
    const $ = cheerio.load(res.data);
    const rows = [];

    // Format utama: NO | HARI | TANGGAL | RESULT
    $('table').each((_, tbl) => {
      if(rows.length >= 60) return;
      $(tbl).find('tr').each((i, tr) => {
        if(rows.length >= 60) return;
        const tds = $(tr).find('td');
        if(tds.length < 4) return;
        const no     = $(tds[0]).text().trim();
        const hari   = $(tds[1]).text().trim();
        const tanggal= $(tds[2]).text().trim();
        const result = $(tds[3]).text().trim().replace(/\D/g,'').substring(0,4);
        if(!/^\d+$/.test(no) || result.length < 4) return;
        const tglIso = convertDate(tanggal) || tanggal;
        rows.push({ tanggal:tglIso, hari, result4:result, as:result[0]||'', cop:result[1]||'', kepala:result[2]||'', ekor:result[3]||'' });
      });
    });

    // Fallback: 2 kolom (tanggal + result)
    if(!rows.length){
      $('table tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if(tds.length < 2) return;
        const tgl    = $(tds[0]).text().trim();
        const result = $(tds[tds.length-1]).text().trim().replace(/\D/g,'').substring(0,4);
        if(result.length < 4) return;
        rows.push({ tanggal:convertDate(tgl)||tgl, hari:hariIndo(convertDate(tgl)||tgl), result4:result, as:result[0]||'', cop:result[1]||'', kepala:result[2]||'', ekor:result[3]||'' });
      });
    }

    if(!rows.length){
      // Pertahankan data lama
      const fp = path.join(DATA_DIR, `${p.key}.json`);
      if(fs.existsSync(fp)){
        const old = JSON.parse(fs.readFileSync(fp,'utf8'));
        if((old.data||[]).length > 0){
          console.log(`   ♻ Pakai data lama: ${old.data.length} rows`);
          return { ...old, status:'cached', updatedAt:new Date().toISOString() };
        }
      }
      console.log(`   ⚠ Tidak ada data`);
      return { key:p.key, nama:p.nama, status:'no_data', total:0, data:[], updatedAt:new Date().toISOString() };
    }

    console.log(`   ✓ ${rows.length} baris berhasil`);
    return { key:p.key, nama:p.nama, status:'ok', total:rows.length, data:rows.slice(0,60), updatedAt:new Date().toISOString() };

  } catch(err){
    console.error(`   ✗ Error: ${err.message}`);
    // Pertahankan data lama jika error
    const fp = path.join(DATA_DIR, `${p.key}.json`);
    if(fs.existsSync(fp)){
      try{
        const old = JSON.parse(fs.readFileSync(fp,'utf8'));
        if((old.data||[]).length > 0){
          console.log(`   ♻ Fallback data lama: ${old.data.length} rows`);
          return { ...old, status:'cached', updatedAt:new Date().toISOString() };
        }
      } catch(_){}
    }
    return { key:p.key, nama:p.nama, status:'error', error:err.message, total:0, data:[], updatedAt:new Date().toISOString() };
  }
}

(async()=>{
  console.log('╔══════════════════════════════════════╗');
  console.log('║   AUTO FETCH PAITO v3.0 – STABLE     ║');
  console.log(`║   ${new Date().toLocaleString('id-ID').padEnd(35)}║`);
  console.log('╚══════════════════════════════════════╝');

  let ok = 0;
  for(const p of PASARAN){
    const result = await fetchPasaran(p);
    fs.writeFileSync(path.join(DATA_DIR, `${p.key}.json`), JSON.stringify(result, null, 2));
    console.log(`   💾 ${p.key}.json [${result.status}] ${result.total||0} rows`);
    if(result.status === 'ok') ok++;
    await sleep(800);
  }

  const all = PASARAN.map(p => {
    try{ return JSON.parse(fs.readFileSync(path.join(DATA_DIR,`${p.key}.json`),'utf8')); }
    catch(_){ return {key:p.key,nama:p.nama,status:'error',total:0,data:[]}; }
  });

  fs.writeFileSync(path.join(DATA_DIR,'index.json'), JSON.stringify({
    updatedAt : new Date().toISOString(),
    ok, total  : PASARAN.length,
    pasaran    : all.map(d=>({ key:d.key, nama:d.nama, status:d.status, total:d.data?.length||0, lastResult:d.data?.[0]?.result4||'-', updatedAt:d.updatedAt }))
  }, null, 2));

  console.log(`\n✅ SELESAI — ${ok}/${PASARAN.length} pasaran berhasil`);
})();
