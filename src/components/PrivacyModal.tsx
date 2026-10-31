import React from 'react';
import { FileText, X, Check, Lock, Eye, Database } from 'lucide-react';

interface PrivacyModalProps {
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Privacy Information
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Transparent and minimal data handling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                No Personal Information Collected
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                SayHola does not ask for or store your email address, phone number, real name, passwords, or payment cards. You join purely with a chosen nickname.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                Public Room Visibility
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Messages sent in SayHola are public and visible to anyone participating in the room. Please refrain from posting confidential secrets or sensitive personal documents.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                Storage & Anonymous Sessions
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                A pseudonymous session identifier is generated in your browser's local storage to keep your session connected across refreshes. If you clear your browser data or click 'Leave Chat', this session identifier is reset.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                Moderation Records & Reporting
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                When you report a message, the report is securely stored and only accessible by authorized administrators. The reporter's identity is never disclosed to public users.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
