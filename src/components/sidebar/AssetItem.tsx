import { Asset } from '@/types';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { resolveAssetColor } from '@/lib/assetColors';

interface AssetItemProps {
  asset: Asset;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export function AssetItem({ asset, isSelected, onClick, onDelete }: AssetItemProps) {
  const assetColor = resolveAssetColor(asset);

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg pr-10 text-left transition-all duration-200',
          isSelected
            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-soft'
            : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
        )}
      >
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm"
          style={{ backgroundColor: assetColor }}
        />
        <span className="text-xl flex-shrink-0">{asset.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{asset.name}</div>
          {asset.description && (
            <div className="text-xs text-muted-foreground truncate">
              {asset.description}
            </div>
          )}
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Διαγραφή ${asset.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}