import type {
  Profile,
  Room,
  Message,
  Request,
  Conversation,
} from "../../shared/types";
import { industries } from "../../shared/config";
const now = new Date().toISOString();
const person = (
  id: string,
  username: string,
  industry: string | null,
): Profile => ({
  id,
  username,
  industry_id: industry,
  avatar_seed: id,
  profession: "",
  unemployment_status: "Changing careers",
  public_status: "Taking it one day at a time.",
  allows_dm_requests: true,
  onboarding_completed: true,
  created_at: now,
});
const fixtures = [
  person("fixture-river", "InterviewGhost_91", "tech"),
  person("fixture-jules", "Rejected_404", "design"),
  person("fixture-sam", "JoblessLegend_42", "business"),
];
export const localRooms: Room[] = [
  {
    id: "lounge",
    slug: "lounge",
    name: "The Unemployment Lounge",
    description: "Job searches, life updates, and everything in between.",
    icon: "○",
    industry_id: null,
  },
  ...industries.map((r) => ({
    id: r.slug,
    slug: r.slug,
    name: r.name,
    description: "A room for people in " + r.name.toLowerCase() + ".",
    icon: r.icon,
    industry_id: r.slug,
  })),
];
let me: Profile | null = null;
let requests: Request[] = [];
let conversations: Conversation[] = [];
let blocks: string[] = [];
const messages: Message[] = [];
const lines: Record<string, string[]> = {
  lounge: [
    "Had an interview today. They asked where I see myself in five years. I’m still deciding what to have for lunch.",
    "Honestly, making lunch counts as a plan.",
    "Small win: finally sent the portfolio I’ve been avoiding all week.",
    "That absolutely counts. Closing the laptop for a bit is allowed too.",
  ],
  tech: [
    "Anyone else rebuilding their side project instead of writing another cover letter?",
    "I fixed one bug and introduced two. At least something is growing.",
  ],
  design: [
    "Portfolio question: fewer projects with more context, or a little of everything?",
    "I’d rather hear the story behind two good decisions.",
  ],
  business: [
    "How are you explaining a career change without turning it into a whole presentation?",
    "Still working on my one-sentence version.",
  ],
  marketing: [
    "Wrote a campaign brief for myself. The audience is currently one recruiter.",
    "The hardest audience to reach.",
  ],
  healthcare: [
    "Taking a week to reset before the next round of applications.",
    "Hope there’s a proper day off in there too.",
  ],
  education: [
    "Missing the conversations more than the timetable.",
    "A surprising amount of teaching happens outside a classroom.",
  ],
  engineering: [
    "Back to learning something I never had time for at work.",
    "What are you building?",
  ],
};
function makeMessage(
  content: string,
  sender: Profile,
  room: string | null,
  conversation: string | null = null,
): Message {
  return {
    id: crypto.randomUUID(),
    room_id: room,
    conversation_id: conversation,
    sender_id: sender.id,
    content,
    created_at: new Date().toISOString(),
    deleted_at: null,
    client_id: crypto.randomUUID(),
    profiles: sender,
    reactions: [],
  };
}
for (const [room, content] of Object.entries(lines))
  content.forEach((text, i) => {
    const message = makeMessage(text, fixtures[i % 3], room);
    message.created_at = new Date(
      Date.now() - (content.length - i) * 180000,
    ).toISOString();
    if (i === 2) message.reactions = [{ user_id: fixtures[0].id, emoji: "🎉" }];
    messages.push(message);
  });
export function localIdentity() {
  return me;
}
export function joinLocal() {
  me = {
    ...person(crypto.randomUUID(), "NewNeighbour", null),
    allows_dm_requests: false,
    onboarding_completed: false,
  };
  window.dispatchEvent(new Event("frontend-session"));
  return me;
}
export function leaveLocal() {
  const previous = me?.id;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === previous || messages[i].conversation_id)
      messages.splice(i, 1);
    else
      messages[i].reactions = messages[i].reactions.filter(
        (r) => r.user_id !== previous,
      );
  }
  me = null;
  requests = [];
  conversations = [];
  blocks = [];
  window.dispatchEvent(new Event("frontend-session"));
}
const getPerson = (id: string) =>
  me?.id === id ? me : fixtures.find((p) => p.id === id);
