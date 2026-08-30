import React, { useState } from 'react';
import { 
  Calculator, 
  Bot, 
  Send, 
  Layers, 
  Sparkles, 
  Building2, 
  Paintbrush, 
  Grid, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Copy, 
  Check, 
  HelpCircle,
  Hammer
} from 'lucide-react';
import type { Project } from '../types';

interface CalculatorAndAIViewProps {
  project: Project;
}

type CalcType = 'concrete' | 'masonry' | 'tiles' | 'paint';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const CalculatorAndAIView: React.FC<CalculatorAndAIViewProps> = ({ project }) => {
  const [activeSubTab, setActiveSubTab] = useState<'calculators' | 'ai_chat'>('calculators');
  const [activeCalc, setActiveCalc] = useState<CalcType>('concrete');

  // Concrete state
  const [concreteLength, setConcreteLength] = useState<number>(5);
  const [concreteWidth, setConcreteWidth] = useState<number>(4);
  const [concreteThickness, setConcreteThickness] = useState<number>(0.10); // 10cm
  const [concreteMixType, setConcreteMixType] = useState<'1:2:3' | '1:2.5:3.5' | '1:3_contrapiso'>('1:2:3');

  // Masonry state
  const [masonryLength, setMasonryLength] = useState<number>(10);
  const [masonryHeight, setMasonryHeight] = useState<number>(2.8);
  const [masonryOpenings, setMasonryOpenings] = useState<number>(3.5); // doors/windows m²
  const [masonryBlockType, setMasonryBlockType] = useState<'baiano8' | 'baiano6' | 'bloco_concreto14' | 'tijolo_comum'>('baiano8');
  const [masonryLoss, setMasonryLoss] = useState<number>(10);

  // Tiles state
  const [tileArea, setTileArea] = useState<number>(35);
  const [tileBoxYield, setTileBoxYield] = useState<number>(2.16); // m² per box
  const [tileLoss, setTileLoss] = useState<number>(10); // 10%
  const [mortarType, setMortarType] = useState<'AC-I' | 'AC-II' | 'AC-III'>('AC-II');

  // Paint state
  const [paintArea, setPaintArea] = useState<number>(120);
  const [paintCoats, setPaintCoats] = useState<number>(2);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o **Mestre IA**, seu consultor técnico em engenharia civil e gestão de obras para o projeto **${project.title}**.\n\nPosso calcular materiais específicos (lajes, drywall, impermeabilização), orientar sobre normas da ABNT, sugerir traços de argamassa ou ajudar a solucionar imprevistos no canteiro. Como posso ajudar hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Concrete calculation logic
  const concreteVolume = Number((concreteLength * concreteWidth * concreteThickness).toFixed(2));
  let cementBags = 0;
  let sandM3 = 0;
  let gravelM3 = 0;
  let waterLiters = 0;

  if (concreteMixType === '1:2:3') {
    // Structural ~25 MPa: ~7 bags/m³
    cementBags = Math.ceil(concreteVolume * 7.5);
    sandM3 = Number((concreteVolume * 0.58).toFixed(2));
    gravelM3 = Number((concreteVolume * 0.85).toFixed(2));
    waterLiters = Math.round(concreteVolume * 180);
  } else if (concreteMixType === '1:2.5:3.5') {
    // Calçadas/Pisos ~20 MPa: ~6.5 bags/m³
    cementBags = Math.ceil(concreteVolume * 6.5);
    sandM3 = Number((concreteVolume * 0.65).toFixed(2));
    gravelM3 = Number((concreteVolume * 0.88).toFixed(2));
    waterLiters = Math.round(concreteVolume * 170);
  } else {
    // Contrapiso 1:3: ~8 bags/m³
    cementBags = Math.ceil(concreteVolume * 8.5);
    sandM3 = Number((concreteVolume * 0.95).toFixed(2));
    gravelM3 = 0;
    waterLiters = Math.round(concreteVolume * 210);
  }

  // Masonry calculation logic
  const netWallArea = Math.max(0, Number(((masonryLength * masonryHeight) - masonryOpenings).toFixed(2)));
  let blocksPerM2 = 25; // default baiano 8 furos
  if (masonryBlockType === 'baiano6') blocksPerM2 = 33;
  if (masonryBlockType === 'bloco_concreto14') blocksPerM2 = 12.5;
  if (masonryBlockType === 'tijolo_comum') blocksPerM2 = 80;

  const totalBlocks = Math.ceil((netWallArea * blocksPerM2) * (1 + masonryLoss / 100));
  const masonryMortarBags = Math.ceil(netWallArea * 0.35); // bags of ready mix or cement equivalent
  const masonrySandM3 = Number((netWallArea * 0.025).toFixed(2));

  // Tiles calculation logic
  const totalTileM2WithLoss = Number((tileArea * (1 + tileLoss / 100)).toFixed(2));
  const totalTileBoxes = Math.ceil(totalTileM2WithLoss / (tileBoxYield || 1));
  const mortarBags20kg = Math.ceil((totalTileM2WithLoss * 5) / 20); // 5kg/m² average
  const groutKg = Math.ceil(totalTileM2WithLoss * 0.35); // 0.35kg/m² average

  // Paint calculation logic
  const paintTotalM2 = paintArea * paintCoats;
  const paintLiters = Number((paintTotalM2 / 10).toFixed(1)); // 10m²/L yield
  const paintCans18L = Math.floor(paintLiters / 18);
  const remainderLiters = paintLiters % 18;
  const paintGallons3_6L = Math.ceil(remainderLiters / 3.6);

  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || chatInput;
    if (!text.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: chatMessages.map(m => ({ role: m.role, content: m.content })),
          projectContext: {
            title: project.title,
            type: project.type,
            budget: project.budgetTotal,
          },
        }),
      });

      if (!response.ok) throw new Error('Erro ao obter resposta da IA');
      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Desculpe, tive um problema ao consultar o Mestre IA: ${err.message}. Verifique a conexão com a internet.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const QUICK_PROMPTS = [
    'Qual o traço correto para reboco externo impermeável?',
    'Como calcular a quantidade de vigas e laje treliçada H12?',
    'Como evitar e tratar trincas e fissuras na alvenaria?',
    'Quais as distâncias mínimas para tomadas e pontos hidráulicos?',
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-500" />
            Calculadora de Materiais & Mestre IA
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cálculo paramétrico de insumos ABNT e consultoria técnica com Gemini 3.7 Flash
          </p>
        </div>

        {/* Subtab Switcher */}
        <div className="flex items-center p-1 bg-[#f8f9fa] dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('calculators')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'calculators'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            Calculadoras de Obra
          </button>
          <button
            onClick={() => setActiveSubTab('ai_chat')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'ai_chat'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Mestre IA (Engenheiro)
          </button>
        </div>
      </div>

      {activeSubTab === 'calculators' ? (
        <div className="space-y-6">
          
          {/* Calculator Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveCalc('concrete')}
              className={`p-4 rounded-3xl border text-left transition flex items-center gap-3 ${
                activeCalc === 'concrete'
                  ? 'bg-amber-500/10 border-amber-500 text-slate-950 dark:text-white font-extrabold shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-2xl ${activeCalc === 'concrete' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Concreto & Traço</div>
                <div className="text-[10px] text-slate-500">Lajes, vigas, contrapiso</div>
              </div>
            </button>

            <button
              onClick={() => setActiveCalc('masonry')}
              className={`p-4 rounded-3xl border text-left transition flex items-center gap-3 ${
                activeCalc === 'masonry'
                  ? 'bg-amber-500/10 border-amber-500 text-slate-950 dark:text-white font-extrabold shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-2xl ${activeCalc === 'masonry' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Alvenaria</div>
                <div className="text-[10px] text-slate-500">Tijolos & blocos</div>
              </div>
            </button>

            <button
              onClick={() => setActiveCalc('tiles')}
              className={`p-4 rounded-3xl border text-left transition flex items-center gap-3 ${
                activeCalc === 'tiles'
                  ? 'bg-amber-500/10 border-amber-500 text-slate-950 dark:text-white font-extrabold shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-2xl ${activeCalc === 'tiles' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Grid className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Pisos & Porcelanato</div>
                <div className="text-[10px] text-slate-500">Caixas, argamassa, rejunte</div>
              </div>
            </button>

            <button
              onClick={() => setActiveCalc('paint')}
              className={`p-4 rounded-3xl border text-left transition flex items-center gap-3 ${
                activeCalc === 'paint'
                  ? 'bg-amber-500/10 border-amber-500 text-slate-950 dark:text-white font-extrabold shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-2xl ${activeCalc === 'paint' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Paintbrush className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Tintas & Pintura</div>
                <div className="text-[10px] text-slate-500">Latas 18L e galões 3.6L</div>
              </div>
            </button>
          </div>

          {/* Calculator Body - 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Input Column */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              
              {/* CONCRETE CALCULATOR */}
              {activeCalc === 'concrete' && (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Dimensões da Peça / Volume de Concreto
                    </h3>
                    <p className="text-xs text-slate-500">Informe as medidas em metros</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Comprimento (m)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={concreteLength}
                        onChange={(e) => setConcreteLength(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Largura (m)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={concreteWidth}
                        onChange={(e) => setConcreteWidth(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Espessura (m)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={concreteThickness}
                        onChange={(e) => setConcreteThickness(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Finalidade / Traço de Concreto
                    </label>
                    <select
                      value={concreteMixType}
                      onChange={(e) => setConcreteMixType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="1:2:3">1:2:3 Estrutural (~25 MPa - Lajes, vigas, pilares)</option>
                      <option value="1:2.5:3.5">1:2.5:3.5 (~20 MPa - Sapatas, calçadas, pisos)</option>
                      <option value="1:3_contrapiso">1:3 Argamassa de Contrapiso</option>
                    </select>
                  </div>
                </>
              )}

              {/* MASONRY CALCULATOR */}
              {activeCalc === 'masonry' && (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Medidas das Paredes
                    </h3>
                    <p className="text-xs text-slate-500">Informe dimensões lineares e aberturas</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Comprimento Total (m)
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={masonryLength}
                        onChange={(e) => setMasonryLength(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Altura / Pé Direito (m)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={masonryHeight}
                        onChange={(e) => setMasonryHeight(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Desconto Portas/Janelas (m²)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={masonryOpenings}
                        onChange={(e) => setMasonryOpenings(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Margem de Quebra/Perda (%)
                      </label>
                      <select
                        value={masonryLoss}
                        onChange={(e) => setMasonryLoss(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        <option value={5}>5% (Corte preciso)</option>
                        <option value={10}>10% (Recomendado)</option>
                        <option value={15}>15% (Muitos recortes)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Tipo de Bloco / Tijolo
                    </label>
                    <select
                      value={masonryBlockType}
                      onChange={(e) => setMasonryBlockType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="baiano8">Bloco Baiano 8 furos (9x19x19 cm) - ~25 un/m²</option>
                      <option value="baiano6">Bloco Baiano 6 furos (9x14x19 cm) - ~33 un/m²</option>
                      <option value="bloco_concreto14">Bloco Concreto Estrutural (14x19x39 cm) - ~12.5 un/m²</option>
                      <option value="tijolo_comum">Tijolo Maciço Comum (5x9x19 cm) - ~80 un/m²</option>
                    </select>
                  </div>
                </>
              )}

              {/* TILES CALCULATOR */}
              {activeCalc === 'tiles' && (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Área a Revestir & Especificações
                    </h3>
                    <p className="text-xs text-slate-500">Pisos cerâmicos e porcelanatos</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Área do Ambiente (m²)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tileArea}
                        onChange={(e) => setTileArea(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Rendimento p/ Caixa (m²)
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.05"
                        value={tileBoxYield}
                        onChange={(e) => setTileBoxYield(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Margem de Recortes (%)
                      </label>
                      <select
                        value={tileLoss}
                        onChange={(e) => setTileLoss(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        <option value={10}>10% (Assentamento Reto)</option>
                        <option value={15}>15% (Diagonal / Grandes Formatos)</option>
                        <option value={20}>20% (Espaços irregulares)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Tipo de Argamassa
                      </label>
                      <select
                        value={mortarType}
                        onChange={(e) => setMortarType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        <option value="AC-I">AC-I (Interior comum)</option>
                        <option value="AC-II">AC-II (Interiores & Exteriores)</option>
                        <option value="AC-III">AC-III (Porcelanatos & Fachadas)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* PAINT CALCULATOR */}
              {activeCalc === 'paint' && (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Área de Pintura
                    </h3>
                    <p className="text-xs text-slate-500">Paredes e tetos</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Área Total a Pintar (m²)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="5"
                        value={paintArea}
                        onChange={(e) => setPaintArea(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Número de Demãos
                      </label>
                      <select
                        value={paintCoats}
                        onChange={(e) => setPaintCoats(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                      >
                        <option value={1}>1 Demão (Retoque)</option>
                        <option value={2}>2 Demãos (Padrão)</option>
                        <option value={3}>3 Demãos (Superfície nova / Cores fortes)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Output Summary Column */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white border border-slate-700/80 shadow-sm flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                      Resultado do Quantitativo
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Norma ABNT</span>
                </div>

                {/* CONCRETE OUTPUT */}
                {activeCalc === 'concrete' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-xs text-slate-400 block">Volume Total Calculado:</span>
                      <span className="text-2xl font-black text-white">{concreteVolume} m³</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Sacos de Cimento 50kg:</span>
                        <span className="text-lg font-black text-amber-400">{cementBags} sacos</span>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Areia Média Lavada:</span>
                        <span className="text-lg font-black text-white">{sandM3} m³</span>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Brita 1:</span>
                        <span className="text-lg font-black text-white">{gravelM3} m³</span>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Água Aproximada:</span>
                        <span className="text-lg font-black text-sky-400">{waterLiters} Litros</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MASONRY OUTPUT */}
                {activeCalc === 'masonry' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-xs text-slate-400 block">Área Líquida de Parede:</span>
                      <span className="text-2xl font-black text-white">{netWallArea} m²</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Total de Blocos/Tijolos:</span>
                        <span className="text-lg font-black text-amber-400">{totalBlocks} unidades</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">com {masonryLoss}% de perda</span>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Argamassa Assentamento:</span>
                        <span className="text-lg font-black text-white">{masonryMortarBags} sacos 20kg</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TILES OUTPUT */}
                {activeCalc === 'tiles' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-xs text-slate-400 block">Total com {tileLoss}% de Margem:</span>
                      <span className="text-2xl font-black text-white">{totalTileM2WithLoss} m²</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Caixas:</span>
                        <span className="text-base font-black text-amber-400">{totalTileBoxes} caixas</span>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Argamassa {mortarType}:</span>
                        <span className="text-base font-black text-white">{mortarBags20kg} sacos (20kg)</span>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Rejunte:</span>
                        <span className="text-base font-black text-white">{groutKg} kg</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAINT OUTPUT */}
                {activeCalc === 'paint' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-xs text-slate-400 block">Litros Totais ({paintCoats} demãos):</span>
                      <span className="text-2xl font-black text-white">{paintLiters} Litros</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Latas Grandes (18L):</span>
                        <span className="text-lg font-black text-amber-400">{paintCans18L} latas</span>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                        <span className="text-slate-400 block">Galões Pequenos (3.6L):</span>
                        <span className="text-lg font-black text-white">{paintGallons3_6L} galões</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Dúvidas sobre outros materiais?</span>
                <button
                  onClick={() => setActiveSubTab('ai_chat')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Bot className="w-3.5 h-3.5" /> Perguntar ao Mestre IA
                </button>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* Mestre IA Chatbot Tab */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
          
          {/* Chat Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Mestre IA • Consultor de Obras
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Respostas baseadas em boas práticas de engenharia e normas ABNT
                </p>
              </div>
            </div>

            <button
              onClick={() => setChatMessages([chatMessages[0]])}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 text-xs flex items-center gap-1"
              title="Limpar conversa"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copiado!' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-3 items-center text-xs text-slate-500">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center animate-spin">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>Mestre IA está calculando e redigindo a resposta técnica...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 overflow-x-auto flex gap-2 no-scrollbar">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isChatLoading}
                className="px-3 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap transition"
              >
                💡 {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ex: Como dimensionar o disjuntor para um chuveiro de 7500W?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};
