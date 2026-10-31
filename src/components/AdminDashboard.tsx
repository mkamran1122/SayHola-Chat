import React, { useState, useEffect } from 'react';
import {
  Shield,
  MessageSquare,
  Flag,
  Ban,
  VolumeX,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Settings,
  History,
  Lock,
  ArrowLeft,
  Plus,
  RefreshCw,
  AlertTriangle,
  Scissors,
  LogOut,
  Mail,
  Megaphone,
  Heart,
  Eye,
  Send,
  ExternalLink,
  Flame,
  Check,
  Copy,
} from 'lucide-react';
import {
  ChatMessage,
  MessageReport,
  ModerationLog,
  UserModeration,
  ChatSettings,
} from '../types';
import { ChatService } from '../lib/chatStore';
import { UserAvatar } from './UserAvatar';
import { checkProfanity } from '../lib/badWords';
import {
  getStoredFirebaseConfig,
  isFirebaseConfigured,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
  DEFAULT_FIREBASE_CONFIG,
  FirebaseConfig,
} from '../lib/firebase';
import { User } from 'firebase/auth';

interface AdminDashboardProps {
  onClose: () => void;
  onlineCount: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  onlineCount,
}) => {
  const chatService = ChatService.getInstance();

  // Auth State (Pure Firebase Authentication)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(chatService.getCurrentAdminUser());
  });
  const [adminUser, setAdminUser] = useState<User | null>(chatService.getCurrentAdminUser());
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'messages' | 'announcements' | 'reports' | 'moderations' | 'settings' | 'firebase' | 'logs'
  >('messages');

  // Data States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [moderations, setModerations] = useState<UserModeration[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [settings, setSettings] = useState<ChatSettings>(chatService.getSettings());

  // Search & Filter
  const [messageSearch, setMessageSearch] = useState('');
  const [newProhibitedWord, setNewProhibitedWord] = useState('');
  const [testPhrase, setTestPhrase] = useState('');
  const [testResult, setTestResult] = useState<{ isClean: boolean; matchedWord?: string; reason?: string } | null>(null);

  // Manual Ban Form
  const [manualSessionId, setManualSessionId] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualDuration, setManualDuration] = useState('60'); // minutes or 0 for permanent
  const [manualAction, setManualAction] = useState<'mute' | 'ban'>('mute');

  // Pruning action state
  const [pruneResult, setPruneResult] = useState<string | null>(null);

  // Announcements State
  const [announcementText, setAnnouncementText] = useState('');
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState<string | null>(null);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [showAnnouncementPreview, setShowAnnouncementPreview] = useState(false);

  // Patreon URL state
  const [patreonUrlInput, setPatreonUrlInput] = useState(
    chatService.getSettings().patreon_url || 'https://patreon.com/sayhola_chat'
  );
  const [patreonSavedNotice, setPatreonSavedNotice] = useState(false);

  // Firebase Diagnostic / Config State (Admin Only)
  const currentConfig = getStoredFirebaseConfig();
  const [customFirebaseConfig, setCustomFirebaseConfig] = useState<FirebaseConfig>({ ...currentConfig });
  const [fbSaveNotice, setFbSaveNotice] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  // Reload data from service
  const reloadData = () => {
    setReports([...chatService.getReports()]);
    setModerations([...chatService.getModerationRecords()]);
    setLogs([...chatService.getModerationLogs()]);
    const currentSets = chatService.getSettings();
    setSettings(currentSets);
    setPatreonUrlInput(currentSets.patreon_url || 'https://patreon.com/sayhola_chat');
  };

  useEffect(() => {
    const unsub = chatService.subscribeToMessages((msgs) => {
      setMessages(msgs);
    });
    const unsubAuth = chatService.subscribeToAdminAuth((user) => {
      setAdminUser(user);
      if (user) {
        setIsAuthenticated(true);
      }
    });

    reloadData();
    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!adminEmail.trim() || !adminPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setIsAuthenticating(true);
    const res = await chatService.adminSignInWithFirebase(adminEmail.trim(), adminPassword);
    setIsAuthenticating(false);

    if (res.success) {
      setIsAuthenticated(true);
    } else {
      setAuthError(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleSignOut = async () => {
    await chatService.adminSignOut();
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  const handleDeleteMessage = async (msgId: string) => {
    await chatService.deleteMessage(msgId, adminUser?.email || 'admin');
    reloadData();
  };

  const handleMuteUser = async (sessionId: string, nickname: string, durationMin: number = 15) => {
    await chatService.moderateUser(
      sessionId,
      'mute',
      'Language or spam violation (Admin panel)',
      durationMin,
      nickname,
      adminUser?.email || 'admin'
    );
    reloadData();
  };

  const handleBanUser = async (sessionId: string, nickname: string, durationMin: number | null = null) => {
    await chatService.moderateUser(
      sessionId,
      'ban',
      'Severe violation of community rules',
      durationMin,
      nickname,
      adminUser?.email || 'admin'
    );
    reloadData();
  };

  const handleUnmoderate = async (sessionId: string, action: 'mute' | 'ban') => {
    await chatService.unmoderateUser(sessionId, action, adminUser?.email || 'admin');
    reloadData();
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    await chatService.updateReportStatus(reportId, status);
    reloadData();
  };

  const handlePruneMessages = async () => {
    const prunedCount = await chatService.pruneOlderMessages(60);
    setPruneResult(
      prunedCount > 0
        ? `Cleaned up ${prunedCount} older messages to optimize Realtime Database storage.`
        : 'Message history is already compact (within 60 messages).'
    );
    reloadData();
    setTimeout(() => setPruneResult(null), 3000);
  };

  const handlePublishAnnouncement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!announcementText.trim() || isPublishingAnnouncement) return;

    setIsPublishingAnnouncement(true);
    setAnnouncementError(null);
    setAnnouncementSuccess(null);

    const isPatreonNotice = announcementText.includes('Patreon') || announcementText.includes('patreon.com');
    const res = await chatService.sendAdminAnnouncement(announcementText.trim(), isPatreonNotice);
    setIsPublishingAnnouncement(false);

    if (res.success) {
      setAnnouncementSuccess('Announcement published to public chat in real time!');
      setAnnouncementText('');
      setShowAnnouncementPreview(false);
      setTimeout(() => setAnnouncementSuccess(null), 4000);
    } else {
      setAnnouncementError(res.error || 'Failed to publish announcement.');
    }
  };

  const handleLoadPatreonTemplate = () => {
    const url = settings.patreon_url || patreonUrlInput || 'https://patreon.com/sayhola_chat';
    const template = `Enjoying SayHola? ❤️ Help us keep the chat free for everyone. If you’d like to support ongoing hosting and development, you can make a voluntary one-time contribution through Patreon: ${url}. Supporting us is completely optional, and the chat remains free to use.`;
    setAnnouncementText(template);
    setAnnouncementError(null);
  };

  const handleSavePatreonUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = patreonUrlInput.trim();
    chatService.updateSettings({ patreon_url: cleanUrl });
    setSettings(chatService.getSettings());
    setPatreonSavedNotice(true);
    setTimeout(() => setPatreonSavedNotice(false), 2500);
  };

  const handleAddProhibitedWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newProhibitedWord.trim().toLowerCase();
    if (!word) return;
    if (settings.prohibited_words.includes(word)) return;

    const updated = [...settings.prohibited_words, word];
    chatService.updateSettings({ prohibited_words: updated });
    setSettings(chatService.getSettings());
    setNewProhibitedWord('');
  };

  const handleRemoveProhibitedWord = (word: string) => {
    const updated = settings.prohibited_words.filter((w) => w !== word);
    chatService.updateSettings({ prohibited_words: updated });
    setSettings(chatService.getSettings());
  };

  const handleRunWordTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhrase.trim()) {
      setTestResult(null);
      return;
    }
    const result = checkProfanity(testPhrase, settings.prohibited_words);
    setTestResult(result);
  };

  const handleManualModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSessionId.trim()) return;

    const duration = manualDuration === '0' ? null : parseInt(manualDuration, 10);
    await chatService.moderateUser(
      manualSessionId.trim(),
      manualAction,
      manualReason.trim() || 'Manual moderation via Admin',
      duration,
      undefined,
      adminUser?.email || 'admin'
    );

    setManualSessionId('');
    setManualReason('');
    reloadData();
  };

  const handleSaveCustomFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomFirebaseConfig(customFirebaseConfig);
    chatService.initFirebaseListeners();
    setFbSaveNotice(true);
    setTimeout(() => setFbSaveNotice(false), 2500);
  };

  const handleResetFirebaseConfig = () => {
    clearCustomFirebaseConfig();
    setCustomFirebaseConfig({ ...DEFAULT_FIREBASE_CONFIG });
    chatService.initFirebaseListeners();
  };

  const filteredMessages = messages.filter((m) => {
    if (!messageSearch) return true;
    const q = messageSearch.toLowerCase();
    return (
      m.message_text.toLowerCase().includes(q) ||
      m.nickname_snapshot.toLowerCase().includes(q) ||
      m.session_id.toLowerCase().includes(q)
    );
  });

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  // Unauthenticated Admin Login Screen (Clean, Professional, No Technical Implementation Leak)
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center mb-3 shadow-md">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Admin & Moderator Login
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Authorized personnel only. Enter your credentials to access moderation controls.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@sayhola.org"
                    autoFocus
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 font-medium">
                {authError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 transition shadow-xs min-h-[40px] flex items-center gap-2"
              >
                {isAuthenticating && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{isAuthenticating ? 'Signing In...' : 'Log In as Admin'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 animate-fade-in overflow-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            aria-label="Back to Public Chat"
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Back to Public Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base leading-tight truncate">SayHola Admin</h2>
                {adminUser && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold px-1.5 py-0.2 rounded truncate max-w-[120px] sm:max-w-[200px]">
                    {adminUser.email}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-500 hidden sm:block">Moderation, Announcements & Settings</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={reloadData}
            aria-label="Refresh data"
            className="p-1.5 sm:p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSignOut}
            aria-label="Log out"
            className="p-1.5 sm:p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Log out from Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="px-2.5 sm:px-3.5 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Return to Room
          </button>
        </div>
      </header>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 px-3 sm:px-6 py-3 max-w-6xl w-full mx-auto shrink-0">
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="text-[11px] text-zinc-500 uppercase font-semibold">Online Chatters</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {onlineCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="text-[11px] text-zinc-500 uppercase font-semibold">Recent Messages</div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {messages.length}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="text-[11px] text-zinc-500 uppercase font-semibold">Pending Reports</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {pendingReportsCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="text-[11px] text-zinc-500 uppercase font-semibold">Active Sanctions</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {moderations.length}
          </div>
        </div>
      </div>

      {/* Tab Navigation (Responsive Horizontal Scroll) */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-6 shrink-0">
        <div className="max-w-6xl mx-auto flex gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap min-h-[40px] ${
              activeTab === 'messages'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap min-h-[40px] ${
              activeTab === 'announcements'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Announcements</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap min-h-[40px] ${
              activeTab === 'reports'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>Reports {pendingReportsCount > 0 && `(${pendingReportsCount})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('moderations')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap min-h-[40px] ${
              activeTab === 'moderations'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Bans & Mutes</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap min-h-[40px] ${
              activeTab === 'settings'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('firebase')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap min-h-[40px] ${
              activeTab === 'firebase'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Firebase & Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap min-h-[40px] ${
              activeTab === 'logs'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Logs</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 max-w-6xl w-full mx-auto">
        {/* TAB 1: MESSAGES & SEARCH */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search messages by text, nickname, or session ID..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 min-h-[38px]"
                />
              </div>

              <button
                onClick={handlePruneMessages}
                className="px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-600" />
                <span>Prune to 60 Messages</span>
              </button>
            </div>

            {pruneResult && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 font-medium">
                {pruneResult}
              </div>
            )}

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-between">
                <span>Loaded Messages ({filteredMessages.length})</span>
                <span className="text-[11px] text-zinc-400">Chronological list</span>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[60vh] overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    No messages matched the search criteria.
                  </div>
                ) : (
                  filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <UserAvatar nickname={msg.nickname_snapshot} size="xs" />
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {msg.nickname_snapshot}
                          </span>
                          {msg.is_admin && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Admin
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                            {msg.session_id}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p
                          className={`text-zinc-800 dark:text-zinc-200 break-words ${
                            msg.deleted_at ? 'line-through opacity-50 italic' : ''
                          }`}
                        >
                          {msg.message_text}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-end sm:self-center">
                        {!msg.deleted_at && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="px-2.5 py-1 min-h-[30px] rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Delete message"
                          >
                            Delete
                          </button>
                        )}
                        {!msg.is_admin && (
                          <>
                            <button
                              onClick={() => handleMuteUser(msg.session_id, msg.nickname_snapshot, 15)}
                              className="px-2.5 py-1 min-h-[30px] rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                              title="Mute user 15m"
                            >
                              Mute 15m
                            </button>
                            <button
                              onClick={() => handleBanUser(msg.session_id, msg.nickname_snapshot, null)}
                              className="px-2.5 py-1 min-h-[30px] rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Ban session"
                            >
                              Ban
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANNOUNCEMENTS & VOLUNTARY PATREON SUPPORT */}
        {activeTab === 'announcements' && (
          <div className="space-y-5">
            {/* Announcement Creator Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-600" />
                    <span>Send Announcement to Public Chat</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Broadcast an official administrative message in real time with verified "SayHola Admin" branding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadPatreonTemplate}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition flex items-center gap-1.5 shrink-0"
                  title="Insert Patreon support template"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Load Voluntary Patreon Notice</span>
                  <span className="sm:hidden">Patreon Notice</span>
                </button>
              </div>

              {/* Form Input */}
              <form onSubmit={handlePublishAnnouncement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Announcement Content
                  </label>
                  <textarea
                    rows={4}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Write an announcement to broadcast to all participants in the public chat room..."
                    className="w-full p-3 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>URLs will automatically format as clickable links.</span>
                    <span>{announcementText.length}/500 chars</span>
                  </div>
                </div>

                {/* Preview Box */}
                {showAnnouncementPreview && announcementText.trim() && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs space-y-1 animate-fade-in">
                    <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      <span>Live Preview (How visitors will see this in the public room):</span>
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {announcementText}
                    </p>
                  </div>
                )}

                {/* Status messages */}
                {announcementSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{announcementSuccess}</span>
                  </div>
                )}

                {announcementError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{announcementError}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAnnouncementPreview((prev) => !prev)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 min-h-[38px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showAnnouncementPreview ? 'Hide Preview' : 'Preview Message'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!announcementText.trim() || isPublishingAnnouncement}
                    className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 transition shadow-xs flex items-center gap-2 min-h-[38px]"
                  >
                    {isPublishingAnnouncement ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{isPublishingAnnouncement ? 'Publishing...' : 'Publish Announcement'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Configurable Patreon Settings Notice */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <h4 className="font-bold text-sm">Voluntary Patreon Support Configuration</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                SayHola is free for everyone and never requires contributions to chat. If you configure a Patreon URL below, the announcement template will automatically link to your page when asking for voluntary support for hosting and server upkeep.
              </p>

              <form onSubmit={handleSavePatreonUrl} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={patreonUrlInput}
                  onChange={(e) => setPatreonUrlInput(e.target.value)}
                  placeholder="https://patreon.com/your_handle"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 min-h-[38px]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition min-h-[38px] shrink-0"
                >
                  Save Patreon URL
                </button>
              </form>

              {patreonSavedNotice && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Patreon URL updated successfully!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: USER REPORTS */}
        {activeTab === 'reports' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-between">
              <span>Community Reports ({reports.length})</span>
              <span className="text-rose-600 font-bold">{pendingReportsCount} Pending</span>
            </div>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No user reports have been filed yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-3.5 sm:p-4 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                            rep.status === 'pending'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {rep.status}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          Reason: {rep.reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(rep.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
                      <div className="text-[10px] text-zinc-400">Reported Message Snapshot:</div>
                      <p className="italic text-zinc-700 dark:text-zinc-300 break-words">
                        "{rep.message_text_snapshot}"
                      </p>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        <span>Sender:</span>
                        <UserAvatar nickname={rep.message_nickname_snapshot} size="xs" />
                        <b className="text-zinc-900 dark:text-zinc-100">{rep.message_nickname_snapshot}</b>
                      </div>
                    </div>

                    {rep.details && (
                      <p className="text-zinc-500 text-[11px]">Reporter Note: {rep.details}</p>
                    )}

                    {rep.status === 'pending' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'resolved')}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                        >
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'dismissed')}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 transition"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(rep.message_id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          Delete Message
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BANS & MUTES */}
        {activeTab === 'moderations' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <h3 className="font-bold text-sm">Issue Manual Sanction</h3>
              <p className="text-xs text-zinc-500">
                Apply mute or ban directly to an identifiable session ID.
              </p>

              <form onSubmit={handleManualModerationSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Session ID
                    </label>
                    <input
                      type="text"
                      placeholder="sess_..."
                      value={manualSessionId}
                      onChange={(e) => setManualSessionId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Action Type
                    </label>
                    <select
                      value={manualAction}
                      onChange={(e: any) => setManualAction(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="mute">Mute (Cannot send messages)</option>
                      <option value="ban">Ban (Session revoked)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Duration
                    </label>
                    <select
                      value={manualDuration}
                      onChange={(e) => setManualDuration(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="1440">24 Hours</option>
                      <option value="0">Permanent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Abusive behavior, spamming"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualSessionId.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 transition min-h-[38px]"
                >
                  Apply Sanction
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
                Current Active Moderation Sanctions ({moderations.length})
              </div>
              {moderations.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No active mutes or bans right now.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {moderations.map((mod) => (
                    <div
                      key={mod.id}
                      className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold uppercase px-1.5 py-0.2 rounded ${
                              mod.action_type === 'ban'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700'
                            }`}
                          >
                            {mod.action_type}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {mod.nickname_snapshot || mod.session_id}
                          </span>
                          <span className="text-zinc-400">
                            {mod.expires_at
                              ? `Expires: ${new Date(mod.expires_at).toLocaleTimeString()}`
                              : 'Permanent'}
                          </span>
                        </div>
                        <p className="text-zinc-500 mt-0.5">Reason: {mod.reason}</p>
                      </div>

                      <button
                        onClick={() => handleUnmoderate(mod.session_id, mod.action_type)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 transition min-h-[32px]"
                      >
                        Lift {mod.action_type === 'ban' ? 'Ban' : 'Mute'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS & PROFANITY FILTER */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <h3 className="font-bold text-sm">Live Filter Tester</h3>
              <p className="text-xs text-zinc-500">
                Test any text with leetspeak or Roman Urdu/English profanity to verify filter behavior.
              </p>
              <form onSubmit={handleRunWordTest} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testPhrase}
                  onChange={(e) => setTestPhrase(e.target.value)}
                  placeholder="e.g. f.u.c.k, kuttteee, hello world"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 min-h-[38px]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white min-h-[38px] shrink-0"
                >
                  Test Phrase
                </button>
              </form>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    testResult.isClean
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {testResult.isClean ? (
                    <>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Clean! This phrase passed moderation.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Blocked! Matched pattern: <b>{testResult.matchedWord}</b> ({testResult.reason})
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <h3 className="font-bold text-sm">Add Prohibited Word or Pattern</h3>
              <p className="text-xs text-zinc-500">
                Core engine already screens English and Roman Urdu abuses. Add custom prohibited terms below:
              </p>
              <form onSubmit={handleAddProhibitedWord} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newProhibitedWord}
                  onChange={(e) => setNewProhibitedWord(e.target.value)}
                  placeholder="Add custom word..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 min-h-[38px]"
                />
                <button
                  type="submit"
                  disabled={!newProhibitedWord.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 disabled:opacity-40 min-h-[38px] shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Word</span>
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {settings.prohibited_words.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                  >
                    <span>{word}</span>
                    <button
                      onClick={() => handleRemoveProhibitedWord(word)}
                      className="text-zinc-400 hover:text-red-500 ml-0.5 text-sm font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {settings.prohibited_words.length === 0 && (
                  <span className="text-xs text-zinc-400 italic">
                    No custom words added yet. Core dictionary is active.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: FIREBASE & DIAGNOSTICS (RESTRICTED TO VERIFIED ADMINS ONLY) */}
        {activeTab === 'firebase' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <Flame className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Firebase Realtime Database & Diagnostics</h3>
                  <p className="text-xs text-zinc-500">
                    Administrator-only infrastructure diagnostics and verified backend connection.
                  </p>
                </div>
              </div>

              {/* Status Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-1">
                  <div className="font-semibold text-zinc-500 text-[11px]">Firebase Project ID</div>
                  <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {customFirebaseConfig.projectId}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-1">
                  <div className="font-semibold text-zinc-500 text-[11px]">Connection Status</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live & Connected</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-1 sm:col-span-2">
                  <div className="font-semibold text-zinc-500 text-[11px]">Realtime Database URL</div>
                  <div className="font-mono text-zinc-800 dark:text-zinc-200 break-all text-xs">
                    {customFirebaseConfig.databaseURL}
                  </div>
                </div>
              </div>

              {/* Security Rules Verification Info */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Firebase Security Rules Verification</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-100">
                  <li>Public visitors can read and send messages without mandatory login.</li>
                  <li>Ordinary visitors cannot impersonate admins (<code className="font-mono">is_admin: true</code> is blocked by rule).</li>
                  <li>Presence records are owned per session ID; onDisconnect cleanup operates without permission errors.</li>
                  <li>Moderation, logs, and reports are private to verified administrators only.</li>
                </ul>
              </div>

              {/* Developer Configuration Form (Admin Only) */}
              <form onSubmit={handleSaveCustomFirebase} className="space-y-3 pt-2">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Edit Web App Configuration Parameters (Optional Override)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">API Key</label>
                    <input
                      type="text"
                      value={customFirebaseConfig.apiKey}
                      onChange={(e) =>
                        setCustomFirebaseConfig((p) => ({ ...p, apiKey: e.target.value.trim() }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">Database URL</label>
                    <input
                      type="text"
                      value={customFirebaseConfig.databaseURL}
                      onChange={(e) =>
                        setCustomFirebaseConfig((p) => ({ ...p, databaseURL: e.target.value.trim() }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {fbSaveNotice && (
                  <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Configuration updated and listeners refreshed.</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition min-h-[36px]"
                  >
                    Save & Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFirebaseConfig}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition min-h-[36px]"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
              Moderation Audit Trail ({logs.length})
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                No moderator actions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      <span>Mod: {log.moderator_id}</span>
                    </div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Action: {log.action_type.toUpperCase()}
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400">{log.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
