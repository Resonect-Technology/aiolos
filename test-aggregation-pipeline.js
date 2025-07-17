#!/usr/bin/env node

/**
 * Comprehensive Aiolos Wind Aggregation Pipeline Test
 *
 * This script tests the complete flow:
 * 1. Sends mock wind data to create raw readings
 * 2. Waits for 1-minute aggregations to be created
 * 3. Triggers 10-minute aggregations
 * 4. Verifies data appears in both aggregation tables
 * 5. Tests frontend data endpoints
 */

const axios = require("axios");

// Configuration
const BASE_URL = "http://localhost:8080";
const STATION_ID = "vasiliki-001";
const TEST_DURATION_MINUTES = 5; // Run test for 5 minutes (shortened for testing)
const WIND_DATA_INTERVAL_SECONDS = 5; // Send wind data every 5 seconds (faster for testing)

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}
function logError(message) {
  log(`❌ ${message}`, colors.red);
}
function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}
function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}
function logStep(message) {
  log(`🔄 ${message}`, colors.cyan);
}

// Test state
let testState = {
  windDataSent: 0,
  oneMinAggregations: 0,
  tenMinAggregations: 0,
  errors: 0,
  startTime: Date.now(),
};

// Generate realistic wind data with some variation
function generateWindData() {
  const baseSpeed = 8 + Math.sin(Date.now() / 60000) * 3; // Oscillating between 5-11 m/s
  const baseDirection = 180 + Math.sin(Date.now() / 120000) * 60; // Oscillating between 120-240 degrees

  return {
    windSpeed: Math.max(0, baseSpeed + (Math.random() - 0.5) * 4), // Add some randomness
    windDirection: (baseDirection + (Math.random() - 0.5) * 30) % 360, // Add some randomness
  };
}

// Send single wind data point
async function sendWindData() {
  try {
    const windData = generateWindData();
    console.log(
      `🌪️  Sending: ${JSON.stringify(windData)} to ${BASE_URL}/api/stations/${STATION_ID}/wind`
    );

    const response = await axios.post(`${BASE_URL}/api/stations/${STATION_ID}/wind`, windData, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    console.log(`📤 Response status: ${response.status}, data:`, response.data);

    testState.windDataSent++;
    if (testState.windDataSent % 5 === 0) {
      logInfo(
        `Sent ${testState.windDataSent} wind readings. Latest: ${windData.windSpeed.toFixed(1)} m/s @ ${windData.windDirection.toFixed(0)}°`
      );
    }
    return true;
  } catch (error) {
    logError(`Failed to send wind data: ${error.message}`);
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data:`, error.response.data);
    }
    testState.errors++;
    return false;
  }
}

// Check 1-minute aggregation count
async function check1MinAggregations() {
  try {
    const url = `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated?interval=1min&limit=100`;
    console.log(`🔍 Checking 1-min aggregations: ${url}`);

    const response = await axios.get(url, {
      timeout: 5000,
    });

    console.log(`📊 1-min response:`, response.data);

    const newCount = response.data.totalRecords;
    if (newCount > testState.oneMinAggregations) {
      const added = newCount - testState.oneMinAggregations;
      logSuccess(`Found ${added} new 1-minute aggregation(s). Total: ${newCount}`);
      testState.oneMinAggregations = newCount;
    }
    return newCount;
  } catch (error) {
    logError(`Failed to check 1-min aggregations: ${error.message}`);
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data:`, error.response.data);
    }
    testState.errors++;
    return 0;
  }
}

// Check 10-minute aggregation count
async function check10MinAggregations() {
  try {
    const url = `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated?interval=10min&limit=100`;
    console.log(`🔍 Checking 10-min aggregations: ${url}`);

    const response = await axios.get(url, {
      timeout: 5000,
    });

    console.log(`📊 10-min response:`, response.data);

    const newCount = response.data.totalRecords;
    if (newCount > testState.tenMinAggregations) {
      const added = newCount - testState.tenMinAggregations;
      logSuccess(`Found ${added} new 10-minute aggregation(s). Total: ${newCount}`);
      testState.tenMinAggregations = newCount;
    }
    return newCount;
  } catch (error) {
    logError(`Failed to check 10-min aggregations: ${error.message}`);
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data:`, error.response.data);
    }
    testState.errors++;
    return 0;
  }
}

// Trigger 10-minute aggregation
async function trigger10MinAggregation() {
  try {
    logStep("Triggering 10-minute aggregation...");
    const response = await axios.post(
      `${BASE_URL}/api/wind/aggregation/10min/trigger`,
      {},
      {
        timeout: 10000,
      }
    );

    if (response.data.success) {
      logSuccess("10-minute aggregation triggered successfully");
      return true;
    } else {
      logWarning(`10-minute aggregation trigger returned: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to trigger 10-min aggregation: ${error.message}`);
    testState.errors++;
    return false;
  }
}

// Force catchup for any missed aggregations
async function forceCatchup() {
  try {
    logStep("Running force catchup for missed aggregations...");
    const response = await axios.post(
      `${BASE_URL}/api/wind/aggregation/10min/force-catchup`,
      {},
      {
        timeout: 15000,
      }
    );

    if (response.data.success) {
      logSuccess(`Force catchup completed: ${response.data.message}`);
      return true;
    } else {
      logWarning(`Force catchup returned: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to run force catchup: ${error.message}`);
    testState.errors++;
    return false;
  }
}

// Check aggregation status
async function checkAggregationStatus() {
  try {
    const url = `${BASE_URL}/api/wind/aggregation/status`;
    console.log(`📋 Checking aggregation status: ${url}`);

    const response = await axios.get(url, {
      timeout: 5000,
    });

    console.log(`📋 Status response:`, response.data);

    logInfo(
      `Aggregation status: Last 1-min: ${response.data.last1MinAggregation || "None"}, Last 10-min: ${response.data.last10MinAggregation || "None"}`
    );
    return response.data;
  } catch (error) {
    logError(`Failed to check aggregation status: ${error.message}`);
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data:`, error.response.data);
    }
    testState.errors++;
    return null;
  }
}

