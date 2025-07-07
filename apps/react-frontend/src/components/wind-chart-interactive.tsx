import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wind, Compass } from "lucide-react"
import { WindSpeedDisplay } from "./wind-speed-display"
import { WindDirectionCompass } from "./wind-direction-compass"

interface WindData {
  windSpeed: number
  windDirection: number
  timestamp: string
}

interface WindChartInteractiveProps {
  windData: WindData | null
  selectedUnit: string
}

export function WindChartInteractive({ windData, selectedUnit }: WindChartInteractiveProps) {
  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-2">
      {/* Wind Speed Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            Wind Speed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WindSpeedDisplay 
            windData={windData} 
            selectedUnit={selectedUnit} 
          />
        </CardContent>
      </Card>

      {/* Wind Direction Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Wind Direction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WindDirectionCompass 
            windDirection={windData?.windDirection} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
