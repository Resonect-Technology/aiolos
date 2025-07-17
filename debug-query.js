#!/usr/bin/env node

/**
 * Debug specific database queries to understand why 10-minute aggregation isn't working
 */

const axios = require("axios");

const BASE_URL = "http://localhost:8080";
const STATION_ID = "vasiliki-001";

async function debugQuery() {
  try {
    console.log("🔍 Testing specific database queries...\n");

    // Test the exact query that should find 1-minute data in 21:50 interval
    console.log("📊 Testing interval 21:50:00 - should contain 21:54-21:59 data");

    const response = await axios.post(`${BASE_URL}/api/debug/test-10min-query`, {
      stationId: STATION_ID,
      intervalStart: "2025-07-17T21:50:00.000Z",
    });

    console.log("Query result:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Debug query failed:", error.message);
    if (error.response) {
      console.log("Response data:", error.response.data);
    }
  }
}

debugQuery();
