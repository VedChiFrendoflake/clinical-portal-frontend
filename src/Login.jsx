import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a secure network request for 1.5 seconds
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
      
      {/* Sliding and Fading Panel */}
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg">
            <span className="text-3xl text-white">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">CliniPort</h1>
          <p className="text-gray-500 mt-2">Secure Provider Access</p>
        </div>

        {/* Fake Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider ID</label>
            <input 
              type="text" 
              defaultValue="DOC-8492"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passcode</label>
            <input 
              type="password" 
              defaultValue="********"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center h-12 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Secure Login"
            )}
          </button>
        </form>
        
      </div>
    </div>
  );
}
