@echo off
REM Start backend server for Controle de Produção
cd /d "%~dp0"

echo.
echo =============================================
echo  Servidor - Controle de Produção
echo =============================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Instalando dependências...
    call npm install
    echo.
)

REM Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /V "127.0.0.1"') do (
    set LOCAL_IP=%%a
    goto :ip_found
)
:ip_found
if defined LOCAL_IP (
    set LOCAL_IP=%LOCAL_IP:* =%
) else (
    set LOCAL_IP=localhost
)

echo .
echo Iniciando servidor...
echo.
echo ✓ Acesso LOCAL:  http://localhost:3000
echo ✓ Acesso REDE:   http://%LOCAL_IP%:3000
echo.
echo Digite Ctrl+C para parar o servidor
echo.

call npm start
pause
