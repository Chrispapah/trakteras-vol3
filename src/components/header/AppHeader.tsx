import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Bell, Sun, Cloud, LogOut, CloudRain, Snowflake, CloudLightning, CloudDrizzle, CloudFog, CloudSun, Loader2, Droplets, Wind } from 'lucide-react';
import { Reminder } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useWeather } from '@/hooks/useWeather';
import { parseDbDate } from '@/lib/utils';

interface AppHeaderProps {
  selectedAssetName?: string;
  selectedAssetColor?: string;
  upcomingReminders: (Reminder & { assetName: string; assetColor?: string })[];
  onToggleCalendar: () => void;
  showCalendar: boolean;
  onSignOut?: () => void;
  userEmail?: string;
}

export function AppHeader({
  selectedAssetName,
  selectedAssetColor,
  upcomingReminders,
  onToggleCalendar,
  showCalendar,
  onSignOut,
  userEmail,
}: AppHeaderProps) {
  const { weather, loading: weatherLoading } = useWeather();
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const WeatherIcon = ({ iconName }: { iconName: string }) => {
    const iconClass = "w-4 h-4";
    switch (iconName) {
      case 'sun': return <Sun className={`${iconClass} text-accent`} />;
      case 'cloud-sun': return <CloudSun className={`${iconClass} text-accent`} />;
      case 'cloud-fog': return <CloudFog className={`${iconClass} text-muted-foreground`} />;
      case 'cloud-drizzle': return <CloudDrizzle className={`${iconClass} text-muted-foreground`} />;
      case 'cloud-rain': return <CloudRain className={`${iconClass} text-muted-foreground`} />;
      case 'snowflake': return <Snowflake className={`${iconClass} text-blue-400`} />;
      case 'cloud-lightning': return <CloudLightning className={`${iconClass} text-yellow-400`} />;
      default: return <Cloud className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const weatherSummary = (
    <>
      {weatherLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      ) : weather ? (
        <>
          <WeatherIcon iconName={weather.icon} />
          <span className="font-medium">{weather.temperature}°</span>
        </>
      ) : (
        <>
          <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">--°</span>
        </>
      )}
    </>
  );

  const weatherDetails = weather ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <WeatherIcon iconName={weather.icon} />
        <span className="font-medium">{weather.description}</span>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sun className="w-3 h-3" />
          <span>Θερμοκρασία: {weather.temperature}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="w-3 h-3" />
          <span>Υγρασία: {weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-3 h-3" />
          <span>Άνεμος: {weather.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">Δεν ήταν δυνατή η φόρτωση καιρού</p>
  );

  const remindersList = (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Επερχόμενες Υπενθυμίσεις</h4>
      {upcomingReminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν υπενθυμίσεις</p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {upcomingReminders.slice(0, 5).map((reminder) => (
            <div
              key={reminder.id}
              className="rounded-lg bg-muted/50 p-2 text-sm"
            >
              <div className="font-medium">{reminder.title}</div>
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  {reminder.assetColor && (
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: reminder.assetColor }}
                    />
                  )}
                  <span className="truncate">{reminder.assetName}</span>
                </span>
                <span>{parseDbDate(reminder.due_date).toLocaleDateString('el-GR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const accountPanel = (
    <div className="space-y-3">
      {userEmail && (
        <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
      )}
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => {
          onSignOut?.();
          setAccountOpen(false);
        }}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Αποσύνδεση
      </Button>
    </div>
  );

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-2 sm:px-4 lg:px-6">
      {/* Left: Context Info */}
      <div className="flex items-center gap-2 ml-12 lg:ml-0 min-w-0 flex-1">
        {selectedAssetName ? (
          <div className="flex items-center gap-1.5 min-w-0">
            {selectedAssetColor && (
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: selectedAssetColor }}
              />
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">Συνομιλία για:</span>
            <span className="font-medium text-sm text-foreground truncate">{selectedAssetName}</span>
          </div>
        ) : (
          <span className="font-medium text-sm text-foreground">Γενικός Βοηθός</span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        {/* Weather Widget */}
        <Sheet open={weatherOpen} onOpenChange={setWeatherOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-1 rounded-full px-2.5 text-xs sm:hidden"
            >
              {weatherSummary}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl p-0">
            <div className="space-y-4 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle>Καιρός</SheetTitle>
              </SheetHeader>
              {weatherDetails}
            </div>
          </SheetContent>
        </Sheet>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="hidden items-center gap-1 rounded-full bg-secondary px-2 py-1.5 text-xs transition-colors hover:bg-secondary/80 sm:inline-flex sm:text-sm"
            >
              {weatherSummary}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            {weatherDetails}
          </PopoverContent>
        </Popover>

        {/* Reminders */}
        <Sheet open={remindersOpen} onOpenChange={setRemindersOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 sm:hidden">
              <Bell className="w-5 h-5" />
              {upcomingReminders.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                  {upcomingReminders.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl p-0">
            <div className="space-y-4 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle>Υπενθυμίσεις</SheetTitle>
              </SheetHeader>
              {remindersList}
            </div>
          </SheetContent>
        </Sheet>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hidden h-10 w-10 sm:inline-flex sm:h-9 sm:w-9">
              <Bell className="w-5 h-5" />
              {upcomingReminders.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                  {upcomingReminders.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-w-[calc(100vw-1rem)]" align="end">
            {remindersList}
          </PopoverContent>
        </Popover>

        {/* Calendar Toggle */}
        <Button
          variant={showCalendar ? 'default' : 'ghost'}
          size="icon"
          onClick={onToggleCalendar}
          className="h-10 w-10 sm:h-9 sm:w-9"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Sign Out */}
        {onSignOut && (
          <>
            <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:hidden">
                  <LogOut className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl p-0">
                <div className="space-y-4 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
                  <SheetHeader className="space-y-1 text-left">
                    <SheetTitle>Λογαριασμός</SheetTitle>
                  </SheetHeader>
                  {accountPanel}
                </div>
              </SheetContent>
            </Sheet>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden h-10 w-10 sm:inline-flex sm:h-9 sm:w-9">
                  <LogOut className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 max-w-[calc(100vw-1rem)]" align="end">
                {accountPanel}
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
    </header>
  );
}