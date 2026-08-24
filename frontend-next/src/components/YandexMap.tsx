"use client";

import { useEffect, useRef, useState } from 'react';
import { Court } from '@/lib/api';

interface YandexMapProps {
  courts: Court[];
  center?: [number, number];
  zoom?: number;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function YandexMap({ courts, center, zoom }: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const defaultCenter: [number, number] = [55.751244, 37.618423];
  const defaultZoom = 10;

  const mapCenter = center || defaultCenter;
  const mapZoom = zoom || defaultZoom;
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || apiKey === 'demo') {
      setMapError('API ключ не настроен');
      return;
    }

    // Load Yandex Maps script
    if (!window.ymaps) {
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;
      script.onload = () => {
        window.ymaps.ready(initMap);
      };
      script.onerror = () => {
        setMapError('Ошибка загрузки скрипта карт');
      };
      document.head.appendChild(script);
    } else {
      window.ymaps.ready(initMap);
    }

    function initMap() {
      if (!mapRef.current) return;

      try {
        const map = new window.ymaps.Map(mapRef.current, {
          center: mapCenter,
          zoom: mapZoom,
          controls: ['zoomControl', 'fullscreenControl']
        });

        // Store map instance for later updates
        (mapRef.current as any)._yandexMap = map;

        // Add placemarks for courts
        courts.forEach((court) => {
          const placemark = new window.ymaps.Placemark(
            [court.coordinates?.lat || 55.751244, court.coordinates?.lng || 37.618423],
            {
              balloonContentHeader: court.name,
              balloonContentBody: `${court.city}, ${court.address}`,
              hintContent: court.name
            },
            {
              preset: 'islands#icon',
              iconColor: '#0095b6'
            }
          );
          map.geoObjects.add(placemark);
        });

        setMapLoaded(true);
      } catch (error) {
        setMapError('Ошибка инициализации карты');
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [apiKey, courts]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = (mapRef.current as any)._yandexMap;
      if (map) {
        map.setCenter(mapCenter);
        map.setZoom(mapZoom);
      }
    }
  }, [mapCenter, mapZoom, mapLoaded]);

  if (!apiKey || apiKey === 'demo') {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <h3 className="font-display font-bold text-xl mb-2">Карта недоступна</h3>
          <p className="text-muted-foreground">Необходимо настроить API ключ Яндекс.Карт</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">❌</p>
          <h3 className="font-display font-bold text-xl mb-2">Ошибка карты</h3>
          <p className="text-muted-foreground">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      {!mapLoaded && (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Загрузка карты...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
