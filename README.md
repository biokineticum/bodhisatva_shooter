# Bodhisattva Shooter

A side-scrolling shooter that mixes **head-camera motion** with **keyboard** controls. Lean to move, raise your head to jump or aim up, and use the keyboard to shoot.

## How to run

**Double-click `play.bat`.** That is how you start the game.

`play.bat` looks for the desktop app and launches it:

1. `desktop\bin\Release\net10.0-windows\win-x64\Bodhisattva.exe`
2. the published copy next to it
3. `Bodhisattva.exe` in the game folder

The desktop app is the real way to play — camera tracking works there.

If no `.exe` is found, `play.bat` opens `http://127.0.0.1:8080/` in the browser instead. Camera does **not** work from a raw `index.html` file.

### First time after a clone

The `.exe` is not in this repo. Build it once, then use `play.bat`:

```bat
cd desktop
dotnet build -c Release
cd ..
play.bat
```

You need [.NET 10](https://dotnet.microsoft.com/download) and a webcam for head tracking.

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

## Play in the browser (no camera)

If you only want keyboard play and have no desktop build:

```bat
python -m http.server 8080
```

Then open [http://127.0.0.1:8080/](http://127.0.0.1:8080/).
