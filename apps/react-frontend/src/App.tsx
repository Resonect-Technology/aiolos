import { WindDashboard } from './components/WindDashboard'
import { ConstructionModeAlert } from './components/ConstructionModeAlert'

function App() {
  // Fixed station ID for Vasiliki weather station
  const stationId = 'vasiliki-001';

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Vasiliki Wind Station</h1>
        <p className="text-muted-foreground mt-2">
          Real-time wind data from Vasiliki, Greece
        </p>
      </header>
      
      <ConstructionModeAlert />

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
