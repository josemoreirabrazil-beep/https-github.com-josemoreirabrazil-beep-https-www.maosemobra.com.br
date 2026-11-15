import React, { useState } from 'react';
import { 
  X, 
  HardHat, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  ExternalLink,
  Bot,
  Calendar,
  Building2,
  Phone,
  Mail,
  Download
} from 'lucide-react';
import type { CorporateContact } from '../types';
import confetti from 'canvas-confetti';

interface ClientPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: CorporateContact | null;
  onSendDemoResponse?: (contactId: string, responseText: string) => void;
}

export const ClientPresentationModal: React.FC<ClientPresentationModalProps> = ({
  isOpen,
  onClose,
  contact,
  onSendDemoResponse,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [demoRequested, setDemoRequested] = useState(false);
  const [clientNameInput, setClientNameInput] = useState(contact?.name || '');
  const [clientEmailInput, setClientEmailInput] = useState(contact?.email || '');

  if (!isOpen) return null;

  const standardDemoText = "Gostamos das ferramentas de RDO digital e cotações. Gostaríamos de uma demonstração.";

  const handleRequestDemo = () => {
    setDemoRequested(true);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    if (contact && onSendDemoResponse) {
      onSendDemoResponse(contact.id, standardDemoText);
    }
  };

  const slides = [
    {
      title: "MÃOS EM OBRA — Canteiro de Obras Inteligente",
      subtitle: "A plataforma líder em gestão de engenharia, RDO digital e cotações para construtoras e empreiteiros.",
      icon: HardHat,
      badge: "Apresentação Comercial Oficial",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Bem-vindo à apresentação institucional do <strong>Mãos em Obra</strong>. Projetada para engenheiros, construtoras e fornecedores que buscam eficiência máxima no canteiro de obras e controle financeiro absoluto.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">RDO Digital Instantâneo</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">Registro diário de obras, clima, efetivação de equipe e pareceres técnicos por IA.</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">Cotações &amp; Orçamentos</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">Cotação automatizada de materiais, logística e orçamentos detalhados para empreiteiros.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Destaque 1: Diário de Obra (RDO) Digital",
      subtitle: "Substitua o papel por relatórios fotográficos, geolocalização e histórico imutável na nuvem.",
      icon: FileText,
      badge: "Módulo RDO Pro",
      content: (
        <div className="space-y-4">
          <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Registro Fotográfico Organizado:</strong> Captura de fotos via câmera ou upload com pastas e vínculo a documentos técnicos.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Resumo Inteligente por IA:</strong> Geração automática de parecer executivo para o cliente final e alertas de segurança.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Lembretes e Push Notifications:</strong> Agendamento de lembretes diários integrados com a API de notificações do navegador.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Destaque 2: Cotações & Logística Avançada",
      subtitle: "Calcule insumos, despesas de mobilização, transporte, alimentação e hospedagem em segundos.",
      icon: DollarSign,
      badge: "Módulo Financeiro & Cotações",
      content: (
        <div className="space-y-4">
          <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Orçado vs Realizado:</strong> Controle de fluxo de caixa por categoria (Material, Mão de Obra, Equipamentos, Outros).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Propostas e Orçamentos Dinâmicos:</strong> Envio de propostas profissionais com tabela de serviços e cálculo automático de insumos.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Integração com Mercado Pago &amp; Pix:</strong> Recebimento automatizado de pagamentos e webhook síncrono.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Solicitar Demonstração Oficial",
      subtitle: "Gostamos das ferramentas de RDO digital e cotações. Gostaríamos de uma demonstração.",
      icon: Sparkles,
      badge: "Agendamento Automatizado",
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-amber-100 space-y-2">
            <p className="text-xs font-bold">Mensagem Padrão de Demonstração:</p>
            <p className="text-xs italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-500/20">
              &quot;{standardDemoText}&quot;
            </p>
          </div>

          {!demoRequested ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Seu Nome / Empresa</label>
                <input
                  type="text"
                  value={clientNameInput}
                  onChange={e => setClientNameInput(e.target.value)}
                  placeholder="Ex: Construtora Exemplo Ltda"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleRequestDemo}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Solicitar Demonstração (Enviar Mensagem Automatizada)</span>
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-950 dark:text-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black">Demonstração Solicitada com Sucesso!</h4>
              <p className="text-xs">
                Nossa equipe de engenharia comercial recebeu sua mensagem: <br />
                <strong className="font-semibold">&quot;{standardDemoText}&quot;</strong>
              </p>
              <p className="text-[11px] opacity-80 pt-1">Entraremos em contato em instantes para agendar a demonstração ao vivo.</p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {slides[activeSlide].badge}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Mãos em Obra · Apresentação Comercial
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
            {React.createElement(slides[activeSlide].icon, { className: 'w-4 h-4' })}
            <span>Slide {activeSlide + 1} de {slides.length}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {slides[activeSlide].title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {slides[activeSlide].subtitle}
          </p>

          <div className="pt-2">
            {slides[activeSlide].content}
          </div>
        </div>

        {/* Modal Footer / Slide Navigation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  activeSlide === idx ? 'w-6 bg-amber-500' : 'w-2 bg-slate-300 dark:bg-slate-700'
                }`}
                title={`Ir para slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {activeSlide > 0 && (
              <button
                type="button"
                onClick={() => setActiveSlide(activeSlide - 1)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
              >
                Anterior
              </button>
            )}
            {activeSlide < slides.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveSlide(activeSlide + 1)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                Concluir
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
