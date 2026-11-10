// WPP-01R1 | Offline regression for telephone multiline input. No external calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileCandidatesDetailed,mobileCandidates} from '../contacts.mjs';

const a='91 99999-8888';
const b='+55 (91) 98888-7777';
const expected=['5591999998888','5591988887777'];

for (const [name,input] of [
  ['LF',a+'\n'+b],
  ['CRLF',a+'\r\n'+b],
  ['CR',a+'\r'+b],
  ['semicolon',a+'; '+b],
  ['slash',a+' / '+b]
]){
  test('WPP-01R1: two mobile candidates separated by '+name,()=>{
    assert.deepEqual(mobileCandidates(input),expected);
    assert.deepEqual(mobileCandidatesDetailed(input).map(x=>x.number),expected);
  });
}
test('WPP-01R1: duplicate mobile only one action candidate',()=>{
  assert.deepEqual(mobileCandidates(a+'\n'+a),[expected[0]]);
});
test('WPP-01R1: landline and malformed text remain without WA',()=>{
  assert.deepEqual(mobileCandidates('91 3333-4444\nnot a phone'),[]);
});
