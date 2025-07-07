import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Compass, Info } from "lucide-react";
import "./wind-direction-compass.css"; // Uses the CSS provided by the user

interface WindDirectionCompassProps {
  windDirection: number | null | undefined;
}

export const WindDirectionCompass: React.FC<WindDirectionCompassProps> = ({ windDirection }) => {
  const [compassCircleTransformStyle, setCompassCircleTransformStyle] =
    useState("translate(-50%, -50%)");

  useEffect(() => {
    if (windDirection !== null && windDirection !== undefined) {
      const rotation = 360 - windDirection;
      const transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
      setCompassCircleTransformStyle(transform);
    } else {
      setCompassCircleTransformStyle("translate(-50%, -50%)");
    }
  }, [windDirection]);

  return (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center gap-2">
        <Compass className="h-5 w-5 text-primary" />
        <h3 className="text-2xl font-bold text-foreground">Wind Direction</h3>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          The red arrow shows the direction from which the wind blows. For optimal Vasiliki
          conditions, we look for westerly winds (around 270°).
        </AlertDescription>
      </Alert>

      <div className="flex justify-center mb-6">
        <ChevronsDown />
        <div className="compass">
          {" "}
          {/* Class from user's CSS */}
          <div
            className="compass-circle" /* Class from user's CSS */
            style={{ transform: compassCircleTransformStyle }}
          />
          <div className="my-point" /> {/* Class from user's CSS */}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Current Direction</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <div className="text-3xl font-bold text-foreground">
            {windDirection !== null && windDirection !== undefined
              ? `${Math.round(windDirection)}°`
              : "---"}
          </div>
          {windDirection !== null && windDirection !== undefined && (
            <Badge variant="outline" className="text-sm">
              {getCompassDirection(windDirection)}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to convert degrees to compass direction
function getCompassDirection(degrees: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
