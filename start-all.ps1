# Start Backend  
Write-Host \"Starting backend server...\" -ForegroundColor Green  
Start-Process -FilePath \"node\" -ArgumentList \"dist/index.js\" -WorkingDirectory \"D:\WorkSpace\Network_Panel\src\backend\" -WindowStyle Hidden  
Start-Sleep -Seconds 3  
Write-Host \"Starting frontend...\" -ForegroundColor Green  
$env:ESBUILD_BINARY_PATH = \"D:\WorkSpace\Network_Panel\node_modules\@esbuild\win32-x64\esbuild.exe\"  
Set-Location \"D:\WorkSpace\Network_Panel\"  
npx vite --host 
