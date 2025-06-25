# Aiolos Firmware

## Using USB Devices with WSL and PlatformIO

If you are developing firmware using PlatformIO in VS Code on Windows Subsystem for Linux (WSL), and you want to use USB devices (such as serial programmers or modems), you need to use `usbipd` to attach USB devices to your WSL environment.

### Attaching USB Devices

1. **List available USB devices:**
   ```bash
   usbipd wsl list
   ```
   This will show all USB devices that can be attached to WSL.

2. **Attach the device:**
   Find the `BUSID` of your device from the list, then run:
   ```bash
   usbipd wsl attach --busid <BUSID>
   ```
   Replace `<BUSID>` with the correct value (e.g., `1-2`).

### Persistence Limitation

**Note:** If you unplug and replug your USB device, it will not be automatically re-attached to WSL. You must repeat the `usbipd wsl attach` command each time you reconnect the device. This is a current limitation of `usbipd` and WSL.

#### Workaround
- You can create a simple script to re-attach the device when needed.
- Some advanced users set up automation on Windows to detect device changes and run the attach command, but this requires extra setup.

### Troubleshooting
- If your device does not show up in WSL after replugging, repeat the attach steps above.
- Make sure you have the latest version of `usbipd-win` installed on Windows.
- For more information, see the [usbipd-win documentation](https://github.com/dorssel/usbipd-win).
