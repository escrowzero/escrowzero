import React from 'react';
import { X, Download, FileCode, ExternalLink } from 'lucide-react';

interface ExportHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportHtmlModal: React.FC<ExportHtmlModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/escrow-market.html';
    link.download = 'escrow-market.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenRaw = () => {
    window.open('/escrow-market.html', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-[rgba(58,94,60,0.16)] rounded-3xl shadow-2xl p-6 sm:p-7 relative text-[#3a5e3c]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#1e3a2c] hover:text-[#3a5e3c] hover:bg-[#e7f6ec] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded bg-[#3a5e3c]/10 border border-[#82f5ad]/30 text-[#145c32]">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-robotics text-base font-bold text-[#3a5e3c]">
              STANDALONE SINGLE-FILE HTML
            </h3>
            <p className="text-xs font-mono text-[#1e3a2c]">
              HTML + &lt;style&gt; + &lt;script&gt; Self-Contained dApp
            </p>
          </div>
        </div>
        <p className="text-xs text-[#1e3a2c] font-sans leading-relaxed mb-4">
          The complete <strong>Escrow Market</strong> dApp (Landing Page, Ticker Bar, Robotics dApp Terminal, Escrow Creator, Active Ledger, $ZEC VIP Tier system, and Web3 logic) is bundled into a single zero-dependency HTML file (<code>escrow-market.html</code>) with warm cream styling and robotics typography. Open directly in any web browser without Node.js or build steps!
        </p>
        <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded font-mono text-xs flex flex-col gap-2 mb-4">
          <div className="flex justify-between text-[#1e3a2c]">
            <span>File Name:</span>
            <span className="text-[#3a5e3c] font-bold">escrow-market.html</span>
          </div>
          <div className="flex justify-between text-[#1e3a2c]">
            <span>Visual Theme:</span>
            <span className="text-[#145c32] font-bold">Warm Cream / Desert Earth & Robotics Font</span>
          </div>
          <div className="flex justify-between text-[#1e3a2c]">
            <span>EVM Network:</span>
            <span className="text-[#145c32] font-bold">Robinhood Chain (EVM L2)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 bg-[#3a5e3c] hover:bg-[#2f4d31] text-white font-robotics font-bold text-xs rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download .HTML File</span>
          </button>
          <button
            onClick={handleOpenRaw}
            className="px-4 py-2.5 bg-white hover:bg-[#c1d9bf] border border-[rgba(58,94,60,0.16)] text-[#3a5e3c] font-robotics text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-[#145c32]" />
            <span>Open Standalone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
