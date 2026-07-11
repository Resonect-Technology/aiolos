# React Frontend - Aiolos Project

This application is the frontend for the Aiolos live wind data monitoring
system. It features a professional, modular wind monitoring dashboard built with
React (using Vite), TypeScript, Tailwind CSS, and modern UI components.

## Architecture

The frontend follows **Atomic Design principles** for component organization,
providing a clear hierarchy and improved maintainability:

- **Atoms**: Basic building blocks (buttons, inputs, icons)
- **Molecules**: Simple component combinations (form fields, cards)
- **Organisms**: Complex components (navigation, panels, complete sections)
- **Pages**: Full page layouts combining organisms
- **Providers**: Context providers for state management

## Key Features

### 🌪️ **Comprehensive Wind Dashboard**

- **Modular Component Architecture**: Clean separation of concerns with
  dedicated components for each feature
- **Responsive Design**: Professional layout that adapts beautifully from mobile
  to desktop
- **Modern UI**: Polished interface with cards, shadows, rounded corners, and
  smooth transitions

### 📊 **Advanced Wind Visualization**

- **Dynamic Wind Speed Gauge**:
  - Large, prominent semicircular gauge with unified color scheme
  - **Multi-Unit Support**: Switch between m/s, km/h, knots, and Beaufort scale
  - **Adaptive Scaling**: Automatic scale adjustment with appropriate tick marks
    and ranges
  - **Color-Coded Ranges**: Unified wind speed color palette across all
    components
  - **Informative Tooltips**: Descriptive tooltips for each wind speed range
    (e.g., "Calm", "Moderate breeze", "Gale")

- **Wind Direction Compass**:
  - Interactive compass with animated wind direction indicator
  - Real-time rotation based on incoming wind direction data
  - Clean, minimalist design with clear directional markings

- **Wind Rose Chart**:
  - Professional wind rose visualization showing wind patterns over time
  - Consistent color scheme matching the speed gauge
  - Always-visible legend positioned below the chart
  - Historical wind data analysis capabilities

### 🎛️ **User Controls & Status**

- **Unit Selector**: Clean dropdown for switching between wind speed units
- **Connection Status**: Real-time connection indicator with visual feedback
- **Control Panel**: Comprehensive mock data controls for testing:
  - Start/Stop continuous mock data streams
  - Send single mock data events
  - Clear historical wind data
  - View latest wind data with timestamps

### 🔧 **Technical Features**

- **Real-time Data**: SSE connection to AdonisJS backend via
  `@adonisjs/transmit-client`
- **Station Selection**: Dynamic station ID input for monitoring specific data
  channels
- **Error Handling**: Robust error handling with user-friendly error messages
- **Development Proxy**: Vite proxy configuration for seamless backend
  integration
- **Type Safety**: Full TypeScript implementation with proper type definitions

## Component Architecture

The application is built with **Atomic Design methodology** for optimal
component organization and reusability:

### Atomic Design Structure

```
src/components/
├── atoms/              # Basic building blocks
│   ├── ui/            # Base UI components (Button, Input, Card, etc.)
│   └── icons/         # Icon components
├── molecules/         # Simple component combinations
│   ├── forms/         # Form-related components
│   └── cards/         # Card-based components
├── organisms/         # Complex, feature-complete components
│   ├── navigation/    # Navigation components (AppSidebar, SiteHeader)
│   ├── dashboard/     # Dashboard-specific organisms
│   └── panels/        # Feature panels and sections
├── pages/             # Complete page layouts
│   ├── dashboard-page.tsx
│   └── landing-page.tsx
└── providers/         # Context providers and state management
    └── wind-data-provider.tsx
```

### Wind Dashboard Components

- **`WindDashboard`** (Organism): Main dashboard container with responsive grid
  layout
- **`WindSpeedDisplay`** (Organism): Large wind speed gauge with unit conversion
- **`WindDirectionCompass`** (Organism): Animated compass showing wind direction
- **`WindRoseChart`** (Organism): Historical wind pattern visualization
- **`UnitSelector`** (Molecule): Wind speed unit selection dropdown
- **`ControlPanel`** (Organism): Mock data controls and wind data display
- **`ConnectionStatus`** (Molecule): Real-time connection status indicator

### Utilities

