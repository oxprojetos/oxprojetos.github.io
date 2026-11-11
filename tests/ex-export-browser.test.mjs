import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import puppeteer from '/home/oxrunner/ox-pesquisa-ci-p0/runtime/browser/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const ROOT=new URL('..', import.meta.url).pathname.replace(/\/$/,'');
const SITE=ROOT,QA=join(ROOT,'qa'),ORIGIN='https://oxprojetos.github.io';
const data=Array.from({length:20},(_,i)=>({
 cnpj: String(1000000000000+i).padStart(14,'0'),razao_social:'EMPRESA FICTÍCIA '+i,
 nome_fantasia:'POSTO DE TESTE',municipio:i%3===0?'BELÉM':'CASTANHAL',uf:'PA',
 telefone:i===0?'9391526080 / 000000000000':i===1?'000000000000':i===2?'91 98888-7777\n91 99999-8888':'',
 situacao:i<7?'ATIVA':i<17?'BAIXADA':'INAPTA',email:'',cnae_principal:'4731800',
 capital_social:i===0?'6.000.000,30':String((i+1)*10000),fonte:'fixture_export',
 consultado_em:'2026-11-10T23:41:26.963Z'
}));
const browser=await puppeteer.launch({executablePath:'/home/oxrunner/ox-pesquisa-ci-p0/runtime/browser/chrome/chrome-headless-shell',headless:true,pipe:true,args:['--no-sandbox','--no-first-run','--disable-dev-shm-usage'],timeout:24000});
let assertions=0;
function check(ok,msg){assert.ok(ok,msg);assertions++;}
async function visit(label,w,h,touch){
 const page=await browser.newPage(), errors=[],externals=[];
 const dir=join(QA,'downloads-export-'+label);mkdirSync(dir,{recursive:true});
 await page._client().send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
 await page.setViewport({width:w,height:h,isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
 await page.evaluateOnNewDocument(rows=>{
  window.fetch=async(url,options={})=>{
   const value=String(url);
   if(value.includes('/auth/v1/token?grant_type=password')){
    const b=JSON.parse(String(options.body||'{}'));
    if(b.email==='qa@example.test' && b.password==='synthetic-only')
       return Response.json({access_token:'synthetic.header.signature',expires_in:3600});
    return Response.json({error:'invalid_credentials'},{status:400});
   }
   if(value.includes('/functions/v1/ox-research')){
    const q=new URL(value).searchParams.get('path')||'';
    if(q.startsWith('/api/sources'))return Response.json({minhareceita:'fixture',supabase:'auth_only_no_storage'});
    if(q.startsWith('/api/search?')){
     const cnae=new URL(q,'https://invalid.test').searchParams.get('cnae');
     if(cnae==='4930202')return Response.json({error:'UPSTREAM_ERROR',message:'Falha sintética de fornecedor'},{status:503});
     return Response.json({source:'fixture',data:rows,count:rows.length,cursor:null});
    }
   }
   throw Error('NO_EXTERNAL_ALLOWED');
  };
  document.addEventListener('click',ev=>{if(ev.target.closest?.('a.whatsapp-icon'))ev.preventDefault()},true);
 },data);
 await page.setRequestInterception(true);
 page.on('request',req=>{
  const url=new URL(req.url());
  if(url.origin!==ORIGIN){externals.push(url.origin);req.abort();return;}
  const f=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  if(f.includes('/')||f.includes('..')||!existsSync(join(SITE,f))){req.respond({status:404,body:'Not Found'});return;}
  const content=readFileSync(join(SITE,f));
  const type=f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':f.endsWith('.mjs')||f.endsWith('.js')?'application/javascript':'text/plain';
  req.respond({status:200,contentType:type,body:content});
 });
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const r=await page.goto(ORIGIN+'/',{waitUntil:'networkidle2',timeout:24000});
  check(r.status()===200,'public assets loaded');
  await page.type('#auth-login input[name=email]','qa@example.test');
  await page.type('#auth-login input[name=password]','synthetic-only');
  await page.click('#auth-login button[type=submit]');
  await page.waitForFunction(()=>document.body.classList.contains('pro-authenticated'),{timeout:5000});
  await page.select('#form-search select[name=limit]','20');
  await page.click('#form-search button[type=submit]');
  await page.waitForFunction(()=>document.getElementById('feedback')?.textContent.includes('Pesquisa concluída'),{timeout:5000});
  check(await page.$eval('#count-total',e=>e.textContent)==='20','loaded twenty');
  check(await page.$eval('#count-active',e=>e.textContent)==='7','active seven');
  check(await page.$eval('#export-scope',e=>e.value)==='filtered','filtered safe default');
  check(await page.$eval('#export-count',e=>e.textContent.includes('7 registro(s)')),'filtered seven even if table has pagination');
  check(await page.$eval('#count-phone',e=>e.textContent)==='2','invalid phone excluded from counter');
  check(await page.$eval('#records .phone-invalid',e=>e.textContent.includes('000000000000')),'invalid raw fragment retained');
  check(await page.$eval('#export',e=>!e.disabled),'filtered available');
  await page.click('#export');
  await page.waitForFunction(()=>document.getElementById('feedback')?.textContent.includes('Exportação XLSX gerada'),{timeout:3000});
  check(await page.$eval('#feedback',e=>e.textContent.includes('7 registros filtrados')),'XLSX selected filtered');
  await page.select('#export-scope','all');
  check(await page.$eval('#export-count',e=>e.textContent.includes('20 registro(s)')),'explicit all');
  await page.select('#export-format','csv');
  await page.click('#export');
  check(await page.$eval('#feedback',e=>e.textContent.includes('20 registros carregados')),'CSV all even if only active visible');
  check((await page.evaluate(()=>document.querySelectorAll('#records tr').length))===7,'screen still filtered');
  await page.select('#export-scope','filtered');
  await page.type('#filter','NÃO-EXISTE');
  check(await page.$eval('#export',e=>e.disabled),'filtered zero rows disabled');
  await page.select('#export-scope','all');
  check(await page.$eval('#export',e=>!e.disabled),'all available when view empty');
  await page.$eval('#filter',el=>{el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));});
  if(label==='desktop'){
   await page.type('#cnae-input','4930202');
   await page.click('#cnae-add');
   await page.click('#form-search button[type=submit]');
   await page.waitForFunction(()=>document.getElementById('feedback')?.textContent.includes('Pesquisa interrompida'),{timeout:5000});
   check(await page.$eval('#export',e=>e.disabled),'partial provider failure blocks ALL scope');
   check(await page.$eval('#export-count',e=>e.textContent.includes('bloqueada')),'partial warning visible');
  }
  check(errors.length===0,'zero JavaScript errors');
  check(externals.length===0,'zero external requests');
  check(await page.$eval('html',e=>e.scrollWidth<=innerWidth+3),'no horizontal overflow');
  await page.screenshot({path:join(QA,'ex-export-'+label+'.png'),fullPage:false});
  const downloads=readdirSync(dir).filter(f=>f.startsWith('OX_pesquisa'));
  check(downloads.some(f=>f.includes('_7_empresas_filtradas.xlsx')),'xlsx download found');
  check(downloads.some(f=>f.includes('_20_empresas_todas.csv')),'csv download found');
  return {label,downloadFiles:downloads,errors:errors.length,external:externals.length};
 }finally{await page.close();}
}
try{
 console.log(JSON.stringify(await visit('desktop',1440,900,false)));
 console.log(JSON.stringify(await visit('mobile',390,844,true)));
 console.log('EX_EXPORT_BROWSER=GREEN');
 console.log('ASSERTIONS='+assertions);
 console.log('AUTH_AND_CNPJ_QUERIES=MOCK_ONLY');
}finally{await browser.close();}
