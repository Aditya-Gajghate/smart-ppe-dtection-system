# SMART PPE ATTENDANCE SYSTEM

## Prerequisites
- **Python 3.11** (Required for dlib compatibility)
- **Node.js** (v18+)
- **MongoDB** (Running locally on default port 27017)

## 1. Setup Python AI Microservice (IMPORTANT)

We use a setup script to configure the Python environment correctly.

1. Navigate to the service directory:
   ```bash
   cd ai-service
   ```

2. Run the automated setup script:
   - **PowerShell**: `./setup.ps1`
   - This will install Python 3.11 (if missing), create a virtual environment, and install dependencies including dlib.

3. Start the service:
   - **PowerShell**: `./start.ps1`
   - The API will be available at `http://localhost:8000`.

## 2. Setup Next.js Frontend

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to `http://localhost:3000`.

## Usage
1. **Login**: Use any credentials (demo mode).
2. **Employees**: Go to `/employees` and register a new employee.
3. **Live Attendance**: Go to `/attendance-live`.
   - Ensure your webcam is enabled.
   - The system sends frames to the Python service.

## Troubleshooting
- **'pip' not found / dlib error**:
  - Run `./setup.ps1` again.
  - If dlib fails to compile, install **Visual Studio Build Tools**.
- **Camera not working**: specific permissions must be granted in browser.
- **MongoDB Error**: Ensure `mongod` service is running.
