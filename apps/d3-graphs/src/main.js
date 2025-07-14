import * as d3 from "d3";
import { generateSampleData } from "./data/sampleData.js";
import { createWindSpeedChart } from "./charts/windSpeedChart.js";
import { createWindDirectionCompass } from "./charts/windDirectionCompass.js";
import { createWindRoseChart } from "./charts/windRoseChart.js";
import { createTemperatureChart } from "./charts/temperatureChart.js";

// Global data store
let windData = [];
let temperatureData = [];

// Initialize the application
function init() {
  console.log("🌪️ Aiolos D3.js Playground initialized");

  // Set up event listeners
  document.getElementById("generate-data").addEventListener("click", handleGenerateData);
  document.getElementById("clear-graphs").addEventListener("click", handleClearGraphs);

  // Generate initial sample data
  handleGenerateData();
}

function handleGenerateData() {
  const sampleData = generateSampleData();
  windData = sampleData.windData;
  temperatureData = sampleData.temperatureData;

  console.log("Generated sample data:", {
    windData: windData.length,
    temperatureData: temperatureData.length,
  });

  // Update all charts
  updateAllCharts();
}

function handleClearGraphs() {
  // Clear all SVG elements
  d3.select("#wind-speed-chart").selectAll("*").remove();
  d3.select("#wind-direction-compass").selectAll("*").remove();
  d3.select("#wind-rose-chart").selectAll("*").remove();
  d3.select("#temperature-chart").selectAll("*").remove();

  console.log("All graphs cleared");
}

function updateAllCharts() {
  // Create/update all charts with current data
  createWindSpeedChart("#wind-speed-chart", windData);
  createWindDirectionCompass("#wind-direction-compass", windData);
  createWindRoseChart("#wind-rose-chart", windData);
  createTemperatureChart("#temperature-chart", temperatureData);
}

// Start the application
init();
