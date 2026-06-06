import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../context/ThemeContext';
import LeadCard from './LeadCard';

const createDotIcon = (isDark) => {
  const dotColor = '#4f6ef7'; // Hookline primary color
  return L.divIcon({
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${dotColor};
          opacity: 0.4;
          animation: leaflet-pulsate 1.5s ease-out infinite;
        "></div>
        <div style="
          position: relative;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: ${dotColor};
          border: 2px solid ${isDark ? '#18181b' : '#ffffff'};
          box-shadow: 0 0 8px ${dotColor};
        "></div>
      </div>
      <style>
        @keyframes leaflet-pulsate {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      </style>
    `,
    className: 'custom-leaflet-dot',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const HOUSTON_CENTER = [29.7604, -95.3698];

export default function LeadGeneration({
  leads,
  streaming,
  streamComplete,
  onSend,
  onSkip,
  sentLeads,
  skippedLeads,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && leads.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [leads.length]);

  const sortedLeads = [...leads].sort((a, b) => b.priorityScore - a.priorityScore);
  const mapLeads = sortedLeads.filter((l) => {
    const lat = parseFloat(l.lat);
    const lng = parseFloat(l.lng);
    return !isNaN(lat) && !isNaN(lng);
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Leads</h2>
        <p className={`mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          {streaming
            ? `Finding leads... ${leads.length} discovered so far`
            : streamComplete
              ? `${leads.length} qualified leads ready — sorted by priority`
              : 'Preparing lead generation...'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`h-[500px] rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
          <MapContainer center={HOUSTON_CENTER} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution={isDark ? '&copy; <a href="https://carto.com/attributions">CARTO</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
              url={isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            />
            {mapLeads.map((lead, i) => (
              <Marker 
                key={i} 
                position={[parseFloat(lead.lat), parseFloat(lead.lng)]} 
                icon={createDotIcon(isDark)}
              >
                <Popup>
                  <div className="text-gray-900">
                    <strong>{lead.name}</strong>
                    <br />
                    Priority: {lead.priorityScore}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div ref={listRef} className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {sortedLeads.length === 0 && streaming && (
            <div className={`flex items-center justify-center h-40 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-200'}`}>
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-hookline-500 mx-auto mb-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Scanning West Houston for leads...</p>
              </div>
            </div>
          )}

          {sortedLeads.map((lead, i) => (
            <LeadCard
              key={`${lead.name}-${i}`}
              lead={lead}
              onSend={onSend}
              onSkip={onSkip}
              sent={sentLeads.has(lead.name)}
              skipped={skippedLeads.has(lead.name)}
            />
          ))}

          {streaming && sortedLeads.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-5 w-5 text-hookline-500 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Loading more leads...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
