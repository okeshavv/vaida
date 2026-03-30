import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function SeverityCheck() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Bring over the body parts selected on the previous screen
  const selectedParts = location.state?.selectedParts || [];

  const [duration, setDuration] = useState<string>('');
  const [painLevel, setPainLevel] = useState<number>(5);

  const durationOptions = ['2h', '6h', '12h', '1d', '2d', '3d', '5d', '7d'];

  const handleNext = () => {
    if (!duration) return alert("Please select how long you've had these symptoms.");
    // Pass everything to the final Triage Results screen
    navigate('/triage', { 
      state: { selectedParts, duration, painLevel } 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 md:ml-56 flex flex-col">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 p-4">
        <h1 className="text-center text-xl font-bold text-slate-900">Symptom Check</h1>
        <div className="flex justify-center mt-2">
          <div className="h-1 w-64 bg-slate-200 flex rounded">
            <div className="h-full bg-teal-700 w-4/5 rounded"></div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-1">Severity (4/5)</p>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 md:p-10 flex-grow">
        <h2 className="text-3xl font-black text-center text-slate-900 mb-10">How severe?</h2>

        {/* Duration Selection */}
        <div className="mb-12">
          <label className="block text-slate-900 font-bold mb-4 text-lg">How long have you had this?</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {durationOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setDuration(opt)}
                className={`py-3 px-6 rounded-xl border font-semibold transition-all shadow-sm
                  ${duration === opt 
                    ? 'bg-teal-50 border-teal-600 text-teal-800 ring-2 ring-teal-600/20' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Pain Level Slider */}
        <div className="mb-12 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <label className="text-slate-900 font-bold text-lg">Pain Level:</label>
            <span className={`text-xl font-black ${painLevel >= 8 ? 'text-red-600' : painLevel >= 5 ? 'text-amber-500' : 'text-teal-600'}`}>
              {painLevel}/10
            </span>
          </div>
          
          <div className="relative pt-2">
            <input 
              type="range" 
              min="1" max="10" 
              value={painLevel} 
              onChange={(e) => setPainLevel(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #14b8a6, #eab308, #ef4444)`
              }}
            />
            {/* Custom slider thumb styling via Tailwind arbitrary variants isn't perfectly supported across all browsers, so we rely on the standard accent or system default for the thumb, while the track handles the gradient */}
            <div className="flex justify-between mt-3 text-xs font-bold text-slate-500">
              <span className="text-teal-700">Mild</span>
              <span className="text-red-700">Severe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center md:px-10">
        <button onClick={() => navigate(-1)} className="text-slate-600 font-bold px-6 py-3 hover:bg-slate-50 rounded-lg">
          ← Back
        </button>
        <button 
          onClick={handleNext}
          className="bg-[#2A523C] hover:bg-[#1f3d2d] text-white font-bold px-12 py-3 rounded-xl shadow-md transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}