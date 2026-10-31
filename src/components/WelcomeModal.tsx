import React, { useState } from 'react';
import { MessageSquare, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { validateNickname } from '../lib/badWords';
import { UserAvatar } from './UserAvatar';

interface WelcomeModalProps {
  onJoin: (nickname: string) => { success: boolean; error?: string };
}

const RANDOM_NICKNAMES = [
  'SolarEcho',
  'MistyRiver',
  'NeonFalcon',
  'PixelPioneer',
  'SkyWanderer',
  'QuietBreeze',
  'SilverFox',
  'EchoChamber',
  'CosmicRay',
  'VelvetThunder',
  'LuckyClover',
  'BlazeRunner',
  'AuroraGlow',
  'NovaSpark',
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onJoin }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRandomize = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_NICKNAMES.length);
    const suffix = Math.floor(10 + Math.random() * 89);
    setNickname(`${RANDOM_NICKNAMES[randomIndex]}_${suffix}`);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    const validation = validateNickname(trimmed);

    if (!validation.isValid) {
      setError(validation.error || 'Invalid nickname.');
      return;
    }

    const result = onJoin(trimmed);
    if (!result.success) {
      setError(result.error || 'Failed to join chat.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl transition-all">
        {/* Brand visual header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-blue-500/25">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Welcome to SayHola
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            Instant public text chat. No registration, no email, no passwords.
          </p>
        </div>

        {/* Nickname Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="nickname-input"
                className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"
              >
                Choose your Nickname
              </label>
              <button
                type="button"
                onClick={handleRandomize}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                Randomize
              </button>
            </div>

            <div className="relative">
              <input
                id="nickname-input"
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={20}
                placeholder="e.g. Alex_99, CoolCoder"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-base focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
              />
              <span className="absolute right-3 top-3.5 text-xs text-zinc-400">
                {nickname.length}/20
              </span>
            </div>

            {error ? (
              <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                3 to 20 letters, numbers, or underscores.
              </p>
            )}
          </div>

          {/* Live Deterministic Avatar Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 transition-all">
            <UserAvatar nickname={nickname.trim() || 'You'} size="lg" animate />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Generated Avatar
              </div>
              <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {nickname.trim() || 'Enter nickname above'}
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Unique to you
            </span>
          </div>

          {/* Guidelines reminder */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-xs">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              SayHola is a moderated community. Harassment, spam, and abusive language are automatically blocked.
            </span>
          </div>

          <button
            type="submit"
            disabled={!nickname.trim() || nickname.trim().length < 3}
            className="w-full py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
          >
            <span>Enter Public Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
