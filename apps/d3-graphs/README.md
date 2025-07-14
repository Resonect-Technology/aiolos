# D3.js Graph Playground for Aiolos

> **📊 Note:** The chart examples in this playground were generated with AI assistance as starting points for experimentation. Feel free to modify, improve, or completely rewrite them to suit your visualization needs.

This is a standalone D3.js experimentation environment for developing wind data visualizations for the Aiolos Weather Station project.

## What is this?

If you're coming from data science (Python, R, etc.), think of this as a JavaScript equivalent to creating plots with matplotlib or ggplot2, but for the web. D3.js is a powerful library for creating interactive data visualizations in web browsers.

This playground lets you experiment with different chart types without worrying about the complexities of a full web application. You can focus on the data visualization logic while the development server handles the technical details.

## Features

- **Wind Speed Chart**: Time-series line chart showing wind speed and gusts over time (like a line plot in matplotlib)
- **Wind Direction Compass**: Real-time compass showing current wind direction and speed (similar to a polar plot)
- **Wind Rose Chart**: Polar chart showing wind direction and speed distribution patterns (like a rose diagram in meteorology)
- **Temperature Chart**: Dual-axis chart showing temperature and humidity trends (like subplots with different y-axes)

## Prerequisites

✅ **You're all set!** Since you're working in a devcontainer, everything is already installed and configured:

- **Node.js** and **pnpm** are ready to use
- **VS Code** is your editor
- All development tools are pre-configured

## Setup

1. **Navigate to the project directory** (in the VS Code terminal):

   ```bash
   cd apps/d3-graphs
   ```

2. **Install dependencies** (this downloads the D3.js library and development tools):

   ```bash
   pnpm install
   ```

3. **Start the development server** (this starts a local web server with hot-reload):

   ```bash
   pnpm run dev
   ```

   You should see output like:

   ```
   Local:   http://localhost:3002/
   ```

4. **Open in your browser**:
   Navigate to `http://localhost:3002`

   The page will automatically refresh when you make changes to the code (hot-reload).

## Understanding the Code Structure

If you're new to JavaScript web development, here's what each part does:

### File Structure

```
apps/d3-graphs/
├── package.json              # Project configuration (like requirements.txt in Python)
├── vite.config.js            # Development server configuration
├── index.html                # Main HTML page (what loads in the browser)
├── src/
│   ├── main.js               # Main application entry point (like main.py)
│   ├── style.css             # Styling for the page (colors, fonts, layout)
│   ├── data/
│   │   └── sampleData.js     # Sample data generation (like creating test datasets)
│   └── charts/
│       ├── windSpeedChart.js       # Time-series wind speed visualization
│       ├── windDirectionCompass.js # Real-time compass display
│       ├── windRoseChart.js        # Wind rose polar chart
│       └── temperatureChart.js     # Temperature and humidity trends
```

### Key Concepts for Data Scientists

**JavaScript vs Python parallels:**

- `import` statements = `import` in Python
- `function` = `def` in Python
- `const`/`let` = variable assignment (like `=` in Python)
- Arrays `[]` = lists in Python
- Objects `{}` = dictionaries in Python

**D3.js concepts:**

- **Selections**: `d3.select()` picks HTML elements (like selecting dataframe rows)
- **Scales**: `d3.scaleLinear()` maps data values to visual properties (like normalizing data)
- **Data binding**: `.data()` connects your data to visual elements
- **SVG**: Scalable Vector Graphics - think of it as a canvas for drawing charts

### Development Workflow

1. **Edit code** in your editor (VS Code recommended)
2. **Save the file** - the browser automatically refreshes
3. **View results** in the browser at `http://localhost:3002`
4. **Debug** using browser developer tools (F12)

### Working with the Charts

Each chart function follows this pattern:

```javascript
export function createChartName(selector, data) {
    // 1. Clear any existing chart
    d3.select(selector).selectAll('*').remove();

    // 2. Set up dimensions and scales
    const width = 500;
    const height = 300;

    // 3. Create SVG container
    const svg = d3.select(selector).append('svg')...

    // 4. Process your data and create visualizations
    // This is where you'd do your data analysis and plotting
}
```

This is similar to creating a plotting function in Python where you:

1. Clear the previous plot
2. Set up the figure size
3. Create the plot
4. Add your data and styling

## Development

### Project Structure

```
src/
├── main.js                    # Main application entry point
├── style.css                  # Global styles and D3.js-specific CSS
├── data/
│   └── sampleData.js         # Sample data generation utilities
└── charts/
    ├── windSpeedChart.js     # Time-series wind speed visualization
    ├── windDirectionCompass.js  # Real-time compass display
    ├── windRoseChart.js      # Wind rose polar chart
    └── temperatureChart.js   # Temperature and humidity trends
```

### Adding New Charts

1. **Create a new file** in `src/charts/` (e.g., `myNewChart.js`)
2. **Write your chart function**:

   ```javascript
   import * as d3 from "d3";

   export function createMyNewChart(selector, data) {
     // Your chart code here
   }
   ```

