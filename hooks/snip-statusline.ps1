# Snip statusline badge for Claude Code on Windows.
# Reads %USERPROFILE%\.claude\.snip-active and prints [SNIP:MODE] or nothing.

$StatePath = Join-Path $env:USERPROFILE '.claude' '.snip-active'

if (-not (Test-Path $StatePath)) {
    exit 0
}

$Lines = Get-Content $StatePath -TotalCount 2
$Mode = if ($Lines.Count -ge 1) { $Lines[0] } else { '' }
$Lang = if ($Lines.Count -ge 2) { $Lines[1] } else { '' }

if ([string]::IsNullOrWhiteSpace($Mode) -or $Mode -eq 'off') {
    exit 0
}

$ModeUpper = $Mode.ToUpper()

if (-not [string]::IsNullOrWhiteSpace($Lang)) {
    $LangAbbrev = $Lang.Substring(0, [Math]::Min(2, $Lang.Length)).ToUpper()
    Write-Host -NoNewline "[SNIP:${ModeUpper}:${LangAbbrev}]"
} else {
    Write-Host -NoNewline "[SNIP:${ModeUpper}]"
}
