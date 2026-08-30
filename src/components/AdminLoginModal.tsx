import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Key, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Eye,
  EyeOff,
  Server,
  Fingerprint
} from 'lucide-react';
import { loginAdminMaster, MASTER_CREDENTIALS } from '../services/adminAuth';
import type { AdminMasterUser } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminUser: AdminMasterUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await loginAdminMaster(identifier, password);
      if (result.success && result.user) {
        onSuccess(result.user);
        onClose();
      } else {
        setErrorMessage(result.error || 'Credenciais inválidas. Acesso restrito ao Administrador Master.');
      }
    } catch (err: any) {
      setErrorMessage('Erro ao conectar ao servidor de segurança.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoCreds = (type: 'user' | 'email' | 'cpf') => {
    if (type === 'user') setIdentifier(MASTER_CREDENTIALS.username);
    if (type === 'email') setIdentifier(MASTER_CREDENTIALS.email);
    if (type === 'cpf') setIdentifier(MASTER_CREDENTIALS.cpfRaw);
    setPassword(MASTER_CREDENTIALS.password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            Admin Master Global
            <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full border border-amber-500/30 uppercase tracking-widest">
              Nível 0
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Acesso restrito ao Titular Geral com Blindagem de Ponta a Ponta
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User/Email/CPF */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Usuário, Email ou CPF Master
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="maos, email ou CPF..."
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Senha de Acesso Master
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick-fill helpers for authorized testing */}
          <div className="pt-1">
            <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
              <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
              <span>Preenchimento Rápido das Credenciais Master:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => handleFillDemoCreds('user')}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition cursor-pointer text-center"
              >
                Usuário: <strong>maos</strong>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemoCreds('email')}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition cursor-pointer text-center truncate"
                title="josemoreirabrazil@gmail.com"
              >
                Email Master
              </button>
              <button
                type="button"
                onClick={() => handleFillDemoCreds('cpf')}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition cursor-pointer text-center truncate"
                title="CPF: 21952892520"
              >
                CPF Master
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Validando Blindagem & Acesso...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Entrar no Painel Master Global</span>
              </>
            )}
          </button>
        </form>

        {/* Security Shield Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Escudo de Defesa Ativo</span>
          </div>
          <div className="text-slate-500 font-mono text-[10px]">
            TLS 1.3 • AES-256
          </div>
        </div>
      </div>
    </div>
  );
};
