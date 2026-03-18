import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Users, Check, Share2, LogOut, Loader2, AlertCircle, Wand2, Type, Code2, Cpu, Hash } from 'lucide-react';
import { SOCKET_EVENTS, type RoomData, type FileMetadata } from '@realtime-clipboard/shared';
import { socket } from '../lib/socket';
import FileTransfer from '../components/FileTransfer';
import Editor, { type OnMount } from '@monaco-editor/react';

const SUPPORTED_LANGUAGES = [
  { id: 'plaintext', name: 'Plain Text', icon: <Type className="w-4 h-4" /> },
  { id: 'json', name: 'JSON', icon: <Hash className="w-4 h-4" /> },
  { id: 'javascript', name: 'JavaScript', icon: <Code2 className="w-4 h-4" /> },
  { id: 'typescript', name: 'TypeScript', icon: <Code2 className="w-4 h-4" /> },
  { id: 'html', name: 'HTML', icon: <Cpu className="w-4 h-4" /> },
  { id: 'css', name: 'CSS', icon: <Cpu className="w-4 h-4" /> },
  { id: 'markdown', name: 'Markdown', icon: <Hash className="w-4 h-4" /> },
];

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
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [language, setLanguage] = useState('plaintext');
  
  const editorRef = useRef<any>(null);

  // Auto-detect JSON
  useEffect(() => {
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        JSON.parse(text);
        if (language === 'plaintext') setLanguage('json');
      } catch (e) {
        // Not valid JSON
      }
    }
  }, [text, language]);

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
      setRoomData({ ...data }); 
      if (loading) {
        setText(data.text);
        setLoading(false);
      }
    };

    const onTextUpdate = ({ text: newText }: { text: string }) => {
      // If we are currently focused on editor, we need to be careful with cursors
      // Monaco handles this better if we only update when necessary
      if (newText !== text) {
        setText(newText);
      }
    };

    const onFileAvailable = (file: FileMetadata) => {
      setFiles((prev) => {
        if (prev.find(f => f.fileId === file.fileId)) return prev;
        return [...prev, file];
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.ERROR, onError);
    socket.on(SOCKET_EVENTS.ROOM_DATA, onRoomData);
    socket.on(SOCKET_EVENTS.TEXT_UPDATE, onTextUpdate);
    socket.on(SOCKET_EVENTS.FILE_AVAILABLE, onFileAvailable);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.ERROR, onError);
      socket.off(SOCKET_EVENTS.ROOM_DATA, onRoomData);
      socket.off(SOCKET_EVENTS.TEXT_UPDATE, onTextUpdate);
      socket.off(SOCKET_EVENTS.FILE_AVAILABLE, onFileAvailable);
      socket.disconnect();
    };
  }, [roomId, navigate, loading, text]);

  // Debounced emit
  const emitUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    setText(val);
    
    localStorage.setItem(`clipboard_${roomId}`, val);

    if (emitUpdateRef.current) clearTimeout(emitUpdateRef.current);
    
    emitUpdateRef.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TEXT_UPDATE, { roomId, text: val });
    }, 200);
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

  const handleFormat = async () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleFileUploadSuccess = () => {};

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
      <main className="flex-1 flex flex-col lg:flex-row p-4 md:p-8 max-w-7xl mx-auto w-full gap-8">
        
        {/* Left: Editor Area */}
        <div className="flex-1 flex flex-col shadow-xl shadow-gray-200/50 rounded-2xl bg-white border border-gray-100 overflow-hidden min-h-[500px]">
          
          {/* Editor Toolbar */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      language === lang.id 
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {lang.icon}
                    <span className="hidden xl:inline">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleFormat}
                className="flex items-center space-x-1.5 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-200 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Format Code</span>
              </button>
              
              <button
                onClick={handleCopy}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ring-1 ${
                  copied 
                    ? 'bg-green-50 text-green-600 ring-green-200 animate-in zoom-in-95' 
                    : 'bg-indigo-600 text-white ring-indigo-500 hover:bg-indigo-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy All'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 h-full w-full bg-white relative">
            <Editor
              height="100%"
              language={language}
              value={text}
              theme="light"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                matchBrackets: 'always',
                automaticLayout: true,
                padding: { top: 20, bottom: 20 },
                lineHeight: 1.6,
                letterSpacing: 0,
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
              }}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              loading={<div className="flex items-center justify-center h-full text-gray-400">Loading editor...</div>}
            />
          </div>
          
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-2 flex justify-between items-center">
            <p className="text-[10px] text-gray-400 font-medium">
              Synced in realtime • Monaco Engine
            </p>
            <p className="text-[10px] text-indigo-400 font-mono">
              {text.length} chars
            </p>
          </div>
        </div>

        {/* Right: File Transfer */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-24">
            <FileTransfer 
              roomId={roomId!} 
              files={files} 
              onUploadSuccess={handleFileUploadSuccess} 
            />
          </div>
        </div>
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
