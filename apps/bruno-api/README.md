# Aiolos API Administration with Bruno

This directory contains a [Bruno](https://www.usebruno.com/) API client collection for administering the Aiolos Weather Station system. Bruno is a lightweight, Git-friendly alternative to Postman/Insomnia that keeps API collections as plain files in your project.

## Installation and Setup

### Step 1: Install Bruno

1. **Download Bruno**:
   - Go to [https://www.usebruno.com/downloads](https://www.usebruno.com/downloads)
   - Choose the appropriate version for your operating system (Windows, macOS, or Linux)

2. **Linux Installation**:
   - For Debian/Ubuntu:
     ```bash
     # Download the .deb file from the Bruno website
     sudo dpkg -i bruno_[version]_amd64.deb
     # Or use the AppImage version
     ```
   - For other Linux distributions, use the AppImage version:
     ```bash
     # Download the AppImage
     chmod +x Bruno-[version].AppImage
     ./Bruno-[version].AppImage
     ```

3. **Launching Bruno on Linux**:
   - **From Application Menu**: Look for Bruno in your application launcher/menu
   - **From Terminal**: Type `bruno` or run the AppImage directly
   - **From Desktop**: If a desktop shortcut was created, click on it

### Step 2: Open the Aiolos Collection

1. **Launch Bruno** after installation
2. **Open the Collection**:
   - Click on "Open Collection" in the welcome screen
   - Navigate to the `/apps/bruno-api` directory in your Aiolos project
   - Select the folder and click "Open"

### Step 3: Configure the Environment

1. **Select an Environment**:
   - Look for the environment dropdown in the top-right corner of Bruno
   - The collection includes two environments:
     - **Development**: For local development (localhost)
     - **Production**: For the production server
   - Select "Production" for the live server

2. **Environment Variables**:
   - The environment variables are already set up in the `environments.json` file:
     - `base_url`: The base URL of your API server (e.g., `http://3.79.164.51`)
     - `station_id`: The ID of your weather station (e.g., `Aiolos-Vasiliki`)
     - `admin_api_key`: Your admin API key for authentication
   - You can edit these in Bruno's environment panel if needed

## Available Requests

### Station Configuration

1. **Get Station Configuration**
   - `GET /api/stations/{station_id}/config`
   - Retrieves the current configuration for a station
   - To use:
     1. Click on "Get Station Configuration" in the sidebar
     2. Click "Send" to execute the request

2. **Update Station Configuration**
   - `POST /api/stations/{station_id}/config`
   - Updates the configuration for a station
   - Requires the `X-API-Key` header with your admin API key (already set up)
   - To use:
     1. Click on "Update Station Configuration" in the sidebar
     2. Edit the JSON body as needed:
     ```json
     {
       "temp_interval": 300000,
       "wind_interval": 1000,
       "diag_interval": 300000,
       "time_interval": 3600000,
       "restart_interval": 21600,
       "sleep_start_hour": 22,
       "sleep_end_hour": 9
     }
     ```
     3. Click "Send" to execute the request

### Parameter Explanation

| Parameter | Description | Default Value | Unit |
|-----------|-------------|---------------|------|
| `temp_interval` | Temperature reading interval | 300000 | milliseconds (5 minutes) |
| `wind_interval` | Wind reading interval | 1000 | milliseconds (1 second) |
| `diag_interval` | Diagnostics data sending interval | 300000 | milliseconds (5 minutes) |
| `time_interval` | Time synchronization interval | 3600000 | milliseconds (1 hour) |
| `restart_interval` | Automatic restart interval | 21600 | seconds (6 hours) |
| `sleep_start_hour` | Hour to enter sleep mode | 22 | 24-hour format |
| `sleep_end_hour` | Hour to wake from sleep mode | 9 | 24-hour format |

### Station Diagnostics

1. **Get Station Diagnostics**
   - `GET /api/stations/{station_id}/diagnostics`
   - Retrieves the latest diagnostics data for a station
   - To use:
     1. Click on "Get Station Diagnostics" in the sidebar
     2. Click "Send" to execute the request

## Advantages of Bruno

1. **Git-friendly**: Bruno's collections are stored as simple files that can be version-controlled
2. **Local-first**: No cloud account required, collections live in your project
3. **Developer-focused**: Clean interface with the features developers need
4. **Team collaboration**: Share collections with your team through your codebase
5. **Open-source**: Fully open-source tool with an active community

## Security Note

The admin API key in the collection should be kept secret. When sharing this repository, consider using environment variables or Git-ignored files for sensitive values.
