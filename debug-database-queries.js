#!/usr/bin/env node

/**
 * Database query debug script
 */

const axios = require("axios");

const BASE_URL = "http://localhost:8080";
const STATION_ID = "vasiliki-001";

async function debugDatabaseQueries() {
  console.log("🔍 Debugging database queries...\n");

  try {
    // 1. Get current time info
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Two hours ago: ${twoHoursAgo.toISOString()}`);

    // 2. Check what 1-minute data exists
    console.log("\n📊 Checking 1-minute data...");
    const oneMinResponse = await axios.get(
      `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated?interval=1min&limit=50`
    );

    console.log(`Found ${oneMinResponse.data.totalRecords} 1-minute records total`);

    if (oneMinResponse.data.data.length > 0) {
      const latest = oneMinResponse.data.data[oneMinResponse.data.data.length - 1];
      const earliest = oneMinResponse.data.data[0];
      console.log(`Latest: ${latest.timestamp}`);
      console.log(`Earliest: ${earliest.timestamp}`);

      // Show all timestamps
      console.log("\nAll 1-minute timestamps:");
      oneMinResponse.data.data.forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.timestamp} (${record.avgSpeed} m/s)`);
      });

      // Check if any fall in the expected 10-minute intervals
      console.log("\n🕐 10-minute interval analysis:");
      const timestamps = oneMinResponse.data.data.map(r => new Date(r.timestamp));
      const intervals = new Set();

      timestamps.forEach(ts => {
        const minute = Math.floor(ts.getMinutes() / 10) * 10;
        const intervalStart = new Date(ts);
        intervalStart.setMinutes(minute, 0, 0);
        intervals.add(intervalStart.toISOString());
      });

      console.log(`Found ${intervals.size} potential 10-minute intervals:`);
      Array.from(intervals)
        .sort()
        .forEach(interval => {
          console.log(`  - ${interval}`);
        });
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
  }
}

// Run the debug
debugDatabaseQueries();
