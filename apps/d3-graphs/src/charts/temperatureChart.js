import * as d3 from "d3";

export function createTemperatureChart(selector, data) {
  // Clear previous chart
  d3.select(selector).selectAll("*").remove();

  // Set up dimensions and margins
  const container = d3.select(selector).node();
  const containerWidth = container.getBoundingClientRect().width;
  const margin = { top: 20, right: 60, bottom: 40, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  // Create SVG
  const svg = d3
    .select(selector)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Set up scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(data, d => d.timestamp))
    .range([0, width]);

  const tempScale = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d.temperature))
    .range([height, 0]);

  const humidityScale = d3.scaleLinear().domain([0, 100]).range([height, 0]);

  // Create line generators
  const tempLine = d3
    .line()
    .x(d => xScale(d.timestamp))
    .y(d => tempScale(d.temperature))
    .curve(d3.curveMonotoneX);

  const humidityLine = d3
    .line()
    .x(d => xScale(d.timestamp))
    .y(d => humidityScale(d.humidity))
    .curve(d3.curveMonotoneX);

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M")));

  g.append("g").attr("class", "axis").call(d3.axisLeft(tempScale));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${width},0)`)
    .call(d3.axisRight(humidityScale));

  // Add axis labels
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#e74c3c")
    .text("Temperature (°C)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", width + margin.right - 10)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#3498db")
    .text("Humidity (%)");

  // Add temperature area
  const tempArea = d3
    .area()
    .x(d => xScale(d.timestamp))
    .y0(height)
    .y1(d => tempScale(d.temperature))
    .curve(d3.curveMonotoneX);

  g.append("path").datum(data).attr("d", tempArea).style("fill", "#e74c3c").style("opacity", 0.3);

  // Add temperature line
  g.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", tempLine)
    .style("stroke", "#e74c3c")
    .style("stroke-width", "2px")
    .style("fill", "none");

  // Add humidity line
  g.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", humidityLine)
    .style("stroke", "#3498db")
    .style("stroke-width", "2px")
    .style("fill", "none");

  // Add dots for recent data points
  g.selectAll(".temp-dot")
    .data(data.slice(-12)) // Last 12 points
    .enter()
    .append("circle")
    .attr("class", "temp-dot")
    .attr("cx", d => xScale(d.timestamp))
    .attr("cy", d => tempScale(d.temperature))
    .attr("r", 3)
    .style("fill", "#e74c3c")
    .style("stroke", "white")
    .style("stroke-width", 2);

  g.selectAll(".humidity-dot")
    .data(data.slice(-12)) // Last 12 points
    .enter()
    .append("circle")
    .attr("class", "humidity-dot")
    .attr("cx", d => xScale(d.timestamp))
    .attr("cy", d => humidityScale(d.humidity))
    .attr("r", 3)
    .style("fill", "#3498db")
    .style("stroke", "white")
    .style("stroke-width", 2);

  // Add legend
  const legend = g.append("g").attr("class", "legend").attr("transform", `translate(20, 20)`);

  // Temperature legend
  legend
    .append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", 0)
    .attr("y2", 0)
    .style("stroke", "#e74c3c")
    .style("stroke-width", "2px");

  legend
    .append("text")
    .attr("x", 25)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("fill", "#e74c3c")
    .text("Temperature");

  // Humidity legend
  legend
    .append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", 15)
    .attr("y2", 15)
    .style("stroke", "#3498db")
    .style("stroke-width", "2px");

  legend
    .append("text")
    .attr("x", 25)
    .attr("y", 15)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("fill", "#3498db")
    .text("Humidity");

  // Add tooltips
  const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

  g.selectAll(".temp-dot")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `Time: ${d3.timeFormat("%H:%M")(d.timestamp)}<br/>Temperature: ${d.temperature}°C<br/>Humidity: ${d.humidity}%<br/>Pressure: ${d.pressure} hPa`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  g.selectAll(".humidity-dot")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `Time: ${d3.timeFormat("%H:%M")(d.timestamp)}<br/>Temperature: ${d.temperature}°C<br/>Humidity: ${d.humidity}%<br/>Pressure: ${d.pressure} hPa`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });
}
