import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, RotateCcw, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isRefund = toast.type === 'refund';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-lg border backdrop-blur-md shadow-xl transition-all animate-in slide-in-from-bottom-5 duration-300 font-mono text-xs flex items-start gap-3 ${
              isSuccess
                ? 'bg-white border-[#82f5ad]/40 text-[#3a5e3c]'
                : isRefund
                ? 'bg-white border-[#82f5ad]/40 text-[#3a5e3c]'
                : isWarning
                ? 'bg-white border-amber-400 text-[#3a5e3c]'
                : 'bg-white border-[rgba(58,94,60,0.16)] text-[#3a5e3c]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#145c32]" />}
              {isRefund && <RotateCcw className="w-4 h-4 text-[#145c32]" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[#1e3a2c]" />}
            </div>
            <div className="flex-1 pr-1">
              <div className="font-robotics font-bold flex items-center gap-1.5">
                <span className={isSuccess ? 'text-[#145c32]' : isRefund ? 'text-[#145c32]' : 'text-[#3a5e3c]'}>
                  {toast.title}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#82f5ad] led-blink-green" />
              </div>
              <div className="text-[11px] text-[#1e3a2c] mt-0.5 leading-snug">
                {toast.message}
              </div>
              {toast.txHash && (
                <div className="text-[10px] text-[#1e3a2c] truncate mt-1">
                  TX: {toast.txHash.slice(0, 16)}...
                </div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 text-[#1e3a2c] hover:text-[#3a5e3c] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
