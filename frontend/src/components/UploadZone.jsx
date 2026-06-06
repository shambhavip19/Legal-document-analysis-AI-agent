import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, AlertTriangle } from 'lucide-react';

export default function UploadZone({ onUpload, isLoading }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    setError('');
    const totalFiles = [...files, ...acceptedFiles];
    if (totalFiles.length > 2) {
      setError('You can upload a maximum of 2 files.');
      return;
    }
    setFiles(totalFiles);
  }, [files]);

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
    setError('');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 2
  });

  const handleUploadSubmit = () => {
    if (files.length === 0) {
      setError('Please select at least one document.');
      return;
    }
    onUpload(files);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        {...getRootProps()} 
        className={`glass-panel border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
            : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-900/40'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-indigo-600/10 rounded-full text-indigo-400 group-hover:scale-110 transition-transform">
            <Upload className="h-10 w-10 animate-bounce" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-slate-100">
              {isDragActive ? 'Drop your contract here' : 'Drag & drop your contract'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Supports standard contracts in PDF or DOCX format (Max 2 files for comparison)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center space-x-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Selected Documents ({files.length}/2)</h4>
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div 
                key={`${file.name}-${idx}`} 
                className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeFile(idx)}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleUploadSubmit}
            disabled={isLoading}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Parsing & Chunking...</span>
              </>
            ) : (
              <span>{files.length === 2 ? 'Analyze & Compare Contracts' : 'Analyze Contract'}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
