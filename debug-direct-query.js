#!/usr/bin/env node

/**
 * Direct database query test
 */

const axios = require("axios");

async function testDirectQuery() {
  console.log("🔍 Testing direct database query...\n");

  try {
    // Call a simple endpoint to trigger logging of the station query
    await axios.post("http://localhost:8080/api/wind/aggregation/10min/trigger");

    console.log("✅ Triggered aggregation - check server logs for debug output");
  } catch (error) {
    console.error("❌ Failed:", error.message);
  }
}

testDirectQuery();
