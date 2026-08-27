@echo off  
cd /d D:\WorkSpace\Network_Panel\src\backend  
echo Starting backend server...  
start /b node dist/index.js  
timeout /t 3  
cd /d D:\WorkSpace\Network_Panel  
echo Starting frontend...  
set \"ESBUILD_BINARY_PATH=D:\WorkSpace\Network_Panel\node_modules\@esbuild\win32-x64\esbuild.exe\"  
npx vite --host 
