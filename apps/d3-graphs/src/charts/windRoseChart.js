import * as d3 from "d3";
import { generateWindRoseData } from "../data/sampleData.js";

export function createWindRoseChart(selector, data) {
  // Clear previous chart
  d3.select(selector).selectAll("*").remove();

  if (!data || data.length === 0) return;

  // Generate wind rose data
  const roseData = generateWindRoseData(data);

  // Set up dimensions
  const container = d3.select(selector).node();
  const containerWidth = container.getBoundingClientRect().width;
  const size = Math.min(containerWidth, 350);
  const radius = size / 2 - 40;
  const center = { x: size / 2, y: size / 2 };

  // Create SVG
  const svg = d3.select(selector).append("svg").attr("width", size).attr("height", size);

  const g = svg.append("g").attr("transform", `translate(${center.x},${center.y})`);

  // Color scale for wind speed bins
  const colorScale = d3
    .scaleOrdinal()
    .domain([0, 1, 2, 3, 4, 5, 6, 7])
    .range([
      "#3498db",
      "#5dade2",
      "#85c1e9",
      "#f39c12",
      "#e67e22",
      "#d35400",
      "#e74c3c",
      "#c0392b",
    ]);

  // Scale for radial distance based on percentage
  const radiusScale = d3
    .scaleLinear()
    .domain([0, d3.max(roseData, d => d.percentage)])
    .range([0, radius]);

  // Group data by sector
  const sectors = d3.group(roseData, d => d.sector);

  // Create sectors
  sectors.forEach((sectorData, sector) => {
    const sectorAngle = ((sector * 22.5 - 90) * Math.PI) / 180;
    const sectorWidth = (22.5 * Math.PI) / 180;

    let cumulativeRadius = 0;

    sectorData.forEach(d => {
      if (d.count > 0) {
        const innerRadius = cumulativeRadius;
        const outerRadius = cumulativeRadius + radiusScale(d.percentage);

        const arc = d3
          .arc()
          .innerRadius(innerRadius)
          .outerRadius(outerRadius)
          .startAngle(sectorAngle - sectorWidth / 2)
          .endAngle(sectorAngle + sectorWidth / 2);

        g.append("path")
          .attr("d", arc)
          .attr("class", "wind-rose-sector")
          .style("fill", colorScale(d.speedBin))
          .style("stroke", "white")
          .style("stroke-width", 1)
          .on("mouseover", function (event) {
            // Tooltip
            const tooltip = d3
              .select("body")
              .append("div")
              .attr("class", "tooltip")
              .style("opacity", 0);

            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip
              .html(
                `Direction: ${d.sectorName}<br/>Speed: ${d.minSpeed}-${d.maxSpeed} m/s<br/>Frequency: ${d.percentage.toFixed(1)}%`
              )
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
          })
          .on("mouseout", function () {
            d3.selectAll(".tooltip").remove();
          });

        cumulativeRadius = outerRadius;
      }
    });
  });

  // Add compass directions
  const directions = [
    { angle: 0, label: "N" },
    { angle: 45, label: "NE" },
    { angle: 90, label: "E" },
    { angle: 135, label: "SE" },
    { angle: 180, label: "S" },
    { angle: 225, label: "SW" },
    { angle: 270, label: "W" },
    { angle: 315, label: "NW" },
  ];

  directions.forEach(dir => {
    const angleRad = ((dir.angle - 90) * Math.PI) / 180;
    const x = Math.cos(angleRad) * (radius + 15);
    const y = Math.sin(angleRad) * (radius + 15);

    g.append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(dir.label);
  });

  // Add concentric circles for scale
  const maxPercentage = d3.max(roseData, d => d.percentage);
  const scaleSteps = [0.25, 0.5, 0.75, 1];

  scaleSteps.forEach(step => {
    const r = radiusScale(maxPercentage * step);
    g.append("circle")
      .attr("r", r)
      .style("fill", "none")
      .style("stroke", "#ddd")
      .style("stroke-width", 1)
      .style("stroke-dasharray", "2,2");

    g.append("text")
      .attr("x", 5)
      .attr("y", -r)
      .style("font-size", "10px")
      .style("fill", "#666")
      .text(`${(maxPercentage * step).toFixed(1)}%`);
  });

  // Add legend
  const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(20, 20)`);

  const speedBins = [
    { min: 0, max: 2, color: colorScale(0) },
    { min: 2, max: 4, color: colorScale(1) },
    { min: 4, max: 6, color: colorScale(2) },
    { min: 6, max: 8, color: colorScale(3) },
    { min: 8, max: 10, color: colorScale(4) },
    { min: 10, max: 15, color: colorScale(5) },
    { min: 15, max: 20, color: colorScale(6) },
    { min: 20, max: 25, color: colorScale(7) },
  ];

  speedBins.forEach((bin, i) => {
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", i * 18)
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", bin.color);

    legend
      .append("text")
      .attr("x", 16)
      .attr("y", i * 18 + 6)
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .style("fill", "#333")
      .text(`${bin.min}-${bin.max} m/s`);
  });

  // Add title
  g.append("text")
    .attr("y", -(radius + 30))
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text("Wind Rose - Direction & Speed Distribution");
}
