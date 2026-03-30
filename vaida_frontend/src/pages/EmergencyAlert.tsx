import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmergencyAlert() {
  const navigate = useNavigate();

  return (
    // Added md:ml-56 to push it past the sidebar on desktop!
    <div className="min-h-screen bg-red-600 text-white flex flex-col md:ml-56">
      <div className="p-8 max-w-3xl mx-auto w-full mt-10">
        <h1 className="text-4xl font-extrabold mb-4">Immediate medical attention</h1>
        <p className="text-lg font-medium mb-8">
          If someone nearby has severe bleeding, chest pain, trouble breathing, sudden weakness, or loss of consciousness, call emergency services now. Do not wait for this app.
        </p>

        <div className="bg-white text-gray-900 rounded-xl p-6 shadow-xl mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <span className="mr-2">🏥</span> Nearest healthcare facility
            </h2>
            <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-1 rounded">MOCK DATA</span>
          </div>
          <h3 className="text-lg font-semibold">PHC Bassi (Primary Health Centre)</h3>
          <p className="text-gray-600 mb-2">Government • 24x7 emergency desk</p>
          <p className="text-gray-700 font-medium mb-4">📍 SH2, Bassi, Jaipur Rural — RJ 303301</p>
          <div className="flex gap-4 text-sm font-semibold">
            <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">🚀 4.2 km away</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">⏱️ ~12 min by road</span>
          </div>
        </div>

        <button 
          onClick={() => alert('SMS Sent to Local ASHA Worker: Emergency triggered at patient location.')}
          className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg mb-4 transition-colors flex justify-center items-center"
        >
          <span className="mr-2">💬</span> Alert local ASHA worker via SMS
        </button>

        <a 
          href="tel:108"
          className="w-full bg-black hover:bg-gray-900 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg transition-colors flex justify-center items-center"
        >
          <span className="mr-2">📞</span> Call 108 — National emergency
        </a>
        
        <button 
          onClick={() => navigate('/')}
          className="w-full text-white underline mt-6 opacity-80 hover:opacity-100"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}