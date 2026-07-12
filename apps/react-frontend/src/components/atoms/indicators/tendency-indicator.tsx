import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

interface TendencyIndicatorProps {
  tendency: 'increasing' | 'decreasing' | 'stable';
  className?: string;
}

export function TendencyIndicator({ tendency, className }: TendencyIndicatorProps) {
  const getIcon = () => {
    switch (tendency) {
      case 'increasing':
        return <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'decreasing':
        return <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'stable':
        return <ArrowRight className="text-muted-foreground h-4 w-4" />;
      default:
        return <ArrowRight className="text-muted-foreground h-4 w-4" />;
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
        return 'text-green-600 dark:text-green-400';
      case 'decreasing':
        return 'text-red-600 dark:text-red-400';
      case 'stable':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {getIcon()}
      <span className={cn('text-sm font-medium', getColor())}>{getLabel()}</span>
    </div>
  );
}
