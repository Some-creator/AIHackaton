import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';
import LeadCard from './LeadCard';
import StepNavigation from './StepNavigation';

const createDotIcon = (lead, selected = false) => {
  const isPriority = parseFloat(lead.priorityScore) >= 8.0;
  const dotColor = isPriority ? '#ef4444' : '#3b82f6';
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; height: 60px; pointer-events: none;">
        <div style="
          background-color: ${selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          color: ${selected ? '#ffffff' : '#18181b'};
          border: 1px solid ${selected ? '#2563eb' : '#d4d4d8'};
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,${selected ? '0.35' : '0.2'});
          margin-bottom: 4px;
          pointer-events: auto;
          cursor: pointer;
        ">
          ${lead.name}
        </div>
        <div style="position: relative; width: ${selected ? '24px' : '20px'}; height: ${selected ? '24px' : '20px'}; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: ${selected ? '20px' : '16px'};
            height: ${selected ? '20px' : '16px'};
            border-radius: 50%;
            background-color: ${dotColor};
            opacity: ${selected ? '0.55' : '0.4'};
            animation: leaflet-pulsate 1.5s ease-out infinite;
          "></div>
          <div style="
            position: relative;
            width: ${selected ? '10px' : '8px'};
            height: ${selected ? '10px' : '8px'};
            border-radius: 50%;
            background-color: ${dotColor};
            border: 2px solid ${selected ? '#2563eb' : '#ffffff'};
            box-shadow: 0 0 ${selected ? '10px' : '6px'} ${dotColor};
          "></div>
        </div>
      </div>
      <style>
        @keyframes leaflet-pulsate {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      </style>
    `,
    className: 'custom-leaflet-dot-label',
    iconSize: [120, 60],
    iconAnchor: [60, 50],
    popupAnchor: [0, -40],
  });
};

function MapController({ leads, selectedLeadName, resetToken }) {
  const map = useMap();

  const fitAllLeads = useCallback(() => {
    if (leads.length === 0) return;
    const bounds = L.latLngBounds(leads.map((l) => [parseFloat(l.lat), parseFloat(l.lng)]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [leads, map]);

  useEffect(() => {
    if (selectedLeadName) return;
    fitAllLeads();
  }, [leads.length, fitAllLeads, selectedLeadName]);

  useEffect(() => {
    if (resetToken === 0) return;
    fitAllLeads();
  }, [resetToken, fitAllLeads]);

  useEffect(() => {
    if (!selectedLeadName) return;
    const lead = leads.find((l) => l.name === selectedLeadName);
    if (!lead) return;
    const lat = parseFloat(lead.lat);
    const lng = parseFloat(lead.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    map.flyTo([lat, lng], 14, { duration: 0.6 });
  }, [selectedLeadName, leads, map]);

  return null;
}

const HOUSTON_CENTER = [29.7604, -95.3698];

export default function LeadGeneration({
  leads,
  business,
  analysis,
  marketGap,
  streaming,
  streamComplete,
  onSkip,
  skippedLeads,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  navDisabled,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const listRef = useRef(null);
  const cardRefs = useRef({});
  const markerRefs = useRef({});
  const [selectedLeadName, setSelectedLeadName] = useState(null);
  const [resetToken, setResetToken] = useState(0);

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

  const selectLead = useCallback((lead) => {
    setSelectedLeadName(lead.name);
  }, []);

  const handleResetMap = () => {
    setSelectedLeadName(null);
    setResetToken((t) => t + 1);
    Object.values(markerRefs.current).forEach((marker) => marker.closePopup?.());
  };

  useEffect(() => {
    if (!selectedLeadName) return;
    const cardEl = cardRefs.current[selectedLeadName];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const marker = markerRefs.current[selectedLeadName];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedLeadName]);

  return (
    <div className="max-w-6xl mx-auto">
      <StepNavigation
        onBack={onBack}
        backLabel={backLabel}
        onNext={onNext}
        nextLabel={nextLabel}
        backDisabled={navDisabled}
        nextDisabled={navDisabled}
      />
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Leads</h2>
        <p className={`mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          {streaming
            ? `Finding leads... ${leads.length} discovered so far`
            : streamComplete
              ? `${leads.length} qualified leads with contact info — sorted by priority`
              : 'Preparing lead generation...'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`relative h-[500px] rounded-2xl overflow-hidden border shadow-sm ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
          <button
            type="button"
            onClick={handleResetMap}
            className={`absolute top-3 right-3 z-[1000] px-3 py-1.5 text-xs font-semibold rounded-lg shadow-md transition ${
              isDark
                ? 'bg-zinc-800/95 text-zinc-200 border border-zinc-600 hover:bg-zinc-700'
                : 'bg-white/95 text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Reset view
          </button>
          <MapContainer center={HOUSTON_CENTER} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution="Map data &copy; Google"
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            />
            <MapController leads={mapLeads} selectedLeadName={selectedLeadName} resetToken={resetToken} />
            {mapLeads.map((lead) => {
              const isSelected = selectedLeadName === lead.name;
              return (
              <Marker
                key={`${lead.name}-${isSelected ? 'selected' : 'default'}`}
                ref={(ref) => {
                  if (ref) markerRefs.current[lead.name] = ref;
                }}
                position={[parseFloat(lead.lat), parseFloat(lead.lng)]}
                icon={createDotIcon(lead, isSelected)}
                eventHandlers={{
                  click: () => selectLead(lead),
                }}
              >
                <Popup>
                  <div className="text-gray-900 text-sm space-y-1">
                    <strong>{lead.name}</strong>
                    <div>Priority: {lead.priorityScore}</div>
                    {lead.phone && <div>{lead.phone}</div>}
                    {lead.website && (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                        Website
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
              );
            })}
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
            <div
              key={`${lead.name}-${i}`}
              ref={(el) => {
                if (el) cardRefs.current[lead.name] = el;
              }}
            >
              <LeadCard
                lead={lead}
                business={business}
                analysis={analysis}
                marketGap={marketGap}
                onSkip={onSkip}
                skipped={skippedLeads.has(lead.name)}
                selected={selectedLeadName === lead.name}
                onSelect={() => selectLead(lead)}
              />
            </div>
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
