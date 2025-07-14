import * as d3 from "d3";

export function createWindSpeedChart(selector, data) {
  // Clear previous chart
  d3.select(selector).selectAll("*").remove();

  // Set up dimensions and margins
  const container = d3.select(selector).node();
  const containerWidth = container.getBoundingClientRect().width;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
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

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.speed, d.gust))])
    .range([height, 0]);

  // Create line generators
  const speedLine = d3
    .line()
    .x(d => xScale(d.timestamp))
    .y(d => yScale(d.speed))
    .curve(d3.curveMonotoneX);

  const gustLine = d3
    .line()
    .x(d => xScale(d.timestamp))
    .y(d => yScale(d.gust))
    .curve(d3.curveMonotoneX);

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M")));

  g.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

  // Add axis labels
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Wind Speed (m/s)");

  // Add speed line
  g.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", speedLine)
    .style("stroke", "#667eea")
    .style("stroke-width", "2px")
    .style("fill", "none");

  // Add gust line
  g.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", gustLine)
    .style("stroke", "#e74c3c")
    .style("stroke-width", "1px")
    .style("fill", "none")
    .style("stroke-dasharray", "3,3");

  // Add dots for recent data points
  g.selectAll(".dot")
    .data(data.slice(-24)) // Last 24 points
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.timestamp))
    .attr("cy", d => yScale(d.speed))
    .attr("r", 3)
    .style("fill", "#667eea");

  // Add legend
  const legend = g
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 100}, 20)`);

  legend
    .append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", 0)
    .attr("y2", 0)
    .style("stroke", "#667eea")
    .style("stroke-width", "2px");

  legend
    .append("text")
    .attr("x", 25)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text("Speed");

  legend
    .append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", 15)
    .attr("y2", 15)
    .style("stroke", "#e74c3c")
    .style("stroke-width", "1px")
    .style("stroke-dasharray", "3,3");

  legend
    .append("text")
    .attr("x", 25)
    .attr("y", 15)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text("Gust");

  // Add tooltip
  const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

  g.selectAll(".dot")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `Time: ${d3.timeFormat("%H:%M")(d.timestamp)}<br/>Speed: ${d.speed} m/s<br/>Gust: ${d.gust} m/s`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });
}
