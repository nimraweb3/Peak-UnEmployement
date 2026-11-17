export interface Profile {
  id: string;
  username: string;
  avatar_seed: string;
  industry_id: string | null;
  profession: string;
  unemployment_status: string;
  public_status: string;
  allows_dm_requests: boolean;
  onboarding_completed: boolean;
  created_at: string;
}
export interface Room {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  industry_id: string | null;
}
export interface ReplyReference {
  id: string;
  content: string;
  deleted_at: string | null;
  sender_id: string;
  profiles: { username: string } | null;
}
export interface Message {
  reply_to_message_id?: string | null;
  reply?: ReplyReference | null;
  id: string;
  room_id: string | null;
  conversation_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  client_id: string;
  profiles: Pick<
    Profile,
    "id" | "username" | "avatar_seed" | "allows_dm_requests"
  > & {
    profile_details?: {
      avatar_path: string | null;
      display_name: string;
    } | null;
  };
  reactions: { user_id: string; emoji: string }[];
}
export interface Request {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  sender: Profile;
  recipient: Profile;
}
export interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  closed_at: string | null;
  created_at: string;
  a: Profile;
  b: Profile;
  unread: number;
}

export interface AppNotification {
  id: string;
  type: "reply" | "request" | "accepted" | "private_message";
  is_read: boolean;
  created_at: string;
  actor_id: string;
  message_id: string | null;
  conversation_id: string | null;
  room: { slug: string; name: string } | null;
  actor: {
    id: string;
    username: string;
    avatar_seed: string;
    profile_details?: { avatar_path: string | null } | null;
  } | null;
}
