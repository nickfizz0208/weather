const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
http.createServer((req,res) => {
 const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
 const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root,'index.html');
 res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ico':'image/x-icon'})[path.extname(target)] || 'application/octet-stream');
 fs.createReadStream(target).pipe(res);
}).listen(4200, '127.0.0.1', () => console.log('http://127.0.0.1:4200'));
