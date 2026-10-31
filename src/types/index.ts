export type UserStatus = 'active' | 'muted' | 'banned';

export interface ChatSession {
  id: string;
  nickname: string;
  normalized_nickname: string;
  created_at: string;
  last_seen_at: string;
  status: UserStatus;
  avatar_color?: string;
  is_admin?: boolean;
}

export interface TypingUser {
  session_id: string;
  nickname: string;
  timestamp: number;
}

export interface ReactionDefinition {
  id: string; // e.g. 'thumbs_up'
  emoji: string; // e.g. '👍'
  label: string; // e.g. 'Like'
}

export const AVAILABLE_REACTIONS: ReactionDefinition[] = [
  { id: 'thumbs_up', emoji: '👍', label: 'Like' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'surprised', emoji: '😮', label: 'Wow' },
  { id: 'party', emoji: '🎉', label: 'Celebrate' },
];

export const REACTION_EMOJI_MAP: Record<string, string> = {
  thumbs_up: '👍',
  heart: '❤️',
  laugh: '😂',
  fire: '🔥',
  surprised: '😮',
  party: '🎉',
};

export function getEmojiForReactionKey(key: string): string {
  return REACTION_EMOJI_MAP[key] || key;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  nickname_snapshot: string;
  message_text: string;
  created_at: string;
  deleted_at?: string | null;
  is_system?: boolean;
  is_admin?: boolean;
  message_type?: 'chat' | 'system' | 'announcement' | 'join';
  avatar_color?: string;
  reactions?: Record<string, Record<string, string>>; // emojiKey -> sessionId -> nickname
}

export type ModerationActionType = 'mute' | 'ban' | 'delete_message' | 'unban' | 'unmute';

export interface UserModeration {
  id: string;
  session_id: string;
  nickname_snapshot?: string;
  action_type: 'mute' | 'ban';
  reason: string;
  starts_at: string;
  expires_at?: string | null; // null for permanent
  created_at: string;
  moderator_id: string;
}

export type ReportReason = 
  | 'abusive_language' 
  | 'harassment' 
  | 'spam' 
  | 'threats' 
  | 'inappropriate_content' 
  | 'other';

export interface MessageReport {
  id: string;
  message_id: string;
  message_text_snapshot: string;
  message_nickname_snapshot: string;
  reporter_session_id: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string | null;
}

export interface ModerationLog {
  id: string;
  moderator_id: string;
  action_type: ModerationActionType;
  target_session_id?: string | null;
  target_message_id?: string | null;
  target_nickname?: string | null;
  reason: string;
  created_at: string;
}

export interface ChatSettings {
  max_message_length: number;
  rate_limit_cooldown_sec: number;
  prohibited_words: string[];
  duplicate_check_sec: number;
  patreon_url?: string;
}
