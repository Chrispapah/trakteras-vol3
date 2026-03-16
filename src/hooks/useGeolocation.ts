import { useState, useEffect } from 'react';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setError(err.message);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { location, error };
}
