import * as d3 from "d3";

export function createWindDirectionCompass(selector, data) {
  // Clear previous chart
  d3.select(selector).selectAll("*").remove();

  // Get latest wind data
  const latestData = data[data.length - 1];
  if (!latestData) return;

  // Set up dimensions
  const container = d3.select(selector).node();
  const containerWidth = container.getBoundingClientRect().width;
  const size = Math.min(containerWidth, 350);
  const radius = size / 2 - 20;
  const center = { x: size / 2, y: size / 2 };

  // Create SVG
  const svg = d3.select(selector).append("svg").attr("width", size).attr("height", size);

  const g = svg.append("g").attr("transform", `translate(${center.x},${center.y})`);

  // Draw compass circles
  const circles = [0.25, 0.5, 0.75, 1];
  g.selectAll(".compass-circle")
    .data(circles)
    .enter()
    .append("circle")
    .attr("class", "compass-circle")
    .attr("r", d => d * radius)
    .style("fill", "none")
    .style("stroke", "#ddd")
    .style("stroke-width", 1);

  // Draw compass directions
  const directions = [
    { angle: 0, label: "N" },
    { angle: 90, label: "E" },
    { angle: 180, label: "S" },
    { angle: 270, label: "W" },
    { angle: 45, label: "NE" },
    { angle: 135, label: "SE" },
    { angle: 225, label: "SW" },
    { angle: 315, label: "NW" },
  ];

  directions.forEach(dir => {
    const angleRad = ((dir.angle - 90) * Math.PI) / 180;
    const x = Math.cos(angleRad) * (radius + 10);
    const y = Math.sin(angleRad) * (radius + 10);

    g.append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(dir.label);

    // Draw direction lines
    const x1 = Math.cos(angleRad) * (radius - 10);
    const y1 = Math.sin(angleRad) * (radius - 10);
    const x2 = Math.cos(angleRad) * radius;
    const y2 = Math.sin(angleRad) * radius;

    g.append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .style("stroke", "#666")
      .style("stroke-width", 2);
  });

  // Draw wind direction needle
  const windAngle = ((latestData.direction - 90) * Math.PI) / 180;
  const needleLength = radius * 0.8;
  const needleWidth = 8;

  // Create arrow path
  const arrowPath = d3.path();
  arrowPath.moveTo(0, -needleWidth / 2);
  arrowPath.lineTo(needleLength - 15, -needleWidth / 2);
  arrowPath.lineTo(needleLength, 0);
  arrowPath.lineTo(needleLength - 15, needleWidth / 2);
  arrowPath.lineTo(0, needleWidth / 2);
  arrowPath.closePath();

  g.append("path")
    .attr("d", arrowPath.toString())
    .attr("transform", `rotate(${latestData.direction})`)
    .style("fill", "#e74c3c")
    .style("stroke", "#c0392b")
    .style("stroke-width", 1);

  // Add center circle
  g.append("circle")
    .attr("r", 8)
    .style("fill", "#34495e")
    .style("stroke", "#2c3e50")
    .style("stroke-width", 2);

  // Add speed indicator in center
  g.append("text")
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text(`${latestData.speed} m/s`);

  // Add direction in degrees
  g.append("text")
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#666")
    .text(`${latestData.direction}°`);

  // Add wind speed scale
  const speedScale = d3
    .scaleLinear()
    .domain([0, 20])
    .range([0, radius * 0.6]);

  // Draw speed indicator arc
  const speedArc = d3
    .arc()
    .innerRadius(radius * 0.1)
    .outerRadius(radius * 0.2)
    .startAngle(-Math.PI / 2)
    .endAngle(-Math.PI / 2 + (latestData.speed / 20) * Math.PI);

  g.append("path").attr("d", speedArc).style("fill", "#3498db").style("opacity", 0.7);

  // Add timestamp
  g.append("text")
    .attr("y", radius + 25)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", "#999")
    .text(d3.timeFormat("%H:%M:%S")(latestData.timestamp));
}
