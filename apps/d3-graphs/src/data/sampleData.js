// Generate realistic sample data for testing D3.js charts
export function generateSampleData() {
  const now = new Date();
  const windData = [];
  const temperatureData = [];

  // Generate 48 hours of data (every 30 minutes)
  for (let i = 0; i < 96; i++) {
    const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000);

    // Wind data with some realistic patterns
    const baseWindSpeed = 8 + Math.sin(i * 0.1) * 3; // Base speed varies with time
    const windSpeed = Math.max(0, baseWindSpeed + (Math.random() - 0.5) * 4);

    // Wind direction - simulate changing wind patterns
    const baseDirection = (i * 2 + Math.sin(i * 0.05) * 45) % 360;
    const windDirection = (baseDirection + (Math.random() - 0.5) * 30 + 360) % 360;

    windData.push({
      timestamp,
      speed: Math.round(windSpeed * 10) / 10,
      direction: Math.round(windDirection),
      gust: Math.round((windSpeed + Math.random() * 5) * 10) / 10,
    });

    // Temperature data - simulate daily temperature cycle
    const baseTemp =
      20 + Math.sin(((i * 30 * 60 * 1000) / (24 * 60 * 60 * 1000)) * 2 * Math.PI) * 8;
    const temperature = baseTemp + (Math.random() - 0.5) * 2;

    temperatureData.push({
      timestamp,
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(60 + Math.sin(i * 0.08) * 20 + (Math.random() - 0.5) * 10),
      pressure: Math.round((1013 + Math.sin(i * 0.03) * 15 + (Math.random() - 0.5) * 5) * 10) / 10,
    });
  }

  return {
    windData: windData.reverse(), // Reverse so most recent is last
    temperatureData: temperatureData.reverse(),
  };
}

// Generate specific data patterns for testing
export function generateWindRoseData(windData) {
  const sectors = 16; // 16 compass directions
  const sectorSize = 360 / sectors;
  const speedBins = [0, 2, 4, 6, 8, 10, 15, 20]; // m/s

  const roseData = [];

  for (let sector = 0; sector < sectors; sector++) {
    const sectorAngle = sector * sectorSize;
    const sectorName = getCompassDirection(sectorAngle);

    for (let bin = 0; bin < speedBins.length - 1; bin++) {
      const minSpeed = speedBins[bin];
      const maxSpeed = speedBins[bin + 1];

      // Count data points in this sector and speed range
      const count = windData.filter(d => {
        const angle = d.direction;
        const speed = d.speed;

        // Check if direction falls in this sector
        const sectorStart = sectorAngle - sectorSize / 2;
        const sectorEnd = sectorAngle + sectorSize / 2;

        let inSector = false;
        if (sectorStart < 0) {
          inSector = angle >= sectorStart + 360 || angle <= sectorEnd;
        } else if (sectorEnd > 360) {
          inSector = angle >= sectorStart || angle <= sectorEnd - 360;
        } else {
          inSector = angle >= sectorStart && angle <= sectorEnd;
        }

        return inSector && speed >= minSpeed && speed < maxSpeed;
      }).length;

      roseData.push({
        sector,
        sectorAngle,
        sectorName,
        speedBin: bin,
        minSpeed,
        maxSpeed,
        count,
        percentage: (count / windData.length) * 100,
      });
    }
  }

  return roseData;
}

function getCompassDirection(angle) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(angle / 22.5) % 16;
  return directions[index];
}
