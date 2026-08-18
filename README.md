# Bodhisattva Shooter

A side-scrolling shooter that mixes **head-camera motion** with **keyboard** controls. Lean to move, raise your head to jump or aim up, and use the keyboard to shoot.

## How to run

1. **Rozpakuj ZIP na dysk** (Pulpit, Dokumenty, itd.). Nie odpalaj gry prosto z archiwum.
2. Wejdź do folderu `bodhisatva_shooter-main` (albo `bodhisatva_shooter`).
3. **Kliknij `play.bat`.**

To jedyny sposób uruchomienia. `play.bat`:

- odpala aplikację pulpitu z kamerą, jeśli `Bodhisattva.exe` już jest
- przy pierwszym starcie ze źródeł **sam buduje grę** (trzeba [.NET 10 SDK](https://dotnet.microsoft.com/download) i internet)
- gdy nie ma `.NET`, odpala wersję w przeglądarce (klawiatura; kamera nie działa)

Zostaw okno `play.bat` otwarte przy pierwszym budowaniu. Potem gra powinna wystartować sama.

## Controls

| Action | Keyboard | Camera |
| --- | --- | --- |
| Start / camera check | `Enter` | — |
| Move | Left / Right arrows | Lean left / right |
| Jump | `Space` | Raise your head |
| Crouch | Down arrow | — |
| Shoot | `A` | — |
| Super | `S` | — |
| Aim | Up / Down arrows | Raise or lower your head |
| Camera settings | `F1` | — |

Keyboard still works while the camera is on.

## If play.bat says it cannot find the game

- Extract the ZIP first. Running files from inside the archive will fail.
- Install [.NET 10 SDK](https://dotnet.microsoft.com/download), then click `play.bat` again.
- Camera needs the desktop app, a webcam, and the [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).
