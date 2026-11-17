import { getCachedAdminSession } from './adminAuth';
import { getActiveUserSubscription, hasPaidServiceAccess } from './subscriberBilling';
import type { SecurityAuditLog, SecurityAuditLogType } from '../types';

const LOCAL_BALANCE_AUDIT_KEY = 'maos_em_obra_balance_audit_logs_v1';

export interface BalanceAuditSummary {
  totalBalanceEvents: number;
  authorizedViews: number;
  withdrawalAttempts: number;
  deniedAttempts: number;
  lastAccessAt: string | null;
  lastActor: string | null;
}

export interface LogBalanceAccessInput {
  type: SecurityAuditLogType;
  severity?: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
  action: string;
  resource: string;
  details: string;
  authorized: boolean;
  amountInvolved?: number;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: 'ADMIN_MASTER' | 'SUBSCRIBER' | 'USER' | 'VISITOR' | 'SYSTEM' | 'UNKNOWN';
}

function getLocalAuditFallback(): SecurityAuditLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_BALANCE_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAuditFallback(entry: SecurityAuditLog): void {
  try {
    const existing = getLocalAuditFallback();
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, 150);
    localStorage.setItem(LOCAL_BALANCE_AUDIT_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function resolveCurrentActorContext(
  overrideEmail?: string | null,
  overrideName?: string | null,
  overrideRole?: 'ADMIN_MASTER' | 'SUBSCRIBER' | 'USER' | 'VISITOR' | 'SYSTEM' | 'UNKNOWN'
): {
  actorEmail: string;
  actorName: string;
  actorRole: 'ADMIN_MASTER' | 'SUBSCRIBER' | 'USER' | 'VISITOR' | 'SYSTEM' | 'UNKNOWN';
  adminToken?: string;
} {
  const adminSession = getCachedAdminSession();
  if (overrideRole === 'ADMIN_MASTER' || adminSession?.token) {
    return {
      actorEmail: overrideEmail || adminSession?.email || 'josemoreirabrazil@gmail.com',
      actorName: overrideName || adminSession?.name || 'José Moreira (Master Global)',
      actorRole: 'ADMIN_MASTER',
      adminToken: adminSession?.token,
    };
  }

  const sub = getActiveUserSubscription();
  const isPaid = hasPaidServiceAccess(sub);
  let storedUserEmail = overrideEmail || '';
  if (!storedUserEmail) {
    try {
      storedUserEmail = localStorage.getItem('maos_em_obra_last_user_email') || '';
    } catch {
      storedUserEmail = '';
    }
  }

  if (overrideRole) {
    return {
      actorEmail: storedUserEmail || 'visitante@anonimo',
      actorName: overrideName || (storedUserEmail ? storedUserEmail.split('@')[0] : 'Visitante Não Autenticado'),
      actorRole: overrideRole,
    };
  }

  if (isPaid) {
    return {
      actorEmail: storedUserEmail || 'assinante@maosemobra.com.br',
      actorName: overrideName || `Assinante (${sub.planName})`,
      actorRole: 'SUBSCRIBER',
    };
  }

  if (storedUserEmail) {
    return {
      actorEmail: storedUserEmail,
      actorName: overrideName || storedUserEmail.split('@')[0],
      actorRole: 'USER',
    };
  }

  return {
    actorEmail: 'visitante@anonimo',
    actorName: overrideName || 'Visitante Não Autenticado',
    actorRole: 'VISITOR',
  };
}

export async function logBalanceAccessEvent(input: LogBalanceAccessInput): Promise<void> {
  const actor = resolveCurrentActorContext(input.actorEmail, input.actorName, input.actorRole);
  const fallbackEntry: SecurityAuditLog = {
    id: `bal-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    type: input.type,
    severity: input.severity || (input.authorized ? 'INFO' : 'CRITICAL'),
    ip: 'Sessão Web',
    details: input.details,
    actorEmail: actor.actorEmail,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    action: input.action,
    resource: input.resource,
    authorized: input.authorized,
    amountInvolved: input.amountInvolved,
  };

  saveLocalAuditFallback(fallbackEntry);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (actor.adminToken) {
      headers['Authorization'] = `Bearer ${actor.adminToken}`;
    }

    await fetch('/api/audit/balance-access', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: input.type,
        severity: fallbackEntry.severity,
        action: input.action,
        resource: input.resource,
        details: input.details,
        authorized: input.authorized,
        amountInvolved: input.amountInvolved,
        actorEmail: actor.actorEmail,
        actorName: actor.actorName,
        actorRole: actor.actorRole,
      }),
    });
  } catch {
    // Fallback already stored locally
  }
}

export async function fetchBalanceAuditLogs(adminToken?: string): Promise<{
  logs: SecurityAuditLog[];
  summary: BalanceAuditSummary;
}> {
  const localLogs = getLocalAuditFallback();
  const token = adminToken || getCachedAdminSession()?.token;

  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/balance-audit-logs', { headers });
    if (res.ok) {
      const data = await res.json();
      const serverLogs: SecurityAuditLog[] = Array.isArray(data.logs) ? data.logs : [];
      return {
        logs: serverLogs.length > 0 ? serverLogs : localLogs,
        summary: data.summary || computeBalanceAuditSummary(serverLogs.length > 0 ? serverLogs : localLogs),
      };
    }
  } catch {
    // fallback to local logs
  }

  return {
    logs: localLogs,
    summary: computeBalanceAuditSummary(localLogs),
  };
}

export function computeBalanceAuditSummary(logs: SecurityAuditLog[]): BalanceAuditSummary {
  const balanceLogs = logs.filter((l) =>
    ['BALANCE_ACCESS_VIEW', 'BALANCE_WITHDRAW_ATTEMPT', 'BALANCE_ACCESS_DENIED', 'PIX_AUTO_TRANSFER', 'SENSITIVE_DATA_VIEW'].includes(
      l.type
    )
  );
  const authorizedViews = balanceLogs.filter(
    (l) => l.authorized !== false && (l.type === 'BALANCE_ACCESS_VIEW' || l.type === 'SENSITIVE_DATA_VIEW')
  ).length;
  const withdrawalAttempts = balanceLogs.filter(
    (l) => l.type === 'BALANCE_WITHDRAW_ATTEMPT' || l.type === 'PIX_AUTO_TRANSFER'
  ).length;
  const deniedAttempts = balanceLogs.filter(
    (l) => l.type === 'BALANCE_ACCESS_DENIED' || l.authorized === false
  ).length;
  const latest = balanceLogs[0];

  return {
    totalBalanceEvents: balanceLogs.length,
    authorizedViews,
    withdrawalAttempts,
    deniedAttempts,
    lastAccessAt: latest?.timestamp || null,
    lastActor: latest?.actorEmail || latest?.actorName || null,
  };
}
