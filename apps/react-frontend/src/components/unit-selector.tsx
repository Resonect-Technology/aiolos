import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UnitSelectorProps {
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
  className?: string;
}

export function UnitSelector({ selectedUnit, onUnitChange, className = "" }: UnitSelectorProps) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Wind Speed Units</h3>
          <p className="text-md text-muted-foreground">Choose your preferred measurement unit</p>
        </div>

        <Select value={selectedUnit} onValueChange={onUnitChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="m/s">m/s (Meters per second)</SelectItem>
            <SelectItem value="km/h">km/h (Kilometers per hour)</SelectItem>
            <SelectItem value="knots">Knots (Nautical miles per hour)</SelectItem>
            <SelectItem value="beaufort">Beaufort Scale</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
