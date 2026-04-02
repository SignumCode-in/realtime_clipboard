import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Users, Check, Share2, LogOut, Loader2, AlertCircle, Type, Code2, Cpu, Hash, X } from 'lucide-react';
import { SOCKET_EVENTS, type RoomData, type FileMetadata } from '@realtime-clipboard/shared';
import { socket } from '../lib/socket';
import { cn } from '../lib/utils';
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
  const [userId] = useState(() => {
    const saved = localStorage.getItem('clipboard_user_id');
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('clipboard_user_id', newId);
    return newId;
  });

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

    const onConnect = () => {
      setIsConnected(true);
      setErrorMsg('');
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onError = ({ message }: { message: string }) => {
      setErrorMsg(message);
      setLoading(false);
    };

    const onRoomData = (data: RoomData) => {
      setRoomData(data);
      setText(data.text);
      setLoading(false);
    };

    const onTextUpdate = ({ text: newText }: { text: string }) => {
      setText((prevText) => {
        if (newText !== prevText) {
          return newText;
        }
        return prevText;
      });
    };

    const onFileAvailable = (file: FileMetadata) => {
      setFiles((prev) => {
        if (prev.find(f => f.fileId === file.fileId)) return prev;
        return [...prev, file];
      });
    };

    const onFileDeleted = ({ fileId }: { fileId: string }) => {
      setFiles((prev) => prev.filter(f => f.fileId !== fileId));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.ERROR, onError);
    socket.on(SOCKET_EVENTS.ROOM_DATA, onRoomData);
    socket.on(SOCKET_EVENTS.TEXT_UPDATE, onTextUpdate);
    socket.on(SOCKET_EVENTS.FILE_AVAILABLE, onFileAvailable);
    socket.on(SOCKET_EVENTS.FILE_DELETED, onFileDeleted);

    if (socket.connected) {
      onConnect();
    }

    // Update document title for SEO and better UX
    const originalTitle = document.title;
    document.title = `Room: ${roomId} - Realtime Clipboard`;

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.ERROR, onError);
      socket.off(SOCKET_EVENTS.ROOM_DATA, onRoomData);
      socket.off(SOCKET_EVENTS.TEXT_UPDATE, onTextUpdate);
      socket.off(SOCKET_EVENTS.FILE_AVAILABLE, onFileAvailable);
      socket.off(SOCKET_EVENTS.FILE_DELETED, onFileDeleted);
      document.title = originalTitle;
    };
  }, [roomId, navigate]);

  // Debounced emit
  const emitUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    setText(val);

    localStorage.setItem(`clipboard_${roomId}`, val);

    if (emitUpdateRef.current) clearTimeout(emitUpdateRef.current);

    emitUpdateRef.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TEXT_UPDATE, { roomId, text: val });
    }, 500);
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const copyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUploadSuccess = (file: FileMetadata) => {
    setFiles((prev) => [...prev, file]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/50 flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connecting to Room</h2>
          <p className="text-gray-500 text-center text-sm">Preparing your encrypted clipboard session...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-red-100/50 flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Room Error</h2>
          <p className="text-red-500 text-center text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-6 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all active:scale-[0.98]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-lg font-bold text-gray-900 leading-none">Realtime</h1>
              <p className="text-[10px] font-medium text-indigo-600 tracking-wider uppercase mt-0.5">Clipboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
            <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100 overflow-hidden max-w-[140px] xs:max-w-none">
              <code className="text-sm font-mono font-medium text-gray-600 px-2 truncate">
                {roomId}
              </code>
              <button
                onClick={copyRoomId}
                className={cn(
                  "p-2 rounded-lg transition-all active:scale-95",
                  copied ? "bg-green-500 text-white" : "bg-white text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100"
                )}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all active:scale-95"
                title="Share room"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <div className="h-8 w-[1px] bg-gray-100 mx-1 hidden md:block" />
              <button
                onClick={() => navigate('/')}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                title="Leave room"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col lg:flex-row gap-8">
        {/* Left: Editor Area */}
        <div className="flex-1 min-w-0 flex flex-col space-y-4">
          {/* Header Controls */}
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-gray-100 shadow-sm shrink-0">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                    language === lang.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {lang.icon}
                  <span className="hidden sm:inline">{lang.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg shrink-0">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs font-bold font-mono">{roomData?.users || 0}</span>
              </div>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )} />
            </div>
          </div>

          {/* Editor Container */}
          <div className="relative flex-1 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden min-h-[450px]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 z-10 opacity-50" />
            
            <div className="h-full pt-4">
              <Editor
                height="450px"
                language={language}
                value={text}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  wordWrap: 'on',
                  cursorStyle: 'line',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false,
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                  }
                }}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                loading={<div className="flex items-center justify-center h-full text-gray-400">Loading editor...</div>}
              />
            </div>

            {/* Editor Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-2 flex justify-between items-center">
              <p className="text-[10px] text-gray-400 font-medium">
                Synced in realtime • Monaco Engine
              </p>
              <p className="text-[10px] text-indigo-400 font-mono">
                {text.length} chars
              </p>
            </div>
          </div>
        </div>

        {/* Right: File Transfer */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-24">
            <FileTransfer
              roomId={roomId!}
              userId={userId}
              files={files}
              onUploadSuccess={handleFileUploadSuccess}
            />
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px] transition-opacity">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                <Share2 className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Share Room</h3>
              <p className="text-gray-500 text-center text-sm mb-8">Scan this code to quickly join the room from another device.</p>
              
              <div className="p-6 bg-white border-2 border-gray-50 rounded-3xl mb-8 shadow-sm">
                <QRCodeSVG value={window.location.href} size={200} />
              </div>

              <div className="w-full flex gap-3">
                <button
                  onClick={copyRoomId}
                  className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
