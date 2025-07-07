import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ConnectionStatus } from "./connection-status"
import { TemperatureDisplay } from "./temperature-display"
import { UnitSelector } from "./unit-selector"

interface SectionCardsProps {
  stationId: string
  isConnected: boolean
  error: string | null
  selectedUnit: string
  onUnitChange: (unit: string) => void
}

export function SectionCards({ 
  stationId, 
  isConnected, 
  error, 
  selectedUnit, 
  onUnitChange 
}: SectionCardsProps) {
  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-3 px-4 lg:px-6">
      {/* Connection Status */}
      <Card className="md:col-span-2">
        <CardContent className="p-6">
          <ConnectionStatus 
            isConnected={isConnected}
            error={error}
          />
        </CardContent>
      </Card>
      
      {/* Temperature + Unit Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <TemperatureDisplay stationId={stationId} />
            <Separator />
            <UnitSelector 
              selectedUnit={selectedUnit} 
              onUnitChange={onUnitChange} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
