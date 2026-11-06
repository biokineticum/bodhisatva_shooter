# Bodhisattva Shooter

**Side-scrolling shooter mixing head-camera motion with keyboard** — lean to move, raise your head to jump / aim, shoot with keys.

A playful motion-capture game for **neck and upper-body movement** between work sessions. For physios, coaches and makers exploring camera-based exergames.

## Features

- Hybrid **camera + keyboard** controls
- Desktop app with webcam head tracking; browser fallback without camera
- Windows one-click launch via `play.bat`

## Requirements

- Webcam + [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) for camera mode
- [.NET SDK](https://dotnet.microsoft.com/download) to build from source

## Quick start

1. Extract / clone the folder to disk (do not run from inside a ZIP).
2. Open the project folder and double-click **`play.bat`**.

`play.bat` launches `Bodhisattva.exe` if present, otherwise builds from source. Without .NET it opens the browser version (keyboard only).

## Controls

| Action | Keyboard | Camera |
| --- | --- | --- |
| Start / camera check | `Enter` | — |
| Move | ← / → | Lean left / right |
| Jump | `Space` | Raise head |
| Crouch | ↓ | — |
| Shoot | `A` | — |
| Super | `S` | — |
| Aim | ↑ / ↓ | Raise or lower head |
| Camera settings | `F1` | — |

Keyboard still works while the camera is on.

### If `play.bat` cannot find the game

- Extract the ZIP first
- Install the .NET SDK, then run `play.bat` again
- Camera needs the desktop app, a webcam, and WebView2

---

## Author

**Dariusz Mosler** (Biokineticum) — physiotherapy, biomechanics, sports science  
🌐 [biokineticum.com](https://biokineticum.com) · 📰 [Substack](https://biokineticum.substack.com) · 𝕏 [@Biokineticum](https://x.com/Biokineticum)

