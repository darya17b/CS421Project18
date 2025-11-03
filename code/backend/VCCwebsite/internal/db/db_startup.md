step 1: 
cd "...\code\backend\VCCwebsite"

step 2: 
# 1) set a variable with the Go bin path
$goPath = 'C:\Program Files\Go\bin'

# 2) add to current session PATH if not already present
if ($env:Path -notlike "*$goPath*") {
  $env:Path = "$env:Path;$goPath"
  Write-Host "Added $goPath to current session PATH"
} else {
  Write-Host "$goPath already in current PATH"
}

# 3) verify go is now available
go version

# 4) persistently add to your user PATH (so new PowerShell windows will see it)
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
if ($userPath -notlike "*$goPath*") {
  [Environment]::SetEnvironmentVariable('Path', "$userPath;$goPath",'User')
  Write-Host "Added $goPath to user PATH (persisted). Close and re-open PowerShell to reload."
} else {
  Write-Host "$goPath already in user PATH"
}

step 3:

$env:MONGO_URI = 'mongodb+srv://darya17:testpassword@cluster0.nfsv0cg.mongodb.net/test?retryWrites=true&w=majority'

step4:

go run ./cmd/service

Do once u have advanced password: 

$enc = [System.Uri]::EscapeDataString("YOUR_RAW_PASSWORD")
$env:MONGO_URI = "mongodb+srv://darya17:$enc@cluster0.nfsv0cg.mongodb.net/test?retryWrites=true&w=majority"
