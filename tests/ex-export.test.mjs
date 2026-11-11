import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {exportBytes,exportMatrix,parseCapitalSocial,EXPORT_COLUMNS} from '../exporters.mjs';
import {selectedExportRows} from '../export-scope.mjs';
import {isUsablePhone,hasUsablePhone,mobileCandidatesDetailed} from '../contacts.mjs';
const QA=new URL('./',import.meta.url).pathname;
const original = Array.from({length:20},(_,i)=>({
  cnpj:(i%2?'0':'1')+String(1000000000000+i).padStart(13,'0'),
  razao_social:'EMPRESA SINTÉTICA '+(i+1),
  nome_fantasia:'TESTE',
  municipio:i%3===0?'BELÉM':'CASTANHAL',uf:'PA',
  telefone:i===0?'9391526080 / 000000000000':i===1?'000000000000':i===2?'91 98888-7777\n91 99999-8888':'',
  email:'',situacao:i<7?'ATIVA':i<17?'BAIXADA':'INAPTA',
  cnae_principal:'4731800',porte:'MICRO EMPRESA',capital_social:i===0?'6.000.000,30':i===1?'R$ 1.250,90':i===2?'not-amount':String((i+1)*10000),
  website:'',instagram:'',facebook:'',linkedin:'',youtube:'',tiktok:'',x:'',
  fonte_site:'',consultado_site_em:'',fonte:'fixture',consultado_em:'2026-11-10T23:41:26.963Z'
}));
const filtered=original.filter(x=>x.situacao==='ATIVA');
test('EX01: explicit scope and counts, not visual page',()=>{
 assert.equal(original.length,20);
 assert.equal(selectedExportRows(original,filtered,'filtered').length,7);
 assert.equal(selectedExportRows(original,filtered,'all').length,20);
 assert.throws(()=>selectedExportRows(original,filtered,'other'));
 assert.equal(selectedExportRows(original,filtered,'filtered')[0].cnpj,original[0].cnpj);
});
test('EX02: fixed columns and zero-prefixed CNPJ remain text',()=>{
 const m=exportMatrix(original);
 assert.equal(m.length,21);assert.equal(m[0].length,22);
 assert.equal(m[0][0],'CNPJ');
 assert.equal(m[1][0].length,14);
 assert.equal(typeof m[1][0],'string');
});
test('EX03: invalid fragments have no action, original stays untouched',()=>{
 assert.equal(hasUsablePhone('000000000000'),false);
 assert.equal(isUsablePhone('9391526080'),true);
 assert.equal(hasUsablePhone('9391526080 / 000000000000'),true);
 assert.deepEqual(mobileCandidatesDetailed('9391526080 / 000000000000').map(x=>x.number),['5593991526080']);
 assert.equal(original[0].telefone,'9391526080 / 000000000000');
});
test('EX04: valid amount numbers and ambiguous values retain text',()=>{
 assert.equal(parseCapitalSocial('500000'),500000);
 assert.equal(parseCapitalSocial('R$ 6.000.000,30'),6000000.3);
 assert.equal(parseCapitalSocial('1,234.50'),1234.5);
 assert.equal(parseCapitalSocial('1250,90'),1250.9);
 assert.equal(parseCapitalSocial('-2'),null);
 assert.equal(parseCapitalSocial('1e8'),null);
 assert.equal(parseCapitalSocial('9.999.999.999.999,99'),null);
 assert.equal(parseCapitalSocial('123,456'),null);
 assert.equal(parseCapitalSocial('not-amount'),null);
});
test('EX04: three formats generated without mutating original rows',()=>{
 const before=JSON.stringify(original);
 for(const [scope,data] of [['all',original],['filtered',filtered]]){
  for(const format of ['csv','xls','xlsx']){
   const bytes=exportBytes(data,format);
   assert.ok(bytes.length>100);
   writeFileSync(QA+'sample-'+scope+'.'+format,bytes);
  }
 }
 assert.equal(before,JSON.stringify(original));
 assert.equal(EXPORT_COLUMNS.length,22);
});
