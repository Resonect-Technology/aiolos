#!/usr/bin/env node

/**
 * Debug script to understand why 10-minute aggregations aren't working
 */

const axios = require("axios");

const BASE_URL = "http://localhost:8080";
const STATION_ID = "vasiliki-001";

async function debug10MinAggregation() {
  console.log("🔍 Debugging 10-minute aggregation pipeline...\n");

  try {
    // 1. Check 1-minute data availability
    console.log("📊 Checking 1-minute data...");
    const oneMinResponse = await axios.get(
      `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated?interval=1min&limit=20`
    );

    console.log(`Found ${oneMinResponse.data.totalRecords} 1-minute records`);
    if (oneMinResponse.data.data.length > 0) {
      const latest = oneMinResponse.data.data[oneMinResponse.data.data.length - 1];
      const earliest = oneMinResponse.data.data[0];
      console.log(`Latest: ${latest.timestamp}`);
      console.log(`Earliest: ${earliest.timestamp}`);
    }

    // 2. Check current 10-minute data
    console.log("\n📊 Checking 10-minute data...");
    const tenMinResponse = await axios.get(
      `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated?interval=10min&limit=20`
    );

    console.log(`Found ${tenMinResponse.data.totalRecords} 10-minute records`);
    if (tenMinResponse.data.data.length > 0) {
      const latest = tenMinResponse.data.data[tenMinResponse.data.data.length - 1];
      console.log(`Latest 10-min: ${latest.timestamp}`);
    } else {
      console.log("❌ No 10-minute records found");
    }

    // 3. Trigger aggregation and watch
    console.log("\n🔄 Triggering 10-minute aggregation...");
    const triggerResponse = await axios.post(`${BASE_URL}/api/wind/aggregation/10min/trigger`, {});
    console.log(`Trigger response: ${triggerResponse.data.message}`);

    // 4. Wait and check again
    console.log("\n⏱️ Waiting 3 seconds then checking again...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    const tenMinResponse2 = await axios.get(
      `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated?interval=10min&limit=20`
    );

    console.log(`Found ${tenMinResponse2.data.totalRecords} 10-minute records after trigger`);
    if (tenMinResponse2.data.data.length > 0) {
      const latest = tenMinResponse2.data.data[tenMinResponse2.data.data.length - 1];
      console.log(`✅ Latest 10-min: ${latest.timestamp}`);
    } else {
      console.log("❌ Still no 10-minute records found");
    }

    // 5. Force catchup
    console.log("\n🔄 Running force catchup...");
    const catchupResponse = await axios.post(
      `${BASE_URL}/api/wind/aggregation/10min/force-catchup`,
      {}
    );
    console.log(`Catchup response: ${catchupResponse.data.message}`);

    // 6. Final check
    console.log("\n⏱️ Waiting 3 seconds then final check...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    const tenMinResponse3 = await axios.get(
      `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated?interval=10min&limit=20`
    );

    console.log(`\n📊 FINAL RESULT: ${tenMinResponse3.data.totalRecords} 10-minute records`);
    if (tenMinResponse3.data.data.length > 0) {
      console.log("✅ SUCCESS: 10-minute aggregations working!");
      tenMinResponse3.data.data.forEach(record => {
        console.log(`  ${record.timestamp}: ${record.avgSpeed} m/s @ ${record.dominantDirection}°`);
      });
    } else {
      console.log("❌ FAILED: No 10-minute aggregations created");
      console.log("\n🔧 Possible issues:");
      console.log("- Check server console logs for errors");
      console.log("- Verify aggregation service is running");
      console.log("- Check database connection");
      console.log("- Verify data exists in correct time ranges");
    }
  } catch (error) {
    console.error("❌ Debug script failed:", error.message);
  }
}

// Run the debug
debug10MinAggregation();
