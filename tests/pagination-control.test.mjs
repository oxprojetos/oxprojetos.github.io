import test from 'node:test';
import assert from 'node:assert/strict';
import {nextBatchGoal,readSourcePage,nextSourceCursor,MAX_SOURCE_PAGES} from '../pagination-control.mjs';

const company=cnpj=>({cnpj});
test('P02: lote normal 20, 50 e máximo de 200',()=>{
 assert.equal(nextBatchGoal(20,20,20),40);
 assert.equal(nextBatchGoal(20,20,50),70);
 assert.equal(nextBatchGoal(100,100,200),300);
 assert.throws(()=>nextBatchGoal(1,0,201));
});
test('P02: retry preserva a meta do lote parcialmente recebido',()=>{
 assert.equal(nextBatchGoal(27,40,20,true),40);
 assert.equal(nextBatchGoal(20,40,20,true),40);
 assert.equal(nextBatchGoal(40,40,20,true),60);
});
test('P02: resposta de fonte exige array e CNPJ textual de 14 dígitos',()=>{
 assert.equal(readSourcePage({data:[company('01000000000001')]},{remaining:2}).length,1);
 assert.throws(()=>readSourcePage({data:{cnpj:'01000000000001'}},{remaining:2}),/formato/);
 assert.throws(()=>readSourcePage({data:[company(100)]},{remaining:2}),/CNPJ/);
 assert.throws(()=>readSourcePage({data:[company('123')]},{remaining:2}),/CNPJ/);
 assert.throws(()=>readSourcePage({data:[company('01000000000001'),company('01000000000002')]},{remaining:1}),/limite/);
 assert.equal(readSourcePage({data:company('01000000000001')},{remaining:1,search:false}).length,1);
});
test('P02: cursor válido, ciclo, excesso de tamanho e ausência de novos CNPJs',()=>{
 assert.equal(nextSourceCursor('page-a',{previous:null,used:new Set(),before:0,after:10}),'page-a');
 assert.equal(nextSourceCursor('page-b',{previous:'page-a',used:new Set(['page-a']),before:10,after:20}),'page-b');
 assert.equal(nextSourceCursor(null,{previous:'page-a',used:new Set(),before:10,after:10}),null);
 assert.throws(()=>nextSourceCursor('page-a',{previous:'page-a',used:new Set(),before:10,after:20}),/repetida/);
 assert.throws(()=>nextSourceCursor('page-a',{previous:'page-b',used:new Set(['page-a']),before:10,after:20}),/repetida/);
 assert.throws(()=>nextSourceCursor('page-c',{previous:'page-b',used:new Set(),before:10,after:10}),/sem novos/);
 assert.throws(()=>nextSourceCursor('x'.repeat(513),{previous:null,used:new Set(),before:0,after:5}),/excessivamente/);
 assert.equal(MAX_SOURCE_PAGES,10);
});
