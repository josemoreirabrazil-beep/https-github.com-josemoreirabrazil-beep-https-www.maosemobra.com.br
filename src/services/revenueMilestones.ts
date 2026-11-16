import { getCachedAdminSession, MASTER_CREDENTIALS } from './adminAuth';
import { simulatePushNotification } from './firebaseMessaging';
import { logBalanceAccessEvent } from './balanceAudit';

export interface RevenueMilestone {
  id: string;
  title: string;
  targetAmount: number;
  enabled: boolean;
  reached: boolean;
  notifiedAt: string | null;
  createdAt: string;
}

export interface AdminMilestoneNotification {
  id: string;
  milestoneId: string;
  title: string;
  message: string;
  targetAmount: number;
  currentRevenue: number;
  createdAt: string;
  read: boolean;
}

export const REVENUE_MILESTONES_EVENT = 'maos-em-obra-revenue-milestones-updated';
const STORAGE_KEY_MILESTONES = 'maos_em_obra_admin_revenue_milestones_v1';
const STORAGE_KEY_NOTIFS = 'maos_em_obra_admin_milestone_notifs_v1';

const DEFAULT_MILESTONES: RevenueMilestone[] = [
  {
    id: 'rev-goal-500',
    title: 'Marco Inicial • R$ 500,00',
    targetAmount: 500,
    enabled: true,
    reached: false,
    notifiedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rev-goal-1500',
    title: 'Expansão Mensal • R$ 1.500,00',
    targetAmount: 1500,
    enabled: true,
    reached: false,
    notifiedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rev-goal-5000',
    title: 'Escala Construtoras • R$ 5.000,00',
    targetAmount: 5000,
    enabled: true,
    reached: false,
    notifiedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rev-goal-10000',
    title: 'Meta Master • R$ 10.000,00',
    targetAmount: 10000,
    enabled: true,
    reached: false,
    notifiedAt: null,
    createdAt: new Date().toISOString(),
  },
];

function loadLocalMilestones(): RevenueMilestone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MILESTONES);
    if (!raw) return DEFAULT_MILESTONES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MILESTONES;
  } catch {
    return DEFAULT_MILESTONES;
  }
}

function saveLocalMilestones(milestones: RevenueMilestone[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MILESTONES, JSON.stringify(milestones));
  } catch {
    // ignore storage errors
  }
}

function loadLocalMilestoneNotifs(): AdminMilestoneNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalMilestoneNotifs(notifs: AdminMilestoneNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifs.slice(0, 50)));
  } catch {
    // ignore storage errors
  }
}

function dispatchMilestonesUpdated(milestones: RevenueMilestone[], notifications: AdminMilestoneNotification[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(REVENUE_MILESTONES_EVENT, {
        detail: { milestones, notifications },
      })
    );
  }
}

export async function fetchRevenueMilestones(isAdminMaster: boolean): Promise<{
  milestones: RevenueMilestone[];
  notifications: AdminMilestoneNotification[];
}> {
  if (!isAdminMaster) {
    return { milestones: [], notifications: [] };
  }

  const token = getCachedAdminSession()?.token;
  if (token) {
    try {
      const res = await fetch('/api/admin/revenue-milestones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const milestones: RevenueMilestone[] = Array.isArray(data.milestones) ? data.milestones : loadLocalMilestones();
        const notifications: AdminMilestoneNotification[] = Array.isArray(data.notifications) ? data.notifications : loadLocalMilestoneNotifs();
        saveLocalMilestones(milestones);
        saveLocalMilestoneNotifs(notifications);
        return { milestones, notifications };
      }
    } catch {
      // fall through to local storage
    }
  }

  return {
    milestones: loadLocalMilestones(),
    notifications: loadLocalMilestoneNotifs(),
  };
}

