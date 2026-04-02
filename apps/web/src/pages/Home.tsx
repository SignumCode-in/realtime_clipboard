import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CopyPlus, ArrowRight, Laptop2, Globe2, Zap } from 'lucide-react';

export default function Home() {
  const [joinId, setJoinId] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    // Generate a random 6-character alphanumeric room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${roomId}`);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      navigate(`/room/${joinId.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left column / Hero */}
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-100/80 text-indigo-700 px-3 py-1 rounded-full text-[11px] md:text-sm font-medium mb-4 md:mb-6">
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Realtime clipboard sync</span>
            </div>
            <h1 className="text-3xl xs:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
              Realtime Clipboard
            </h1>
            <h2 className="mt-2 text-xl xs:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Share Text Instantly Between Devices
            </h2>
            <p className="mt-4 text-base md:text-lg text-gray-600 max-w-md">
              A frictionless way to copy-paste between your phone, tablet, and computer. No login required.
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <button
              onClick={handleCreateRoom}
              className="group relative flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/30 overflow-hidden"
            >
              <CopyPlus className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Create a new clipboard</span>
            </button>
            
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span>OR JOIN EXISTING</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <form onSubmit={handleJoinSubmit} className="relative">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Enter Room ID"
                className="w-full bg-white border border-gray-200 text-gray-900 px-5 md:px-6 py-3.5 md:py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase tracking-widest text-base md:text-lg transition-shadow shadow-sm hover:shadow-md"
                maxLength={20}
              />
              <button
                type="submit"
                disabled={!joinId.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-gray-900 text-white px-4 rounded-lg flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right column / Feature Art / Glassmorphism */}
        <div className="hidden md:flex relative h-[500px] w-full justify-center items-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-[3rem] opacity-20 blur-3xl transform rotate-6"></div>
          
          <div className="relative z-10 w-full max-w-sm bg-white/60 backdrop-blur-xl border border-white/40 p-8 rounded-3xl shadow-2xl flex flex-col space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Laptop2 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">MacBook Pro</div>
                <div className="text-xs text-green-600 font-medium tracking-wide">CONNECTED</div>
              </div>
            </div>
            
            <div className="w-full bg-white rounded-xl p-4 shadow-inner border border-gray-100 space-y-3">
              <div className="h-2 bg-gray-200 rounded-full w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded-full w-full"></div>
              <div className="h-2 bg-gray-200 rounded-full w-5/6"></div>
            </div>

            <div className="flex justify-end items-center space-x-2 text-indigo-600 font-medium text-sm mt-4">
              <Globe2 className="w-4 h-4" />
              <span>Realtime Sync</span>
            </div>
          </div>
        </div>

      </div>

      {/* SEO Landing Section */}
      <section className="w-full max-w-4xl mt-24 mb-16 px-4">
        <div className="grid md:grid-cols-2 gap-12 border-t border-gray-100 pt-16">
          <article className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Why use Realtime Clipboard?</h2>
            <p className="text-gray-600 leading-relaxed">
              Realtime Clipboard is a powerful, instant text sharing tool designed to bridge the gap between your devices. 
              Whether you're moving a URL from your phone to your PC, or a code snippet between two laptops, 
              our platform makes it as simple as copy and paste.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Engineered for speed and simplicity, it requires no registration, no emails, and no passwords. 
              Just a secure room ID is all you need to start syncing in real-time.
            </p>
          </article>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-50">
              <h3 className="font-bold text-gray-900 mb-2">Developers</h3>
              <p className="text-sm text-gray-500">Quickly sync API keys, logs, or snippets between dev environments and testing devices.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-50">
              <h3 className="font-bold text-gray-900 mb-2">Students</h3>
              <p className="text-sm text-gray-500">Share research links or notes between your tablet and laptop during study sessions.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-50">
              <h3 className="font-bold text-gray-900 mb-2">Professionals</h3>
              <p className="text-sm text-gray-500">Move text data instantly across multiple workstations without the friction of chat apps.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-50">
              <h3 className="font-bold text-gray-900 mb-2">Free Forever</h3>
              <p className="text-sm text-gray-500">Enjoy unlimited text sharing across all your devices for free, with no hidden costs.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full py-8 border-t border-gray-50 flex flex-col items-center space-y-4">
        <p className="text-sm text-gray-400">© 2024 Realtime Clipboard. All rights reserved.</p>
        <div className="flex space-x-6 text-xs text-indigo-400 font-medium">
          <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Contact Us</a>
        </div>
      </footer>
    </div>
  );
}