// Test frontend endpoint (latest aggregated data)
async function testFrontendEndpoint() {
  try {
    const response1min = await axios.get(
      `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated/latest?interval=1min`,
      {
        timeout: 5000,
      }
    );

    const response10min = await axios.get(
      `${BASE_URL}/api/stations/${STATION_ID}/wind/aggregated/latest?interval=10min`,
      {
        timeout: 5000,
      }
    );

    logInfo(
      `Frontend data - 1min latest: ${response1min.data.timestamp || "None"}, 10min latest: ${response10min.data.timestamp || "None"}`
    );
    return true;
  } catch (error) {
    logError(`Failed to test frontend endpoint: ${error.message}`);
    testState.errors++;
    return false;
  }
}

// Print test summary
function printSummary() {
  const duration = (Date.now() - testState.startTime) / 1000;

  console.log(`\n${colors.bright}=== TEST SUMMARY ===${colors.reset}`);
  console.log(`Duration: ${duration.toFixed(1)} seconds`);
  console.log(`Wind data sent: ${testState.windDataSent}`);
  console.log(`1-minute aggregations: ${testState.oneMinAggregations}`);
  console.log(`10-minute aggregations: ${testState.tenMinAggregations}`);
  console.log(`Errors: ${testState.errors}`);

  const success =
    testState.windDataSent > 0 &&
    testState.oneMinAggregations > 0 &&
    testState.tenMinAggregations > 0 &&
    testState.errors < 5;

  if (success) {
    logSuccess("🎉 TEST PASSED: Complete aggregation pipeline working!");
  } else {
    logError("💥 TEST FAILED: Issues detected in aggregation pipeline");
  }

  console.log(`\n${colors.bright}=== RECOMMENDATIONS ===${colors.reset}`);
  if (testState.oneMinAggregations === 0) {
    console.log("- Check if 1-minute aggregation service is running");
  }
  if (testState.tenMinAggregations === 0) {
    console.log("- Check if 10-minute aggregation logic is working");
    console.log("- Try running the force-catchup endpoint manually");
  }
  if (testState.errors > 5) {
    console.log("- Check server logs for detailed error information");
    console.log("- Verify server is running on port 8080");
  }
}

// Main test execution
async function runTest() {
  log(`🚀 Starting Aiolos Wind Aggregation Pipeline Test`, colors.bright);
  log(`Station ID: ${STATION_ID}`);
  log(`Test duration: ${TEST_DURATION_MINUTES} minutes`);
  log(`Wind data interval: ${WIND_DATA_INTERVAL_SECONDS} seconds`);
  console.log("");

  // Test server connectivity first
  try {
    console.log(`🔗 Testing server connectivity: ${BASE_URL}`);
    await axios.get(`${BASE_URL}/healthcheck`, { timeout: 5000 });
    logSuccess("Server is reachable");
  } catch (error) {
    logError(`Server connectivity test failed: ${error.message}`);
    console.log("❌ Make sure the AdonisJS server is running on port 8080");
    process.exit(1);
  }

  // Initial status check
  await checkAggregationStatus();
  await check1MinAggregations();
  await check10MinAggregations();

  // Send a few test wind data points immediately
  logStep("Sending initial wind data points...");
  for (let i = 0; i < 5; i++) {
    await sendWindData();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between sends
  }

  // Start sending wind data regularly
  const windDataInterval = setInterval(sendWindData, WIND_DATA_INTERVAL_SECONDS * 1000);

  // Check aggregations every 30 seconds
  const checkInterval = setInterval(async () => {
    await check1MinAggregations();
    await check10MinAggregations();
    await testFrontendEndpoint();
  }, 30000);

  // Trigger 10-minute aggregation every 2 minutes
  const triggerInterval = setInterval(async () => {
    await trigger10MinAggregation();
  }, 120000);

  // Run force catchup after 5 minutes
  setTimeout(async () => {
    await forceCatchup();
  }, 300000);

  // Stop test after specified duration
  setTimeout(
    async () => {
      clearInterval(windDataInterval);
      clearInterval(checkInterval);
      clearInterval(triggerInterval);

      logStep("Test completed, performing final checks...");
      await checkAggregationStatus();
      await check1MinAggregations();
      await check10MinAggregations();
      await testFrontendEndpoint();

      printSummary();
      process.exit(0);
    },
    TEST_DURATION_MINUTES * 60 * 1000
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logWarning("Test interrupted by user");
    clearInterval(windDataInterval);
    clearInterval(checkInterval);
    clearInterval(triggerInterval);
    printSummary();
    process.exit(0);
  });

  logInfo("Test started! Press Ctrl+C to stop early...");
}

// Check if axios is available
try {
  require.resolve("axios");
} catch (e) {
  console.error("❌ axios is required. Please install it with: pnpm install axios");
  process.exit(1);
}

// Run the test
runTest().catch(error => {
  logError(`Test failed to start: ${error.message}`);
  process.exit(1);
});
