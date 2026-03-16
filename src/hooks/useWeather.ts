import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

const WEATHER_FUNCTION_URL = 'https://izxbjndafoqrkjwvutax.supabase.co/functions/v1/WEATHER';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        // Try to get user's location
        let latitude = 37.98;
        let longitude = 23.73;

        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          } catch {
            // Use default (Athens)
          }
        }

        const response = await fetch(WEATHER_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude }),
        });

        const data = await response.json().catch(() => null) as WeatherData | { error?: string } | null;

        if (response.ok && data && !cancelled && !('error' in data)) {
          setWeather(data);
        } else if (!response.ok) {
          console.error('Weather function error:', data);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { weather, loading };
}
