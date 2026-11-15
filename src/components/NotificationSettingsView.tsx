import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  ClipboardList,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Send,
  Save,
  Trash2,
  ArrowRight
} from 'lucide-react';
import type { Project, DailyLog, Expense } from '../types';
import type { NotificationSettingsConfig, WeekdayCode } from '../services/firebaseMessaging';
import { usePushNotifications } from '../hooks/usePushNotifications';
import confetti from 'canvas-confetti';

interface NotificationSettingsViewProps {
  currentProject: Project;
  rdos: DailyLog[];
  expenses: Expense[];
  onNavigateToRdo: () => void;
  onNavigateToFinancial: () => void;
}

const WEEKDAYS: { code: WeekdayCode; label: string }[] = [
  { code: 'Seg', label: 'Segunda' },
  { code: 'Ter', label: 'Terça' },
  { code: 'Qua', label: 'Quarta' },
  { code: 'Qui', label: 'Quinta' },
  { code: 'Sex', label: 'Sexta' },
  { code: 'Sab', label: 'Sábado' },
  { code: 'Dom', label: 'Domingo' },
];

export const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({
  currentProject,
  rdos,
  expenses,
  onNavigateToRdo,
  onNavigateToFinancial,
}) => {
  const {
    permission: permissionStatus,
    token: fcmToken,
    settings: savedSettings,
    history,
    requestPermission,
    sendNotification,
    updateSettings,
    clearHistory,
  } = usePushNotifications();

  const [settings, setSettings] = useState<NotificationSettingsConfig>(savedSettings);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    setSettings(savedSettings);
  }, [savedSettings]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const hasRdoToday = useMemo(() => {
    return rdos.some((r) => r.date === todayStr);
  }, [rdos, todayStr]);

  // Analyze upcoming & overdue unpaid expenses based on user's configured advance days & threshold
  const expenseAlertsAnalysis = useMemo(() => {
    const unpaid = expenses.filter(
      (e) =>
        e.status !== 'Pago' &&
        (Number(e.actualAmount) || Number(e.plannedAmount) || 0) >= (Number(settings.expenseMinAmountThreshold) || 0)
    );

    const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
    const advanceMs = (Number(settings.expenseAdvanceDays) || 3) * 86400000;

    const overdue: Expense[] = [];
    const dueToday: Expense[] = [];
    const upcoming: Expense[] = [];

    for (const exp of unpaid) {
      const expTime = new Date(`${exp.date}T00:00:00`).getTime();
      const diff = expTime - todayTime;
      if (diff < 0) {
        overdue.push(exp);
      } else if (diff === 0) {
        dueToday.push(exp);
      } else if (diff <= advanceMs) {
        upcoming.push(exp);
      }
    }

    const totalAlertItems = [
      ...(settings.expenseAlertOnOverdue ? overdue : []),
      ...(settings.expenseAlertOnDueToday ? dueToday : []),
      ...upcoming,
    ];

    const totalAmount = totalAlertItems.reduce(
      (sum, e) => sum + (Number(e.actualAmount) || Number(e.plannedAmount) || 0),
      0
    );

    return {
      unpaidCount: unpaid.length,
      overdue,
      dueToday,
      upcoming,
      totalAlertItems,
      totalAmount,
    };
  }, [expenses, todayStr, settings.expenseAdvanceDays, settings.expenseMinAmountThreshold, settings.expenseAlertOnOverdue, settings.expenseAlertOnDueToday]);

  const handleToggleWeekday = (day: WeekdayCode) => {
    setSettings((prev) => {
      const exists = prev.rdoReminderDays.includes(day);
      const nextDays = exists
        ? prev.rdoReminderDays.filter((d) => d !== day)
        : [...prev.rdoReminderDays, day];
      return { ...prev, rdoReminderDays: nextDays };
    });
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = updateSettings(settings);
    setSettings(updated);
    setSavedBanner('Preferências de lembretes de RDO e alertas de despesas salvas e sincronizadas com o Push FCM!');
    confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
    setTimeout(() => setSavedBanner(null), 5000);
  };

  const handleEnablePushPermission = async () => {
    const token = await requestPermission();
    if (token) {
      const next = { ...settings, pushEnabled: true };
      updateSettings(next);
      setSettings(next);
      await sendNotification({
        title: 'Notificações Push Ativadas • Mãos em Obra',
        body: `Lembretes diários de RDO (${settings.rdoReminderTime}) e alertas de prazos de despesas (${settings.expenseAlertTime}) configurados!`,
        category: 'SYSTEM',
      });
    }
  };

  const handleTriggerRdoReminderNow = async () => {
    const statusLabel = hasRdoToday
      ? `O RDO de hoje (${todayStr.split('-').reverse().join('/')}) já consta registrado na obra "${currentProject.title}", mas o lembrete foi enviado para conferência.`
      : `Pendente Hoje: ${settings.rdoCustomMessage}`;

    await sendNotification({
      title: `📋 Lembrete Diário de RDO (${settings.rdoReminderTime}) • ${currentProject.title}`,
      body: statusLabel,
      category: 'RDO',
    });
    confetti({ particleCount: 45, spread: 60 });
  };

  const handleTriggerExpenseAlertNow = async () => {
    const count = expenseAlertsAnalysis.totalAlertItems.length;
    const formattedTotal = expenseAlertsAnalysis.totalAmount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const bodyText =
      count > 0
        ? `Atenção na obra "${currentProject.title}": ${count} despesa(s) no radar de vencimento (${expenseAlertsAnalysis.overdue.length} atrasada(s), ${expenseAlertsAnalysis.dueToday.length} hoje, ${expenseAlertsAnalysis.upcoming.length} nos próximos ${settings.expenseAdvanceDays} dias) somando R$ ${formattedTotal}.`
        : `Obra "${currentProject.title}": Nenhuma despesa pendente ou próxima do vencimento nos próximos ${settings.expenseAdvanceDays} dias.`;

    await sendNotification({
      title: `💰 Alerta de Prazos de Despesas • ${currentProject.title}`,
      body: bodyText,
      category: 'EXPENSE',
    });
    confetti({ particleCount: 45, spread: 60 });
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ======================================================== */}
      {/* 🔔 BANNER PRINCIPAL: CONFIGURAÇÕES DE NOTIFICAÇÕES PUSH */}
      {/* ======================================================== */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 text-white border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-sm">
                <BellRing className="w-3.5 h-3.5" />
                CENTRAL DE ALERTAS &amp; PUSH FCM
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  permissionStatus === 'granted' || fcmToken
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                }`}
              >
                {permissionStatus === 'granted' || fcmToken ? '🟢 Push Notifications Ativo' : '⚡ Pronto para Ativar'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Configurações de Notificações &amp; Lembretes
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Programe lembretes diários automáticos para o preenchimento do <strong>Diário de Obra (RDO)</strong> e alertas antecipados de <strong>prazos e vencimentos de despesas</strong> da obra <strong>{currentProject.title}</strong> via Push Notifications (Firebase Cloud Messaging).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleEnablePushPermission}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{fcmToken ? 'Sincronizar Token FCM' : 'Ativar Permissão Push'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveSettings()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </div>

        {/* Quick Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Lembrete Diário RDO</div>
              <div className="text-sm font-black text-white mt-0.5">
                {settings.rdoReminderEnabled ? `Ativo às ${settings.rdoReminderTime}` : 'Pausado'}
              </div>
              <div className="text-[11px] text-amber-400 font-medium">
                {settings.rdoReminderDays.join(', ')}
              </div>
            </div>
            <ClipboardList className="w-6 h-6 text-amber-400 opacity-80" />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Alertas de Despesas</div>
              <div className="text-sm font-black text-white mt-0.5">
                {settings.expenseAlertsEnabled
                  ? `${settings.expenseAdvanceDays} dia(s) antes • ${settings.expenseAlertTime}`
                  : 'Pausado'}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium">
                {expenseAlertsAnalysis.totalAlertItems.length} despesa(s) no radar atual
              </div>
            </div>
            <Wallet className="w-6 h-6 text-emerald-400 opacity-80" />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Status Push FCM</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5 truncate max-w-[180px]">
                {fcmToken ? `Token: ${fcmToken.slice(0, 16)}...` : 'Pronto no Navegador'}
              </div>
              <div className="text-[11px] text-slate-300 font-medium">
                {history.length} alerta(s) no histórico
              </div>
            </div>
            <Bell className="w-6 h-6 text-sky-400 opacity-80" />
          </div>
        </div>
      </div>

      {savedBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{savedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedBanner(null)}
            className="text-xs font-black underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📋 GRID PRINCIPAL: RDO REMINDERS & EXPENSE ALERTS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: LEMBRETE DIÁRIO DO DIÁRIO DE OBRA (RDO) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-500">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Lembretes Diários do Diário de Obra (RDO)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notificação push diária para registro de equipe, clima, fotos e ocorrências
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.rdoReminderEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, rdoReminderEnabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all relative" />
              </label>
            </div>

            {/* Time & Missing Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Horário do Lembrete Diário
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    value={settings.rdoReminderTime}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, rdoReminderTime: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.rdoOnlyIfMissingToday}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, rdoOnlyIfMissingToday: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Alertar se RDO do dia estiver pendente</span>
                </label>
              </div>
            </div>

            {/* Days of the Week */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Dias da Semana para Disparo do Lembrete RDO
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => {
                  const active = settings.rdoReminderDays.includes(d.code);
                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => handleToggleWeekday(d.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {d.code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Texto Personalizado do Lembrete Push RDO
              </label>
              <textarea
                rows={2}
                value={settings.rdoCustomMessage}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, rdoCustomMessage: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Real-time RDO Today Status Box */}
            <div
              className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                hasRdoToday
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-start gap-2.5 text-xs">
                {hasRdoToday ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-black block">
                    {hasRdoToday
                      ? `RDO de Hoje (${todayStr.split('-').reverse().join('/')}) Preenchido!`
                      : `RDO de Hoje (${todayStr.split('-').reverse().join('/')}) Ainda Não Preenchido`}
                  </span>
                  <span className="text-[11px] opacity-85">
                    Obra atual: <strong>{currentProject.title}</strong> ({rdos.length} RDOs registrados no total)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleTriggerRdoReminderNow}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Disparar Lembrete RDO Agora (Push)</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToRdo}
              className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Abrir RDO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 2: ALERTAS DE PRAZOS E VENCIMENTOS DE DESPESAS */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-500">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Alertas de Prazos &amp; Vencimentos de Despesas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Avisos push preventivos antes do vencimento e alertas de contas em aberto
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.expenseAlertsEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, expenseAlertsEnabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all relative" />
              </label>
            </div>

            {/* Advance Days & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Antecedência do Alerta
                </label>
                <select
                  value={settings.expenseAdvanceDays}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      expenseAdvanceDays: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>1 dia antes</option>
                  <option value={2}>2 dias antes</option>
                  <option value={3}>3 dias antes</option>
                  <option value={5}>5 dias antes</option>
                  <option value={7}>7 dias antes</option>
                  <option value={15}>15 dias antes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Horário do Alerta
                </label>
                <input
                  type="time"
                  value={settings.expenseAlertTime}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, expenseAlertTime: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Valor Mínimo (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={settings.expenseMinAmountThreshold}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      expenseMinAmountThreshold: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Checkboxes for Due Today & Overdue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.expenseAlertOnDueToday}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, expenseAlertOnDueToday: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <span>Alertar despesas que vencem no dia</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.expenseAlertOnOverdue}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, expenseAlertOnOverdue: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <span>Alertar despesas vencidas / em atraso</span>
              </label>
            </div>

            {/* Live Radar of Expenses */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Radar de Prazos ({currentProject.title})
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  Total: R${' '}
                  {expenseAlertsAnalysis.totalAmount.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                    Vencidas
                  </div>
                  <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {expenseAlertsAnalysis.overdue.length}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                    Vencem Hoje
                  </div>
                  <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {expenseAlertsAnalysis.dueToday.length}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                    Próx. {settings.expenseAdvanceDays}d
                  </div>
                  <div className="text-sm font-black text-sky-600 dark:text-sky-400">
                    {expenseAlertsAnalysis.upcoming.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleTriggerExpenseAlertNow}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Disparar Alerta de Despesas Agora (Push)</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToFinancial}
              className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Ver Custos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📜 HISTÓRICO DE DISPAROS PUSH (RDO, DESPESAS E SISTEMA) */}
      {/* ======================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                Histórico de Notificações Push Disparadas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro em tempo real dos alertas de RDO e vencimento de despesas enviados pelo sistema via <code>usePushNotifications</code>
              </p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/15 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Histórico</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            Nenhum disparo registrado ainda. Clique em <strong>"Disparar Lembrete RDO Agora"</strong> ou <strong>"Disparar Alerta de Despesas Agora"</strong> acima para testar o envio imediato via Push.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      item.category === 'RDO'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : item.category === 'EXPENSE'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    {item.category === 'RDO'
                      ? 'Diário de Obra (RDO)'
                      : item.category === 'EXPENSE'
                      ? 'Prazo de Despesa'
                      : 'Push FCM'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  {item.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
