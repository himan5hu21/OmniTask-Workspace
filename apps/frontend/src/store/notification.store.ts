import { create } from "zustand";

type NotificationSummaryState = {
  totalUnread: number;
  orgUnread: Record<string, number>;
  initialize: (payload: { totalUnread: number; orgUnread: Record<string, number> }) => void;
  increment: (orgId?: string | null) => void;
  markOneRead: (orgId?: string | null) => void;
  markAllRead: (orgId?: string | null) => void;
};

const sameCounts = (left: Record<string, number>, right: Record<string, number>) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
};

export const useNotificationStore = create<NotificationSummaryState>()((set) => ({
  totalUnread: 0,
  orgUnread: {},

  initialize: ({ totalUnread, orgUnread }) =>
    set((state) => {
      if (state.totalUnread === totalUnread && sameCounts(state.orgUnread, orgUnread)) {
        return state;
      }
      return { totalUnread, orgUnread };
    }),

  increment: (orgId) =>
    set((state) => ({
      totalUnread: state.totalUnread + 1,
      orgUnread: orgId
        ? {
            ...state.orgUnread,
            [orgId]: (state.orgUnread[orgId] ?? 0) + 1,
          }
        : state.orgUnread,
    })),

  markOneRead: (orgId) =>
    set((state) => ({
      totalUnread: Math.max(0, state.totalUnread - 1),
      orgUnread: orgId
        ? {
            ...state.orgUnread,
            [orgId]: Math.max(0, (state.orgUnread[orgId] ?? 0) - 1),
          }
        : state.orgUnread,
    })),

  markAllRead: (orgId) =>
    set((state) => {
      if (!orgId) {
        return { totalUnread: 0, orgUnread: {} };
      }

      const orgCount = state.orgUnread[orgId] ?? 0;
      return {
        totalUnread: Math.max(0, state.totalUnread - orgCount),
        orgUnread: {
          ...state.orgUnread,
          [orgId]: 0,
        },
      };
    }),
}));
