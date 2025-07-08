import { useEffect, useState } from "react";
import { HardHat } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getSystemConfig, parseBooleanConfig } from "../lib/api/system-config";

export function ConstructionModeAlert() {
  const [isConstructionMode, setIsConstructionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConstructionMode = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const config = await getSystemConfig("construction_mode");
        setIsConstructionMode(parseBooleanConfig(config.value));
      } catch (err) {
        console.error("Failed to check construction mode:", err);
        setError("Failed to check site status");
      } finally {
        setIsLoading(false);
      }
    };

    // Check immediately on component mount
    checkConstructionMode();

    // Set up a periodic check every 5 minutes
    const intervalId = setInterval(checkConstructionMode, 5 * 60 * 1000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Don't render anything if not in construction mode or still loading
  if (isLoading || !isConstructionMode) {
    return null;
  }

  // Render error state if there was an error
  if (error) {
    return null; // Silently fail rather than showing an error about the construction mode
  }

  // Render the construction mode alert
  return (
    <Alert
      variant="destructive"
      className="mb-6 p-5 text-base border-amber-200 bg-amber-50 text-amber-800"
    >
      <HardHat />
      <AlertTitle className="text-lg font-bold">Site Under Construction</AlertTitle>
      <AlertDescription className="text-base">
        We're currently working on improvements to the Aiolos Weather Station system. Some features
        may be temporarily unavailable or behave unexpectedly.
      </AlertDescription>
    </Alert>
  );
}
