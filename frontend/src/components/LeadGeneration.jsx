import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';
import ActivityLog from './ActivityLog';
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
  leadLogs = [],
  leadFinishing = false,
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
  const markerRefs = useRef({});
  const [selectedLeadName, setSelectedLeadName] = useState(null);
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    if (listRef.current && leads.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [leads.length]);

  const sortedLeads = [...leads].sort((a, b) => b.priorityScore - a.priorityScore);
  const visibleLeads = sortedLeads.filter((lead) => !skippedLeads.has(lead.name));
  const mapLeads = sortedLeads.filter((l) => {
    const lat = parseFloat(l.lat);
    const lng = parseFloat(l.lng);
    return !isNaN(lat) && !isNaN(lng);
  });

  const activeLeadIndex = (() => {
    if (!visibleLeads.length) return -1;
    if (selectedLeadName) {
      const idx = visibleLeads.findIndex((lead) => lead.name === selectedLeadName);
      if (idx >= 0) return idx;
    }
    return 0;
  })();

  const activeLead = activeLeadIndex >= 0 ? visibleLeads[activeLeadIndex] : null;

  const selectLead = useCallback((lead) => {
    setSelectedLeadName(lead.name);
  }, []);

  const goToLead = useCallback((index) => {
    const lead = visibleLeads[index];
    if (lead) setSelectedLeadName(lead.name);
  }, [visibleLeads]);

  const goToPreviousLead = () => {
    if (activeLeadIndex > 0) goToLead(activeLeadIndex - 1);
  };

  const goToNextLead = () => {
    if (activeLeadIndex < visibleLeads.length - 1) goToLead(activeLeadIndex + 1);
  };

  const handleResetMap = () => {
    setSelectedLeadName(null);
    setResetToken((t) => t + 1);
    Object.values(markerRefs.current).forEach((marker) => marker.closePopup?.());
  };

  useEffect(() => {
    if (!selectedLeadName) return;
    const marker = markerRefs.current[selectedLeadName];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedLeadName]);

  useEffect(() => {
    if (!visibleLeads.length) {
      setSelectedLeadName(null);
      return;
    }
    if (!selectedLeadName || !visibleLeads.some((lead) => lead.name === selectedLeadName)) {
      setSelectedLeadName(visibleLeads[0].name);
    }
  }, [visibleLeads, selectedLeadName]);

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
      <div className="mb-8 animate-rise">
        <p className="eyebrow mb-2">Step 5 · Leads</p>
        <h2 className={`font-section-title text-2xl sm:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Leads</h2>
        <p className={`mt-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          {streaming || leadFinishing
            ? 'Generating and qualifying leads — results appear when complete'
            : streamComplete
              ? `${leads.length} qualified leads with contact info — sorted by priority (highest first)`
              : 'Preparing lead generation...'}
        </p>
      </div>

      {(streaming || leadFinishing) && (
        <div className="mb-8">
          <ActivityLog
            logs={leadLogs}
            title="Agent 5 — Generating leads"
            loading={streaming}
            finishing={leadFinishing}
          />
        </div>
      )}

      {!streaming && !leadFinishing && (
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

        <div ref={listRef} className="flex flex-col h-[500px]">
          {visibleLeads.length > 1 && (
            <div className={`flex items-center justify-between gap-3 mb-3 shrink-0 rounded-xl border px-3 py-2 ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-200'
            }`}>
              <button
                type="button"
                onClick={goToPreviousLead}
                disabled={activeLeadIndex <= 0}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeLeadIndex <= 0
                    ? 'opacity-40 cursor-not-allowed'
                    : isDark
                      ? 'text-zinc-300 hover:bg-zinc-800'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Previous
              </button>
              <div className="text-center min-w-0 flex-1">
                <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {activeLead?.name}
                </p>
                <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  Lead {activeLeadIndex + 1} of {visibleLeads.length}
                </p>
              </div>
              <button
                type="button"
                onClick={goToNextLead}
                disabled={activeLeadIndex >= visibleLeads.length - 1}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeLeadIndex >= visibleLeads.length - 1
                    ? 'opacity-40 cursor-not-allowed'
                    : isDark
                      ? 'text-zinc-300 hover:bg-zinc-800'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Next
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0">
            {activeLead && (
              <div className="h-full min-h-0">
                <LeadCard
                  lead={activeLead}
                  business={business}
                  analysis={analysis}
                  marketGap={marketGap}
                  onSkip={onSkip}
                  skipped={false}
                  selected
                  onSelect={() => selectLead(activeLead)}
                  compact
                />
              </div>
            )}

            {!activeLead && (
              <div className={`flex items-center justify-center h-full rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                <p className="text-sm">No leads to show.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
