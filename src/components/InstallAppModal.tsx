import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Apple, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  QrCode, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  ExternalLink,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';
import confetti from 'canvas-confetti';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'direct' | 'ios' | 'android' | 'playstore'>('direct');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Generate QR Code for mobile install
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      QRCode.toDataURL(currentUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Error generating QR code:', err));
    }
  }, [isOpen]);

  // Set default tab based on user device
  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    } else if (isAndroid && !isInstallable) {
      setActiveTab('android');
    } else {
      setActiveTab('direct');
    }
  }, [isIOS, isAndroid, isInstallable]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (success) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-md font-black shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-slate-950 tracking-tight">
                  Baixar &amp; Instalar o Aplicativo
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-amber-300 uppercase tracking-wide">
                  PWA Oficial
                </span>
              </div>
              <p className="text-xs text-slate-950/80 font-medium">
                Mãos em Obra • Funciona no Celular (Android/iOS) e no Computador
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-slate-950/15 hover:bg-slate-950/30 flex items-center justify-center text-slate-950 font-bold transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Mode Switcher Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'direct'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instalação Rápida</span>
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'android'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (Chrome)</span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'ios'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone / iPad (iOS)</span>
          </button>

          <button
            onClick={() => setActiveTab('playstore')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'playstore'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Google Play Store</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Tab 1: Instalação Rápida 1-Click & QR Code */}
          {activeTab === 'direct' && (
            <div className="space-y-6">
              {/* Primary Direct Install Action */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-slate-800/90 dark:to-slate-800/40 border border-amber-200 dark:border-amber-500/30">
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <div className="flex items-center gap-3.5 text-left">
                    <img 
                      src="/pwa-192x192.png" 
                      alt="Ícone Mãos em Obra" 
                      className="w-14 h-14 rounded-2xl shadow-md border border-amber-300 dark:border-slate-700 object-cover shrink-0" 
                    />
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base">
                        Mãos em Obra - Canteiro Pro
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {isInstalled 
                          ? 'O aplicativo já está instalado no seu sistema!'
                          : 'Instale como aplicativo nativo. Leve, rápido e funciona sem ocupar memória.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 w-full sm:w-auto">
                    {isInstalled ? (
                      <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Já Instalado!</span>
                      </div>
                    ) : isInstallable ? (
                      <button
                        onClick={handleInstallClick}
                        disabled={isInstalling}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isInstalling ? 'Instalando...' : 'Instalar Agora (1 Clique)'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab(isIOS ? 'ios' : 'android')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-black text-xs transition cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Ver Como Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code Section: Open on Smartphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code de Instalação Mobile" 
                      className="w-40 h-40 rounded-xl"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                      Gerando QR Code...
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <QrCode className="w-3.5 h-3.5 text-amber-500" />
                    <span>Aponte a câmera do seu celular</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    Instale no seu Celular
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Abra a câmera do celular ou leitor de QR Code para carregar a versão oficial do <strong>Mãos em Obra</strong> diretamente no seu smartphone Android ou iPhone.
                  </p>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Link do App Copiado!' : 'Copiar Link para Enviar via WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Benefits of Installing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h6 className="text-xs font-bold text-slate-900 dark:text-white">Sem Ocupar Espaço</h6>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Carrega instantâneo sem pesar na memória do celular.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h6 className="text-xs font-bold text-slate-900 dark:text-white">Ícone na Tela Inicial</h6>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Abra com 1 toque como qualquer aplicativo nativo.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h6 className="text-xs font-bold text-slate-900 dark:text-white">Atualizações Automáticas</h6>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sempre na versão mais recente sem precisar atualizar manualmente.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Guia Android / Chrome */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  Instalação nativa para smartphones <strong>Samsung, Motorola, Xiaomi, etc.</strong> através do Google Chrome ou navegador padrão.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-white">Abra no Google Chrome</h6>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Acesse este endereço no seu navegador Google Chrome no celular Android.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-white">Toque nos 3 pontos (Menu)</h6>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      No canto superior direito da tela do Chrome, toque no botão de opções <strong>(⋮)</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-white">
                      Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
                    </h6>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Confirme a instalação. O ícone oficial do <strong>Mãos em Obra</strong> aparecerá junto aos seus outros apps.
                    </p>
                  </div>
                </div>
              </div>

              {isInstallable && (
                <div className="pt-2">
                  <button
                    onClick={handleInstallClick}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Disparar Instalação Agora no Android</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Guia iPhone / iPad (iOS Safari) */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <Apple className="w-6 h-6 text-slate-900 dark:text-white shrink-0" />
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  Instalação no <strong>iPhone ou iPad</strong> usando o navegador Safari padrão da Apple.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Toque no botão Compartilhar</span>
                      <Share2 className="w-3.5 h-3.5 text-blue-500 inline" />
                    </h6>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Na barra inferior do Safari no iPhone (ou superior no iPad), toque no ícone de <strong>Compartilhar</strong> (o quadrado com uma seta para cima).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Role para baixo e selecione "Adicionar à Tela de Início"</span>
                      <PlusSquare className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 inline" />
                    </h6>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Procure a opção <strong>"Adicionar à Tela de Início"</strong> (Add to Home Screen).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-white">Toque em "Adicionar"</h6>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Pronto! O ícone dourado do Mãos em Obra será adicionado diretamente à tela de aplicativos do seu iPhone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Google Play Store / Empacotamento */}
          {activeTab === 'playstore' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    100% Apto para o Google Play Console
                  </h5>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    O aplicativo atende a todos os critérios de Trusted Web Activity (TWA) e PWA exigidos pelo Google Play.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <h6 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Arquivos e Recursos Prontos:
                </h6>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Manifesto PWA Oficial configurado em <code>/manifest.json</code></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ícones de alta resolução: 192x192, 512x512 e Maskable para Android</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Service Worker ativo em <code>/sw.js</code> com suporte a cache offline</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Pronto para empacotamento em <strong>.AAB (Android App Bundle)</strong> via Bubblewrap CLI ou PWABuilder</span>
                  </li>
                </ul>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                  <a
                    href="/manifest.json"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold transition text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver manifest.json</span>
                  </a>

                  <a
                    href="https://www.pwabuilder.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-400 transition text-xs"
                  >
                    <span>Gerar APK / .AAB no PWABuilder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Versão Oficial Segura • TLS 1.3 Criptografado</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
