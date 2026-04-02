param(
  [string]$Repo = "MilleBii/visite-plus",
  [string]$LabelsFile = ".github/labels.json"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) is not installed. Install it from https://cli.github.com/"
}

if (-not (Test-Path $LabelsFile)) {
  Write-Error "Labels file not found: $LabelsFile"
}

$labels = Get-Content $LabelsFile | ConvertFrom-Json

foreach ($label in $labels) {
  $name = $label.name
  $color = $label.color
  $description = $label.description

  $exists = $false
  try {
    gh label view "$name" --repo $Repo *> $null
    $exists = $true
  } catch {
    $exists = $false
  }

  if ($exists) {
    gh label edit "$name" --repo $Repo --color $color --description "$description" | Out-Null
    Write-Host "Updated label: $name"
  } else {
    gh label create "$name" --repo $Repo --color $color --description "$description" | Out-Null
    Write-Host "Created label: $name"
  }
}

Write-Host "Labels sync complete for $Repo"
