param([int]$Port = 8080)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".json" = "application/json"
  ".xml"  = "application/xml"
  ".txt"  = "text/plain; charset=utf-8"
  ".wasm" = "application/wasm"
}

$listener = $null
$prefix = $null
for ($p = $Port; $p -lt $Port + 20; $p++) {
  try {
    $tryPrefix = "http://127.0.0.1:$p/"
    $try = [System.Net.HttpListener]::new()
    $try.Prefixes.Add($tryPrefix)
    $try.Start()
    $listener = $try
    $prefix = $tryPrefix
    $Port = $p
    break
  } catch {
    if ($try) { $try.Close() }
  }
}
if (-not $listener) {
  Write-Host "[play] Nie moge otworzyc portu od $Port."
  exit 1
}

Write-Host "[play] Serwer: $prefix"
Start-Process $prefix

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
  $rel = $rel -replace "/", [IO.Path]::DirectorySeparatorChar

  $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
  $rootFull = [IO.Path]::GetFullPath($root)
  if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    $ctx.Response.StatusCode = 403
    $ctx.Response.Close()
    continue
  }

  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
    $ctx.Response.StatusCode = 404
    $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
    continue
  }

  $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
  $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
  $data = [IO.File]::ReadAllBytes($full)
  $ctx.Response.ContentLength64 = $data.Length
  $ctx.Response.OutputStream.Write($data, 0, $data.Length)
  $ctx.Response.Close()
}
