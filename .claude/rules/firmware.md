---
paths:
  - 'firmware/**'
  - 'platformio.ini'
---

# Firmware Rules

- **PlatformIO + Arduino framework** (root `platformio.ini`, sources in
  `firmware/src`). Do NOT port to ESP-IDF or "align" with hastr-monorepo's
  firmware setup — this project deliberately stays on PlatformIO.
- Secrets live in `firmware/secrets.ini` (gitignored;
  `firmware/secrets.ini.example` is the template). CI copies the example.
- Build: `pio run -e aiolos-esp32dev` (also `-debug`, `-calibration` envs).
  Upload/monitor need USB (`/dev/ttyACM0`) on the host — not available in
  devcontainers.
- Hardware: ESP32 + SIM7000G cellular modem, wind + temperature sensors,
  solar/battery power. Deployed units update via OTA windows configured through
  the station config API — a broken firmware release can strand remote devices;
  be conservative.
- The server contract the firmware depends on is documented in
  `.claude/rules/production-safety.md`.
