param(
    [Parameter(Position = 0)]
    [string]$Path = "actions-tracker-release.keystore"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Keystore not found: $Path"
}

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path))
if ($bytes.Length -lt 1024) {
    throw "The keystore is only $($bytes.Length) bytes. Check that this is the actual .keystore/.jks file."
}

[Convert]::ToBase64String($bytes)
