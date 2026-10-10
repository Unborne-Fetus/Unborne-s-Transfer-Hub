// Copies only Brisk Dex's existing 2D front PNG sprites and species data.
// After this one-time sync, the Transfer Hub runs entirely from local assets.
import { mkdtemp, readdir, copyFile, cp, rm, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const target=join(root,'assets','brisk-dex-sprites'), temporary=await mkdtemp(join(tmpdir(),'unborne-brisk-'));
const remote='https://github.com/Unborne-Fetus/Brisk-Dex.git';
function git(...args){
  const result=spawnSync('git',args,{stdio:'inherit'});
  if(result.error || result.status!==0) throw Error('Git failed: '+args.join(' ')+'. Install Git and check your connection.');
}
try{
  console.log('Syncing Brisk Dex front sprites (requires internet this one time)...');
  git('clone','--depth','1','--filter=blob:none','--sparse','--quiet',remote,temporary);
  git('-C',temporary,'sparse-checkout','set','--cone','brisk-dex-sprites');
  await mkdir(target,{recursive:true});
  const files=await readdir(join(temporary,'brisk-dex-sprites'));
  const fronts=files.filter(name=>/^\d+_front(?:_shiny)?\.png$/i.test(name));
  for(const name of fronts)await copyFile(join(temporary,'brisk-dex-sprites',name),join(target,name));
  const catalogue=join(temporary,'brisk-dex-data.json');
  await copyFile(catalogue,join(root,'assets','brisk-dex-data.json'));
  console.log('Synced '+fronts.length+' exact Brisk Dex 2D front sprites (normal + shiny).');
  console.log('Local catalogue: assets/brisk-dex-data.json');
  console.log('You can now launch Transfer Hub without internet.');
}finally{await rm(temporary,{recursive:true,force:true});}
