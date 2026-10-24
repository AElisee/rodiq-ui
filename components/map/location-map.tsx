"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";
import type { GeoPoint } from "@/lib/stores/settings-store";

// Carte OpenStreetMap : un clic ou un glisser du repère choisit la position du salon.
// Leaflet lit `window` dès son import, d'où le chargement dans l'effet.
export const LocationMap = ({ value, onChange }: { value: GeoPoint; onChange: (point: GeoPoint) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  // Lue au chargement de Leaflet (asynchrone) : la position a pu changer entre-temps
  const latestValue = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    latestValue.current = value;
  });

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      const start = latestValue.current;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Repère dessiné en CSS : les icônes PNG par défaut de Leaflet ne passent pas le bundler
      const icon = L.divIcon({
        className: "",
        html: '<span class="block size-5 rounded-full border-[3px] border-pearl bg-cocoa shadow-md"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const marker = L.marker([start.lat, start.lng], { icon, draggable: true, keyboard: false }).addTo(map);

      const emit = (lat: number, lng: number) =>
        onChangeRef.current({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        emit(lat, lng);
      });
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        emit(e.latlng.lat, e.latlng.lng);
      });

      // Carte montée dans un onglet masqué : recalcule sa taille quand il s'affiche
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Coordonnées saisies à la main : le repère suit et la carte se recentre
  useEffect(() => {
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    const current = marker.getLatLng();
    if (current.lat === value.lat && current.lng === value.lng) return;
    marker.setLatLng([value.lat, value.lng]);
    map.panTo([value.lat, value.lng]);
  }, [value.lat, value.lng]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Carte : cliquez pour placer le salon"
      className="isolate h-80 w-full overflow-hidden rounded-[var(--radius)] border border-sand bg-sand"
    />
  );
};
