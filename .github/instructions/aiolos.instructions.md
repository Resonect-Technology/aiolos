---
applyTo: '**'
---

# Aiolos Weather Station Project

## Project Overview

Aiolos is a comprehensive weather station project consisting of hardware, firmware, and software components designed to collect and analyze environmental data from remote locations. The system is built around a solar/battery-operated weather station based on the LilyGO T-SIM7000G board (ESP32 + SIM7000G cellular modem), which transmits data to a cloud-based backend for storage, analysis, and visualization.

The project is designed with reliability, power efficiency, and remote deployment capabilities as key priorities, making it suitable for long-term environmental monitoring in remote or challenging locations.

## System Architecture

The Aiolos Weather Station project consists of three main components:

1. **Hardware**: 
   - LilyGO T-SIM7000G-based weather station with environmental sensors
   - Solar power system with battery backup
   - Custom enclosure for outdoor deployment
   - Wind speed and direction sensors
   - Temperature sensors

2. **Firmware**:
   - ESP32-based firmware for sensor data collection
   - Power management optimized for solar operation
   - Cellular connectivity for data transmission
   - Full details available in the firmware documentation

3. **Backend**:
   - AdonisJS REST API for data reception and processing
   - React-based dashboard for data visualization
   - Time-series database for historical data storage
   - User management and alerts system

## Key Features

- **Remote Environmental Monitoring**:
  - Temperature measurement (internal and external)
  - Wind speed and direction analysis
  - Data logging with timestamps
  - Custom sensor support for future expansion

- **Power-Efficient Design**:
  - Solar-powered with battery backup
  - Advanced power management for 24/7 operation
  - Sleep cycles optimized for power conservation
  - Battery level monitoring and protection

- **Reliable Data Transmission**:
  - Cellular connectivity (2G/NB-IoT)
  - HTTP-based communication protocol
  - Automatic reconnection with backoff strategy
  - Data buffering during connectivity issues

- **User-Friendly Interface**:
  - Web-based dashboard for data visualization
  - Mobile-responsive design
  - Real-time and historical data views
  - Alert configuration and notification system

- **Extensible Platform**:
  - Modular software architecture
  - OTA firmware updates
  - API-first design for integration with other systems
  - Open architecture for adding new sensor types

## Project Components

### Hardware

The hardware platform is built around the LilyGO T-SIM7000G board, which integrates an ESP32 microcontroller with a SIM7000G cellular modem. This is coupled with environmental sensors, a solar charging system, and a weather-resistant enclosure.

The detailed hardware specifications and build instructions are available in the hardware documentation.

### Firmware

The firmware is designed for reliability and power efficiency, featuring:
- Modular C++ codebase built on the Arduino framework
- Advanced power management with deep sleep capabilities
- Robust sensor data collection and processing
- HTTP-based data transmission over cellular networks

For detailed firmware documentation, see the [firmware description](/.github/instructions/fw-description.instructions.md).

### Backend

The backend system consists of:
- AdonisJS REST API for data reception and processing
- React-based dashboard for visualization
- PostgreSQL database for data storage
- Deployment options for both cloud and self-hosted setups

### Frontend

The frontend is a professional, modular wind monitoring dashboard built with modern web technologies:

- **Technologies**: React (using Vite), TypeScript, Tailwind CSS, shadcn/ui components
- **Features**:
  - Comprehensive wind dashboard with responsive design
  - Dynamic wind speed gauge with multi-unit support (m/s, km/h, knots, Beaufort)
  - Interactive wind direction compass with animated indicators
  - Wind rose chart for historical pattern visualization
  - Real-time data updates via Server-Sent Events (SSE)
  - Connection status indicators and user controls

The frontend connects to the AdonisJS backend using the @adonisjs/transmit-client for real-time data streaming, displaying live and historical wind data in an intuitive, mobile-friendly interface. See the [Frontend README](/apps/react-frontend/README.md) for detailed component architecture and setup instructions.

## Development Status

