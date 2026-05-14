const axios=require('axios'),cheerio=require('cheerio'),fs=require('fs'),path=require('path');
const DATA_DIR=path.join(__dirname,'data');
if(!fs.existsSync(DATA_DIR))fs.mkdirSync(DATA_DIR,{recursive:true});
const HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function hariIndo(d){const dt=new Date(d);return isNaN(dt.getTime())?'-':HARI[dt.getDay()];}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
const H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36','Accept':'text/html','Accept-Language':'id-ID,id;q=0.9','Cache-Control':'no-cache'};
const PASARAN=[
  {key:'sgp',nama:'SGP | Singapore',url:'http://157.245.204.87/'},
  {key:'hkg',nama:'Hongkong Pools',url:'http://152.42.209.210/'},
  {key:'syd',nama:'Sydneypools',url:'http://159.223.90.241/'},
  {key:'sdlt',nama:'Sydney Lotto',url:'http://128.199.64.12/'},
  {key:'hklt',nama:'Hongkong Lotto',url:'http://178.128.30.60/'},
  {key:'chn',nama:'Chinapools',url:'http://178.128.17.42/'},
  {key:'jpn',nama:'Japan',url:'http://157.245.204.87/'},
  {key:'cmb2',nama:'Magnum Cambodia',url:'http://159.223.90.241/'},
  {key:'ncd',nama:'North Carolina Day',url:'http://157.245.204.87/'},
  {key:'twn',nama:'Taiwan',url:'http://159.223.90.241/'},
];
function cvDate(s){if(!s)return'';const m=s.match(/^(\d{2})-(\d{2})-(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:s;}
async function fetchOne(p){
  console.log(`\n→ ${p.nama}`);
  try{
    const res=await axios.get(p.url,{headers:H,timeout:20000});
    const $=cheerio.load(res.data);
    const rows=[];
    $('table').each((_,tbl)=>{
      if(rows.length>=60)return;
      $(tbl).find('tr').each((_,tr)=>{
        if(rows.length>=60)return;
        const tds=$(tr).find('td');
        if(tds.length<4)return;
        const no=$(tds[0]).text().trim();
        const hari=$(tds[1]).text().trim();
        const tgl=$(tds[2]).text().trim();
        const r4=$(tds[3]).text().trim().replace(/\D/g,'').substring(0,4);
        if(!/^\d+$/.test(no)||r4.length<4)return;
        const t=cvDate(tgl)||tgl;
        rows.push({tanggal:t,hari,result4:r4,as:r4[0]||'',cop:r4[1]||'',kepala:r4[2]||'',ekor:r4[3]||''});
      });
    });
    if(!rows.length){console.log('  ⚠ no data');return{key:p.key,nama:p.nama,status:'no_data',total:0,data:[],updatedAt:new Date().toISOString()};}
    console.log(`  ✓ ${rows.length} rows`);
    return{key:p.key,nama:p.nama,status:'ok',total:rows.length,data:rows.slice(0,60),updatedAt:new Date().toISOString()};
  }catch(e){
    console.log(`  ✗ ${e.message}`);
    const fp=path.join(DATA_DIR,`${p.key}.json`);
    if(fs.existsSync(fp)){const old=JSON.parse(fs.readFileSync(fp,'utf8'));if((old.data||[]).length>0)return{...old,status:'cached',updatedAt:new Date().toISOString()};}
    return{key:p.key,nama:p.nama,status:'error',total:0,data:[],updatedAt:new Date().toISOString()};
  }
}
(async()=>{
  let ok=0;
  for(const p of PASARAN){
    const r=await fetchOne(p);
    fs.writeFileSync(path.join(DATA_DIR,`${p.key}.json`),JSON.stringify(r,null,2));
    if(r.status==='ok')ok++;
    await sleep(800);
  }
  const all=PASARAN.map(p=>{try{return JSON.parse(fs.readFileSync(path.join(DATA_DIR,`${p.key}.json`),'utf8'));}catch(_){return{key:p.key,nama:p.nama,status:'error',total:0,data:[]}}});
  fs.writeFileSync(path.join(DATA_DIR,'index.json'),JSON.stringify({updatedAt:new Date().toISOString(),ok,total:PASARAN.length,pasaran:all.map(d=>({key:d.key,nama:d.nama,status:d.status,total:d.data?.length||0,lastResult:d.data?.[0]?.result4||'-',updatedAt:d.updatedAt}))},null,2));
  console.log(`\n✅ ${ok}/${PASARAN.length} berhasil`);
})();