const required = () => {
  if (!me)
    throw new Error("Join anonymously to participate in this frontend demo.");
  return me;
};
export async function localApi<T>(
  path: string,
  method = "GET",
  raw?: unknown,
): Promise<T> {
  const body = (raw || {}) as Record<string, any>;
  const route = path.split("?")[0];
  const result = (): unknown => {
    const guest = /^\/public\/rooms\/([^/]+)\/messages$/.exec(route);
    if (guest) {
      const room = localRooms.find((r) => r.slug === guest[1]);
      if (!room) throw new Error("Room not found.");
      return {
        room,
        items: messages
          .filter((m) => m.room_id === room.id)
          .slice(-30)
          .reverse()
          .map((m) => ({
            ...m,
            author: {
              username: m.profiles.username,
              avatar_seed: m.profiles.avatar_seed,
            },
            reactions: [...new Set(m.reactions.map((r) => r.emoji))].map(
              (emoji) => ({
                emoji,
                count: m.reactions.filter((r) => r.emoji === emoji).length,
              }),
            ),
          })),
        next: null,
      };
    }
    const self = required();
    if (route === "/me") {
      if (method === "DELETE") {
        leaveLocal();
        return { ok: true };
      }
      if (method === "PATCH") {
        const allowed = [
          "username",
          "avatar_seed",
          "industry_id",
          "profession",
          "unemployment_status",
          "public_status",
          "allows_dm_requests",
          "onboarding_completed",
        ];
        for (const key of Object.keys(body))
          if (!allowed.includes(key)) throw new Error("Unknown preference.");
        if (body.username && !/^[A-Za-z0-9_]{3,30}$/.test(body.username))
          throw new Error("Use 3–30 letters, numbers or underscores.");
        me = { ...self, ...body };
        return me;
      }
      return self;
    }
    if (route === "/rooms") return localRooms;
    if (route === "/admin") return { admin: false };
    const profile = /^\/profiles\/([^/]+)$/.exec(route);
    if (profile) {
      const p = getPerson(profile[1]);
      if (!p) throw new Error("Profile unavailable.");
      return p;
    }
    const feed = /^\/(rooms|conversations)\/([^/]+)\/messages$/.exec(route);
    if (feed) {
      const isRoom = feed[1] === "rooms";
      const conversation = conversations.find((c) => c.id === feed[2]);
      if (!isRoom && (!conversation || blocks.includes(conversation.b.id)))
        throw new Error("Conversation unavailable.");
      if (method === "POST") {
        if (conversation?.closed_at) throw new Error("Conversation is closed.");
        if (
          typeof body.content !== "string" ||
          !body.content.trim() ||
          body.content.length > 1000
        )
          throw new Error("Use 1–1000 characters.");
        const existing = messages.find(
          (m) => m.client_id === body.client_id && m.sender_id === self.id,
        );
        if (existing) return existing;
        const m = makeMessage(
          body.content.trim(),
          self,
          isRoom ? feed[2] : null,
          isRoom ? null : feed[2],
        );
        m.client_id = body.client_id;
        messages.push(m);
        return m;
      }
      return {
        items: messages
          .filter(
            (m) =>
              (isRoom ? m.room_id : m.conversation_id) === feed[2] &&
              !blocks.includes(m.sender_id),
          )
          .slice(-40)
          .reverse(),
        next: null,
      };
    }
    const message = /^\/messages\/([^/]+)(\/reactions)?$/.exec(route);
    if (message) {
      const m = messages.find((m) => m.id === message[1]);
      if (!m) throw new Error("Message unavailable.");
      if (message[2]) {
        m.reactions = m.reactions.filter(
          (r) => !(r.user_id === self.id && r.emoji === body.emoji),
        );
        if (method === "POST")
          m.reactions.push({ user_id: self.id, emoji: body.emoji });
      } else {
        if (m.sender_id !== self.id)
          throw new Error("You can only remove your own messages.");
        m.deleted_at = new Date().toISOString();
        m.content = "";
      }
      return { ok: true };
    }
    if (route === "/demo/incoming") {
      if (!self.allows_dm_requests) throw new Error("Enable requests first.");
      const sender = fixtures[0];
      if (blocks.includes(sender.id))
        throw new Error("Unblock this sample profile first.");
      if (
        requests.some(
          (r) => r.sender_id === sender.id && r.status === "pending",
        )
      )
        return { ok: true };
      requests.push({
        id: crypto.randomUUID(),
        sender_id: sender.id,
        recipient_id: self.id,
        status: "pending",
        created_at: now,
        sender,
        recipient: self,
      });
      return { ok: true };
    }
    if (route === "/dm-requests") {
      if (method === "POST") {
        const recipient = getPerson(body.recipient_id);
        if (!recipient?.allows_dm_requests || blocks.includes(recipient.id))
          throw new Error("This person isn’t accepting requests.");
        if (
          requests.some(
            (r) => r.recipient_id === recipient.id && r.sender_id === self.id,
          )
        )
          throw new Error("You already requested this conversation.");
        const r = {
          id: crypto.randomUUID(),
          sender_id: self.id,
          recipient_id: recipient.id,
          status: "pending",
          created_at: now,
          sender: self,
          recipient,
        };
        requests.push(r);
        return r;
      }
      return requests;
    }
    const request = /^\/dm-requests\/([^/]+)$/.exec(route);
    if (request) {
      const r = requests.find((r) => r.id === request[1]);
      if (
        !r ||
        r.recipient_id !== self.id ||
        r.status !== "pending" ||
        !["accepted", "declined"].includes(body.status)
      )
        throw new Error("Request unavailable.");
      r.status = body.status;
      if (r.status === "accepted") {
        const c = {
          id: crypto.randomUUID(),
          user_a: self.id,
          user_b: r.sender.id,
          a: self,
          b: r.sender,
          created_at: now,
          closed_at: null,
          unread: 0,
        };
        conversations.push(c);
      }
      return r;
    }
    if (route === "/conversations")
      return conversations.filter((c) => !blocks.includes(c.b.id));
    const conversation = /^\/conversations\/([^/]+)$/.exec(route);
    if (conversation) {
      const c = conversations.find((c) => c.id === conversation[1]);
      if (!c) throw new Error("Conversation unavailable.");
      if (body.action === "close") c.closed_at = new Date().toISOString();
      return { ok: true };
    }
    if (route === "/blocks") {
      if (method === "POST") {
        blocks = [...new Set([...blocks, body.user_id])];
        requests = requests.map((r) =>
          r.sender_id === body.user_id || r.recipient_id === body.user_id
            ? { ...r, status: "declined" }
            : r,
        );
        return { ok: true };
      }
      return blocks.map((id) => ({ blocked_id: id, profile: getPerson(id) }));
    }
    const unblock = /^\/blocks\/([^/]+)$/.exec(route);
    if (unblock) {
      blocks = blocks.filter((id) => id !== unblock[1]);
      return { ok: true };
    }
    if (route === "/reports")
      throw new Error(
        "This frontend demo has no moderation service. Nothing was submitted.",
      );
    throw new Error("This action is not available in the frontend preview.");
  };
  return structuredClone(result()) as T;
}
