import { useMemo, useState } from 'react';
import { AssetSidebar } from '@/components/sidebar/AssetSidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { AppHeader } from '@/components/header/AppHeader';
import { AssetDetails } from '@/components/asset/AssetDetails';
import { CalendarView } from '@/components/calendar/CalendarView';
import { useAssets } from '@/hooks/useAssets';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { AssetCreateInput } from '@/types';
import { resolveAssetColor } from '@/lib/assetColors';

const Index = () => {
  const { signOut, user } = useAuth();
  const { location } = useGeolocation();
  const {
    assets,
    selectedAsset,
    selectedAssetId,
    setSelectedAssetId,
    addAsset,
    deleteAsset,
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    getUpcomingReminders,
    assetMessages,
    sendAssetMessage,
    sendAssetVoiceMessage,
    isAssetMessageLoading,
  } = useAssets();

  const { 
    messages, 
    isLoading, 
    sendMessage, 
    conversations, 
    loadConversation, 
    startNewChat,
    deleteConversation,
    currentConversationId,
  } = useChat();
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(true);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const centerMessages = useMemo(() => {
    if (!selectedAsset) return messages;

    // Sort oldest → newest
    const sorted = [...assetMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const assetFeed = sorted.map((m) => ({
      id: `asset-${m.id}`,
      role: (m.role ?? 'user') as 'user' | 'assistant',
      content: m.text,
      timestamp: new Date(m.created_at),
      assetContext: m.role === 'assistant' ? selectedAsset.name : undefined,
    }));

    // When an asset is selected show only the welcome message + asset conversation.
    // Never merge general-chat messages into the asset view — they have different
    // lifecycles and would cause timestamp/context bleed-through.
    const welcome = messages.filter((m) => m.id === 'welcome');
    return [...welcome, ...assetFeed];
  }, [selectedAsset, assetMessages, messages]);

  const handleSendMessage = (message: string, images?: string[]) => {
    if (selectedAsset) {
      sendAssetMessage(selectedAsset.id, message, images);
    } else {
      sendMessage(message, images, undefined, location);
    }
  };

  const handleAddAsset = async (asset: AssetCreateInput) => {
    await addAsset(asset);
  };

  const handleAddEntry = async (entry: { content: string; tags: string[] }) => {
    if (selectedAsset) {
      await addEntry(selectedAsset.id, entry);
    }
  };

  const handleUpdateEntry = async (id: string, content: string, tags: string[]) => {
    await updateEntry(id, { content, tags });
  };

  const handleDeleteEntry = async (id: string) => {
    await deleteEntry(id);
  };

  const handleAddReminder = async (reminder: { title: string; due_date: string; priority: 'low' | 'medium' | 'high' }) => {
    if (selectedAsset) {
      await addReminder(selectedAsset.id, reminder);
    }
  };

  const handleUpdateReminder = async (id: string, updates: { title: string; due_date: string; priority: 'low' | 'medium' | 'high' }) => {
    await updateReminder(id, updates);
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteReminder(id);
  };

  const handleToggleReminder = async (reminderId: string) => {
    await toggleReminder(reminderId);
  };

  const handleDeleteAsset = async (assetId: string) => {
    const deleted = await deleteAsset(assetId);
    if (deleted) {
      setMobileDetailsOpen(false);
    }
    return deleted;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Get entries for selected asset
  const selectedAssetEntries = selectedAsset ? entries : [];
  const selectedAssetReminders = selectedAsset 
    ? reminders.filter((r) => r.asset_id === selectedAsset.id) 
    : [];

  const assetDetailsPanel = selectedAsset && (
    <AssetDetails
      asset={selectedAsset}
      entries={selectedAssetEntries}
      reminders={selectedAssetReminders}
      onAddEntry={handleAddEntry}
      onUpdateEntry={handleUpdateEntry}
      onDeleteEntry={handleDeleteEntry}
      onAddReminder={handleAddReminder}
      onUpdateReminder={handleUpdateReminder}
      onDeleteReminder={handleDeleteReminder}
      onToggleReminder={handleToggleReminder}
    />
  );

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-background">
      {/* Sidebar */}
      <AssetSidebar
        assets={assets}
        selectedAssetId={selectedAssetId}
        currentConversationId={currentConversationId}
        onSelectAsset={setSelectedAssetId}
        onAddAsset={handleAddAsset}
        onDeleteAsset={handleDeleteAsset}
        conversations={conversations}
        onLoadConversation={loadConversation}
        onNewChat={startNewChat}
        onDeleteConversation={deleteConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <AppHeader
          selectedAssetName={selectedAsset?.name}
          selectedAssetColor={selectedAsset ? resolveAssetColor(selectedAsset) : undefined}
          upcomingReminders={getUpcomingReminders()}
          onToggleCalendar={() => setShowCalendar(!showCalendar)}
          showCalendar={showCalendar}
          onSignOut={handleSignOut}
          userEmail={user?.email}
        />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Chat Panel */}
          <div className="flex-1 min-w-0">
            <ChatPanel
              messages={centerMessages}
              isLoading={selectedAsset ? isAssetMessageLoading : isLoading}
              onSend={handleSendMessage}
              onVoiceSend={selectedAsset ? (audioBlob) => sendAssetVoiceMessage(selectedAsset.id, audioBlob) : undefined}
              assetContext={selectedAsset?.name}
            />
          </div>

          {/* Mobile: Asset Details Sheet */}
          {selectedAsset && (
            <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="lg:hidden fixed bottom-24 right-4 z-30 rounded-full shadow-lg w-12 h-12"
                >
                  <FileText className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="h-[85dvh] overflow-hidden rounded-t-2xl p-0 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
              >
                {assetDetailsPanel}
              </SheetContent>
            </Sheet>
          )}

          {/* Desktop: Asset Details Panel */}
          {selectedAsset && showAssetDetails && (
            <div className="hidden lg:block w-80">
              {assetDetailsPanel}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarView assets={assets} onClose={() => setShowCalendar(false)} />
      )}
    </div>
  );
};

export default Index;
