@echo off
cd /d "%~dp0"
if exist "desktop\bin\Release\net10.0-windows\win-x64\Bodhisattva.exe" (
  start "" "desktop\bin\Release\net10.0-windows\win-x64\Bodhisattva.exe"
  exit /b 0
)
if exist "desktop\bin\Release\net10.0-windows\win-x64\publish\Bodhisattva.exe" (
  start "" "desktop\bin\Release\net10.0-windows\win-x64\publish\Bodhisattva.exe"
  exit /b 0
)
if exist "Bodhisattva.exe" (
  start "" "Bodhisattva.exe"
  exit /b 0
)
echo Brak Bodhisattva.exe — kamera nie dziala z pliku HTML.
echo Uruchom aplikacje pulpitu albo: python -m http.server 8080
start "" "http://127.0.0.1:8080/"
