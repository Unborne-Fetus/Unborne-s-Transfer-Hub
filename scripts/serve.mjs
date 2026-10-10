// Small zero-dependency local server. Listens only on your own computer.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};
const port=8765;
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:'+port);
    const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
    if(!Object.hasOwn(mime,extname(path))){res.writeHead(404);res.end('Not found');return;}
    const meta=await stat(path);if(!meta.isFile())throw Error('Not a file');
    res.writeHead(200,{'Content-Type':mime[extname(path)],'Content-Length':meta.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    createReadStream(path).pipe(res);
  }catch{res.writeHead(404);res.end('File not found');}
}).listen(port,'127.0.0.1',()=>{
  const address='http://127.0.0.1:'+port+'/';
  console.log('Unborne Transfer Hub: '+address);
  console.log('Offline local server. Press Ctrl+C to quit.');
  if(process.platform==='win32')spawn('cmd.exe',['/d','/s','/c','start "" "'+address+'"'],{detached:true,stdio:'ignore'}).unref();
});
