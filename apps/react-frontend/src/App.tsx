import { useState } from 'react'
import { WindDashboard } from './components/WindDashboard'
import { ConstructionModeAlert } from './components/ConstructionModeAlert'

function App() {
  const [stationId, setStationId] = useState('station-001');

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Aiolos Wind Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Real-time wind data visualization with Server-Sent Events
        </p>
      </header>
      
      <ConstructionModeAlert />

      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center space-x-4">
          <label htmlFor="stationId" className="font-medium">Station ID:</label>
          <input
            id="stationId"
            type="text"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          />
        </div>
      </div>

      <WindDashboard stationId={stationId} />

      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>Aiolos Project &copy; {new Date().getFullYear()}</p>
        <p className="mt-1">
          <a href="https://github.com/antoniolago/react-gauge-component" target="_blank" rel="noopener noreferrer" className="underline">
            Gauge Component by antoniolago
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
