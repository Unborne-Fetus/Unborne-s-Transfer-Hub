import { parseSave } from './save.js';

const $ = id => document.getElementById(id);
const saves = [];
let selectedSave = 0, selectedBox = 0, showVault = false;
let catalog = {};
let vault = readStoredVault();

function readStoredVault() {
  try { const value = JSON.parse(localStorage.getItem('unborne.transfer-hub.vault.v1') || '[]'); return Array.isArray(value) ? value.filter(validVaultMon) : []; }
  catch { return []; }
}
function validVaultMon(mon) {
  return mon && Number.isInteger(mon.species) && mon.species > 0 && mon.species <= 2047 &&
    typeof mon.record === 'string' && /^[A-Za-z0-9+/]{107}=$/.test(mon.record) &&
    typeof mon.origin === 'string' && mon.origin.length <= 120;
}
function persistVault() {
  try { localStorage.setItem('unborne.transfer-hub.vault.v1', JSON.stringify(vault)); }
  catch { notify('Browser storage is full. Export your vault so it is not lost.'); }
}
function notify(message) {
  const el = $('message'); el.textContent=message;el.classList.add('show');
  clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),3800);
}
function elm(tag, cls, text) {
  const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;
}
function clear(el){el.replaceChildren();}
function speciesName(id) {
  const entry=catalog[String(id)]; return typeof entry==='string' ? entry : entry?.name || 'Species #'+id;
}
function getSprite(mon) {
  const file=String(mon.species)+'_front'+(mon.shiny?'_shiny':'')+'.png';
  const img=elm('img','sprite');
  img.alt=speciesName(mon.species)+(mon.shiny?' shiny':'')+' front sprite';
  img.loading='lazy';img.decoding='async';
  img.onerror=()=>{
    if(img.dataset.remote !== 'yes') {
      img.dataset.remote='yes';
      img.src='https://raw.githubusercontent.com/Unborne-Fetus/Brisk-Dex/main/brisk-dex-sprites/'+file;
    } else img.replaceWith(elm('div','sprite-missing','◇'));
  };
  img.src='./assets/brisk-dex-sprites/'+file;
  return img;
}
function tab(label,selected,onClick) {
  const b=elm('button','tab'+(selected?' active':''),label);
  b.type='button';b.addEventListener('click',onClick);return b;
}
function renderGames() {
  const host=$('games');clear(host);$('gameCount').textContent=saves.length+' saves';
  saves.forEach((s,i)=>{
    const b=elm('button','game'+(!showVault&&i===selectedSave?' active':''));
    const icon=elm('span',null,'▣'), info=elm('span');
    const title=elm('strong',null,s.trainer),small=elm('small',null,s.fileName);
    info.append(title,small);b.append(icon,info);
    b.addEventListener('click',()=>{selectedSave=i;selectedBox=0;showVault=false;render();});
    host.append(b);
  });
}
function render() {
  renderGames();
  $('vaultCount').textContent=vault.length;
  $('vaultTab').classList.toggle('active',showVault);
  const tabs=$('tabs'),stats=$('stats'),body=$('collection');
  clear(tabs);clear(stats);clear(body);
  const count=arr=>arr.filter(Boolean).length;
  if(showVault) {
    $('collectionTitle').textContent='Your Pokémon vault';
    $('saveDetails').textContent='Portable copies of Pokémon records — not an edited game save.';
    tabs.append(tab('All archived Pokémon',true,()=>{}));
    showStat(stats,'Archived',vault.length);
    if(!vault.length) { empty(body,'Nothing in your vault yet','Select Pokémon from a save and add them here. You can export the vault to a JSON archive.'); }
    else {
      const grid=elm('div','grid');
      vault.forEach((mon,index)=>grid.append(makeCard(mon,()=>{
        if(!confirm('Remove this Pokémon copy from your vault?'))return;
        vault.splice(index,1);persistVault();render();notify('Removed from vault.');
      },'Remove copy')));
      body.append(grid);
    }
    return;
  }
  const save=saves[selectedSave];
  if(!save) {
    $('collectionTitle').textContent='Choose a save to begin';
    $('saveDetails').textContent='Pokémon from your party and PC boxes will appear here.';
    empty(body,'Your transfer story starts here','Import a .sav or .srm to inspect your party and boxes.');
    return;
  }
  $('collectionTitle').textContent=save.trainer+"'s collection";
  $('saveDetails').textContent=save.format+'  •  '+save.fileName;
  tabs.append(tab('Party',selectedBox===0,()=>{selectedBox=0;render();}));
  for(let b=0;b<save.boxCount;b++) tabs.append(tab('Box '+(b+1),selectedBox===b+1,()=>{selectedBox=b+1;render();}));
  const all=save.boxes.flat().filter(Boolean).length+save.party.length;
  const shine=save.party.concat(save.boxes.flat().filter(Boolean)).filter(x=>x.shiny).length;
  showStat(stats,'Total Pokémon',all);showStat(stats,'Shiny',shine);showStat(stats,'PC boxes',save.boxCount);
  if(save.problems.badRecords) showStat(stats,'Skipped corrupt',save.problems.badRecords);
  const source=selectedBox===0?save.party:save.boxes[selectedBox-1];
  if(!source.some(Boolean)) {empty(body,'This '+(selectedBox?'box':'party')+' is empty','Choose another tab to browse your Pokémon.');return;}
  const grid=elm('div','grid');
  source.forEach(mon=>{
    if(mon)grid.append(makeCard(mon,()=>{
      vault.push({...mon,origin:save.fileName,archivedAt:new Date().toISOString()});
      persistVault();$('vaultCount').textContent=vault.length;
      notify(speciesName(mon.species)+' added to your vault.');
    },'Add to vault'));
    else if(selectedBox!==0)grid.append(elm('div','slot-empty','Empty slot'));
  });
  body.append(grid);
}
function makeCard(mon, action, buttonLabel) {
  const card=elm('article','mon');
  if(mon.shiny)card.append(elm('span','star','★'));
  card.append(getSprite(mon),elm('div','name',speciesName(mon.species)));
  const meta=elm('div','meta','#'+mon.species+'  ·  '+(mon.estimatedLevel?'~':'')+'Lv '+mon.level+'  ·  '+mon.nature);
  card.append(meta);
  const b=elm('button',null,buttonLabel);b.addEventListener('click',action);card.append(b);
  return card;
}
function showStat(parent,name,value) {
  const el=elm('div','stat',name+' '),strong=elm('strong',null,value);
  el.append(strong);parent.append(el);
}
function empty(parent,title,subtitle) {
  const wrap=elm('div','empty');
  wrap.append(elm('div','empty-symbol','✦'),elm('h3',null,title),elm('p',null,subtitle));
  parent.append(wrap);
}
async function loadFiles(fileList) {
  for (const file of Array.from(fileList)) {
    try {
      if(!/\.(sav|srm)$/i.test(file.name))throw Error('Choose a .sav or .srm file.');
      const parsed=parseSave(await file.arrayBuffer());
      saves.push({...parsed,fileName:file.name});
      selectedSave=saves.length-1;selectedBox=0;showVault=false;
      notify(file.name+' imported (read-only).');
    } catch(error) {notify(file.name+': '+error.message);}
  }
  $('saveInput').value='';render();
}
function download(name,object) {
  const blob=new Blob([JSON.stringify(object,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function exportVault(){
  if(!vault.length){notify('Your vault is empty. Add Pokémon from a save first.');return;}
  download('unborne-transfer-vault.json',{format:'unborne-transfer-vault',version:1,createdAt:new Date().toISOString(),pokemon:vault});
}
async function importVault(file){
  try{
    if(file.size>10*1024*1024)throw Error('Vault archive exceeds 10 MiB limit.');
    const obj=JSON.parse(await file.text());
    if(obj.format!=='unborne-transfer-vault'||obj.version!==1||!Array.isArray(obj.pokemon)||obj.pokemon.length>50000||!obj.pokemon.every(validVaultMon))
      throw Error('Not a valid version 1 Transfer Hub vault.');
    vault.push(...obj.pokemon);
    persistVault();showVault=true;render();notify(obj.pokemon.length+' Pokémon loaded from vault archive.');
  }catch(error){notify(error.message);}
}
$('saveInput').addEventListener('change',e=>loadFiles(e.target.files));
$('vaultTab').addEventListener('click',()=>{showVault=true;render();});
$('exportVault').addEventListener('click',exportVault);
$('importVault').addEventListener('click',()=>$('vaultInput').click());
$('vaultInput').addEventListener('change',e=>{const file=e.target.files[0];if(file)importVault(file);e.target.value='';});
const drop=$('dropZone');
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging');});
drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files.length)loadFiles(e.dataTransfer.files);});
fetch('./assets/brisk-dex-data.json')
  .then(r=>r.ok?r.json():null).then(data=>{if(data?.species){catalog=data.species;render();}})
  .catch(()=>{}); // A fresh clone works with numeric IDs until assets are synced.
render();
