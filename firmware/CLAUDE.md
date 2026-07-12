# firmware/

ESP32 weather-station firmware — PlatformIO + Arduino framework (root
`platformio.ini`; do NOT port to ESP-IDF). See `.claude/rules/firmware.md`.

## Layout

- `src/main.cpp` — main loop (sensor sampling, send intervals, sleep, OTA
  windows)
- `src/core/` — cellular (TinyGSM/SIM7000G), HTTP client, OTA
- `src/sensors/` — wind (speed/direction) and temperature (Dallas)
- `src/config/Config.h` — compile-time config; server is
  `aiolos.resonect.cz:80` (plain HTTP)

## Commands

```sh
cp secrets.ini.example secrets.ini   # once; fill APN/OTA values
pio run -e aiolos-esp32dev           # build (CI runs this)
pio run -e aiolos-esp32dev -t upload # needs USB (/dev/ttyACM0)
pio device monitor
```

Envs: `aiolos-esp32dev` (prod), `aiolos-esp32dev-debug`,
`aiolos-esp32dev-calibration`.

Runtime intervals (wind send/sample, diagnostics, sleep hours, OTA window)
come from the server config endpoint — change behavior there before
considering a firmware release; deployed units are remote and solar-powered.
