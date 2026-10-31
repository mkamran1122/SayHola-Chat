import React from 'react';
import { ShieldCheck, X, Check, AlertTriangle } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Community Rules
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Guidelines for everyone in SayHola
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

        {/* Content list */}
        <div className="p-6 space-y-4 overflow-y-auto text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                Treat Everyone with Respect
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Hate speech, personal slurs, insults, targeted harassment, and violent threats are strictly prohibited in all languages (including Roman Urdu and English).
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                No Spamming or Flooding
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Do not repeatedly send identical messages, paste walls of repetitive characters, or run automated bot scripts. Rate limits will temporarily mute flooders.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                Protect Privacy & No Doxxing
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Never post anyone's private contact information, real-world addresses, phone numbers, social security, or passwords without explicit consent.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                No Impersonation
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Do not choose nicknames intended to impersonate staff, moderators, or other chatters. Administrative nicknames are blocked automatically.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              5
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                Moderation & Enforcement
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Messages containing prohibited keywords are automatically rejected. Moderators can remove offending messages, temporarily mute accounts, or permanently ban disruptive sessions.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              If you see a message violating these rules, please use the flag icon on that message to submit an instant report to moderators.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>I Understand</span>
          </button>
        </div>
      </div>
    </div>
  );
};
