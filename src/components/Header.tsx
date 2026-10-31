import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  Sun,
  Moon,
  HelpCircle,
  FileText,
  Lock,
  Wifi,
  WifiOff,
  LogOut,
  Volume2,
  VolumeX,
  Menu,
  X,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ChatSession } from '../types';
import { UserAvatar } from './UserAvatar';

interface HeaderProps {
  session: ChatSession | null;
  onlineCount: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenPrivacy: () => void;
  onOpenAbout?: () => void;
  onOpenAdmin: () => void;
  onLeaveChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onlineCount,
  connectionStatus,
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenPrivacy,
  onOpenAbout,
  onOpenAdmin,
  onLeaveChat,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const [isCountPulsing, setIsCountPulsing] = useState(false);
  const [countTrend, setCountTrend] = useState<'up' | 'down' | null>(null);
  const prevCountRef = useRef(onlineCount);
  const isFirstRender = useRef(true);

  // Monitor onlineCount changes to trigger a subtle pulse animation
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevCountRef.current = onlineCount;
      return;
    }

    if (prevCountRef.current !== onlineCount) {
      const trend = onlineCount > prevCountRef.current ? 'up' : 'down';
      prevCountRef.current = onlineCount;
      setCountTrend(trend);
      setIsCountPulsing(true);

      const timer = setTimeout(() => {
        setIsCountPulsing(false);
        setCountTrend(null);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [onlineCount]);

  // Close mobile menu on screen resize to desktop (>= 768px / md)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(e.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleLinkClick = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 pt-[max(0.5rem,calc(0.5rem+env(safe-area-inset-top,0px)))] pl-[max(0.75rem,calc(0.75rem+env(safe-area-inset-left,0px)))] pr-[max(0.75rem,calc(0.75rem+env(safe-area-inset-right,0px)))]">
        {/* Brand logo & public room title */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-none truncate">
                SayHola
              </h1>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                Public Room
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block truncate">
              Open real-time chat for everyone
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* DESKTOP NAVBAR (md and up): Unchanged layout, colors, and controls */}
        {/* ------------------------------------------------------------------- */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-3 shrink-0">
          {/* Live Users Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
              isCountPulsing
                ? countTrend === 'up'
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/60 dark:ring-emerald-500/40 scale-105 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 ring-2 ring-zinc-400/40 dark:ring-zinc-600/30 scale-95'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
            } border`}
            title={`Approximate number of online participants (${onlineCount})`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                countTrend === 'down' ? 'bg-zinc-400' : 'bg-emerald-400'
              } opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                countTrend === 'down' ? 'bg-zinc-500' : 'bg-emerald-500'
              }`}></span>
            </span>
            <Users className={`w-3.5 h-3.5 inline transition-transform duration-300 ${
              isCountPulsing ? 'scale-110' : 'scale-100'
            }`} />
            <span className={`text-xs font-medium transition-all duration-300 inline-block ${
              isCountPulsing ? 'scale-110 font-bold' : 'scale-100'
            }`}>
              {onlineCount}
            </span>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center">
            {connectionStatus === 'connected' ? (
              <span
                className="p-1.5 text-zinc-400 dark:text-zinc-500"
                title="Realtime connection active"
              >
                <Wifi className="w-4 h-4 text-emerald-500" />
              </span>
            ) : (
              <span
                className="p-1.5 text-amber-500 animate-pulse"
                title="Connecting..."
              >
                <WifiOff className="w-4 h-4" />
              </span>
            )}
          </div>

          {/* Community Rules Link */}
          <button
            onClick={onOpenRules}
            aria-label="Community Rules"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Community Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Privacy Policy Link */}
          <button
            onClick={onOpenPrivacy}
            aria-label="Privacy Policy"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Privacy Policy"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Dark/Light mode toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle dark/light mode"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Message notification sound toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute message sound' : 'Unmute message sound'}
            className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition ${
              soundEnabled
                ? 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                : 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {/* Admin Link */}
          <button
            onClick={onOpenAdmin}
            aria-label="Admin Portal"
            className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200 dark:border-zinc-800"
            title="Moderator & Admin Portal"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          {/* Current user badge & exit */}
          {session && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <UserAvatar nickname={session.nickname} size="sm" animate />
              <button
                onClick={onLeaveChat}
                aria-label="Change nickname or leave chat"
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Change nickname or leave chat"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* MOBILE TOP BAR RIGHT (< md): Live status pill & Hamburger button   */}
        {/* ------------------------------------------------------------------- */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          {/* Compact Live Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
              isCountPulsing
                ? countTrend === 'up'
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/60 scale-105 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 ring-2 ring-zinc-400/40 scale-95'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
            } border`}
            title={`${onlineCount} online participants`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                countTrend === 'down' ? 'bg-zinc-400' : 'bg-emerald-400'
              } opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                countTrend === 'down' ? 'bg-zinc-500' : 'bg-emerald-500'
              }`}></span>
            </span>
            <span className={`text-[11px] font-semibold transition-all duration-300 inline-block ${
              isCountPulsing ? 'scale-110 font-bold' : 'scale-100'
            }`}>
              {onlineCount}
            </span>
          </div>

          {/* Hamburger Menu Toggle Button (minimum 44x44px touch target) */}
          <button
            ref={toggleButtonRef}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-colors active:scale-95"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-zinc-900 dark:text-zinc-100 transition-transform duration-200 rotate-90 animate-in" />
            ) : (
              <Menu className="w-5 h-5 text-zinc-900 dark:text-zinc-100 transition-transform duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MOBILE BACKDROP OVERLAY                                             */}
      {/* ------------------------------------------------------------------- */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-[49px] bg-zinc-950/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MOBILE NAVIGATION MENU (Vertically stacked, animated drawer)         */}
      {/* ------------------------------------------------------------------- */}
      <div
        id="mobile-navigation-menu"
        ref={menuRef}
        aria-hidden={!isMobileMenuOpen}
        className={`absolute top-full left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all duration-300 ease-out origin-top md:hidden ${
          isMobileMenuOpen
            ? 'opacity-100 translate-y-0 visible pointer-events-auto max-h-[calc(100dvh-3.5rem)]'
            : 'opacity-0 -translate-y-2 invisible pointer-events-none max-h-0'
        } overflow-y-auto`}
      >
        <div className="p-3 sm:p-4 space-y-3 pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom,0px)))] pl-[max(0.75rem,calc(0.75rem+env(safe-area-inset-left,0px)))] pr-[max(0.75rem,calc(0.75rem+env(safe-area-inset-right,0px)))]">
          {/* User Session Profile Card */}
          {session ? (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar nickname={session.nickname} size="md" animate />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {session.nickname}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Active in Public Room
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleLinkClick(onLeaveChat)}
                className="flex items-center gap-1 px-2.5 py-1.5 min-h-[40px] text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition active:scale-95 shrink-0"
                title="Change nickname or leave chat"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Welcome to SayHola
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Join in seconds — no registration needed
                </p>
              </div>
            </div>
          )}

          {/* Connection & Presence Status Row */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 transition-all duration-300 ${
                isCountPulsing ? 'text-emerald-500 scale-110' : 'text-emerald-600 dark:text-emerald-400'
              }`} />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                <strong className={`transition-all duration-300 inline-block ${
                  isCountPulsing
                    ? 'text-emerald-600 dark:text-emerald-400 scale-115 font-bold'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}>{onlineCount}</strong> users online
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              {connectionStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[11px] font-medium text-amber-500">Connecting</span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Links Stack (min 44px touch targets) */}
          <div className="space-y-1">
            {/* Community Rules */}
            <button
              onClick={() => handleLinkClick(onOpenRules)}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    Community Rules
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Chat etiquette &amp; zero-tolerance guidelines
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            {/* Privacy Policy */}
            <button
              onClick={() => handleLinkClick(onOpenPrivacy)}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    Privacy Policy
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    No tracking, no passwords, anonymous sessions
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            {/* About & FAQ */}
            {onOpenAbout && (
              <button
                onClick={() => handleLinkClick(onOpenAbout)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-[0.99] text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      About SayHola &amp; FAQ
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      Real-time public chat features &amp; answers
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
              </button>
            )}

            {/* Admin Portal */}
            <button
              onClick={() => handleLinkClick(onOpenAdmin)}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    Admin Portal
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Moderation controls &amp; system diagnostics
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
          </div>

          {/* Quick Settings Grid (Theme & Sound toggles) */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="min-h-[44px] p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition active:scale-95"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-blue-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Sound Notification Toggle Button */}
            <button
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
              className="min-h-[44px] p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition active:scale-95"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                  <span>Sound Off</span>
                </>
              )}
            </button>
          </div>

          {/* Branding credit note */}
          <div className="pt-1 text-center">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              SayHola • Free Public Real-Time Chat • MK Labs
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
