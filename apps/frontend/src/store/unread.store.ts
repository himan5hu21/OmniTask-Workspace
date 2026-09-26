import { create } from "zustand";

type UnreadCounts = Record<string, number>;

interface UnreadState {
  dmUnread: UnreadCounts;
  channelUnread: UnreadCounts;
  initialize: (counts: { dmUnread?: UnreadCounts; channelUnread?: UnreadCounts }) => void;
  incrementDm: (conversationId: string) => void;
  clearDm: (conversationId: string) => void;
  incrementChannel: (channelId: string) => void;
  clearChannel: (channelId: string) => void;
  totalDmUnread: () => number;
}

const sanitizeUnreadCounts = (counts: UnreadCounts = {}) =>
  Object.fromEntries(
    Object.entries(counts).filter(([, count]) => Number.isFinite(count) && count > 0)
  );

const areUnreadCountsEqual = (left: UnreadCounts, right: UnreadCounts) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key) => left[key] === right[key]);
};

export const useUnreadStore = create<UnreadState>()((set, get) => ({
  dmUnread: {},
  channelUnread: {},

  initialize: ({ dmUnread = {}, channelUnread = {} }) =>
    set((state) => {
      const nextDmUnread = sanitizeUnreadCounts(dmUnread);
      const nextChannelUnread = sanitizeUnreadCounts(channelUnread);

      if (
        areUnreadCountsEqual(state.dmUnread, nextDmUnread) &&
        areUnreadCountsEqual(state.channelUnread, nextChannelUnread)
      ) {
        return state;
      }

      return {
        dmUnread: nextDmUnread,
        channelUnread: nextChannelUnread,
      };
    }),

  incrementDm: (conversationId) =>
    set((state) => ({
      dmUnread: {
        ...state.dmUnread,
        [conversationId]: (state.dmUnread[conversationId] ?? 0) + 1,
      },
    })),

  clearDm: (conversationId) =>
    set((state) => {
      if (!(conversationId in state.dmUnread)) return state;
      const next = { ...state.dmUnread };
      delete next[conversationId];
      return { dmUnread: next };
    }),

  incrementChannel: (channelId) =>
    set((state) => ({
      channelUnread: {
        ...state.channelUnread,
        [channelId]: (state.channelUnread[channelId] ?? 0) + 1,
      },
    })),

  clearChannel: (channelId) =>
    set((state) => {
      if (!(channelId in state.channelUnread)) return state;
      const next = { ...state.channelUnread };
      delete next[channelId];
      return { channelUnread: next };
    }),

  totalDmUnread: () => Object.values(get().dmUnread).reduce((sum, count) => sum + count, 0),
}));
