import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Users, Check, Share2, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { SOCKET_EVENTS, type RoomData } from '@realtime-clipboard/shared';
import { socket } from '../lib/socket';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [text, setText] = useState('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea implicitly when valid
  useEffect(() => {
    if (!loading && isConnected) {
      textareaRef.current?.focus();
    }
  }, [loading, isConnected]);

  // Handle Socket connections
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    socket.connect();

    const onConnect = () => {
      setIsConnected(true);
      setErrorMsg('');
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onError = (err: any) => {
      setErrorMsg(err.message || 'An error occurred');
      if (err.message === 'Invalid room ID') {
        setTimeout(() => navigate('/'), 2000);
      }
    };

    const onRoomData = (data: RoomData) => {
      setRoomData({ ...data }); // to trigger render fresh
      // Only set text if it's the initial connect load to avoid overwriting ongoing typing if desync,
      // but simpler approach: just set it since it's initial load
      if (loading) {
        setText(data.text);
        setLoading(false);
      }
    };

    const onTextUpdate = ({ text: newText }: { text: string }) => {
      setText(newText);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.ERROR, onError);
    socket.on(SOCKET_EVENTS.ROOM_DATA, onRoomData);
    socket.on(SOCKET_EVENTS.TEXT_UPDATE, onTextUpdate);

    // Initial check (in case it connects immediately)
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.ERROR, onError);
      socket.off(SOCKET_EVENTS.ROOM_DATA, onRoomData);
      socket.off(SOCKET_EVENTS.TEXT_UPDATE, onTextUpdate);
      socket.disconnect();
    };
  }, [roomId, navigate]);

  // Debounced emit
  const emitUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    
    // Optimistic cache for offline reloading (basic PWA requirement)
    localStorage.setItem(`clipboard_${roomId}`, val);

    if (emitUpdateRef.current) clearTimeout(emitUpdateRef.current);
    
    emitUpdateRef.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TEXT_UPDATE, { roomId, text: val });
    }, 200); // 200ms debounce
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const newText = text ? text + '\n' + clipboardText : clipboardText;
      setText(newText);
      socket.emit(SOCKET_EVENTS.TEXT_UPDATE, { roomId, text: newText });
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl flex items-center space-x-3 shadow-sm border border-red-100">
          <AlertCircle className="w-6 h-6" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      </div>
    );
  }

  if (loading || !isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-gray-500 font-medium tracking-wide animate-pulse">
          Connecting to room...
        </span>
      </div>
    );
  }

  const roomUrl = window.location.href;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200/80 px-4 py-4 md:px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm shadow-indigo-50/50">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            title="Leave room"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center space-x-2">
              <span>Room:</span>
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">{roomId}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500"></span>
            </span>
            <span>Connected</span>
          </div>
          
          <div className="flex items-center space-x-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Users className="w-4 h-4" />
            <span>{roomData?.users || 1}</span>
          </div>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full relative">
        <div className="flex-1 relative flex flex-col shadow-xl shadow-gray-200/50 rounded-2xl bg-white border border-gray-100 overflow-hidden">
          
          <div className="absolute top-4 right-4 flex space-x-2 z-10">
            {/* Native Paste fallback if preferred, but manual button is nice */}
            <button
              onClick={handlePaste}
              className="px-4 py-2 bg-white/80 backdrop-blur border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium flex items-center space-x-2"
            >
              <span>Paste</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm text-sm font-medium flex items-center space-x-2 w-28 justify-center"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            placeholder="Type or paste something here... It will instantly appear on all connected devices."
            className="flex-1 w-full bg-transparent resize-none p-6 pt-16 md:p-8 md:pt-20 text-lg md:text-xl text-gray-800 placeholder-gray-300 focus:outline-none leading-relaxed font-mono"
            spellCheck="false"
          />
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          All changes are synchronized in realtime. Content is stored in memory and may be cleared.
        </p>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              ✕
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Room</h2>
              <p className="text-gray-500 text-sm">Scan QR code or share the link</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-2xl flex justify-center items-center mb-6 border border-gray-100">
              <QRCodeSVG 
                value={roomUrl} 
                size={200}
                level="H"
                includeMargin={false}
                className="bg-white p-2 rounded-xl shadow-sm"
              />
            </div>

            <div className="flex flex-col space-y-3">
              <div className="flex text-sm">
                <input 
                  type="text" 
                  readOnly 
                  value={roomUrl} 
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-l-lg px-3 py-2 text-gray-600 focus:outline-none"
                />
                <button 
                  onClick={async () => {
                    await navigator.clipboard.writeText(roomUrl);
                    alert('Link copied!');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-lg font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
