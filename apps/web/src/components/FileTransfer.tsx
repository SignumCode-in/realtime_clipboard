import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Upload, File as FileIcon, X, Download, Loader2, Paperclip, Clock, ShieldCheck, Trash2 } from 'lucide-react';
import { type FileMetadata, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@realtime-clipboard/shared';
import { cn } from '../lib/utils';

interface FileTransferProps {
  roomId: string;
  userId: string;
  files: FileMetadata[];
  onUploadSuccess: (file: FileMetadata) => void;
}

export default function FileTransfer({ roomId, userId, files, onUploadSuccess }: FileTransferProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update 'now' every second for the countdown
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRemainingTime = useCallback((uploadedAt: string) => {
    const expiryTime = new Date(uploadedAt).getTime() + 5 * 60 * 1000;
    const diff = expiryTime - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [now]);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError('File size too large (max 50MB)');
      return;
    }

    const isAllowedMimeType = ALLOWED_FILE_TYPES.includes(file.type);
    const isTextExtension = file.name.toLowerCase().endsWith('.txt') || 
                           file.name.toLowerCase().endsWith('.md') ||
                           file.name.toLowerCase().endsWith('.json') ||
                           file.name.toLowerCase().endsWith('.csv');

    if (!isAllowedMimeType && !isTextExtension) {
      setError('Unsupported file type');
      return;
    }

    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    formData.append('ownerId', userId);

    try {
      const response = await axios.post<FileMetadata>('/upload', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      onUploadSuccess(response.data);
      setUploadProgress(null);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setUploadProgress(null);
    }
  }, [roomId, onUploadSuccess]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await axios.post(`/delete/${fileId}`, { ownerId: userId });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const activeFiles = files
    .filter((f) => (new Date(f.uploadedAt).getTime() + 5 * 60 * 1000) > now)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-500" />
          <span>Temporary Transfers</span>
        </h2>
        <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" />
          <span>Expires in 5m</span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group",
          isDragging
            ? "border-indigo-500 bg-indigo-50/50"
            : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50"
        )}
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={onFileChange}
        />

        {uploadProgress !== null ? (
          <div className="w-full max-w-[200px] flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">{uploadProgress}% Uploading...</span>
          </div>
        ) : (
          <>
            <div className="p-2.5 md:p-3 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
              <Upload className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Click or drag to share</p>
              <p className="text-[10px] md:text-xs text-gray-400 mt-1 px-2">Images, PDF, Text, ZIP (max 50MB)</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-xs text-red-600 animate-in fade-in slide-in-from-top-1">
          <X className="w-4 h-4 cursor-pointer" onClick={() => setError(null)} />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Files List */}
      {activeFiles.length > 0 && (
        <div className="grid gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeFiles.map((file) => (
            <div
              key={file.fileId}
              className="group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-gray-50 text-gray-500 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                  <FileIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[120px] xs:max-w-[150px] md:max-w-[200px]">
                    {file.fileName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">
                      {formatFileSize(file.fileSize)}
                    </span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className={cn(
                      "text-[10px] font-mono font-medium",
                      getRemainingTime(file.uploadedAt) === 'Expired' ? "text-red-400" : "text-indigo-400"
                    )}>
                      {getRemainingTime(file.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={file.downloadUrl}
                  download={file.fileName}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                {file.ownerId === userId && (
                  <button
                    onClick={() => handleDelete(file.fileId)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100/50">
        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        <span>No permanent storage. Only visible to others in this room.</span>
      </div>
    </div>
  );
}
