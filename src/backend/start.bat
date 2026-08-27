@echo off
set NODE_TLS_REJECT_UNAUTHORIZED=0
set NPM_CONFIG_OFFLINE=false
cd /d D:\WorkSpace\Network_Panel\src\backend
node --experimental-strip-types src/index.ts
