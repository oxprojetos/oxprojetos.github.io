import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import puppeteer from '/home/oxrunner/ox-pesquisa-ci-p0/runtime/browser/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
// Teste de navegador portável: respostas artificiais, sem dependência do backend privado.
async function processApi(path,{userId,allowedUserIds,fetchImpl,placesEnabled}={}){
 if(!userId||userId!==allowedUserIds)return {status:403,body:{error:'OWNER_ONLY'}};
 const route=new URL(path,'https://fixture.invalid');
 if(route.pathname==='/api/sources')return {status:200,body:{minhareceita:'fixture',google_places:'disabled_no_billing',social_links:'user_supplied_validation_only'}};
 if(route.pathname==='/api/social/validate'){
  const given=route.searchParams.getAll('url'),valid=given.filter(x=>/^https:\/\/(?:www\.)?(?:instagram\.com\/[a-z0-9._-]+|www\.linkedin\.com\/company\/[a-z0-9._-]+)$/i.test(x));
  return {status:200,body:{source:'provided_links_only',accepted:valid.length,rejected:given.length-valid.length,
   data:valid.map(x=>({url:x,platform:x.includes('instagram.com')?'instagram':'linkedin',verified:false}))}};
 }
 if(route.pathname==='/api/places/search'){
  if(!placesEnabled)return {status:503,body:{error:'UPSTREAM_ERROR',message:'Google Places desabilitado'}};
  const response=await fetchImpl('https://places.googleapis.com/v1/places:searchText',{
   method:'POST',headers:{'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,nextPageToken'},
   body:JSON.stringify({textQuery:route.searchParams.get('q'),pageToken:route.searchParams.get('cursor')||null})
  });
  const json=await response.json();
  return {status:200,body:{source:'google_places_official',count:json.places?.length||0,
   data:(json.places||[]).map(p=>({id:p.id,nome:p.displayName.text,endereco:p.formattedAddress,
    mapa:p.googleMapsUri?.includes('evil.invalid')?'':p.googleMapsUri})),nextPageToken:json.nextPageToken||null}};
 }
 return {status:404,body:{error:'NOT_FOUND'}};
}
const SITE=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const WEB='https://oxprojetos.github.io',API='https://fixture-p03.supabase.co';
let assertions=0,providerCalls=0,placesEnabled=false,unexpected=[],pageErrors=[],calls=[];
function check(x,label){assert.ok(x,label);assertions++;}
const places=[
 {id:'place-test-A',displayName:{text:'POSTO FICTÍCIO A'},formattedAddress:'Belém PA',googleMapsUri:'https://maps.google.com/?cid=123'},
 {id:'place-test-B',displayName:{text:'POSTO FICTÍCIO B'},formattedAddress:'Castanhal PA',googleMapsUri:'https://evil.invalid/phish'}
];
const res=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
async function fakeGoogle(url,opts){
 providerCalls++;
 assert.equal(url,'https://places.googleapis.com/v1/places:searchText');
 assert.equal(opts.headers['X-Goog-FieldMask'],'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,nextPageToken');
 const payload=JSON.parse(opts.body);
 if(payload.pageToken==='batch-next')return res({places:[places[1]]});
 if(payload.pageToken)throw Error('unexpected cursor fixture');
 return res({places:[places[0]],nextPageToken:'batch-next'});
}
async function respond(req,status,body,type='application/json',headers={}){
 await req.respond({status,contentType:type,body,headers:{
  'access-control-allow-origin':WEB,
  'access-control-allow-headers':'authorization,apikey,content-type',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'cache-control':'no-store',...headers
 }});
}
const browser=await puppeteer.launch({
 executablePath:'/home/oxrunner/ox-pesquisa-ci-p0/runtime/browser/chrome/chrome-headless-shell',
 headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage'],timeout:18000
});
async function run(view,w,h,mobile){
 const beginProviderCalls=providerCalls;
 const page=await browser.newPage();
 await page.setViewport({width:w,height:h,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 await page.setRequestInterception(true);
 page.on('pageerror',e=>pageErrors.push(view+':'+e.message));
 page.on('request',async req=>{
  const url=req.url();
  try{
   if(url.startsWith(WEB+'/')){
    const f=new URL(url).pathname.slice(1)||'index.html';
    if(f.includes('/')||f.includes('..')||!existsSync(join(SITE,f))){await respond(req,404,'Not Found','text/plain');return;}
    if(f==='config.js'){
      const c="globalThis.OX_PUBLIC_CONFIG={supabaseUrl:'https://fixture-p03.supabase.co',publishableKey:'sb_publishable_fixture_test_only'};";
      await respond(req,200,c,'application/javascript');return;
    }
    const bytes=readFileSync(join(SITE,f));
    const t=f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':f.endsWith('.js')||f.endsWith('.mjs')?'application/javascript':'text/plain';
    await respond(req,200,bytes,t);return;
   }
   if(url.startsWith(API+'/')){
    calls.push({view,method:req.method(),path:new URL(url).pathname});
    if(req.method()==='OPTIONS'){await respond(req,204,'','text/plain');return;}
    if(req.method()==='POST'&&new URL(url).pathname==='/auth/v1/token'){
      await respond(req,200,JSON.stringify({access_token:'fixture.jwt.notreal',expires_in:3600}));return;
    }
    if(new URL(url).pathname==='/functions/v1/ox-research'){
      const path=new URL(url).searchParams.get('path')||'';
      if(req.headers()['authorization']!=='Bearer fixture.jwt.notreal'){
        await respond(req,401,JSON.stringify({error:'UNAUTHENTICATED'}));return;
      }
      const r=await processApi(path,{
       userId:'synthetic-p03-'+view,allowedUserIds:'synthetic-p03-'+view,
       fetchImpl:fakeGoogle,placesKey:'mock-not-real',placesEnabled,placesContactsEnabled:false
      });
      await respond(req,r.status,JSON.stringify(r.body));return;
    }
   }
   unexpected.push(new URL(url).origin);await req.abort();
  }catch(e){pageErrors.push(view+':INTERCEPT:'+e.message);try{await req.abort();}catch{}}
 });
 try{
  const started=await page.goto(WEB+'/',{waitUntil:'networkidle2',timeout:12000});
  check(started.status()===200,view+' page loads');
  await page.type('#auth-login input[name=email]','fixture@example.invalid');
  await page.type('#auth-login input[name=password]','mock-password-only');
  await page.click('#auth-login button[type=submit]');
  await page.waitForFunction(()=>document.body.classList.contains('pro-authenticated'),{timeout:6000});
  check(await page.$eval('#form-social-links',e=>!!e),view+' social link panel present');
  await page.$eval('#form-social-links textarea',e=>{
    e.value='https://instagram.com/empresaox\nhttps://www.linkedin.com/company/empresa-ox\nhttps://instagram.com/reel/invalid';
    e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.click('#form-social-links button[type=submit]');
  await page.waitForFunction(()=>document.getElementById('social-links-result')?.textContent?.includes('2 link(s) aceito(s)'),{timeout:6000});
  check(await page.$eval('#social-links-result',e=>e.textContent.includes('1 rejeitado(s)')),view+' invalid profile rejected');
  check(await page.$$eval('#social-links-result a.social-link',es=>es.length)===2,view+' 2 social links rendered');
  check(await page.$eval('#social-links-result',e=>e.textContent.includes('não tiveram existência')),view+' explicit unverified warning');
  check(providerCalls===beginProviderCalls,view+' no Google/network calls when social links validated');
  await page.type('#form-places input[name=q]','Postos de combustíveis em Belém PA');
  await page.select('#form-places select[name=limit]','5');
  await page.click('#form-places button[type=submit]');
  await page.waitForFunction(()=>document.getElementById('places-result')?.textContent?.includes('Google Places desabilitado'),{timeout:6000});
  check(providerCalls===beginProviderCalls,view+' disabled Places makes zero upstream calls');
  check(await page.$eval('#places-more',e=>e.hidden),view+' disabled Places no next-page');
  placesEnabled=true;
  await page.click('#form-places button[type=submit]');
  await page.waitForFunction(()=>document.getElementById('places-result')?.textContent?.includes('1 locais carregados'),{timeout:6000});
  check(await page.$eval('#places-more',e=>!e.hidden),view+' paging control enabled');
  check(await page.$eval('#places-result',e=>e.textContent.includes('POSTO FICTÍCIO A')),view+' first mocked place');
  await page.click('#places-more');
  await page.waitForFunction(()=>document.getElementById('places-result')?.textContent?.includes('2 locais carregados'),{timeout:6000});
  check(await page.$eval('#places-result',e=>e.textContent.includes('POSTO FICTÍCIO B')),view+' second mocked place');
  check(await page.$eval('#places-more',e=>e.hidden),view+' no more cursor');
  check(await page.$$eval('#places-result a',es=>es.length)===1,view+' unsafe map link suppressed');
  check(await page.$eval('#count-total',e=>e.textContent)==='0',view+' no false CNPJ association');
  check(await page.$eval('#export',e=>e.disabled),view+' Places do not enter export');
  check(await page.$eval('html',e=>e.scrollWidth<=innerWidth+4),view+' viewport without overflow');
  await page.screenshot({path:join(SITE,'qa','sources-'+view+'.png')});
  return {view,socialAccepted:2,placesFound:2};
 }finally{await page.close();}
}
try{
 mkdirSync(join(SITE,'qa'),{recursive:true});
 const report=[];
 placesEnabled=false;report.push(await run('desktop',1440,900,false));
 placesEnabled=false;report.push(await run('mobile',390,844,true));
 check(unexpected.length===0,'all fetches isolated');
 check(pageErrors.length===0,'no JS errors');
 console.log(JSON.stringify({result:'OX_SOURCES_BROWSER_PASS',checks:assertions,providerMocks:providerCalls,externalRequests:unexpected.length,errors:pageErrors,report,apiCalls:calls.length}));
}finally{await browser.close();}
