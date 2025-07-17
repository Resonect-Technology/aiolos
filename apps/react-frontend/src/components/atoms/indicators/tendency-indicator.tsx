import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TendencyIndicatorProps {
  tendency: 'increasing' | 'decreasing' | 'stable';
  className?: string;
}

export function TendencyIndicator({ tendency, className }: TendencyIndicatorProps) {
  const getIcon = () => {
    switch (tendency) {
      case 'increasing':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <ArrowRight className="h-4 w-4 text-gray-500" />;
      default:
        return <ArrowRight className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLabel = () => {
    switch (tendency) {
      case 'increasing':
        return 'Increasing';
      case 'decreasing':
        return 'Decreasing';
      case 'stable':
        return 'Stable';
      default:
        return 'Stable';
    }
  };

  const getColor = () => {
    switch (tendency) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {getIcon()}
      <span className={cn("text-sm font-medium", getColor())}>
        {getLabel()}
      </span>
    </div>
  );
}