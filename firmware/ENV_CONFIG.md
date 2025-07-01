# Environment Configuration Guide

## Overview

This project uses PlatformIO's build system to manage environment-specific configurations and sensitive values. Rather than hardcoding sensitive information in source files, we use a `firmware/secrets.ini` file that is excluded from version control.

## Setup

1. Copy the example file to create your own secrets file:
   ```bash
   cp firmware/secrets.ini.example firmware/secrets.ini
   ```

2. Edit `firmware/secrets.ini` with your specific configuration values:
   ```ini
   [secrets]
   APN = "your_apn_here"
   GPRS_USER = "your_username"
   GPRS_PASS = "your_password"
   OTA_SSID = "your_ota_ssid"
   OTA_PASSWORD = "your_secure_password"
   # ... and other values
   ```

3. Build the project normally with PlatformIO - it will automatically incorporate your secret values.

## How It Works

- The main `platformio.ini` includes the `secrets.ini` file using the `extra_configs` directive
- Values from `secrets.ini` are passed to the compiler via `-D` flags in `build_flags`
- The `Config.h` file has fallback definitions for when environment values aren't provided

## Environment-Specific Builds

You can create different environment configurations for development, testing, and production:

```ini
[env:development]
# Development-specific configuration
platform = espressif32
# ... other settings
build_flags =
    # ... other flags
    -DCONFIG_SERVER_HOST=\"dev.example.com\"

[env:production]
# Production-specific configuration
platform = espressif32
# ... other settings
build_flags =
    # ... other flags
    -DCONFIG_SERVER_HOST=\"prod.example.com\"
```

To build for a specific environment:
```bash
pio run -e production
```

## Security Notes

- The `secrets.ini` file should NEVER be committed to version control
- Ensure it's listed in `.gitignore`
- For production deployments, consider using PlatformIO's encrypted storage or CI/CD secrets management
