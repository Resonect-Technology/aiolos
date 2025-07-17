#!/usr/bin/env node

/**
 * Time calculation debug script
 */

// Simulate the DateTime logic from Luxon
function get10MinuteIntervalStart(timestamp) {
  const date = new Date(timestamp);
  const minute = Math.floor(date.getMinutes() / 10) * 10;
  const result = new Date(date);
  result.setMinutes(minute, 0, 0);
  return result;
}

async function debugTimeCalculations() {
  console.log("🕐 Debugging time calculations...\n");

  const now = new Date();
  const currentIntervalStart = get10MinuteIntervalStart(now);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  console.log(`Now: ${now.toISOString()}`);
  console.log(`Current 10-min interval start: ${currentIntervalStart.toISOString()}`);
  console.log(`Two hours ago: ${twoHoursAgo.toISOString()}`);

  console.log(
    `\nQuery range: ${twoHoursAgo.toISOString()} to ${currentIntervalStart.toISOString()}`
  );

  // Check if our 1-minute data timestamps fall in this range
  const oneMinTimestamps = [
    "2025-07-17T21:29:00.000Z",
    "2025-07-17T21:36:00.000Z",
    "2025-07-17T21:37:00.000Z",
    "2025-07-17T21:38:00.000Z",
    "2025-07-17T21:39:00.000Z",
    "2025-07-17T21:40:00.000Z",
    "2025-07-17T21:41:00.000Z",
    "2025-07-17T21:54:00.000Z",
    "2025-07-17T21:55:00.000Z",
    "2025-07-17T21:56:00.000Z",
    "2025-07-17T21:57:00.000Z",
    "2025-07-17T21:58:00.000Z",
    "2025-07-17T21:59:00.000Z",
  ];

  console.log("\n📊 1-minute data in query range:");
  let inRange = 0;
  oneMinTimestamps.forEach(ts => {
    const timestamp = new Date(ts);
    const isInRange = timestamp >= twoHoursAgo && timestamp < currentIntervalStart;
    console.log(`  ${ts}: ${isInRange ? "✅ IN RANGE" : "❌ OUT OF RANGE"}`);
    if (isInRange) inRange++;
  });

  console.log(`\nResult: ${inRange} timestamps in query range`);

  if (inRange === 0) {
    console.log("\n💡 FOUND THE ISSUE: No 1-minute data in the query time range!");
    console.log("The query is looking for data that doesn't exist in the specified time window.");
  }
}

// Run the debug
debugTimeCalculations();
