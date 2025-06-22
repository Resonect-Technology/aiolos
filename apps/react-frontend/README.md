# React Frontend - Aiolos Project

This application is the frontend for the Aiolos live wind data monitoring system. It is built with React (using Vite), TypeScript, Tailwind CSS, and shadcn/ui components.

## Key Features

-   **Live Data Visualization**: Connects to the AdonisJS backend via Server-Sent Events (SSE) to receive and display real-time wind data.
-   **Wind Speed Gauge**: Utilizes a `react-gauge-component` to visually represent live wind speed.
-   **Station Selection**: Allows users to input a station ID to monitor specific wind data channels.
-   **Connection Status**: Displays the current connection status (Connected/Disconnected) to the SSE stream and any errors.
-   **Mock Data Controls**: Provides UI buttons to interact with the backend's mock data generation features:
    -   Start Mock Data: Initiates a stream of simulated wind data from the backend.
    -   Stop Mock Data: Halts the simulated data stream.
    -   Send Single Event: Triggers a single mock wind data event from the backend.
-   **Proxy to Backend**: Vite development server is configured to proxy API (`/api`) and SSE (`/__transmit`) requests to the AdonisJS backend (typically `http://localhost:3333`).

## Technologies Used

-   [React](https://react.dev/)
-   [Vite](https://vitejs.dev/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [@adonisjs/transmit-client](https://github.com/adonisjs/transmit-client) for SSE communication
-   [Tailwind CSS](https://tailwindcss.com/)
-   [shadcn/ui](https://ui.shadcn.com/)
-   [react-gauge-component](https://github.com/antoniolago/react-gauge-component)

## Setup and Running

1.  Navigate to the `apps/react-frontend` directory.
2.  Install dependencies: `pnpm install` (or `npm install`)
3.  Start the development server: `pnpm run dev` (or `npm run dev`)

The frontend will typically run on `http://localhost:5173` and proxy relevant requests to the backend.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

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
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

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
})
```