export async function saveRevenueMilestone(
  isAdminMaster: boolean,
  input: { id?: string; title: string; targetAmount: number; enabled?: boolean }
): Promise<RevenueMilestone[]> {
  if (!isAdminMaster) return [];

  const cleanTitle = input.title.trim();
  const targetAmount = Number(input.targetAmount);
  if (!cleanTitle || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error('Informe um título válido e um valor de meta maior que zero.');
  }

  const token = getCachedAdminSession()?.token;
  if (token) {
    try {
      const res = await fetch('/api/admin/revenue-milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: input.id,
          title: cleanTitle,
          targetAmount,
          enabled: input.enabled ?? true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const milestones = Array.isArray(data.milestones) ? data.milestones : loadLocalMilestones();
        const notifications = Array.isArray(data.notifications) ? data.notifications : loadLocalMilestoneNotifs();
        saveLocalMilestones(milestones);
        saveLocalMilestoneNotifs(notifications);
        dispatchMilestonesUpdated(milestones, notifications);
        return milestones;
      }
    } catch {
      // fallback to local
    }
  }

  const current = loadLocalMilestones();
  let updated: RevenueMilestone[];
  if (input.id && current.some((m) => m.id === input.id)) {
    updated = current.map((m) =>
      m.id === input.id
        ? {
            ...m,
            title: cleanTitle,
            targetAmount,
            enabled: input.enabled ?? m.enabled,
            reached: targetAmount !== m.targetAmount ? false : m.reached,
            notifiedAt: targetAmount !== m.targetAmount ? null : m.notifiedAt,
          }
        : m
    );
  } else {
    updated = [
      ...current,
      {
        id: input.id || `rev-goal-${Date.now()}`,
        title: cleanTitle,
        targetAmount,
        enabled: input.enabled ?? true,
        reached: false,
        notifiedAt: null,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  updated.sort((a, b) => a.targetAmount - b.targetAmount);
  saveLocalMilestones(updated);
  dispatchMilestonesUpdated(updated, loadLocalMilestoneNotifs());
  return updated;
}

export async function deleteRevenueMilestone(isAdminMaster: boolean, id: string): Promise<RevenueMilestone[]> {
  if (!isAdminMaster) return [];

  const token = getCachedAdminSession()?.token;
  if (token) {
    try {
      const res = await fetch(`/api/admin/revenue-milestones/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const milestones = Array.isArray(data.milestones) ? data.milestones : [];
        saveLocalMilestones(milestones);
        dispatchMilestonesUpdated(milestones, loadLocalMilestoneNotifs());
        return milestones;
      }
    } catch {
      // fallback to local
    }
  }

  const updated = loadLocalMilestones().filter((m) => m.id !== id);
  saveLocalMilestones(updated);
  dispatchMilestonesUpdated(updated, loadLocalMilestoneNotifs());
  return updated;
}

export async function markMilestoneNotificationRead(
  isAdminMaster: boolean,
  notificationId: string
): Promise<AdminMilestoneNotification[]> {
  if (!isAdminMaster) return [];

  const token = getCachedAdminSession()?.token;
  if (token) {
    try {
      const res = await fetch(`/api/admin/revenue-milestones/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        saveLocalMilestoneNotifs(notifications);
        dispatchMilestonesUpdated(loadLocalMilestones(), notifications);
        return notifications;
      }
    } catch {
      // fallback
    }
  }

  const updated = loadLocalMilestoneNotifs().map((n) => (n.id === notificationId ? { ...n, read: true } : n));
  saveLocalMilestoneNotifs(updated);
  dispatchMilestonesUpdated(loadLocalMilestones(), updated);
  return updated;
}

export async function markAllMilestoneNotificationsRead(isAdminMaster: boolean): Promise<AdminMilestoneNotification[]> {
  if (!isAdminMaster) return [];

  const token = getCachedAdminSession()?.token;
  if (token) {
    try {
      const res = await fetch('/api/admin/revenue-milestones/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        saveLocalMilestoneNotifs(notifications);
        dispatchMilestonesUpdated(loadLocalMilestones(), notifications);
        return notifications;
      }
    } catch {
      // fallback
    }
  }

  const updated = loadLocalMilestoneNotifs().map((n) => ({ ...n, read: true }));
  saveLocalMilestoneNotifs(updated);
  dispatchMilestonesUpdated(loadLocalMilestones(), updated);
  return updated;
}

/**
 * Checks accumulated revenue against Admin Master revenue goals and sends automatic
 * notifications exclusively when isAdminMaster is true.
 */
export async function checkAndNotifyAdminRevenueMilestones(params: {
  isAdminMaster: boolean;
  currentRevenue: number;
  milestones?: RevenueMilestone[];
  actorEmail?: string | null;
}): Promise<{
  newlyTriggered: AdminMilestoneNotification[];
  milestones: RevenueMilestone[];
  notifications: AdminMilestoneNotification[];
}> {
  if (!params.isAdminMaster) {
    return { newlyTriggered: [], milestones: [], notifications: [] };
  }

  const revenue = Number(params.currentRevenue) || 0;
  const currentMilestones = params.milestones ? [...params.milestones] : loadLocalMilestones();
  const currentNotifs = loadLocalMilestoneNotifs();

  const newlyTriggered: AdminMilestoneNotification[] = [];
  const nowIso = new Date().toISOString();

  const nextMilestones = currentMilestones.map((m) => {
    if (m.enabled && !m.notifiedAt && revenue >= m.targetAmount) {
      const alreadyHasNotif = currentNotifs.some((n) => n.milestoneId === m.id);
      if (!alreadyHasNotif) {
        newlyTriggered.push({
          id: `rev-notif-${m.id}-${Date.now()}`,
          milestoneId: m.id,
          title: `Meta de Faturamento Atingida: ${m.title}`,
          message: `O faturamento acumulado atingiu R$ ${revenue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} e superou a meta de R$ ${m.targetAmount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}.`,
          targetAmount: m.targetAmount,
          currentRevenue: revenue,
          createdAt: nowIso,
          read: false,
        });
      }
      return {
        ...m,
        reached: true,
        notifiedAt: nowIso,
      };
    }
    if (m.enabled && revenue >= m.targetAmount && !m.reached) {
      return { ...m, reached: true };
    }
    return m;
  });

  if (newlyTriggered.length === 0) {
    saveLocalMilestones(nextMilestones);
    return {
      newlyTriggered: [],
      milestones: nextMilestones,
      notifications: currentNotifs,
    };
  }

  const nextNotifs = [...newlyTriggered, ...currentNotifs].slice(0, 50);
  saveLocalMilestones(nextMilestones);
  saveLocalMilestoneNotifs(nextNotifs);
  dispatchMilestonesUpdated(nextMilestones, nextNotifs);

  for (const notif of newlyTriggered) {
    await simulatePushNotification({
      title: notif.title,
      body: notif.message,
      category: 'SYSTEM',
      data: {
        adminOnly: 'true',
        milestoneId: notif.milestoneId,
      },
    });

    logBalanceAccessEvent({
      type: 'SENSITIVE_DATA_VIEW',
      severity: 'INFO',
      action: 'REVENUE_MILESTONE_NOTIFIED',
      resource: 'DashboardView > Metas de Faturamento',
      details: notif.message,
      authorized: true,
      amountInvolved: revenue,
      actorEmail: params.actorEmail || MASTER_CREDENTIALS.email,
      actorName: MASTER_CREDENTIALS.name,
      actorRole: 'ADMIN_MASTER',
    });
  }

  return {
    newlyTriggered,
    milestones: nextMilestones,
    notifications: nextNotifs,
  };
}
