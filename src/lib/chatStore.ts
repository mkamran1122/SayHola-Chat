import {
  ChatMessage,
  ChatSession,
  ChatSettings,
  MessageReport,
  ModerationLog,
  ReportReason,
  UserModeration,
  TypingUser,
} from '../types';
import { checkProfanity, validateNickname } from './badWords';
import { getFirebaseDb, getFirebaseAuth, isFirebaseConfigured } from './firebase';
import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  query,
  limitToLast,
  onDisconnect,
  serverTimestamp,
  get,
} from 'firebase/database';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';

// Local storage keys
const KEY_SESSION_ID = 'sayhola_session_id';
const KEY_NICKNAME = 'sayhola_nickname';
const KEY_AVATAR_COLOR = 'sayhola_avatar_color';
const KEY_LOCAL_MESSAGES = 'sayhola_cached_messages';
const KEY_LOCAL_MODERATION = 'sayhola_moderation_records';
const KEY_LOCAL_REPORTS = 'sayhola_reports';
const KEY_LOCAL_SETTINGS = 'sayhola_settings';
const KEY_MODERATION_LOGS = 'sayhola_mod_logs';

import { getAvatarColorForNickname } from './avatarGenerator';
export { getAvatarColorForNickname };

// Initial seed messages for active room
const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'seed-sys-welcome',
    session_id: 'system',
    nickname_snapshot: 'SayHola System',
    message_text: 'Welcome to SayHola! Choose a nickname, say hi, and follow the community rules. No registration needed.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_system: true,
  },
  {
    id: 'seed-1',
    session_id: 'usr_sarah',
    nickname_snapshot: 'Sarah_K',
    message_text: 'Hola everyone! Happy to see this public room up and running.',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    avatar_color: '#059669',
  },
  {
    id: 'seed-2',
    session_id: 'usr_tariq',
    nickname_snapshot: 'TariqDev',
    message_text: 'Hey Sarah! Loving the real-time speed with Firebase Realtime Database. Clean and super responsive.',
    created_at: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    avatar_color: '#2563eb',
  },
  {
    id: 'seed-3',
    session_id: 'usr_alex',
    nickname_snapshot: 'Alex_Global',
    message_text: 'Hello from London! Anyone watching the match tonight?',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    avatar_color: '#7c3aed',
  },
  {
    id: 'seed-4',
    session_id: 'usr_nadia',
    nickname_snapshot: 'Nadia99',
    message_text: 'Hi Alex! Yes, watching with friends. Feel free to join in!',
    created_at: new Date(Date.now() - 600000).toISOString(),
    avatar_color: '#db2777',
  },
];

const DEFAULT_SETTINGS: ChatSettings = {
  max_message_length: 500,
  rate_limit_cooldown_sec: 2,
  prohibited_words: [],
  duplicate_check_sec: 15,
  patreon_url: 'https://patreon.com/sayhola_chat',
};

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('sayhola_public_room_v2');
  } catch (e) {
    console.warn('BroadcastChannel not supported', e);
  }
}

export class ChatService {
  private static instance: ChatService;

  private currentSession: ChatSession | null = null;
  private messages: ChatMessage[] = [];
  private reports: MessageReport[] = [];
  private moderationRecords: UserModeration[] = [];
  private moderationLogs: ModerationLog[] = [];
  private settings: ChatSettings = DEFAULT_SETTINGS;

  private messageListeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private presenceListeners: Set<(count: number) => void> = new Set();
  private statusListeners: Set<(status: 'connected' | 'connecting' | 'disconnected') => void> = new Set();
  private adminAuthListeners: Set<(user: User | null) => void> = new Set();
  private typingListeners: Set<(typingUsers: TypingUser[]) => void> = new Set();

  private typingUsers: TypingUser[] = [];
  private lastTypingSentAt: number = 0;
  private typingInterval: ReturnType<typeof setInterval> | null = null;

  private lastSentTimestamp: number = 0;
  private lastSentText: string = '';
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'connected';
  private realtimePresenceCount: number = 0;
  private currentAdminUser: User | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isListenersInitialized: boolean = false;

  private constructor() {
    this.loadFromStorage();
    this.initSession();
    this.setupBroadcastChannel();
    this.initFirebaseListeners();
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private loadFromStorage() {
    try {
      const storedMsgs = localStorage.getItem(KEY_LOCAL_MESSAGES);
      if (storedMsgs) {
        this.messages = JSON.parse(storedMsgs);
      } else {
        this.messages = SEED_MESSAGES;
        this.saveMessagesToStorage();
      }

      const storedMods = localStorage.getItem(KEY_LOCAL_MODERATION);
      if (storedMods) {
        this.moderationRecords = JSON.parse(storedMods);
      }

      const storedReps = localStorage.getItem(KEY_LOCAL_REPORTS);
      if (storedReps) {
        this.reports = JSON.parse(storedReps);
      }

      const storedSettings = localStorage.getItem(KEY_LOCAL_SETTINGS);
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }

      const storedLogs = localStorage.getItem(KEY_MODERATION_LOGS);
      if (storedLogs) {
        this.moderationLogs = JSON.parse(storedLogs);
      }
    } catch (e) {
      console.warn('Error reading chat data from storage', e);
      this.messages = SEED_MESSAGES;
    }
  }

