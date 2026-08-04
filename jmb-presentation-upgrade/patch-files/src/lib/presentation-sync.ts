export type DemoChatRole = "customer" | "admin";

export type DemoChatMessage = {
  id: string;
  requestId: string;
  sender: DemoChatRole;
  name: string;
  text: string;
  timeLabel: string;
  readByCustomer: boolean;
  readByAdmin: boolean;
};

export type DemoRequestStatus = "In Review" | "Quoted" | "Accepted" | "Converted";

export type DemoRequestState = {
  requestId: string;
  status: DemoRequestStatus;
  quote: number;
  orderId?: string;
};

const CHAT_KEY = "jmb2-presentation-chat-v1";
const REQUEST_KEY = "jmb2-presentation-request-v1";
const TYPING_KEY = "jmb2-presentation-typing-v1";
const CHANGE_EVENT = "jmb2-presentation-change";

const INITIAL_MESSAGES: DemoChatMessage[] = [
  {
    id: "msg-1",
    requestId: "REQ-208",
    sender: "customer",
    name: "Priya",
    text: "Hi! I need 12 custom bag charms as party favors, each with a different name.",
    timeLabel: "3:42 PM",
    readByCustomer: true,
    readByAdmin: true,
  },
  {
    id: "msg-2",
    requestId: "REQ-208",
    sender: "admin",
    name: "JMB 2 Creations",
    text: "Absolutely! What theme and colors are you picturing for the set?",
    timeLabel: "3:45 PM",
    readByCustomer: true,
    readByAdmin: true,
  },
  {
    id: "msg-3",
    requestId: "REQ-208",
    sender: "customer",
    name: "Priya",
    text: "Pastel space please. Lavender, blush pink, pearl white, stars and little planets.",
    timeLabel: "3:47 PM",
    readByCustomer: true,
    readByAdmin: true,
  },
  {
    id: "msg-4",
    requestId: "REQ-208",
    sender: "admin",
    name: "JMB 2 Creations",
    text: "That will work beautifully. The presentation quote is $126 for all 12 charms with local pickup.",
    timeLabel: "3:54 PM",
    readByCustomer: true,
    readByAdmin: true,
  },
];

const DEFAULT_REQUEST_STATE: DemoRequestState = {
  requestId: "REQ-208",
  status: "Quoted",
  quote: 126,
};

type TypingState = Partial<Record<DemoChatRole, { active: boolean; updatedAt: number }>>;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function dispatchChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getDemoMessages(requestId = "REQ-208") {
  if (!canUseStorage()) return INITIAL_MESSAGES.filter((message) => message.requestId === requestId);
  const stored = safeParse<DemoChatMessage[]>(window.localStorage.getItem(CHAT_KEY), INITIAL_MESSAGES);
  return stored.filter((message) => message.requestId === requestId);
}

export function saveDemoMessages(messages: DemoChatMessage[]) {
  if (!canUseStorage()) return;
  const current = safeParse<DemoChatMessage[]>(window.localStorage.getItem(CHAT_KEY), INITIAL_MESSAGES);
  const requestIds = new Set(messages.map((message) => message.requestId));
  const untouched = current.filter((message) => !requestIds.has(message.requestId));
  window.localStorage.setItem(CHAT_KEY, JSON.stringify([...untouched, ...messages]));
  dispatchChange();
}

export function addDemoMessage(
  requestId: string,
  sender: DemoChatRole,
  text: string,
): DemoChatMessage[] {
  const trimmed = text.trim();
  if (!trimmed) return getDemoMessages(requestId);

  const messages = getDemoMessages(requestId);
  const now = new Date();
  const next: DemoChatMessage = {
    id: `${sender}-${now.getTime()}`,
    requestId,
    sender,
    name: sender === "admin" ? "JMB 2 Creations" : "Priya",
    text: trimmed,
    timeLabel: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    readByCustomer: sender === "customer",
    readByAdmin: sender === "admin",
  };

  const updated = [...messages, next];
  saveDemoMessages(updated);
  return updated;
}

export function markMessagesRead(requestId: string, role: DemoChatRole) {
  const messages = getDemoMessages(requestId);
  let changed = false;
  const updated = messages.map((message) => {
    if (role === "admin" && !message.readByAdmin) {
      changed = true;
      return { ...message, readByAdmin: true };
    }
    if (role === "customer" && !message.readByCustomer) {
      changed = true;
      return { ...message, readByCustomer: true };
    }
    return message;
  });
  if (changed) saveDemoMessages(updated);
  return updated;
}

export function setRoleTyping(role: DemoChatRole, active: boolean) {
  if (!canUseStorage()) return;
  const state = safeParse<TypingState>(window.localStorage.getItem(TYPING_KEY), {});
  state[role] = { active, updatedAt: Date.now() };
  window.localStorage.setItem(TYPING_KEY, JSON.stringify(state));
  dispatchChange();
}

export function isRoleTyping(role: DemoChatRole) {
  if (!canUseStorage()) return false;
  const state = safeParse<TypingState>(window.localStorage.getItem(TYPING_KEY), {});
  const entry = state[role];
  if (!entry?.active) return false;
  return Date.now() - entry.updatedAt < 2200;
}

export function getDemoRequestState() {
  if (!canUseStorage()) return DEFAULT_REQUEST_STATE;
  return safeParse<DemoRequestState>(
    window.localStorage.getItem(REQUEST_KEY),
    DEFAULT_REQUEST_STATE,
  );
}

export function saveDemoRequestState(state: DemoRequestState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(REQUEST_KEY, JSON.stringify(state));
  dispatchChange();
}

export function resetPresentationDemo() {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CHAT_KEY, JSON.stringify(INITIAL_MESSAGES));
  window.localStorage.setItem(REQUEST_KEY, JSON.stringify(DEFAULT_REQUEST_STATE));
  window.localStorage.removeItem(TYPING_KEY);
  dispatchChange();
}

export function subscribePresentation(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = () => callback();
  const onCustom = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onCustom);
  };
}
