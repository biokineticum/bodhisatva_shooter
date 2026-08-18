@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Bodhisattva

if /I "%~dp0"=="%TEMP%\" goto :from_zip
echo %~dp0 | findstr /I /C:"\Temp\" /C:"\AppData\Local\Temp\" >nul
if not errorlevel 1 goto :from_zip

call :find_exe
if defined GAME_EXE goto :launch

echo.
echo [play] Brak Bodhisattva.exe — pierwsze uruchomienie buduje gre.
echo [play] Potrzebny jest .NET SDK i internet (paczka NuGet).
echo.

where dotnet >nul 2>&1
if errorlevel 1 goto :no_dotnet

dotnet build "%~dp0desktop\Bodhisattva.csproj" -c Release --nologo
if errorlevel 1 (
  echo.
  echo [play] Build sie nie udal. Zainstaluj .NET 10 SDK:
  echo        https://dotnet.microsoft.com/download
  echo.
  pause
  exit /b 1
)

call :find_exe
if defined GAME_EXE goto :launch

echo.
echo [play] Build sie udal, ale nie widze Bodhisattva.exe.
echo.
pause
exit /b 1

:launch
echo [play] Start: %GAME_EXE%
start "" "%GAME_EXE%"
exit /b 0

:no_dotnet
echo [play] Nie ma polecenia "dotnet".
echo [play] Odpalam wersje w przegladarce — klawiatura dziala, kamera nie.
echo.

:web
echo [play] http://127.0.0.1:8080/
echo [play] Zamknij to okno, zeby zatrzymac serwer.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Port 8080
if errorlevel 1 (
  echo.
  echo [play] Nie udalo sie odpalic serwera.
  pause
  exit /b 1
)
exit /b 0

:from_zip
echo.
echo [play] Wyglada na to, ze odpalasz gre prosto z ZIP-a.
echo [play] Rozpakuj archiwum na dysk (np. Pulpit albo Dokumenty),
echo        wejdz do folderu i dopiero wtedy kliknij play.bat.
echo.
pause
exit /b 1

:find_exe
set "GAME_EXE="
if exist "%~dp0Bodhisattva.exe" (
  set "GAME_EXE=%~dp0Bodhisattva.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\win-x64\Bodhisattva.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\win-x64\Bodhisattva.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\win-x64\publish\Bodhisattva.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\win-x64\publish\Bodhisattva.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\Bodhisattva.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\Bodhisattva.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\publish\Bodhisattva.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\publish\Bodhisattva.exe"
  goto :eof
)
goto :eof
