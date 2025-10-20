@echo off
setlocal

REM ====== caminhos básicos ======
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "FRONT_SRC=%ROOT%\Frontend\sysvar"
set "BACK_SRC=%ROOT%\backend"
set "DEST=%ROOT%\_export_sysvar"

echo.
echo [Raiz]      %ROOT%
echo [Frontend]  %FRONT_SRC%
echo [Backend]   %BACK_SRC%
echo [Destino]   %DEST%
echo.

REM ====== checagens rápidas ======
if not exist "%FRONT_SRC%\angular.json" (
  echo [ERRO] Nao encontrei "%FRONT_SRC%\angular.json". Estrutura esperada: Frontend\sysvar
  goto :fim
)
if not exist "%BACK_SRC%\" (
  echo [ERRO] Nao encontrei a pasta de backend em "%BACK_SRC%".
  goto :fim
)

REM ====== limpa destino ======
if exist "%DEST%" rd /s /q "%DEST%"
mkdir "%DEST%\frontend" >nul 2>&1
mkdir "%DEST%\backend"  >nul 2>&1

REM ====== COPIA FRONTEND (sem node_modules/.angular/.vscode/dist/build/.git) ======
echo [Copiando Frontend...]
robocopy "%FRONT_SRC%" "%DEST%\frontend" /E /XD node_modules .angular .vscode dist build .git /XF package-lock.json yarn.lock pnpm-lock.yaml *.log

REM ====== COPIA BACKEND (sem venv/__pycache__/.git/etc) ======
echo [Copiando Backend...]
robocopy "%BACK_SRC%" "%DEST%\backend" /E /XD venv .venv .git __pycache__ .pytest_cache .mypy_cache .idea .vscode /XF *.pyc *.pyo *.log db.sqlite3

echo.
echo [OK] Export concluido em: "%DEST%"
echo (ZIP propositalmente desativado para manter simples.)
echo.
pause

:fim
endlocal
