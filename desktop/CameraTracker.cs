using System.Diagnostics;
using System.Text.Json;

namespace Bodhisattva;

sealed class CameraTracker : IDisposable
{
    readonly object _gate = new();
    Thread? _thread;
    Process? _py;
    volatile bool _run;
    string _error = "";
    bool _ok;
    double _x = 0.5;
    double _y = 0.5;
    string _jpeg = "";
    string _lib = "";
    double[][] _pts = Array.Empty<double[]>();

    public bool Running => _run;

    public void Start()
    {
        lock (_gate)
        {
            if (_run) return;
            _run = true;
            _error = "MediaPipe startuje…";
            _ok = false;
            _thread = new Thread(Loop) { IsBackground = true, Name = "cam" };
            _thread.Start();
        }
    }

    public void Stop()
    {
        _run = false;
        KillPy();
        try { _thread?.Join(1200); } catch { }
        _thread = null;
    }

    public string SnapshotJson()
    {
        lock (_gate)
        {
            return JsonSerializer.Serialize(new
            {
                type = "head",
                ok = _ok,
                x = _x,
                y = _y,
                err = _error,
                jpg = _jpeg,
                lib = _lib,
                pts = _pts,
            });
        }
    }

    void Loop()
    {
        try
        {
            if (!RunMediaPipe())
                SetErr(_error.Length > 0 ? _error : "MediaPipe nie wystartował. Zainstaluj: pip install mediapipe opencv-python");
        }
        catch (Exception ex)
        {
            SetErr(ex.Message);
        }
        finally
        {
            KillPy();
        }
    }

    bool RunMediaPipe()
    {
        var script = FindFile("desktop", "headtrack.py") ?? FindFile(".", "headtrack.py");
        var python = FindPython();
        if (script == null || python == null)
        {
            SetErr(python == null
                ? "Brak Pythona z MediaPipe. pip install mediapipe opencv-python"
                : "Brak desktop/headtrack.py");
            return false;
        }

        SetErr("MediaPipe Face Mesh…");
        var psi = new ProcessStartInfo
        {
            FileName = python,
            Arguments = "-u \"" + script + "\"",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(script) ?? AppContext.BaseDirectory,
        };
        psi.Environment["PYTHONUNBUFFERED"] = "1";
        psi.Environment["TF_CPP_MIN_LOG_LEVEL"] = "3";
        psi.Environment["GLOG_minloglevel"] = "3";

        Process py;
        try { py = Process.Start(psi) ?? throw new InvalidOperationException("python"); }
        catch (Exception ex)
        {
            SetErr("Python: " + ex.Message);
            return false;
        }

        lock (_gate) _py = py;
        py.ErrorDataReceived += (_, e) => { };
        try { py.BeginErrorReadLine(); } catch { }

        while (_run && !py.HasExited)
        {
            string? line;
            try { line = py.StandardOutput.ReadLine(); }
            catch { break; }
            if (line == null) break;
            ApplyLine(line);
        }

        if (_run && py.HasExited && !_ok)
        {
            SetErr("MediaPipe zakończył się (kod " + py.ExitCode + ").");
            return false;
        }
        return true;
    }

    void ApplyLine(string line)
    {
        line = line.Trim();
        if (line.Length == 0 || line[0] != '{') return;
        try
        {
            using var doc = JsonDocument.Parse(line);
            var root = doc.RootElement;
            var ok = root.TryGetProperty("ok", out var okEl) && okEl.ValueKind == JsonValueKind.True;
            var x = root.TryGetProperty("x", out var xEl) ? xEl.GetDouble() : _x;
            var y = root.TryGetProperty("y", out var yEl) ? yEl.GetDouble() : _y;
            var err = root.TryGetProperty("err", out var errEl) ? errEl.GetString() ?? "" : "";
            var lib = root.TryGetProperty("lib", out var libEl) ? libEl.GetString() ?? "mediapipe" : "mediapipe";
            var jpg = root.TryGetProperty("jpg", out var jpgEl) ? jpgEl.GetString() ?? "" : "";
            var pts = ReadPts(root);
            lock (_gate)
            {
                _ok = ok;
                _x = x;
                _y = y;
                _lib = lib;
                if (pts.Length > 0) _pts = pts;
                else if (!ok) _pts = Array.Empty<double[]>();
                if (jpg.Length > 0) _jpeg = jpg;
                _error = ok ? "" : err;
            }
        }
        catch { }
    }

    static double[][] ReadPts(JsonElement root)
    {
        if (!root.TryGetProperty("pts", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return Array.Empty<double[]>();
        var list = new List<double[]>(5);
        foreach (var p in arr.EnumerateArray())
        {
            if (p.ValueKind != JsonValueKind.Array || p.GetArrayLength() < 2) continue;
            list.Add(new[] { p[0].GetDouble(), p[1].GetDouble() });
        }
        return list.ToArray();
    }

    void KillPy()
    {
        Process? py;
        lock (_gate)
        {
            py = _py;
            _py = null;
        }
        if (py == null) return;
        try
        {
            if (!py.HasExited) py.Kill(entireProcessTree: true);
        }
        catch { }
        try { py.Dispose(); } catch { }
    }

    static string? FindPython()
    {
        var local = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs", "Python");
        if (Directory.Exists(local))
        {
            try
            {
                var hits = Directory.GetFiles(local, "python.exe", SearchOption.AllDirectories)
                    .Where(p => p.IndexOf("WindowsApps", StringComparison.OrdinalIgnoreCase) < 0)
                    .OrderByDescending(p => p.Contains("Python311", StringComparison.OrdinalIgnoreCase))
                    .ThenByDescending(p => p)
                    .ToArray();
                if (hits.Length > 0) return hits[0];
            }
            catch { }
        }

        foreach (var name in new[] { "python.exe", "py.exe" })
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "where.exe",
                    Arguments = name,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true,
                };
                using var p = Process.Start(psi);
                var text = p?.StandardOutput.ReadToEnd() ?? "";
                p?.WaitForExit(2000);
                foreach (var line in text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    if (line.IndexOf("WindowsApps", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                    if (File.Exists(line.Trim())) return line.Trim();
                }
            }
            catch { }
        }
        return null;
    }

    static string? FindFile(string folder, string name)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (var i = 0; i < 16 && dir != null; i++, dir = dir.Parent)
        {
            var a = Path.Combine(dir.FullName, folder, name);
            if (File.Exists(a)) return a;
            var b = Path.Combine(dir.FullName, name);
            if (File.Exists(b)) return b;
        }
        return null;
    }

    void SetErr(string msg)
    {
        lock (_gate)
        {
            _error = msg;
            _ok = false;
        }
    }

    public void Dispose() => Stop();
}
