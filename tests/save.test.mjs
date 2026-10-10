import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, decodeRecord } from '../src/save.js';

const SECTOR=4096,MAGIC=0x08012025;
const sizes=[3884,3968,3968,3968,3848,3968,3968,3968,3968,3968,3968,3968,3968,2000];
function checksum(bytes,length) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
  let sum=0;for(let i=0;i<length;i+=4)sum=(sum+view.getUint32(i,true))>>>0;
  return ((sum>>>16)+(sum&65535))&65535;
}
function record(species=1) {
  const bytes=new Uint8Array(100),view=new DataView(bytes.buffer);
  const personality=0,otId=0xABCDEF90;
  view.setUint32(0,personality,true);view.setUint32(4,otId,true);
  bytes[8]=0xBB;bytes[9]=0xFF;
  const plain=new Uint8Array(48),p=new DataView(plain.buffer);
  p.setUint16(0,species,true);p.setUint32(4,1000,true);
  let sum=0;for(let j=0;j<48;j+=2)sum=(sum+p.getUint16(j,true))&65535;
  view.setUint16(28,sum,true);
  for(let j=0;j<48;j+=4)view.setUint32(32+j,p.getUint32(j,true)^otId,true);
  bytes[84]=12; // level
  return bytes;
}
function makeSave(extended=false) {
  const bytes=new Uint8Array(131072);
  for(let s=0;s<14;s++){
    const off=s*SECTOR,part=bytes.subarray(off,off+SECTOR),view=new DataView(part.buffer,part.byteOffset,part.length);
    if(s===0){part[0]=0xBB;part[1]=0xFF;}
    if(s===1){view.setUint32(0x234,1,true);part.set(record(1),0x238);}
    if(s===5){part.set(record(25).subarray(0,80),4);}
    view.setUint16(0xFF4,s,true);
    view.setUint32(0xFF8,MAGIC,true);
    view.setUint32(0xFFC,3,true);
    view.setUint16(0xFF6,checksum(part,extended&&s===13?3968:sizes[s]),true);
  }
  if(extended){
    for(let i=0;i<4;i++){
      const off=(28+i)*SECTOR,part=bytes.subarray(off,off+SECTOR),view=new DataView(part.buffer,part.byteOffset,part.length);
      view.setUint16(0xFF4,0x100+i,true);
      view.setUint32(0xFF8,MAGIC,true);
      view.setUint16(0xFF6,checksum(part,i===3?988:3968),true);
    }
  }
  return bytes;
}
test('reads checksummed party + PC box without touching original save',()=>{
  const bytes=makeSave(false),before=bytes.slice();
  const parsed=parseSave(bytes.buffer);
  assert.equal(parsed.trainer,'A');
  assert.equal(parsed.boxCount,14);
  assert.equal(parsed.party[0].species,1);
  assert.equal(parsed.party[0].level,12);
  assert.equal(parsed.boxes[0][0].species,25);
  assert.equal(parsed.party[0].record.length,108);
  assert.deepEqual(bytes,before);
});
test('recognizes Brisk 20-box storage extension',()=>{
  const parsed=parseSave(makeSave(true).buffer);
  assert.equal(parsed.boxCount,20);
  assert.equal(parsed.boxes.length,20);
  assert.equal(parsed.boxes[0][0].species,25);
});
test('rejects incorrect sector checksum',()=>{
  const save=makeSave();save[0x234+SECTOR]^=0x1;
  assert.throws(()=>parseSave(save.buffer),/checksummed/);
});
test('rejects unsupported file sizes',()=>{
  assert.throws(()=>parseSave(new ArrayBuffer(32768)),/128 KiB/);
});
test('rejects invalid encrypted Pokémon checksum without crashing',()=>{
  const rec=record(1);rec[35]^=0xFF;
  assert.equal(decodeRecord(rec,true).corrupt,true);
});
