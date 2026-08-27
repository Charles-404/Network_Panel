var fs = require('fs');  
var filePath = 'node_modules/vite/node_modules/esbuild/lib/main.js';  
var content = fs.readFileSync(filePath, 'utf8');  
var old = 'child_process.exec(command + \" \" + args.concat(`--service=${\"0.21.5\"}`, \"--ping\").join(\" \"), {shell: true,';  
var rep = 'child_process.spawn(command, args.concat(`--service=${\"0.21.5\"}`, \"--ping\"), {shell: true,';  
content = content.replace(old, rep);  
fs.writeFileSync(filePath, content);  
console.log('Fixed!'); 
