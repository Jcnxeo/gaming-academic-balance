$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8787

Add-Type -AssemblyName System.Web

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$port/"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $path = [System.Web.HttpUtility]::UrlDecode($context.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($path)) {
    $path = "index.html"
  }

  $file = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $path))
  $rootFull = [System.IO.Path]::GetFullPath($root)

  if (-not $file.StartsWith($rootFull)) {
    $context.Response.StatusCode = 403
    $context.Response.Close()
    continue
  }

  if (Test-Path -LiteralPath $file -PathType Leaf) {
    $extension = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
    $contentType = switch ($extension) {
      ".html" { "text/html; charset=utf-8" }
      ".css" { "text/css; charset=utf-8" }
      ".js" { "application/javascript; charset=utf-8" }
      ".csv" { "text/csv; charset=utf-8" }
      default { "application/octet-stream" }
    }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $context.Response.StatusCode = 404
  }

  $context.Response.Close()
}
