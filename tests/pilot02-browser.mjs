// Execução isolada: node tests/pilot02-browser.mjs
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import puppeteer from '/home/oxrunner/ox-pesquisa-ci-p0/runtime/browser/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const ROOT=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const ORIGIN='https://oxprojetos.github.io';
const data=Array.from({length:40},(_,i)=>({
 cnpj:String(1000000000000+i).padStart(14,'0'),razao_social:'EMPRESA SINTÉTICA '+i,
 nome_fantasia:'POSTO TESTE',municipio:i%3===0?'BELÉM':'CASTANHAL',uf:'PA',
 telefone:i===0?'91 98888-7777':i===1?'000000000000':'',
 situacao:(i<7||(i>=20&&i<37))?'ATIVA':'BAIXADA',
 cnae_principal:'4731800',capital_social:String(10000+i*100),email:'',fonte:'synthetic',
 consultado_em:'2026-11-11T12:00:00Z'
}));
const browser=await puppeteer.launch({executablePath:'/home/oxrunner/ox-pesquisa-ci-p0/runtime/browser/chrome/chrome-headless-shell',headless:true,pipe:true,args:['--no-sandbox','--no-first-run','--disable-dev-shm-usage'],timeout:24000});
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
async function visit(view,w,h,mobile){
 const p=await browser.newPage(),errors=[],unexpected=[];
 const dl=join(ROOT,'qa','pilot02-downloads-'+view);mkdirSync(dl,{recursive:true});
 await p._client().send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dl});
 await p.setViewport({width:w,height:h,isMobile:mobile,hasTouch:mobile});
 await p.evaluateOnNewDocument(records=>{
  window.__hmlCalls=[];
  window.__failC30=true;
  window.fetch=async(url,opts={})=>{
   const raw=String(url);
   if(raw.includes('/auth/v1/token?grant_type=password')){
    const b=JSON.parse(String(opts.body||'{}'));
    return b.email==='qa@example.test'&&b.password==='synthetic-only'
      ? Response.json({access_token:'offline.fixture.jwt',expires_in:3600})
      : Response.json({error:'invalid_credentials'},{status:400});
   }
   if(raw.includes('/functions/v1/ox-research')){
    const path=new URL(raw).searchParams.get('path')||'';
    if(path.startsWith('/api/sources'))return Response.json({minhareceita:'fixture',supabase:'auth_only_no_storage'});
    if(path.startsWith('/api/search?')){
      const q=new URL(path,'https://fixture.invalid');
      const cursor=q.searchParams.get('cursor');
      const limit=Number(q.searchParams.get('limit'));
      window.__hmlCalls.push({cursor:cursor||'initial',limit});
      if(!cursor)return Response.json({source:'fixture',data:records.slice(0,20),cursor:'c20'});
      if(cursor==='c20')return Response.json({source:'fixture',data:records.slice(20,30),cursor:'c30'});
      if(cursor==='c30'){
        if(window.__failC30){window.__failC30=false;return Response.json({error:'UPSTREAM_ERROR',message:'Erro 429 sintético'},{status:429});}
        return Response.json({source:'fixture',data:records.slice(30,40),cursor:null});
      }
      throw Error('UNEXPECTED_CURSOR '+cursor);
    }
   }
   throw Error('NO_EXTERNAL_NETWORK');
  };
 },data);
 await p.setRequestInterception(true);
 p.on('request',req=>{
  const u=new URL(req.url());
  if(u.origin!==ORIGIN){unexpected.push(u.origin);req.abort();return;}
  const name=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));
  if(name.includes('/')||name.includes('..')||!existsSync(join(ROOT,name))){req.respond({status:404,body:'Not Found'});return;}
  const type=name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':name.endsWith('.js')||name.endsWith('.mjs')?'application/javascript':'text/plain';
  req.respond({status:200,contentType:type,body:readFileSync(join(ROOT,name))});
 });
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(ORIGIN+'/',{waitUntil:'networkidle2',timeout:20000});
  await p.type('#auth-login input[name=email]','qa@example.test');
  await p.type('#auth-login input[name=password]','synthetic-only');
  await p.click('#auth-login button[type=submit]');
  await p.waitForFunction(()=>document.body.classList.contains('pro-authenticated'),{timeout:6000});
  await p.select('#form-search select[name=limit]','20');
  await p.click('#form-search button[type=submit]');
  await p.waitForFunction(()=>document.getElementById('feedback')?.textContent.includes('Pesquisa concluída'),{timeout:6000});
  check(await p.$eval('#count-total',e=>e.textContent)==='20',view+' first batch 20');
  check(await p.$eval('#count-active',e=>e.textContent)==='7',view+' first active 7');
  check(await p.$eval('#more',e=>!e.hidden),view+' second batch available');
  await p.click('#more');
  await p.waitForFunction(()=>document.getElementById('feedback')?.textContent.includes('Falha:'),{timeout:6000});
  check(await p.$eval('#count-total',e=>e.textContent)==='30',view+' 10 extra retained');
  check(await p.$eval('#export',e=>e.disabled),view+' partial export blocked');
  check(await p.$eval('#more',e=>e.textContent.includes('Tentar novamente')),view+' retry visible');
  await p.click('#more');
  await p.waitForFunction(()=>document.getElementById('feedback')?.textContent.includes('Pesquisa concluída'),{timeout:6000});
  check(await p.$eval('#count-total',e=>e.textContent)==='40',view+' retry resumed to original target 40, not 50');
  check(await p.$eval('#export',e=>!e.disabled),view+' export unblocked after success');
  check(await p.$eval('#count-active',e=>e.textContent)==='24',view+' active 24');
  const queries=await p.evaluate(()=>window.__hmlCalls);
  check(queries.length===4&&queries[0].limit===20&&queries[1].limit===20&&queries[2].limit===10&&queries[3].limit===10,view+' limits controlled across partial retry');
  check(await p.$eval('#more',e=>e.hidden),view+' no more when cursor null');
  const cityOptions=await p.$$eval('#city-suggestions option',es=>es.map(x=>x.value));
  check(cityOptions.includes('BELÉM')&&cityOptions.includes('CASTANHAL'),view+' city suggestions');
  check(await p.$eval('#per-page',e=>Boolean(e.querySelector('option[value="200"]'))),view+' visual 200');
  await p.select('#per-page','200');
  check(await p.$eval('#table-page',e=>e.textContent.includes('1 de 1')),view+' visual list 200');
  await p.select('#export-scope','all');
  check(await p.$eval('#export-count',e=>e.textContent.includes('40 registro(s)')),view+' 40 all');
  await p.click('#export');
  check(await p.$eval('#feedback',e=>e.textContent.includes('40 registros carregados')),view+' download XLSX all 40');
  await p.select('#export-scope','filtered');
  check(await p.$eval('#export-count',e=>e.textContent.includes('24 registro(s)')),view+' 24 filtered active');
  await p.type('#city-filter','Belem');
  check(await p.$eval('#export-count',e=>e.textContent.includes('9 registro(s)')),view+' city Belem 9 active');
  await p.select('#export-format','csv');
  await p.click('#export');
  check(await p.$eval('#feedback',e=>e.textContent.includes('9 registros filtrados')),view+' CSV filtered city 9');
  check(errors.length===0,view+' no js errors');
  check(unexpected.length===0,view+' no extra network');
  check(await p.$eval('html',e=>e.scrollWidth<=innerWidth+4),view+' no overflow');
  const files=readdirSync(dl).filter(x=>x.startsWith('OX_pesquisa'));
  check(files.some(x=>x.includes('40_empresas_todas.xlsx')),view+' xlsx file 40');
  check(files.some(x=>x.includes('9_empresas_filtradas.csv')),view+' csv file 9');
  return {view,queries,downloadFiles:files};
 } finally {await p.close();}
}
try{
 const report=[];
 report.push(await visit('desktop',1440,900,false));
 report.push(await visit('mobile',390,844,true));
 console.log(JSON.stringify({gate:'PILOT02_BROWSER_PASS',checks,report}));
} finally {await browser.close();}
