import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BodyMap() {
  const navigate = useNavigate();
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  // Toggle function for selecting/deselecting parts
  const togglePart = (id: string) => {
    setSelectedParts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selectedParts.length === 0) return;
    navigate('/intake/severity', { state: { selectedParts } });
  };

  // Format the selected parts for the display box (e.g., "Abdomen • Head")
  const formatSelected = () => {
    if (selectedParts.length === 0) return 'None';
    return selectedParts
      .map(p => p.split('_')[0]) // remove the _front/_back suffix for display
      .filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
      .map(p => p.charAt(0).toUpperCase() + p.slice(1)) // capitalize
      .join(' • ');
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] md:ml-56 flex flex-col">
      
      {/* Header */}
      <div className="bg-white px-8 py-4 border-b border-gray-200 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4 text-xl font-bold">
          {'<'}
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Body map</h1>
          <p className="text-sm text-gray-500">Select sore or symptom areas (front and back)</p>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full flex-grow flex flex-col">
        
        {/* Dual Body Pane Container */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          
          {/* FRONT BODY */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Front</span>
            <BodySvg side="front" selectedParts={selectedParts} togglePart={togglePart} />
          </div>

          {/* BACK BODY */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Back</span>
            <BodySvg side="back" selectedParts={selectedParts} togglePart={togglePart} />
          </div>

        </div>

        {/* Selected Items Box */}
        <div className="bg-[#F0FDF4] border border-[#BDE0C7] rounded-xl p-4 mb-6 shadow-sm">
          <p className="text-[10px] font-bold text-[#3B7254] uppercase tracking-wider mb-1">Selected</p>
          <p className="text-gray-800 font-medium">{formatSelected()}</p>
        </div>

        {/* Continue Button */}
        <div className="mt-auto pb-8">
          <button
            onClick={handleContinue}
            disabled={selectedParts.length === 0}
            className="w-full bg-[#3B7254] hover:bg-[#2A523C] text-white font-bold py-4 rounded-xl text-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>

      </div>
    </div>
  );
}

// --- Reusable SVG Component to mimic the blocky screenshot aesthetic ---
interface BodySvgProps {
  side: 'front' | 'back';
  selectedParts: string[];
  togglePart: (id: string) => void;
}

function BodySvg({ side, selectedParts, togglePart }: BodySvgProps) {
  // Helper to check if a specific part is selected
  const isSelected = (part: string) => selectedParts.includes(`${part}_${side}`);

  // Base colors mimicking the screenshot
  const baseFill = "#EAE6DF";
  const baseStroke = "#D0CCC4";
  
  // Highlight colors mimicking the screenshot
  const selectedFill = "#9BBFAB";
  const selectedStroke = "#447A60";

  return (
    <svg viewBox="0 0 200 400" className="w-full max-w-[200px] h-auto cursor-pointer drop-shadow-md">
      {/* --- BASE SILHOUETTE (Non-clickable background) --- */}
      <g fill={baseFill} stroke={baseStroke} strokeWidth="2">
        {/* Left Arm */}
        <polygon points="65,100 30,200 45,200 80,110" />
        {/* Right Arm */}
        <polygon points="135,100 170,200 155,200 120,110" />
        {/* Left Leg */}
        <rect x="70" y="200" width="25" height="150" />
        {/* Right Leg */}
        <rect x="105" y="200" width="25" height="150" />
        {/* Torso Base */}
        <polygon points="65,100 135,100 135,220 65,220" />
        {/* Head Base/Hood */}
        <path d="M75,60 C75,30 125,30 125,60 L125,100 L75,100 Z" />
      </g>

      {/* --- CLICKABLE HOTSPOTS --- */}
      
      {/* Head */}
      <circle
        cx="100" cy="55" r="22"
        fill={isSelected('head') ? selectedFill : 'transparent'}
        stroke={isSelected('head') ? selectedStroke : 'transparent'}
        strokeWidth="3"
        onClick={() => togglePart(`head_${side}`)}
        className="transition-colors duration-200 hover:fill-[#c8e0d3] hover:stroke-[#447A60]"
      />

      {/* Chest (Upper Torso) */}
      <rect
        x="72" y="105" width="56" height="40" rx="8"
        fill={isSelected('chest') ? selectedFill : 'transparent'}
        stroke={isSelected('chest') ? selectedStroke : 'transparent'}
        strokeWidth="3"
        onClick={() => togglePart(`chest_${side}`)}
        className="transition-colors duration-200 hover:fill-[#c8e0d3] hover:stroke-[#447A60]"
      />

      {/* Abdomen (Lower Torso) - This matches the exact box in your screenshot */}
      <rect
        x="72" y="150" width="56" height="60" rx="10"
        fill={isSelected('abdomen') ? selectedFill : 'transparent'}
        stroke={isSelected('abdomen') ? selectedStroke : 'transparent'}
        strokeWidth="3"
        onClick={() => togglePart(`abdomen_${side}`)}
        className="transition-colors duration-200 hover:fill-[#c8e0d3] hover:stroke-[#447A60]"
      />

      {/* Left Arm Hotspot */}
      <polygon
        points="65,115 40,195 50,195 72,120"
        fill={isSelected('arm_l') ? selectedFill : 'transparent'}
        stroke={isSelected('arm_l') ? selectedStroke : 'transparent'}
        strokeWidth="2"
        onClick={() => togglePart(`arm_l_${side}`)}
        className="transition-colors duration-200 hover:fill-[#c8e0d3] hover:stroke-[#447A60]"
      />

      {/* Right Arm Hotspot */}
      <polygon
        points="135,115 160,195 150,195 128,120"
        fill={isSelected('arm_r') ? selectedFill : 'transparent'}
        stroke={isSelected('arm_r') ? selectedStroke : 'transparent'}
        strokeWidth="2"
        onClick={() => togglePart(`arm_r_${side}`)}
        className="transition-colors duration-200 hover:fill-[#c8e0d3] hover:stroke-[#447A60]"
      />

       {/* Left Leg Hotspot */}
       <rect
        x="72" y="225" width="21" height="120" rx="4"
        fill={isSelected('leg_l') ? selectedFill : 'transparent'}
        stroke={isSelected('leg_l') ? selectedStroke : 'transparent'}
        strokeWidth="2"
        onClick={() => togglePart(`leg_l_${side}`)}
        className="transition-colors duration-200 hover:fill-[#c8e0d3] hover:stroke-[#447A60]"
      />

      {/* Right Leg Hotspot */}
      <rect
        x="107" y="225" width="21" height="120" rx="4"
        fill={isSelected('leg_r') ? selectedFill : 'transparent'}
        stroke={isSelected('leg_r') ? selectedStroke : 'transparent'}
        strokeWidth="2"
        onClick={() => togglePart(`leg_r_${side}`)}
        className="transition-colors duration-200 hover:fill-[#c8e0d3] hover:stroke-[#447A60]"
      />
    </svg>
  );
}