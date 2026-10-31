import React, { useState } from 'react';
import { Flag, X, CheckCircle, AlertCircle } from 'lucide-react';
import { ChatMessage, ReportReason } from '../types';
import { UserAvatar } from './UserAvatar';

interface ReportModalProps {
  message: ChatMessage | null;
  onClose: () => void;
  onSubmitReport: (
    messageId: string,
    reason: ReportReason,
    details?: string
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

const REPORT_REASONS: { key: ReportReason; label: string; description: string }[] = [
  { key: 'abusive_language', label: 'Abusive Language', description: 'Profanity, swearing, or vulgar attacks' },
  { key: 'harassment', label: 'Harassment & Bullying', description: 'Targeting, degrading, or intimidating someone' },
  { key: 'spam', label: 'Spam or Flooding', description: 'Repetitive messages, unwanted advertising, or links' },
  { key: 'threats', label: 'Threats or Violence', description: 'Threatening harm, illegal acts, or dangerous content' },
  { key: 'inappropriate_content', label: 'Inappropriate Content', description: 'Explicit or NSFW themes unsuitable for a public room' },
  { key: 'other', label: 'Other Concern', description: 'Other community guideline violations' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  message,
  onClose,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('abusive_language');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!message) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onSubmitReport(message.id, selectedReason, details);
    if (res.success) {
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setError(res.error || 'Failed to submit report.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-150 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-base">
            <Flag className="w-4 h-4 text-rose-500" />
            <span>Report Message</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Report Submitted
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
              Thank you for helping keep SayHola safe. Our moderators will review this message promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Target Message Preview */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                <span>Reported message by</span>
                <UserAvatar nickname={message.nickname_snapshot} size="xs" />
                <span className="text-zinc-900 dark:text-zinc-100 font-bold">{message.nickname_snapshot}:</span>
              </div>
              <div className="text-sm text-zinc-800 dark:text-zinc-200 italic line-clamp-3">
                "{message.message_text}"
              </div>
            </div>

            {/* Reason Radio Options */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                Why are you reporting this message?
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason.key}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border text-sm cursor-pointer transition ${
                      selectedReason === reason.key
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      checked={selectedReason === reason.key}
                      onChange={() => setSelectedReason(reason.key)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {reason.label}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {reason.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional details */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Additional context (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Provide any details to help moderators..."
                className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-xl text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition shadow-sm shadow-rose-500/20"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