- **`wind-utils.ts`**: Centralized wind data utilities including:
  - Unit conversion functions
  - Unified color scheme for wind speeds
  - Gauge configuration helpers
  - Wind speed range definitions

## Technologies Used

- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [@adonisjs/transmit-client](https://github.com/adonisjs/transmit-client) - SSE
  communication
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [react-gauge-component](https://github.com/antoniolago/react-gauge-component) -
  Wind speed gauge
- [Plotly.js](https://plotly.com/javascript/) - Wind rose chart visualization

## Setup and Running

### Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm

### Installation & Development

1.  Navigate to the `apps/react-frontend` directory:

    ```bash
    cd apps/react-frontend
    ```

2.  Install dependencies:

    ```bash
    pnpm install
    # or
    npm install
    ```

3.  Start the development server:

    ```bash
    pnpm run dev
    # or
    npm run dev
    ```

4.  Open your browser to `http://localhost:5173`

### Backend Integration

The frontend is configured to proxy API and SSE requests to the AdonisJS
backend:

- API requests (`/api/*`) → `http://localhost:3333`
- SSE requests (`/__transmit/*`) → `http://localhost:3333`

Make sure the AdonisJS backend is running on port 3333 for full functionality.

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Atomic Design component structure
│   ├── atoms/          # Basic building blocks
│   │   ├── ui/         # shadcn/ui base components
│   │   └── icons/      # Icon components
│   ├── molecules/      # Simple component combinations
│   │   ├── forms/      # Form-related molecules
│   │   └── cards/      # Card-based molecules
│   ├── organisms/      # Complex, feature-complete components
│   │   ├── navigation/ # Navigation components
│   │   ├── dashboard/  # Dashboard organisms
│   │   └── panels/     # Feature panels
│   ├── pages/          # Complete page layouts
│   │   ├── dashboard-page.tsx
│   │   └── landing-page.tsx
│   └── providers/      # Context providers
├── lib/                # Utilities and helpers
│   ├── utils.ts        # General utilities
│   └── wind-utils.ts   # Wind-specific utilities
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

---

# Development Notes

## Vite + React + TypeScript Template

This project was bootstrapped with Vite's React TypeScript template, providing:

- ⚡️ Lightning fast HMR (Hot Module Replacement)
- 🔧 TypeScript support out of the box
- 📦 Optimized production builds
- 🎯 ESLint configuration for code quality

### Available Vite Plugins

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) -
  Uses Babel for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) -
  Uses SWC for Fast Refresh (currently used)

## Extending ESLint Configuration

For production applications, consider enabling type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install
[eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x)
and
[eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom)
for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```

## Data Interface Conventions

The React frontend follows **camelCase** naming conventions for all data
interfaces and API communication to maintain consistency with modern
JavaScript/TypeScript practices.

### Interface Definitions

All TypeScript interfaces use camelCase field names that match the backend API:

```typescript
interface WindData {
  windSpeed: number; // m/s
  windDirection: number; // degrees (0-360)
  timestamp: string; // ISO string
}

interface DiagnosticsData {
  id?: number;
  stationId: string;
  batteryVoltage: number; // volts
  solarVoltage: number; // volts
  internalTemperature: number; // celsius
  signalQuality: number; // CSQ value (0-31)
  uptime: number; // seconds
  createdAt?: string;
  updatedAt?: string;
}

interface TemperatureData {
  temperature: number; // celsius
  timestamp: string; // ISO string
}
```

### API Communication

All API requests and responses use camelCase field names:

- **Real-time Wind Data**: Received via Server-Sent Events (SSE) using
  `@adonisjs/transmit-client`
- **REST API Calls**: Temperature and diagnostics data fetched via standard HTTP
  requests
- **WebSocket Channels**: Subscribed to channels like `wind/live/vasiliki-001`

### Data Flow

1. **Backend API** → sends camelCase JSON
2. **Frontend Components** → receive and display data using camelCase interfaces
3. **Type Safety** → TypeScript ensures consistent field naming throughout the
   application

### Component Examples

```typescript
// WindSpeedDisplay component
export function WindSpeedDisplay({ windData }: { windData: WindData | null }) {
  const speed = windData?.windSpeed || 0;
  const direction = windData?.windDirection || 0;
  // ...
}

// DiagnosticsPanel component
const batteryVoltage = diagnosticsData.batteryVoltage;
const signalQuality = diagnosticsData.signalQuality;
```
