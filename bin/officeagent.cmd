@echo off
:: Windows wrapper for officeagent CLI
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
"%ROOT_DIR%\node_modules\.bin\tsx.cmd" "%ROOT_DIR%\apps\officeagent\src\index.ts" %*
