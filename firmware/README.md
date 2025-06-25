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

## Modem Implementation (LilyGO T-SIM7000G)

The Aiolos Weather Station uses a LilyGO T-SIM7000G module (ESP32 + SIM7000G cellular modem) for connectivity. The firmware follows best practices for robust cellular communication:

### Key Features

- **Reliable Power Sequence**: Proper initialization of the SIM7000G modem with correct timing for power-on sequence
- **Error Resilience**: System continues operation even if modem/SIM errors occur
- **Network Connection**: Automatic connection to cellular network and GPRS with retry mechanisms
- **Power Management**: Sleep mode support for power conservation with proper wake-up sequence
- **SIM Detection**: Multiple methods to detect SIM card presence (CPIN, CCID, TinyGSM)

### Configuration

- APN: "simbase" - Used for cellular data connection
- Baud Rate: 115200
- Hardware Pins:
  - PIN_DTR: 25
  - PIN_TX: 27
  - PIN_RX: 26
  - PWR_PIN: 4

### Modem Initialization Process

1. Initialize hardware (serial port, pins)
2. Power on the modem with correct pulse timing
3. Test AT command response
4. Check SIM card status
5. Connect to network and GPRS

### Power Management

The modem supports sleep mode for power conservation:

- DTR pin control for sleep/wake
- Software commands for power management
- Support for wake-up after ESP32 deep sleep

### Troubleshooting

- If the modem doesn't respond, try a power cycle
- Check signal quality using diagnostic functions
- Verify SIM card is properly inserted
- Ensure the correct APN is configured for your cellular provider
