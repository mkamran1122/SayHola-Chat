import React from 'react';
import { MessageSquare, Shield, Zap, Smartphone, Check, X, Users, Heart } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                About SayHola &amp; FAQ
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Free Public Real-Time Chat Room
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {/* Overview */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2">
            <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Instant Online Chat Without Registration</span>
            </h3>
            <p className="text-blue-950/80 dark:text-blue-200/80 leading-relaxed text-xs">
              SayHola is an open public chat application engineered for instantaneous communication. Pick any available nickname and join the public room in seconds without providing an email, password, or phone number.
            </p>
          </div>

          {/* Key Capabilities */}
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-3">
              Core Features &amp; Architecture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Real-Time Messaging</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Firebase Realtime Database WebSockets stream messages instantly without page reloads.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Community Safety</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Automated profanity filtering, rate-limit protection, and user message reporting.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span>Deterministic Avatars</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Unique vector avatars generated deterministically from your nickname.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Cross-Platform Ready</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Optimized for mobile web, desktop, and packaged for Android devices.
                </p>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="space-y-3">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              Frequently Asked Questions (FAQ)
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Is SayHola completely free?
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  Yes, public chat is completely free for everyone. There are no subscriptions, credits, paywalls, or artificial limits on your conversations.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Do I need an account or email address to chat?
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  No registration or personal details are required. Simply choose a nickname between 3 and 20 characters to enter the room.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  How can I report abusive messages or spam?
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  Hover or tap any message to reveal the report flag icon. You can report spam, harassment, threats, or vulgarity for moderator review.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Who created SayHola?
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  SayHola is proudly created and maintained as a product by MK Labs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500">
            SayHola • A product by MK Labs
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
