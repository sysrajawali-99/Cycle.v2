import React from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

interface TaskPhotoViewerModalProps {
  photoUrl: string;
  title: string;
  onClose: () => void;
}

export const TaskPhotoViewerModal: React.FC<TaskPhotoViewerModalProps> = ({
  photoUrl,
  title,
  onClose
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-60 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full flex flex-col items-center space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between text-white px-2">
          <h4 className="font-bold text-sm tracking-tight truncate max-w-md">{title}</h4>
          <button
            id="close-photo-viewer-btn"
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 max-h-[80vh] flex items-center justify-center shadow-2xl">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
          />
        </div>

        <p className="text-xs text-slate-400 italic">
          * Pratinjau foto inspeksi kebersihan PT Rajawali (Hanya tampilan memori frontend).
        </p>
      </div>
    </div>
  );
};
