import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Phone, 
  MessageCircle, 
  Star, 
  Store, 
  HardHat, 
  Briefcase, 
  Trash2, 
  Edit3, 
  Search, 
  Filter,
  X
} from 'lucide-react';
import type { TeamMember } from '../types';

interface TeamSuppliersViewProps {
  team: TeamMember[];
  onSaveMember: (member: TeamMember) => void;
  onDeleteMember: (memberId: string) => void;
  initialCategoryFilter?: 'all' | 'labor' | 'supplier' | 'technical';
}

export const TeamSuppliersView: React.FC<TeamSuppliersViewProps> = ({
  team,
  onSaveMember,
  onDeleteMember,
  initialCategoryFilter = 'all',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'labor' | 'supplier' | 'technical'>(initialCategoryFilter);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync with initialCategoryFilter when passed
  React.useEffect(() => {
    if (initialCategoryFilter) {
      setCategoryFilter(initialCategoryFilter);
    }
  }, [initialCategoryFilter]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Pedreiro');
  const [category, setCategory] = useState<'labor' | 'supplier' | 'technical'>('labor');
  const [phone, setPhone] = useState('');
  const [dailyRate, setDailyRate] = useState<number | undefined>(undefined);
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setRole('Pedreiro');
    setCategory('labor');
    setPhone('');
    setDailyRate(undefined);
    setRating(5);
    setNotes('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleStartEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setName(member.name);
    setRole(member.role);
    setCategory(
      member.role.toLowerCase().includes('loja') || member.role.toLowerCase().includes('madeireira') || member.role.toLowerCase().includes('depósito')
        ? 'supplier'
        : member.role.toLowerCase().includes('engenheiro') || member.role.toLowerCase().includes('arquiteto')
        ? 'technical'
        : 'labor'
    );
    setPhone(member.phone || '');
    setDailyRate(member.dailyRate);
    setRating(member.rating || 5);
    setNotes(member.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newMember: TeamMember = {
      id: editingId || `team-${Date.now()}`,
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim(),
      dailyRate: dailyRate ? Number(dailyRate) : undefined,
      rating,
      notes: notes.trim(),
    };

    onSaveMember(newMember);
    resetForm();
  };

  const filteredTeam = team.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const isSupplier = m.role.toLowerCase().includes('loja') || m.role.toLowerCase().includes('madeireira') || m.role.toLowerCase().includes('depósito') || m.role.toLowerCase().includes('fornecedor');
    const isTech = m.role.toLowerCase().includes('engenheiro') || m.role.toLowerCase().includes('arquiteto') || m.role.toLowerCase().includes('topógrafo');
    const isLabor = !isSupplier && !isTech;

    if (categoryFilter === 'supplier' && !isSupplier) return false;
    if (categoryFilter === 'technical' && !isTech) return false;
    if (categoryFilter === 'labor' && !isLabor) return false;

    return matchesSearch;
  });

  const formatWhatsAppLink = (phoneNumber?: string) => {
    if (!phoneNumber) return null;
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    return `https://wa.me/${fullNumber}`;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-500" />
              Equipe, Mão de Obra & Fornecedores
            </h2>
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
              Inscrição Gratuita
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Agenda de mestres, pedreiros, encanadores, lojas de materiais e contatos com WhatsApp • <em>Inscrição de profissionais 100% gratuita na fase de lançamento</em>
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Cadastrar Contato
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, função ou loja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
              categoryFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Todos ({team.length})
          </button>
          <button
            onClick={() => setCategoryFilter('labor')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
              categoryFilter === 'labor'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Mão de Obra
          </button>
          <button
            onClick={() => setCategoryFilter('supplier')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
              categoryFilter === 'supplier'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Lojas & Materiais
          </button>
          <button
            onClick={() => setCategoryFilter('technical')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
              categoryFilter === 'technical'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Técnicos & Projetistas
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeam.map((member) => {
          const waLink = formatWhatsAppLink(member.phone);
          const isSupplier = member.role.toLowerCase().includes('loja') || member.role.toLowerCase().includes('depósito') || member.role.toLowerCase().includes('madeireira');

          return (
            <div
              key={member.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-400/80 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${
                      isSupplier 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {isSupplier ? <Store className="w-5 h-5" /> : <HardHat className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {member.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span className="text-xs font-bold">{member.rating || 5}.0</span>
                  </div>
                </div>

                {member.dailyRate && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs mb-3 flex items-center justify-between">
                    <span className="text-slate-500">Diária / Acordo:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      R$ {member.dailyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {member.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {member.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {member.phone ? (
                  <div className="flex items-center gap-2 flex-1">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    )}
                    <a
                      href={`tel:${member.phone.replace(/\D/g, '')}`}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition"
                      title="Ligar"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Sem telefone cadastrado</span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(member)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir ${member.name} dos contatos?`)) {
                        onDeleteMember(member.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar Contato' : 'Cadastrar Prestador / Fornecedor'}
              </h3>
              <button onClick={resetForm}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome do Profissional ou Loja *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Mestre de Obras, Telhanorte..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Função / Especialidade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pedreiro Azulejista, Loja Tintas..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: (11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Valor Diária (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="Ex: 220"
                    value={dailyRate || ''}
                    onChange={(e) => setDailyRate(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Avaliação (1 a 5 estrelas)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (Excelente)</option>
                    <option value={4}>⭐⭐⭐⭐ (Muito Bom)</option>
                    <option value={3}>⭐⭐⭐ (Regular)</option>
                    <option value={2}>⭐⭐ (Fraco)</option>
                    <option value={1}>⭐ (Não Recomendo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                  Anotações / Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Caprichoso em acabamentos de porcelanato fino, pontual..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
