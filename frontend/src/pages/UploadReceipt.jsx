import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiX, FiArrowLeft, FiImage, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

const UploadReceipt = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { success, expense, categorization } or { error }

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(Object.assign(accepted[0], { preview: URL.createObjectURL(accepted[0]) }));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif'] },
    maxFiles: 1,
    multiple: false,
  });

  const removeFile = () => {
    if (file?.preview) URL.revokeObjectURL(file.preview);
    setFile(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/upload/receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setResult({ success: true, ...res.data });
        toast.success('Receipt processed!');
        setTimeout(() => navigate('/expenses'), 3000);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to process receipt';
      toast.error(msg);
      setResult({ error: msg });
    } finally {
      setUploading(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="navbar">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost px-2 py-2">
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="font-display font-semibold text-white text-base leading-tight">Upload Receipt</h1>
            <p className="text-xs text-gray-500">AI will extract all details automatically</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors duration-150
            ${isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }`}
        >
          <input {...getInputProps()} />
          <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center
            ${isDragActive ? 'bg-primary/20 text-primary' : 'bg-white/[0.05] text-gray-500'}`}>
            <FiUploadCloud className="text-2xl" />
          </div>
          <p className="text-sm font-medium text-gray-200 mb-1">
            {isDragActive ? 'Drop your receipt here' : 'Drag & drop receipt, or click to browse'}
          </p>
          <p className="text-xs text-gray-600">JPG, PNG, GIF — up to 10 MB</p>
        </div>

        {/* Preview + actions */}
        {file && !result && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <FiImage className="text-gray-500" />
                <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                <span className="text-gray-600">· {(file.size / 1024).toFixed(0)} KB</span>
              </div>
              <button onClick={removeFile} className="btn-ghost px-2 py-1.5 text-gray-500 hover:text-white">
                <FiX className="text-sm" />
              </button>
            </div>

            <div className="p-4 relative">
              <img
                src={file.preview}
                alt="Receipt preview"
                className="max-h-64 mx-auto rounded-xl object-contain"
              />
              {uploading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-gray-300 font-medium">Extracting data…</p>
                </div>
              )}
            </div>

            {!uploading && (
              <div className="px-4 pb-4">
                <button onClick={handleUpload} className="btn-primary w-full py-2.5">
                  Process Receipt
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success result */}
        {result?.success && (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.07]">
              <FiCheckCircle className="text-emerald-400 text-lg" />
              <p className="text-sm font-semibold text-white">Extraction Successful</p>
              <span className="ml-auto text-xs text-gray-500">Redirecting to expenses…</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
              {[
                { label: 'Merchant', value: result.expense?.merchant },
                { label: 'Amount', value: fmt(result.expense?.amount) },
                { label: 'Date', value: result.expense?.date ? new Date(result.expense.date).toLocaleDateString('en-IN') : '—' },
                { label: 'Category', value: result.categorization?.category },
              ].map(item => (
                <div key={item.label} className="bg-background px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-white">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error result */}
        {result?.error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2.5 mb-3">
              <FiAlertCircle className="text-red-400 text-lg flex-shrink-0" />
              <p className="text-sm font-semibold text-white">Processing Failed</p>
            </div>
            <p className="text-sm text-gray-400 mb-4">{result.error}</p>
            <button
              onClick={() => { setResult(null); setFile(null); }}
              className="btn-secondary text-sm gap-2"
            >
              <FiRefreshCw className="text-sm" />
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadReceipt;
