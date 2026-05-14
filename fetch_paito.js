/**
 * fetch_paito.js  v2.0
 * Repo  : alifavif-cmd/WONGBAGUS-PREDICTION
 * Data  : https://alifavif-cmd.github.io/WONGBAGUS-PREDICTION/data/
 *
 * Strategi: 1) JSON API  2) HTML scrape  3) Pertahankan data lama
 */

const axios  = require('axios');
const cheerio= require('cheerio');
const fs     = require('fs');
const path   = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function hariIndo(d){ const dt=new Date(d); return isNaN(dt.getTime())?'-':HARI[dt.getDay()]; }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
const UA = 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Safari/537.36';

const PASARAN = [
  { key:'sgp',  nama:'SGP | Singapore',   mkt:'sgp',          htmlUrl:'https://www.angkanet.com/singapore/' },
  { key:'hkg',  nama:'Hongkong Pools',     mkt:'hk',           htmlUrl:'https://www.angkanet.com/hongkong/' },
  { key:'syd',  nama:'Sydneypools',        mkt:'syd',          htmlUrl:'https://www.angkanet.com/sydney/' },
  { key:'sdlt', nama:'Sydney Lotto',       mkt:'sdlt',         htmlUrl:'https://www.angkanet.com/sydney-lotto/' },
  { key:'hklt', nama:'Hongkong Lotto',     mkt:'hklt',         htmlUrl:'https://www.angkanet.com/hongkong-lotto/' },
  { key:'chn',  nama:'Chinapools',         mkt:'china',        htmlUrl:'https://www.angkanet.com/china/' },
  { key:'jpn',  nama:'Japan',              mkt:'japan',        htmlUrl:'https://www.angkanet.com/japan/' },
  { key:'cmb2', nama:'Magnum Cambodia',    mkt:'cambodia',     htmlUrl:'https://www.angkanet.com/cambodia/' },
  { key:'ncd',  nama:'North Carolina Day', mkt:'northcarolina',htmlUrl:'https://www.angkanet.com/north-carolina/' },
  { key:'twn',  nama:'Taiwan',             mkt:'taiwan',       htmlUrl:'https://www.angkanet.com/taiwan/' },
];

function parseR4(txt){
  txt = String(txt).replace(/\s+/g,'');
  const m = txt.match(/\d{4}/);
  const r4 = m ? m[0] : txt.slice(0,4);
  return { result4:r4, as:r4[0]||'', cop:r4[1]||'', kepala:r4[2]||'', ekor:r4[3]||'' };
}

async function tryJsonApi(p){
  const urls = [
    `https://www.angkanet.com/api/result/?market=${p.mkt}&limit=60`,
    `https://www.angkanet.com/api/paito/?pasaran=${p.mkt}&limit=60`,
    `https://angkanet.com/api/?act=result&market=${p.mkt}`,
  ];
  for(const url of urls){
    try{
      console.log(`   [API] ${url}`);
      const res = await axios.get(url,{ headers:{'User-Agent':UA,'Accept':'application/json'}, timeout:10000 });
      const arr = res.data?.data || res.data?.results || res.data?.result || res.data;
      if(!Array.isArray(arr)||!arr.length) continue;
      const rows = arr.slice(0,60).map(item=>{
        const tgl = item.tanggal||item.date||item.draw_date||'';
        const rst = item.result||item.result4||item.number||item.angka||'';
        return { tanggal:tgl, hari:hariIndo(tgl), ...parseR4(rst) };
      }).filter(r=>r.result4&&r.result4.length>=4);
      if(rows.length){ console.log(`   ✓ API OK ${rows.length} rows`); return rows; }
    } catch(e){ console.log(`   ✗ ${e.message}`); }
  }
  return null;
}

async function tryHtml(p){
  try{
    console.log(`   [HTML] ${p.htmlUrl}`);
    const res = await axios.get(p.htmlUrl,{
      headers:{ 'User-Agent':UA, 'Accept':'text/html', 'Referer':'https://www.google.com/', 'Accept-Language':'id-ID,id;q=0.9' },
      timeout:15000
    });
    const $ = cheerio.load(res.data);
    // Coba berbagai selector umum paito
    const selectors = [
      '#paito-colok tbody tr',
      '.paito-table tbody tr',
      '.table-paito tbody tr',
      'table.paito tbody tr',
      '.tbl-paito tbody tr',
      'table tbody tr',
    ];
    for(const sel of selectors){
      const rows = [];
      $(sel).each((_,el)=>{
        const tds = $(el).find('td');
        if(tds.length<2) return;
        const tgl = $(tds[0]).text().trim();
        const rst = $(tds[1]).text().trim();
        if(!tgl||!rst) return;
        const parsed = parseR4(rst);
        if(parsed.result4.length<4) return;
        rows.push({ tanggal:tgl, hari:hariIndo(tgl), ...parsed });
      });
      if(rows.length){ console.log(`   ✓ HTML OK ${rows.length} rows (${sel})`); return rows.slice(0,60); }
    }
  } catch(e){ console.log(`   ✗ HTML: ${e.message}`); }
  return null;
}

async function fetchOne(p){
  console.log(`\n→ [${p.key.toUpperCase()}] ${p.nama}`);
  let rows = await tryJsonApi(p);
  if(!rows||!rows.length) rows = await tryHtml(p);

  if(rows&&rows.length){
    return { key:p.key, nama:p.nama, status:'ok', total:rows.length, data:rows, updatedAt:new Date().toISOString() };
  }

  // Pertahankan data lama jika ada
  const fp = path.join(DATA_DIR, `${p.key}.json`);
  if(fs.existsSync(fp)){
    try{
      const old = JSON.parse(fs.readFileSync(fp,'utf8'));
      if((old.data||[]).length>0){
        console.log(`   ♻ Pakai data lama: ${old.data.length} rows`);
        return { ...old, status:'cached', updatedAt:new Date().toISOString() };
      }
    } catch(_){}
  }

  console.log(`   ⚠ No data`);
  return { key:p.key, nama:p.nama, status:'no_data', total:0, data:[], updatedAt:new Date().toISOString() };
}

(async()=>{
  console.log('╔══════════════════════════════════════╗');
  console.log('║   AUTO FETCH PAITO v2.0              ║');
  console.log(`║   ${new Date().toLocaleString('id-ID').padEnd(35)}║`);
  console.log('╚══════════════════════════════════════╝');

  let ok=0;
  for(const p of PASARAN){
    const result = await fetchOne(p);
    fs.writeFileSync(path.join(DATA_DIR,`${p.key}.json`), JSON.stringify(result,null,2));
    console.log(`   💾 ${p.key}.json [${result.status}] ${result.total} rows`);
    if(result.status==='ok') ok++;
    await sleep(1200);
  }

  const all = PASARAN.map(p=>{
    try{ return JSON.parse(fs.readFileSync(path.join(DATA_DIR,`${p.key}.json`),'utf8')); }catch(_){ return {key:p.key,nama:p.nama,status:'error',total:0,data:[]}; }
  });

  fs.writeFileSync(path.join(DATA_DIR,'index.json'), JSON.stringify({
    updatedAt: new Date().toISOString(),
    ok, total: PASARAN.length,
    pasaran: all.map(d=>({ key:d.key, nama:d.nama, status:d.status, total:d.data?.length||0, lastResult:d.data?.[0]?.result4||'-', updatedAt:d.updatedAt }))
  },null,2));

  console.log(`\n✅ SELESAI — ${ok}/${PASARAN.length} berhasil`);
  if(ok===0) console.log('❗ Semua gagal — sumber mungkin blokir scraping. Cek log Actions.');
})();
