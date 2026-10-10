// Brisk/Gen III save adapter. READ-ONLY until write/export validation exists.
// Parsing rules initially mirror Brisk Dex's 14/20-box Gen III layout.
const SECTOR = 4096, DATA = 3968, MAGIC = 0x08012025;
const SIZES = [3884,3968,3968,3968,3848,3968,3968,3968,3968,3968,3968,3968,3968,2000];
const ORDER = [
  'GAEM','GAME','GEAM','GEMA','GMAE','GMEA',
  'AGEM','AGME','AEGM','AEMG','AMGE','AMEG',
  'EGAM','EGMA','EAGM','EAMG','EMGA','EMAG',
  'MGAE','MGEA','MAGE','MAEG','MEGA','MEAG'
];
const NATURES = ['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'];

const CHARS = {0:' ',0x50:' ',0xAB:'!',0xAC:'?',0xAD:'.',0xAE:'-',0xB5:'♂',0xB6:'♀',0xB8:',',0xB4:'’'};
for (let i=0;i<26;i++){ CHARS[0xBB+i]=String.fromCharCode(65+i); CHARS[0xD5+i]=String.fromCharCode(97+i); }
for (let i=0;i<10;i++) CHARS[0xA1+i]=String(i);
const accents = {0x01:'À',0x02:'Á',0x04:'Ç',0x05:'È',0x06:'É',0x0E:'Ó',0x14:'Ñ',0x1B:'é',0x27:'ú',0x29:'ñ',0xF0:':',0xF1:'Ä',0xF2:'Ö',0xF3:'Ü'};
Object.assign(CHARS,accents);
function nameText(bytes){ return Array.from(bytes).filter((v,i)=>bytes.indexOf(0xFF)===-1 || i<bytes.indexOf(0xFF)).map(v=>CHARS[v]??'').join('').trim(); }
function dv(arr){ return new DataView(arr.buffer,arr.byteOffset,arr.byteLength); }
function calcChecksum(bytes,length){
  const view=dv(bytes);let s=0;for(let i=0;i<length;i+=4)s=(s+view.getUint32(i,true))>>>0;
  return ((s>>>16)+(s&65535))&65535;
}
function scanBlock(bytes,start,extended=false){
  const sections=Array(14).fill(null);let index=null;
  for(let n=0;n<14;n++){
    const off=start+n*SECTOR;
    const view=dv(bytes.subarray(off,off+SECTOR));
    const id=view.getUint16(0xFF4,true);
    const magic=view.getUint32(0xFF8,true);
    const seq=view.getUint32(0xFFC,true);
    if(magic!==MAGIC || id>13 || sections[id]) return null;
    if(index!==null && seq!==index) return null;
    index=seq;
    const section=bytes.subarray(off,off+DATA);
    if(calcChecksum(section,id===13 && extended?3968:SIZES[id])!==view.getUint16(0xFF6,true)) return null;
    sections[id]=section;
  }
  if(sections.some(s=>s===null))return null;
  return {sections,index};
}
function readExtension(bytes){
  const result=[];
  if(bytes.byteLength!==131072)return null;
  for(let n=0;n<4;n++){
    const off=(28+n)*SECTOR, entire=bytes.subarray(off,off+SECTOR);
    const view=dv(entire), id=view.getUint16(0xFF4,true), sig=view.getUint32(0xFF8,true);
    if(n===0 && (sig!==MAGIC || id!==0x100))return null;
    const size=n===3?988:3968;
    if(sig!==MAGIC || id!==0x100+n || calcChecksum(entire,size)!==view.getUint16(0xFF6,true))
      throw Error('A Brisk PC extension sector has an invalid header or checksum. No Pokémon were imported.');
    result.push(entire.subarray(0,size));
  }
  return result;
}
function bytesToBase64(bytes) {
  let out=''; for(let i=0;i<bytes.length;i+=0x4000)out+=String.fromCharCode(...bytes.subarray(i,i+0x4000));
  return btoa(out);
}
export function decodeRecord(record,party=false){
  if(record.length<(party?100:80))return null;
  const view=dv(record),pid=view.getUint32(0,true),tid=view.getUint32(4,true);
  if(pid===0 && tid===0)return null;
  const decrypted=record.slice(32,80), p=dv(decrypted), key=(pid^tid)>>>0;
  for(let i=0;i<48;i+=4)p.setUint32(i,(p.getUint32(i,true)^key)>>>0,true);
  let checksum=0;for(let i=0;i<48;i+=2)checksum=(checksum+p.getUint16(i,true))&65535;
  if(checksum!==view.getUint16(28,true))return {corrupt:true};
  const order=ORDER[pid%24],offs={}; for(let i=0;i<4;i++)offs[order[i]]=i*12;
  const species=p.getUint16(offs.G,true)&0x7FF,exp=p.getUint32(offs.G+4,true)&0x1FFFFF;
  if(!species)return null;
  const shinyXor=(pid&65535)^(pid>>>16)^(tid&65535)^(tid>>>16);
  const shinyMod=!!(view.getUint16(30,true)&0x4000);
  const shiny=(shinyXor<8)!==shinyMod;
  const level=party?view.getUint8(0x54):Math.min(100,Math.max(1,Math.floor(Math.cbrt(exp))));
  return {
    species,personality:pid,otId:tid,shiny,nickname:nameText(record.subarray(8,18)),
    originalTrainer:nameText(record.subarray(20,27)),nature:NATURES[pid%25],
    level,estimatedLevel:!party,where:party?'Party':'PC',record:bytesToBase64(record.subarray(0,80))
  };
}
export function parseSave(buffer){
  const bytes=new Uint8Array(buffer);
  if(bytes.byteLength!==131072)throw Error('Expected a 128 KiB Gen III .sav or .srm file. This format is not supported yet.');
  const extension=readExtension(bytes);
  const a=scanBlock(bytes,0,!!extension),b=scanBlock(bytes,0xE000,!!extension);
  if(!a&&!b)throw Error('No complete, checksummed Gen III save bank found. The file may be incompatible or damaged.');
  const block=a&&b?(((a.index-b.index)>>>0)<0x80000000?a:b):(a||b);
  const s=block.sections, trainer=nameText(s[0].subarray(0,7))||'TRAINER';
  const partyCount=Math.min(6,dv(s[1]).getUint32(0x234,true));
  const party=[],problems={badRecords:0};
  for(let i=0;i<partyCount;i++){
    const pokemon=decodeRecord(s[1].subarray(0x238+i*100,0x238+(i+1)*100),true);
    if(pokemon?.corrupt)problems.badRecords++;
    else if(pokemon)party.push({...pokemon,slot:i+1});
  }
  const count=extension?20:14;
  const pieces=[];
  for(let n=5;n<=13;n++)pieces.push(extension?s[n]:n===13?s[n].subarray(0,2000):s[n]);
  if(extension)pieces.push(...extension);
  const total=pieces.reduce((sum,p)=>sum+p.length,0),storage=new Uint8Array(total);
  let at=0;for(const p of pieces){storage.set(p,at);at+=p.length;}
  const boxes=[];for(let b=0;b<count;b++){
    const slots=[];
    for(let i=0;i<30;i++){
      const off=4+(b*30+i)*80;
      const pokemon=decodeRecord(storage.subarray(off,off+80));
      if(pokemon?.corrupt)problems.badRecords++;
      slots.push(pokemon&&!pokemon.corrupt?{...pokemon,box:b+1,slot:i+1}:null);
    }
    boxes.push(slots);
  }
  return {trainer,party,boxes,boxCount:count,problems,format:extension?'Brisk-compatible Gen III (20 boxes)':'Gen III (14 boxes)',size:bytes.length};
}
