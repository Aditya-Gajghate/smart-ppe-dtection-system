
# 1. Force use of Python 3.11 using 'py' launcher
# We check for standard Python 3.11 installation via py launcher
$pythonExecutable = "py"
$pythonArgs = "-3.11"

# Verify 3.11 is available
try {
    & $pythonExecutable $pythonArgs --version
    if ($LASTEXITCODE -ne 0) { throw }
}
catch {
    Write-Host "Python 3.11 not found! Please run: winget install -e --id Python.Python.3.11" -ForegroundColor Red
    exit 1
}

Write-Host "Using Python 3.11..." -ForegroundColor Green

# 2. Create Virtual Environment
if (Test-Path "venv") {
    Write-Host "Removing old venv..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "venv"
}

Write-Host "Creating virtual environment..."
& $pythonExecutable $pythonArgs -m venv venv
if (-not (Test-Path "venv")) {
    Write-Host "Failed to create venv." -ForegroundColor Red
    exit 1
}

# 3. Activate Venv variables
$venvPython = ".\venv\Scripts\python.exe"
$venvPip = ".\venv\Scripts\pip.exe"

# 4. Install Dependencies
Write-Host "Upgrading pip..."
& $venvPython -m pip install --upgrade pip setuptools wheel

Write-Host "Installing CMake..."
& $venvPython -m pip install cmake

# Install dlib specifically
Write-Host "Attempting to install dlib..."
& $venvPython -m pip install dlib
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: dlib installation failed. Face recognition will be disabled." -ForegroundColor Yellow
    Write-Host "Continuing with other dependencies..." -ForegroundColor Gray
}

# Install rest
Write-Host "Installing remaining dependencies..."
& $venvPython -m pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "Installation failed. Please check error messages above." -ForegroundColor Red
    Write-Host "Common fix: Install 'Desktop development with C++' from Visual Studio Build Tools." -ForegroundColor Yellow
    exit 1
}

Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "To run the service, execute: .\start.ps1" -ForegroundColor Cyan
