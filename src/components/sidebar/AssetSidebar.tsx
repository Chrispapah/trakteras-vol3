import { Asset, AssetCreateInput } from '@/types';
import { AssetItem } from './AssetItem';
import { AddAssetDialog } from './AddAssetDialog';
import { AISearchDialog } from '@/components/search/AISearchDialog';
import { Menu, X, MessageSquare, Plus, Trash2, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/hooks/useChat';

interface AssetSidebarProps {
  assets: Asset[];
  selectedAssetId: string | null;
  currentConversationId?: string | null;
  onSelectAsset: (id: string | null) => void;
  onAddAsset: (asset: AssetCreateInput) => void;
  onDeleteAsset?: (id: string) => Promise<boolean>;
  conversations?: Conversation[];
  onLoadConversation?: (id: string) => void;
  onNewChat?: () => void;
  onDeleteConversation?: (id: string) => Promise<boolean>;
}

export function AssetSidebar({
  assets,
  selectedAssetId,
  currentConversationId,
  onSelectAsset,
  onAddAsset,
  onDeleteAsset,
  conversations = [],
  onLoadConversation,
  onNewChat,
  onDeleteConversation,
}: AssetSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} λεπτά πριν`;
    if (diffHours < 24) return `${diffHours} ώρες πριν`;
    if (diffDays < 7) return `${diffDays} μέρες πριν`;
    return date.toLocaleDateString('el-GR');
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteConversation) {
      await onDeleteConversation(id);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!onDeleteAsset) return;

    const confirmed = window.confirm(`Να διαγραφεί το στοιχείο "${asset.name}";`);
    if (!confirmed) return;

    await onDeleteAsset(asset.id);
  };

  return (
    <>
      {/* Mobile Toggle - only show hamburger when sidebar is closed */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-50 h-10 w-10 lg:hidden"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="px-3 py-1 border-b border-sidebar-border">
          <div className="relative flex items-center justify-center">
            <div className="flex items-center justify-center">
              <img src={logo} alt="Trakteras logo" className="block w-24 h-24 rounded-xl object-contain" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Assets List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat?.();
              onSelectAsset(null);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary mb-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium text-sm">Νέα Συνομιλία</span>
          </button>

          {/* AI Search */}
          <AISearchDialog
            trigger={
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 hover:bg-sidebar-accent/50 text-sidebar-foreground mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">AI Αναζήτηση</span>
              </button>
            }
          />

          {/* Conversations */}
          {conversations.length > 0 && (
            <>
              <div className="py-2">
                <div className="text-xs font-medium text-muted-foreground px-3 py-1">
                  Συνομιλίες
                </div>
              </div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="group relative"
                >
                  <button
                    onClick={() => {
                      onLoadConversation?.(conv.id);
                      onSelectAsset(null);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 text-sidebar-foreground',
                      currentConversationId === conv.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-sidebar-accent/50'
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        currentConversationId === conv.id ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate block">{conv.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(conv.updated_at)}</span>
                    </div>
                  </button>
                  {onDeleteConversation && (
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Divider */}
          <div className="py-2">
            <div className="text-xs font-medium text-muted-foreground px-3 py-1">
              Τα Στοιχεία Μου
            </div>
          </div>

          {/* Asset Items */}
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 px-3">
              Δεν υπάρχουν στοιχεία. Προσθέστε το πρώτο σας!
            </p>
          ) : (
            assets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetId === asset.id}
                onClick={() => {
                  onSelectAsset(asset.id);
                  setIsOpen(false);
                }}
                onDelete={onDeleteAsset ? () => handleDeleteAsset(asset) : undefined}
              />
            ))
          )}
        </div>

        {/* Add Asset Button */}
        <div className="p-3 border-t border-sidebar-border">
          <AddAssetDialog onAdd={onAddAsset} />
        </div>
      </aside>
    </>
  );
}