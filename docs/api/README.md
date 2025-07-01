# Aiolos API Administration with Insomnia

This directory contains an Insomnia REST client collection for administering the Aiolos Weather Station system. The collection allows you to manage station configuration without needing the frontend application.

## Installation and Setup

### Step 2: Import the Collection
1. **Launch Insomnia** after installation
2. **Import the Collection**:
   - Click on `Create` or the `+` button in the top-left corner
   - Select `Import from File` or `Import/Export` → `Import Data` → `From File`
   - Navigate to this directory and select `aiolos_insomnia_collection.json`
   - Click `Import`

### Step 3: Configure the Environment
1. **Select an Environment**:
   - Look for the environment dropdown in the top-right corner of Insomnia
   - The collection includes three environments:
     - **Base Environment**: Default settings
     - **Development**: For local development (localhost)
     - **Production**: For the production server
   - Select "Production" for the live server

2. **Update Environment Variables**:
   - Click on the gear icon next to the environment dropdown
   - Edit the variables as needed:
     - `base_url`: The base URL of your API server (e.g., `http://3.79.164.51`)
     - `station_id`: The ID of your weather station (e.g., `Aiolos-Vasiliki`)
     - `admin_api_key`: Your admin API key for authentication
   - Click `Save`

## Available Requests

### Station Configuration

1. **Get Station Configuration**
   - `GET /api/stations/{station_id}/config`
   - Retrieves the current configuration for a station
   - To use:
     1. Select "Get Station Configuration" from the sidebar
     2. Click "Send" to execute the request

2. **Update Station Configuration**
   - `POST /api/stations/{station_id}/config`
   - Updates the configuration for a station
   - Requires the `X-API-Key` header with your admin API key
   - To use:
     1. Select "Update Station Configuration" from the sidebar
     2. Verify the JSON body contains the settings you want to update:
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
     1. Select "Get Station Diagnostics" from the sidebar
     2. Click "Send" to execute the request

## Keeping the Collection Updated

When making changes to the API, please update this collection accordingly. To export updated collections:

1. In Insomnia, select the `Aiolos Weather Station` collection
2. Click on the dropdown menu next to it (three dots)
3. Select `Export`
4. Choose `Collection` format
5. Save the file as `aiolos_insomnia_collection.json` in this directory

## Security Note

The admin API key in the collection should be kept secret. When sharing this collection, make sure to remove any sensitive information from the environment settings.