3. **Import and use it** in `src/main.js`:

   ```javascript
   import { createMyNewChart } from "./charts/myNewChart.js";

   // Then call it in updateAllCharts()
   createMyNewChart("#my-chart", myData);
   ```

### Understanding the Data Format

The charts expect JavaScript objects (similar to Python dictionaries) with this structure:

```javascript
// Wind data (array of objects)
const windData = [
  {
    timestamp: new Date("2025-01-01T12:00:00Z"), // JavaScript Date object
    speed: 8.5, // number (m/s)
    direction: 180, // number (degrees, 0-360)
    gust: 12.3, // number (m/s)
  },
  // ... more data points
];

// Temperature data
const temperatureData = [
  {
    timestamp: new Date("2025-01-01T12:00:00Z"),
    temperature: 22.5, // number (°C)
    humidity: 65, // number (%)
    pressure: 1013.2, // number (hPa)
  },
  // ... more data points
];
```

**Data Science parallel:** This is like having a pandas DataFrame where each object is a row and each property is a column.

### Styling and Colors

The project uses a consistent color scheme:

- **Primary**: `#667eea` (blue-purple)
- **Secondary**: `#e74c3c` (red)
- **Accent**: `#3498db` (blue)

CSS classes are defined in `src/style.css`. Think of CSS as styling instructions for the web page (like setting plot themes in matplotlib).

### Common D3.js Patterns for Data Scientists

**Loading and processing data:**

```javascript
// Similar to pd.read_csv() or loading data in Python
const processedData = rawData.map(d => ({
  x: new Date(d.timestamp),
  y: +d.value, // '+' converts string to number
}));
```

**Creating scales (like normalizing data):**

```javascript
// Similar to MinMaxScaler in scikit-learn
const xScale = d3
  .scaleTime()
  .domain(d3.extent(data, d => d.timestamp)) // input range
  .range([0, width]); // output range
```

**Drawing elements:**

```javascript
// Similar to plt.scatter() or plt.plot()
svg
  .selectAll("circle")
  .data(data)
  .enter()
  .append("circle")
  .attr("cx", d => xScale(d.timestamp))
  .attr("cy", d => yScale(d.value))
  .attr("r", 3);
```

## Testing Your Charts

### Using the Playground

1. **Click "Generate Sample Data"** to create realistic test data
2. **Click "Clear All Graphs"** to start fresh
3. **Modify the code** in your editor and save - the browser will automatically refresh
4. **Use browser developer tools** (F12) to debug:
   - **Console tab**: See JavaScript errors and console.log() output
   - **Elements tab**: Inspect the HTML/SVG structure
   - **Network tab**: Monitor data loading

### Sample Data Generation

The playground includes realistic sample data that mimics:

- Daily temperature cycles (like seasonal patterns)
- Changing wind patterns (with realistic variability)
- Seasonal variations
- Random fluctuations (like noise in real data)

The data generator in `src/data/sampleData.js` creates patterns similar to what you might generate with NumPy or pandas in Python.

### Debugging Tips for Data Scientists

**Common issues and solutions:**

1. **"undefined is not a function"** = Usually a typo or missing import
2. **Nothing appears on screen** = Check the browser console for errors
3. **Data not updating** = Make sure you're calling the chart function with new data
4. **SVG elements not visible** = Check CSS styling and SVG dimensions

**Useful debugging techniques:**

```javascript
// JavaScript equivalent of print() in Python
console.log("My data:", data);

// Check data structure
console.table(data.slice(0, 5)); // Show first 5 rows like df.head()

// Check if data is loading correctly
console.log("Data length:", data.length);
console.log("First item:", data[0]);
```

## Integration with React Frontend

Once your charts are ready, they can be integrated into the React frontend at `apps/react-frontend/` by:

1. **Copying the chart functions** to the React project
2. **Adapting them to work with React refs and state** (the React developers can help with this)
3. **Using the same data format** from the backend API

Think of this as moving your matplotlib plots into a web dashboard - the visualization logic stays the same, but the integration changes.

## Useful Resources for Data Scientists Learning D3.js

- **[D3.js Documentation](https://d3js.org/)** - Official docs with examples
- **[Observable](https://observablehq.com/)** - Interactive D3.js notebooks (like Jupyter notebooks)
- **[D3 in Depth](https://www.d3indepth.com/)** - Comprehensive tutorials
- **[D3 Graph Gallery](https://d3-graph-gallery.com/)** - Chart examples with code

## Tips for Development

- **Start small**: Modify existing charts before creating new ones
- **Use console.log()** liberally for debugging (like print() in Python)
- **Test with different data**: Use the sample data generator to test edge cases
- **Browser developer tools**: F12 is your friend for debugging
- **Save frequently**: The hot-reload will show changes immediately
- **Think in terms of data transformations**: D3.js is about transforming data into visual elements