Aiolos is an active project under continuous development. The current focus areas are:
- Expanding sensor capabilities
- Enhancing dashboard analytics
- Improving power efficiency
- Adding support for additional deployment scenarios

## Deployment

The Aiolos project can be deployed in various environments:

### Local Development

For development purposes, each component can be run locally:
- Firmware can be flashed to a LilyGO T-SIM7000G board using PlatformIO
- Backend API can be run with `node ace serve --watch`
- Frontend can be launched with `pnpm run dev`

### Production Deployment

The system is designed for flexible deployment options:

- **Docker-based Deployment**:
  - The `/infra` directory contains Docker Compose configurations
  - `docker-compose.dev.yml` for development environments
  - `docker-compose.prod.yml` for production setups
  - Caddy as a reverse proxy for handling HTTPS and routing

- **Cloud Infrastructure**:
  - Terraform configurations for AWS deployment
  - Infrastructure as Code (IaC) approach for reproducible deployments
  - Automated setup via user data scripts

See the [Infrastructure README](/infra/README.md) for detailed deployment instructions, including domain configuration, SSL setup, and scaling considerations.

## Documentation Structure

This project's documentation is organized as follows:

1. **Main Project Overview** (this document):  
   General description of the entire Aiolos project, including hardware, firmware, and backend components.

2. **Firmware Documentation** ([fw-description.instructions.md](/.github/instructions/fw-description.instructions.md)):  
   Detailed technical documentation of the weather station firmware, including software architecture, sensor interfaces, and power management strategies.

3. **Modem Usage Guide** ([fw-modem.instructions.md](/.github/instructions/fw-modem.instructions.md)):  
   Specific documentation for the SIM7000G cellular modem implementation, including initialization, network connection, and power management.

4. **Component READMEs**:  
   Each major component of the project includes its own detailed README file:
   - **Frontend Documentation** ([/apps/react-frontend/README.md](/apps/react-frontend/README.md)):  
     Comprehensive guide for the React frontend dashboard, including features, component architecture, and setup instructions.
   - **Backend API Documentation** ([/apps/adonis-api/README.md](/apps/adonis-api/README.md)):  
     Documentation for the AdonisJS REST API, including endpoints, data models, and authentication.
   - **Infrastructure Documentation** ([/infra/README.md](/infra/README.md)):  
     Deployment guides and infrastructure setup instructions, including Docker configuration and hosting options.
   - **Firmware Usage** ([/firmware/README.md](/firmware/README.md)):  
     Quick-start guide and usage instructions for the firmware component.

These component-specific READMEs contain practical implementation details, setup instructions, and usage guides, complementing the higher-level documentation in this repository.

## Getting Started

### Prerequisites

To work with the Aiolos project, you'll need:

- **For Firmware Development**:
  - PlatformIO IDE (or CLI)
  - LilyGO T-SIM7000G board
  - Basic electronics equipment (multimeter, wires, etc.)
  - Weather sensors (DS18B20 temperature sensors, anemometer, wind vane)

- **For Backend/Frontend Development**:
  - Node.js (v18 or higher)
  - pnpm (recommended) or npm
  - PostgreSQL database
  - Basic knowledge of TypeScript, React, and AdonisJS

### Project Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/aiolos.git
   cd aiolos
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**:
   Copy the example environment files in each component directory and fill in the required values:
   ```bash
   cp apps/adonis-api/.env.example apps/adonis-api/.env
   ```

4. **Initialize the Database** (for backend):
   ```bash
   cd apps/adonis-api
   node ace migration:run
   ```

5. **Start Development Servers**:
   ```bash
   # Start the API server
   cd apps/adonis-api
   node ace serve --watch

   # In another terminal, start the frontend
   cd apps/react-frontend
   pnpm run dev
   ```

For detailed setup instructions for each component, refer to the respective README files in the component directories.

## Note

All previous references to CoAP, UDP, or MQTT have been replaced with HTTP for simplicity and compatibility with modern web backends.