  private saveMessagesToStorage() {
    try {
      localStorage.setItem(KEY_LOCAL_MESSAGES, JSON.stringify(this.messages.slice(-100)));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }

  private initSession() {
    try {
      const auth = getFirebaseAuth();
      const id = auth?.currentUser?.uid || localStorage.getItem(KEY_SESSION_ID);
      const nick = localStorage.getItem(KEY_NICKNAME);
      const color = localStorage.getItem(KEY_AVATAR_COLOR);

      if (id && nick) {
        this.currentSession = {
          id,
          nickname: nick,
          normalized_nickname: nick.toLowerCase().trim(),
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          status: 'active',
          avatar_color: color || getAvatarColorForNickname(nick),
        };
      }
    } catch (e) {
      console.warn('Session init failed', e);
    }
  }

  private setupBroadcastChannel() {
    if (!broadcastChannel) return;

    broadcastChannel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'NEW_MESSAGE') {
        const exists = this.messages.some(m => m.id === payload.id);
        if (!exists) {
          this.messages = [...this.messages, payload];
          this.saveMessagesToStorage();
          this.notifyMessageListeners();
        }
      } else if (type === 'DELETE_MESSAGE') {
        this.messages = this.messages.map(m =>
          m.id === payload.messageId ? { ...m, deleted_at: new Date().toISOString() } : m
        );
        this.saveMessagesToStorage();
        this.notifyMessageListeners();
      } else if (type === 'USER_MODERATION') {
        this.moderationRecords = [...this.moderationRecords, payload];
        this.notifyMessageListeners();
      } else if (type === 'SETTINGS_UPDATED') {
        this.settings = payload;
      } else if (type === 'TYPING_STATUS') {
        const { session_id, nickname, isTyping, timestamp } = payload || {};
        if (session_id === this.currentSession?.id) return;
        if (isTyping) {
          const filtered = this.typingUsers.filter((u) => u.session_id !== session_id);
          this.typingUsers = [
            ...filtered,
            { session_id, nickname: nickname || 'Someone', timestamp: timestamp || Date.now() },
          ];
        } else {
          this.typingUsers = this.typingUsers.filter((u) => u.session_id !== session_id);
        }
        this.notifyTypingListeners();
      } else if (type === 'MESSAGE_REACTION') {
        const { messageId, emojiKey, sessionId, nickname, isAdding } = payload || {};
        this.messages = this.messages.map((m) => {
          if (m.id !== messageId) return m;
          const currentReactions = { ...(m.reactions || {}) };
          const emojiGroup = { ...(currentReactions[emojiKey] || {}) };
          if (isAdding) {
            emojiGroup[sessionId] = nickname;
          } else {
            delete emojiGroup[sessionId];
          }
          if (Object.keys(emojiGroup).length > 0) {
            currentReactions[emojiKey] = emojiGroup;
          } else {
            delete currentReactions[emojiKey];
          }
          return { ...m, reactions: currentReactions };
        });
        this.saveMessagesToStorage();
        this.notifyMessageListeners();
      }
    };
  }

  /**
   * Initializes Firebase Realtime Database and Auth listeners
   */
  public initFirebaseListeners() {
    if (this.isListenersInitialized) {
      return;
    }
    this.isListenersInitialized = true;

    const db = getFirebaseDb();
    const auth = getFirebaseAuth();

    if (auth) {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const isAdmin = await this.verifyAdminPermission(user);
          if (isAdmin) {
            this.currentAdminUser = user;
          } else {
            this.currentAdminUser = null;
          }
          this.adminAuthListeners.forEach(listener => listener(this.currentAdminUser));

          // Align session ID with authenticated user UID so presence is strictly owned by the session owner
          if (this.currentSession) {
            const oldId = this.currentSession.id;
            if (oldId && oldId !== user.uid) {
              if (db && isFirebaseConfigured()) {
                const oldRef = ref(db, `presence/${oldId}`);
                onDisconnect(oldRef).cancel().catch(() => {});
                remove(oldRef).catch(() => {});
              }
            }
            this.currentSession.id = user.uid;
            try {
              localStorage.setItem(KEY_SESSION_ID, user.uid);
            } catch {}
            if (this.connectionStatus === 'connected') {
              await this.syncPresence();
            }
          } else {
            try {
              localStorage.setItem(KEY_SESSION_ID, user.uid);
            } catch {}
          }
        } else {
          this.currentAdminUser = null;
          this.adminAuthListeners.forEach(listener => listener(null));

          // Automatically authenticate visitors anonymously so that presence writes are backed by an authenticated session UID
          try {
            await signInAnonymously(auth);
          } catch (anonErr: any) {
            // If anonymous auth is disabled in Firebase Console, continue gracefully
            if (this.connectionStatus === 'connected' && this.currentSession) {
              await this.syncPresence();
            }
          }
        }
      });
    }

    if (!db || !isFirebaseConfigured()) {
      this.setConnectionStatus('connected');
      return;
    }

    this.setConnectionStatus('connecting');

    try {
      // 1. Connection state tracking with .info/connected
      const connectedRef = ref(db, '.info/connected');
      onValue(connectedRef, async (snap) => {
        const isConnected = snap.val() === true;
        this.setConnectionStatus(isConnected ? 'connected' : 'disconnected');

        if (isConnected && this.currentSession) {
          await this.syncPresence();
        }
      }, (err) => {
        console.warn('Connected status note:', err?.message);
      });

      // 2. Presence listener (tracks approximate online users count within active 3m window)
      const presenceRef = ref(db, 'presence');
      onValue(presenceRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const now = Date.now();
          const activeKeys = Object.keys(val).filter((k) => {
            const p = val[k];
            if (!p) return false;
            if (typeof p.last_seen === 'number') {
              return now - p.last_seen < 180000;
            }
            return true;
          });
          this.realtimePresenceCount = activeKeys.length;
        } else {
          this.realtimePresenceCount = 0;
        }
        this.notifyPresenceListeners();
      }, (err) => {
        console.warn('Presence read note:', err?.message);
      });

      // 3. Realtime messages listener with limitToLast(100) to keep memory & bandwidth minimal
      const messagesQuery = query(ref(db, 'messages'), limitToLast(100));
      onValue(messagesQuery, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const remoteList: ChatMessage[] = Object.keys(val).map((k) => ({
            ...val[k],
            id: k,
          }));

          // Sort chronologically
          remoteList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          this.messages = remoteList;
          this.saveMessagesToStorage();
          this.notifyMessageListeners();
        }
      }, (err) => {
        console.warn('Messages read note:', err?.message);
      });

      // 4. Moderation records listener (Private: read restricted to verified administrators)
      const modRef = ref(db, 'moderation');
      onValue(
        modRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const records: UserModeration[] = Object.keys(val).map((k) => ({
              ...val[k],
              id: k,
            }));
            this.moderationRecords = records;
            try {
              localStorage.setItem(KEY_LOCAL_MODERATION, JSON.stringify(records));
            } catch {}
            this.notifyMessageListeners();
          }
        },
        () => {
          // Expected for unauthenticated public clients due to security rules
        }
      );

      // 5. Settings listener
      const settingsRef = ref(db, 'settings');
      onValue(settingsRef, (snap) => {
        if (snap.exists()) {
          this.settings = { ...DEFAULT_SETTINGS, ...snap.val() };
        }
      }, () => {});

      // 6. Reports listener (Private: read restricted to verified administrators)
      const reportsRef = ref(db, 'reports');
      onValue(
        reportsRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            this.reports = Object.keys(val).map((k) => ({
              ...val[k],
              id: k,
            }));
            try {
              localStorage.setItem(KEY_LOCAL_REPORTS, JSON.stringify(this.reports));
            } catch {}
          }
        },
        () => {
          // Expected for unauthenticated public clients due to security rules
        }
      );

      // 7. Presence Heartbeat every 50 seconds for active chatter
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      this.heartbeatInterval = setInterval(() => {
        if (this.currentSession && this.connectionStatus === 'connected') {
          const userPresenceRef = ref(db, `presence/${this.currentSession.id}`);
          update(userPresenceRef, {
            last_seen: serverTimestamp(),
            session_id: this.currentSession.id,
            nickname: this.currentSession.nickname,
          }).catch((err) => {
            if (this.currentAdminUser) console.warn('Presence heartbeat note:', err?.message);
          });
        }
      }, 50000);

      // 8. Real-time typing indicators listener
      const typingRef = ref(db, 'typing');
      onValue(
        typingRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const now = Date.now();
            const list: TypingUser[] = [];
            for (const key of Object.keys(val)) {
              const item = val[key];
              if (!item) continue;
              const ts = typeof item.timestamp === 'number' ? item.timestamp : now;
              if (now - ts < 5000) {
                list.push({
                  session_id: item.session_id || key,
                  nickname: item.nickname || 'Someone',
                  timestamp: ts,
                });
              }
            }
            this.typingUsers = list;
          } else {
            this.typingUsers = [];
          }
          this.notifyTypingListeners();
        },
        () => {}
      );

      // 9. Periodically purge stale typing indicators every 2.5 seconds
      if (this.typingInterval) {
        clearInterval(this.typingInterval);
      }
      this.typingInterval = setInterval(() => {
        if (this.typingUsers.length > 0) {
          const beforeCount = this.typingUsers.length;
          const now = Date.now();
          this.typingUsers = this.typingUsers.filter((u) => now - u.timestamp < 5000);
          if (this.typingUsers.length !== beforeCount) {
            this.notifyTypingListeners();
          }
        }
      }, 2500);
    } catch (e) {
      console.warn('Firebase Realtime Database connect error:', e);
      this.setConnectionStatus('connected');
    }
  }

  /**
   * Synchronizes active presence record and registers onDisconnect removal hook.
   * Ensures presence records are only writable by the authenticated session owner.
   */
  public async syncPresence(): Promise<void> {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured() || !this.currentSession) {
      return;
    }

    if (this.connectionStatus !== 'connected') {
      return;
    }

    // Check if banned
    const modStatus = this.checkModerationStatus(this.currentSession.id);
    if (modStatus.isBanned) {
      return;
    }

    const auth = getFirebaseAuth();
    // Prioritize authenticated UID if user is signed in
    if (auth?.currentUser && this.currentSession.id !== auth.currentUser.uid) {
      const oldId = this.currentSession.id;
      if (oldId) {
        const oldRef = ref(db, `presence/${oldId}`);
        onDisconnect(oldRef).cancel().catch(() => {});
        remove(oldRef).catch(() => {});
      }
      this.currentSession.id = auth.currentUser.uid;
      try {
        localStorage.setItem(KEY_SESSION_ID, auth.currentUser.uid);
      } catch {}
    }

    const sessionId = this.currentSession.id;
    const userPresenceRef = ref(db, `presence/${sessionId}`);

    try {
      // 1. Establish onDisconnect removal FIRST
      await onDisconnect(userPresenceRef).remove();

      // 2. Set current active presence record with all required validated fields
      await set(userPresenceRef, {
        nickname: this.currentSession.nickname,
        last_seen: serverTimestamp(),
        session_id: sessionId,
      });
    } catch (err: any) {
      if (this.currentAdminUser) {
        console.warn('Presence sync note:', err?.message);
      }
    }
  }

  private setConnectionStatus(status: 'connected' | 'connecting' | 'disconnected') {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  public getConnectionStatus() {
    return this.connectionStatus;
  }

  public getSession(): ChatSession | null {
    return this.currentSession;
  }

  public setSession(nickname: string): { success: boolean; error?: string } {
    const existingNicknames = this.messages.map(m => m.nickname_snapshot);
    const validation = validateNickname(nickname, existingNicknames);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const auth = getFirebaseAuth();
    let sessionId = auth?.currentUser?.uid || localStorage.getItem(KEY_SESSION_ID);
    if (!sessionId) {
      sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    }
    try {
      localStorage.setItem(KEY_SESSION_ID, sessionId);
    } catch {}

    const cleanNick = nickname.trim();
    const avatarColor = getAvatarColorForNickname(cleanNick);

    try {
      localStorage.setItem(KEY_NICKNAME, cleanNick);
      localStorage.setItem(KEY_AVATAR_COLOR, avatarColor);
    } catch {}

    this.currentSession = {
      id: sessionId,
      nickname: cleanNick,
      normalized_nickname: cleanNick.toLowerCase(),
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      status: 'active',
      avatar_color: avatarColor,
    };

    this.notifyTypingListeners();

    // Firebase presence update & real-time join notification
    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      // Sync presence with authenticated session owner check
      this.syncPresence().catch(() => {});

      // Emit genuine join notification to Firebase messages so all clients receive it
      try {
        const joinRef = push(ref(db, 'messages'));
        set(joinRef, {
          session_id: sessionId,
          nickname_snapshot: cleanNick,
          message_text: `${cleanNick} joined`,
          created_at: new Date().toISOString(),
          is_system: true,
          message_type: 'join',
          avatar_color: avatarColor,
        }).catch(() => {});
      } catch {}
    } else {
      this.addSystemNotification(`${cleanNick} joined`);
    }

    return { success: true };
  }

  public async leaveChat(): Promise<void> {
    if (this.currentSession) {
      const name = this.currentSession.nickname;
      const sessionId = this.currentSession.id;
      const db = getFirebaseDb();

      if (db && isFirebaseConfigured()) {
        try {
          const userPresenceRef = ref(db, `presence/${sessionId}`);
          // Cancel onDisconnect hook first, then remove presence record immediately
          await onDisconnect(userPresenceRef).cancel();
          await remove(userPresenceRef);
        } catch (err: any) {
          if (this.currentAdminUser) {
            console.warn('Presence cleanup note on leave:', err?.message);
          }
        }
      }

      this.setTyping(false);
      this.currentSession = null;
      try {
        localStorage.removeItem(KEY_NICKNAME);
      } catch {}
      this.addSystemNotification(`${name} left the room.`);
    }
  }

  public addSystemNotification(text: string) {
    const sysMsg: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      session_id: 'system',
      nickname_snapshot: 'System',
      message_text: text,
      created_at: new Date().toISOString(),
      is_system: true,
    };

    this.messages = [...this.messages, sysMsg];
    this.saveMessagesToStorage();
    this.notifyMessageListeners();

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'NEW_MESSAGE', payload: sysMsg });
    }
  }

  /**
   * Check moderation status (Mute / Ban)
   */
  public checkModerationStatus(sessionId?: string): {
    isBanned: boolean;
    isMuted: boolean;
    reason?: string;
    expiresAt?: string | null;
    remainingSeconds?: number;
  } {
    const targetId = sessionId || this.currentSession?.id;
    if (!targetId) {
      return { isBanned: false, isMuted: false };
    }

    const now = Date.now();
    const activeRecords = this.moderationRecords.filter(r => r.session_id === targetId);

    // Check Ban
    const banRecord = activeRecords.find(r => r.action_type === 'ban');
    if (banRecord) {
      if (!banRecord.expires_at) {
        return { isBanned: true, isMuted: false, reason: banRecord.reason, expiresAt: null };
      }
      const expTime = new Date(banRecord.expires_at).getTime();
      if (expTime > now) {
        const remaining = Math.ceil((expTime - now) / 1000);
        return {
          isBanned: true,
          isMuted: false,
          reason: banRecord.reason,
          expiresAt: banRecord.expires_at,
          remainingSeconds: remaining,
        };
      }
    }

    // Check Mute
    const muteRecord = activeRecords.find(r => r.action_type === 'mute');
    if (muteRecord) {
      if (!muteRecord.expires_at) {
        return { isBanned: false, isMuted: true, reason: muteRecord.reason, expiresAt: null };
      }
      const expTime = new Date(muteRecord.expires_at).getTime();
      if (expTime > now) {
        const remaining = Math.ceil((expTime - now) / 1000);
        return {
          isBanned: false,
          isMuted: true,
          reason: muteRecord.reason,
          expiresAt: muteRecord.expires_at,
          remainingSeconds: remaining,
        };
      }
    }

    return { isBanned: false, isMuted: false };
  }

  /**
   * Send a new message to Firebase Realtime Database
   */
  public async sendMessage(rawText: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'Please choose a nickname before sending messages.' };
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    if (trimmed.length > this.settings.max_message_length) {
      return {
        success: false,
        error: `Message is too long. Limit is ${this.settings.max_message_length} characters.`,
      };
    }

    // Check ban and mute
    const modStatus = this.checkModerationStatus(this.currentSession.id);
    if (modStatus.isBanned) {
      return {
        success: false,
        error: `Your session is banned: ${modStatus.reason || 'Violation of community rules'}.`,
      };
    }
    if (modStatus.isMuted) {
      const timeStr = modStatus.remainingSeconds
        ? ` for another ${Math.ceil(modStatus.remainingSeconds / 60)} minute(s)`
        : '';
      return {
        success: false,
        error: `You are temporarily muted${timeStr}. Reason: ${modStatus.reason || 'Rapid messaging or language violation'}.`,
      };
    }

    // Rate limiting cooldown (2s)
    const now = Date.now();
    const timeSinceLast = (now - this.lastSentTimestamp) / 1000;
    if (timeSinceLast < this.settings.rate_limit_cooldown_sec) {
      const waitTime = (this.settings.rate_limit_cooldown_sec - timeSinceLast).toFixed(1);
      return {
        success: false,
        error: `Slow down! Please wait ${waitTime}s before sending another message.`,
      };
    }

    // Duplicate message check (15s)
    if (
      trimmed === this.lastSentText &&
      timeSinceLast < this.settings.duplicate_check_sec
    ) {
      return {
        success: false,
        error: "Please don't repeat the exact same message so quickly.",
      };
    }

    // Inappropriate language filter (English + Roman Urdu)
    const profanityResult = checkProfanity(trimmed, this.settings.prohibited_words);
    if (!profanityResult.isClean) {
      return {
        success: false,
        error: profanityResult.reason || 'Your message contains prohibited words.',
      };
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      session_id: this.currentSession.id,
      nickname_snapshot: this.currentSession.nickname,
      message_text: trimmed,
      created_at: new Date().toISOString(),
      avatar_color: this.currentSession.avatar_color,
    };

    this.lastSentTimestamp = now;
    this.lastSentText = trimmed;

    // Send to Firebase Realtime Database
    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      try {
        const msgRef = push(ref(db, 'messages'));
        const firebaseMsgId = msgRef.key || newMessage.id;
        newMessage.id = firebaseMsgId;

        await set(msgRef, {
          session_id: newMessage.session_id,
          nickname_snapshot: newMessage.nickname_snapshot,
          message_text: newMessage.message_text,
          created_at: newMessage.created_at,
          avatar_color: newMessage.avatar_color || '#2563eb',
        });
      } catch (err: any) {
        if (this.currentAdminUser) {
          console.warn('Firebase RTDB set error:', err);
        }
        return {
          success: false,
          error: 'Unable to send message. Please try again.',
        };
      }
    } else {
      // Local broadcast fallback
      this.messages = [...this.messages, newMessage];
      this.saveMessagesToStorage();
      this.notifyMessageListeners();

      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'NEW_MESSAGE', payload: newMessage });
      }
    }

    this.setTyping(false);
    return { success: true };
  }

  /**
   * Delete message (Admin moderation)
   */
  public async deleteMessage(messageId: string, moderatorId: string = 'admin'): Promise<boolean> {
    const msg = this.messages.find(m => m.id === messageId);
    const deletedAt = new Date().toISOString();

    this.messages = this.messages.map(m =>
      m.id === messageId ? { ...m, deleted_at: deletedAt } : m
    );

    this.logModeratorAction({
      id: `log_${Date.now()}`,
      moderator_id: moderatorId,
      action_type: 'delete_message',
      target_message_id: messageId,
      target_session_id: msg?.session_id,
      target_nickname: msg?.nickname_snapshot,
      reason: 'Deleted by moderator',
      created_at: deletedAt,
    });

    this.saveMessagesToStorage();
    this.notifyMessageListeners();

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'DELETE_MESSAGE',
        payload: { messageId, deletedAt },
      });
    }

    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      try {
        await update(ref(db, `messages/${messageId}`), { deleted_at: deletedAt });
      } catch (e) {
        console.warn('Firebase message soft-delete error:', e);
      }
    }

    return true;
  }

  /**
   * Toggle emoji reaction for a message in real-time
   */
  public async toggleReaction(
    messageId: string,
    emojiKey: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'Please choose a nickname to react to messages.' };
    }

    const modStatus = this.checkModerationStatus();
    if (modStatus.isBanned) {
      return { success: false, error: 'You are banned and cannot add reactions.' };
    }
    if (modStatus.isMuted) {
      return { success: false, error: 'You are muted and cannot add reactions.' };
    }

    const targetMsg = this.messages.find((m) => m.id === messageId);
    if (!targetMsg || targetMsg.deleted_at) {
      return { success: false, error: 'Message not found.' };
    }

    const sessionId = this.currentSession.id;
    const nickname = this.currentSession.nickname;
    const currentEmojiGroup = targetMsg.reactions?.[emojiKey] || {};
    const alreadyReacted = Boolean(currentEmojiGroup[sessionId]);
    const isAdding = !alreadyReacted;

    // 1. Optimistic update in local state
    this.messages = this.messages.map((m) => {
      if (m.id !== messageId) return m;
      const currentReactions = { ...(m.reactions || {}) };
      const emojiGroup = { ...(currentReactions[emojiKey] || {}) };
      if (isAdding) {
        emojiGroup[sessionId] = nickname;
      } else {
        delete emojiGroup[sessionId];
      }
      if (Object.keys(emojiGroup).length > 0) {
        currentReactions[emojiKey] = emojiGroup;
      } else {
        delete currentReactions[emojiKey];
      }
      return { ...m, reactions: currentReactions };
    });

    this.saveMessagesToStorage();
    this.notifyMessageListeners();

    // 2. BroadcastChannel for active local tabs
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'MESSAGE_REACTION',
        payload: { messageId, emojiKey, sessionId, nickname, isAdding },
      });
    }

    // 3. Write to Firebase Realtime Database
    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      try {
        const reactionRef = ref(db, `messages/${messageId}/reactions/${emojiKey}/${sessionId}`);
        if (isAdding) {
          await set(reactionRef, nickname);
        } else {
          await remove(reactionRef);
        }
      } catch (err: any) {
        console.warn('Firebase reaction update failed:', err?.message);
      }
    }

    return { success: true };
  }

  /**
   * Prune older messages (keeps Realtime Database within Spark limits)
   */
  public async pruneOlderMessages(keepCount: number = 60): Promise<number> {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured()) {
      if (this.messages.length > keepCount) {
        const removed = this.messages.length - keepCount;
        this.messages = this.messages.slice(-keepCount);
        this.saveMessagesToStorage();
        this.notifyMessageListeners();
        return removed;
      }
      return 0;
    }

    try {
      const snap = await get(ref(db, 'messages'));
      if (!snap.exists()) return 0;

      const data = snap.val();
      const keys = Object.keys(data);
      if (keys.length <= keepCount) return 0;

      // Sort by created_at ascending
      keys.sort((a, b) => new Date(data[a].created_at).getTime() - new Date(data[b].created_at).getTime());
      const toDelete = keys.slice(0, keys.length - keepCount);

      const updates: Record<string, null> = {};
      for (const k of toDelete) {
        updates[`messages/${k}`] = null;
      }
      await update(ref(db), updates);
      return toDelete.length;
    } catch (e) {
      console.warn('Prune messages error:', e);
      return 0;
    }
  }

  /**
   * Submit report for inappropriate message
   */
  public async reportMessage(
    messageId: string,
    reason: ReportReason,
    details?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'You need an active session to report messages.' };
    }

    const targetMessage = this.messages.find(m => m.id === messageId);
    if (!targetMessage) {
      return { success: false, error: 'Message not found.' };
    }

    const alreadyReported = this.reports.some(
      r => r.message_id === messageId && r.reporter_session_id === this.currentSession?.id
    );

    if (alreadyReported) {
      return {
        success: false,
        error: 'You have already submitted a report for this message.',
      };
    }

    const newReport: MessageReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      message_id: messageId,
      message_text_snapshot: targetMessage.message_text,
      message_nickname_snapshot: targetMessage.nickname_snapshot,
      reporter_session_id: this.currentSession.id,
      reason,
      details: details?.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    this.reports = [newReport, ...this.reports];
    try {
      localStorage.setItem(KEY_LOCAL_REPORTS, JSON.stringify(this.reports));
    } catch {}

    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      try {
        const repRef = push(ref(db, 'reports'));
        newReport.id = repRef.key || newReport.id;
        await set(repRef, newReport);
      } catch (err) {
        console.warn('Firebase report push error:', err);
      }
    }

    return { success: true };
  }

  /**
   * Moderate user (mute or ban)
   */
  public async moderateUser(
    sessionId: string,
    action: 'mute' | 'ban',
    reason: string,
    durationMinutes?: number | null,
    nickname?: string,
    moderatorId: string = 'admin'
  ): Promise<boolean> {
    const startsAt = new Date().toISOString();
    const expiresAt = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60000).toISOString()
      : null;

    const record: UserModeration = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      session_id: sessionId,
      nickname_snapshot: nickname,
      action_type: action,
      reason: reason || 'Violation of chat policies',
      starts_at: startsAt,
      expires_at: expiresAt,
      created_at: startsAt,
      moderator_id: moderatorId,
    };

    this.moderationRecords = [
      ...this.moderationRecords.filter(
        r => !(r.session_id === sessionId && r.action_type === action)
      ),
      record,
    ];

    try {
      localStorage.setItem(KEY_LOCAL_MODERATION, JSON.stringify(this.moderationRecords));
    } catch {}

    this.logModeratorAction({
      id: `log_${Date.now()}`,
      moderator_id: moderatorId,
      action_type: action,
      target_session_id: sessionId,
      target_nickname: nickname,
      reason: `${action.toUpperCase()} applied (${durationMinutes ? `${durationMinutes}m` : 'Permanent'}): ${reason}`,
      created_at: startsAt,
    });

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'USER_MODERATION', payload: record });
    }

    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      try {
        await set(ref(db, `moderation/${sessionId}`), {
          ...record,
          isBanned: action === 'ban',
          isMuted: action === 'mute',
        });
      } catch (err) {
        console.warn('Firebase user moderation write error:', err);
      }
    }

    return true;
  }

  /**
   * Lift mute or ban
   */
  public async unmoderateUser(sessionId: string, action: 'mute' | 'ban', moderatorId: string = 'admin'): Promise<boolean> {
    this.moderationRecords = this.moderationRecords.filter(
      r => !(r.session_id === sessionId && r.action_type === action)
    );
    try {
      localStorage.setItem(KEY_LOCAL_MODERATION, JSON.stringify(this.moderationRecords));
    } catch {}

    this.logModeratorAction({
      id: `log_${Date.now()}`,
      moderator_id: moderatorId,
      action_type: action === 'mute' ? 'unmute' : 'unban',
      target_session_id: sessionId,
      reason: `Moderator lifted ${action}`,
      created_at: new Date().toISOString(),
    });

    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      try {
        await remove(ref(db, `moderation/${sessionId}`));
      } catch (e) {
        console.warn('Firebase unmoderate error:', e);
      }
    }

    return true;
  }

  /**
   * Update report status (Resolve / Dismiss)
   */
  public async updateReportStatus(reportId: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
    this.reports = this.reports.map(r =>
      r.id === reportId ? { ...r, status, resolved_at: new Date().toISOString() } : r
    );
    try {
      localStorage.setItem(KEY_LOCAL_REPORTS, JSON.stringify(this.reports));
    } catch {}

    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      try {
        await update(ref(db, `reports/${reportId}`), {
          status,
          resolved_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firebase report update error:', err);
      }
    }

    return true;
  }

  /**
   * Verify whether a Firebase User has administrator privileges via
   * Custom Claims (admin: true) or Realtime Database /admins registry
   */
  public async verifyAdminPermission(user: User): Promise<boolean> {
    try {
      // 1. Check custom claim set securely via Firebase Admin SDK
      const tokenResult = await user.getIdTokenResult(true);
      if (tokenResult.claims && tokenResult.claims.admin === true) {
        return true;
      }

      // 2. Check /admins/{uid} registry in Realtime Database
      const db = getFirebaseDb();
      if (db) {
        const snap = await get(ref(db, `admins/${user.uid}`));
        if (snap.exists() && snap.val() === true) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Admin authorization verification check failed:', e);
    }
    return false;
  }

  /**
   * Firebase Auth Admin Sign In with trusted verification
   */
  public async adminSignInWithFirebase(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    const auth = getFirebaseAuth();
    if (!auth) {
      return { success: false, error: 'Firebase Auth is not initialized or configured.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const isAdmin = await this.verifyAdminPermission(userCredential.user);

      if (!isAdmin) {
        await signOut(auth);
        this.currentAdminUser = null;
        return {
          success: false,
          error:
            'Access Denied: This account is authenticated, but does not have administrator privileges. An administrator role must be assigned via Firebase custom claims (admin: true) or added to the Realtime Database /admins registry by the project owner.',
        };
      }

      this.currentAdminUser = userCredential.user;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  }

  public async adminSignOut(): Promise<void> {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    this.currentAdminUser = null;
  }

  public getCurrentAdminUser(): User | null {
    return this.currentAdminUser;
  }

  /**
   * Publish an Admin Announcement or Voluntary Patreon Support message
   */
  public async sendAdminAnnouncement(
    messageText: string,
    isPatreonSupport: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentAdminUser) {
      return { success: false, error: 'Unauthorized: Only verified administrators can publish announcements.' };
    }

    const trimmed = messageText.trim();
    if (!trimmed) {
      return { success: false, error: 'Announcement message cannot be empty.' };
    }

    const db = getFirebaseDb();
    const createdAt = new Date().toISOString();

    const announcementMsg: ChatMessage = {
      id: `announcement_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      session_id: `admin_${this.currentAdminUser.uid}`,
      nickname_snapshot: 'SayHola Admin',
      message_text: trimmed,
      created_at: createdAt,
      is_admin: true,
      message_type: 'announcement',
      avatar_color: '#d97706',
    };

    if (db && isFirebaseConfigured()) {
      try {
        const msgRef = push(ref(db, 'messages'));
        announcementMsg.id = msgRef.key || announcementMsg.id;
        await set(msgRef, {
          session_id: announcementMsg.session_id,
          nickname_snapshot: 'SayHola Admin',
          message_text: announcementMsg.message_text,
          created_at: announcementMsg.created_at,
          is_admin: true,
          message_type: 'announcement',
          avatar_color: '#d97706',
        });
      } catch (err: any) {
        return { success: false, error: 'Failed to publish announcement: ' + (err.message || 'Permission denied') };
      }
    } else {
      this.messages = [...this.messages, announcementMsg];
      this.saveMessagesToStorage();
      this.notifyMessageListeners();
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'NEW_MESSAGE', payload: announcementMsg });
      }
    }

    this.logModeratorAction({
      id: `log_${Date.now()}`,
      moderator_id: this.currentAdminUser.email || 'Admin',
      action_type: 'unmute',
      target_session_id: 'public_chat',
      reason: isPatreonSupport ? 'Published Voluntary Patreon Support Notice' : `Published Announcement: "${trimmed.slice(0, 45)}..."`,
      created_at: createdAt,
    });

    return { success: true };
  }

  /**
   * Diagnostic data for verified admins only
   */
  public getAdminDiagnostics() {
    if (!this.currentAdminUser) {
      return null;
    }
    return {
      connectionStatus: this.connectionStatus,
      onlinePresenceCount: this.realtimePresenceCount,
      adminEmail: this.currentAdminUser.email,
      adminUid: this.currentAdminUser.uid,
    };
  }

  public getReports(): MessageReport[] {
    return this.reports;
  }

  public getModerationRecords(): UserModeration[] {
    return this.moderationRecords;
  }

  public getModerationLogs(): ModerationLog[] {
    return this.moderationLogs;
  }

  public getSettings(): ChatSettings {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<ChatSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(KEY_LOCAL_SETTINGS, JSON.stringify(this.settings));
    } catch {}

    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      update(ref(db, 'settings'), this.settings).catch(() => {});
    }

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'SETTINGS_UPDATED', payload: this.settings });
    }
  }

  private logModeratorAction(log: ModerationLog) {
    this.moderationLogs = [log, ...this.moderationLogs.slice(0, 100)];
    try {
      localStorage.setItem(KEY_MODERATION_LOGS, JSON.stringify(this.moderationLogs));
    } catch {}

    const db = getFirebaseDb();
    if (db && isFirebaseConfigured()) {
      push(ref(db, 'logs'), log).catch(() => {});
    }
  }

  // React Subscription APIs
  public subscribeToMessages(callback: (messages: ChatMessage[]) => void): () => void {
    this.messageListeners.add(callback);
    callback(this.messages);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  public subscribeToPresence(callback: (count: number) => void): () => void {
    this.presenceListeners.add(callback);
    callback(this.getEstimatedOnlineCount());
    return () => {
      this.presenceListeners.delete(callback);
    };
  }

  public subscribeToStatus(callback: (status: 'connected' | 'connecting' | 'disconnected') => void): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public subscribeToAdminAuth(callback: (user: User | null) => void): () => void {
    this.adminAuthListeners.add(callback);
    callback(this.currentAdminUser);
    return () => {
      this.adminAuthListeners.delete(callback);
    };
  }

  public subscribeToTyping(callback: (typingUsers: TypingUser[]) => void): () => void {
    this.typingListeners.add(callback);
    callback(this.getFilteredTypingUsers());
    return () => {
      this.typingListeners.delete(callback);
    };
  }

  public setTyping(isTyping: boolean): void {
    if (!this.currentSession) return;
    const db = getFirebaseDb();
    const sessionId = this.currentSession.id;
    const nickname = this.currentSession.nickname;

    if (isTyping) {
      const now = Date.now();
      // Throttle write to at most once per 2 seconds
      if (now - this.lastTypingSentAt < 2000) return;
      this.lastTypingSentAt = now;

      if (db && isFirebaseConfigured()) {
        const userTypingRef = ref(db, `typing/${sessionId}`);
        set(userTypingRef, {
          session_id: sessionId,
          nickname: nickname,
          timestamp: now,
        }).catch(() => {});
        onDisconnect(userTypingRef).remove().catch(() => {});
      }

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'TYPING_STATUS',
          payload: { session_id: sessionId, nickname, isTyping: true, timestamp: now },
        });
      }
    } else {
      this.lastTypingSentAt = 0;
      if (db && isFirebaseConfigured()) {
        const userTypingRef = ref(db, `typing/${sessionId}`);
        remove(userTypingRef).catch(() => {});
      }

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'TYPING_STATUS',
          payload: { session_id: sessionId, nickname, isTyping: false },
        });
      }
    }
  }

  private getFilteredTypingUsers(): TypingUser[] {
    const now = Date.now();
    const currentId = this.currentSession?.id;
    return this.typingUsers.filter(
      (u) => u.session_id !== currentId && now - u.timestamp < 5000
    );
  }

  private notifyTypingListeners() {
    const filtered = this.getFilteredTypingUsers();
    this.typingListeners.forEach((listener) => listener(filtered));
  }

  private notifyMessageListeners() {
    this.messageListeners.forEach(listener => listener([...this.messages]));
  }

  private notifyPresenceListeners() {
    const count = this.getEstimatedOnlineCount();
    this.presenceListeners.forEach(listener => listener(count));
  }

  public getEstimatedOnlineCount(): number {
    if (this.realtimePresenceCount > 0) {
      return this.realtimePresenceCount;
    }

    // Dynamic fallback presence estimate
    const uniqueRecentSenders = new Set(
      this.messages
        .filter(m => !m.is_system && Date.now() - new Date(m.created_at).getTime() < 3600000 * 2)
        .map(m => m.nickname_snapshot)
    ).size;

    return Math.max(3, uniqueRecentSenders + (this.currentSession ? 1 : 0) + 4);
  }
}
