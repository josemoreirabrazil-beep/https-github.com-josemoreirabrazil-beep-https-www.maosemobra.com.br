import React, { useState } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2, 
  HardHat, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  ArrowUpRight, 
  Plus, 
  UserCheck, 
  Star, 
  ShieldCheck, 
  Send, 
  X, 
  User, 
  Check, 
  Award,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { 
  ConstructionOpportunity, 
  OpportunityType, 
  ServiceProviderProfile, 
  ProviderAvailability,
  ProviderReview
} from '../types';
import { 
  loadOpportunities, 
  saveOpportunities, 
  loadServiceProviders, 
  saveServiceProviders 
} from '../services/storage';

export const OpportunitiesView: React.FC = () => {
  // Main Panel Mode: Opportunities vs Providers
  const [activeMode, setActiveMode] = useState<'opportunities' | 'providers'>('opportunities');

  // Stored state
  const [opportunities, setOpportunities] = useState<ConstructionOpportunity[]>(() => loadOpportunities());
  const [providers, setProviders] = useState<ServiceProviderProfile[]>(() => loadServiceProviders());

  // Search & Filters for Opportunities
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [urgencyFilter, setUrgencyFilter] = useState('Todas');

  // Search & Filters for Providers
  const [providerSearch, setProviderSearch] = useState('');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState('Todas');
  const [providerAvailabilityFilter, setProviderAvailabilityFilter] = useState('Todas');
  const [providerSortBy, setProviderSortBy] = useState<'ranking' | 'rating' | 'reviews' | 'experience'>('ranking');

  // Modals
  const [selectedOpp, setSelectedOpp] = useState<ConstructionOpportunity | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProviderProfile | null>(null);
  const [providerDetailTab, setProviderDetailTab] = useState<'about' | 'reviews'>('about');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerTab, setRegisterTab] = useState<'solicitante' | 'prestador'>('solicitante');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [providerToReview, setProviderToReview] = useState<ServiceProviderProfile | null>(null);
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewHoverRating, setNewReviewHoverRating] = useState<number>(0);
  const [newQualityRating, setNewQualityRating] = useState<number>(5);
  const [newPunctualityRating, setNewPunctualityRating] = useState<number>(5);
  const [newCostBenefitRating, setNewCostBenefitRating] = useState<number>(5);
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewerRole, setNewReviewerRole] = useState<'Solicitante' | 'Contratante' | 'Engenheiro' | 'Proprietário'>('Proprietário');
  const [newProjectName, setNewProjectName] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRecommend, setNewReviewRecommend] = useState<boolean>(true);

  // Form State: Solicitante (New Opportunity)
  const [oppTitle, setOppTitle] = useState('');
  const [oppCategory, setOppCategory] = useState('Alvenaria');
  const [oppType, setOppType] = useState<OpportunityType>('Obra Residencial');
  const [oppBudget, setOppBudget] = useState('');
  const [oppCity, setOppCity] = useState('');
  const [oppState, setOppState] = useState('SP');
  const [oppLocation, setOppLocation] = useState('');
  const [oppCompanyName, setOppCompanyName] = useState('');
  const [oppContactName, setOppContactName] = useState('');
  const [oppContactPhone, setOppContactPhone] = useState('');
  const [oppContactEmail, setOppContactEmail] = useState('');
  const [oppCreatorRole, setOppCreatorRole] = useState<'Solicitante' | 'Contratante' | 'Empresa'>('Solicitante');
  const [oppUrgency, setOppUrgency] = useState<'Normal' | 'Alta' | 'Crítica'>('Alta');
  const [oppDeadline, setOppDeadline] = useState('');
  const [oppDescription, setOppDescription] = useState('');
  const [oppRequirementsStr, setOppRequirementsStr] = useState('');

  // Form State: Prestador (New Service Provider Profile)
  const [provName, setProvName] = useState('');
  const [provCompanyName, setProvCompanyName] = useState('');
  const [provCategory, setProvCategory] = useState('Mestre de Obras / Alvenaria');
  const [provSpecialtiesStr, setProvSpecialtiesStr] = useState('');
  const [provExperienceYears, setProvExperienceYears] = useState<number>(5);
  const [provCity, setProvCity] = useState('');
  const [provState, setProvState] = useState('SP');
  const [provPhone, setProvPhone] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provDailyRate, setProvDailyRate] = useState('');
  const [provAvailability, setProvAvailability] = useState<ProviderAvailability>('Disponível Imediato');
  const [provDocumentType, setProvDocumentType] = useState<'MEI' | 'CNPJ' | 'CPF'>('MEI');
  const [provPixKey, setProvPixKey] = useState('');
  const [provBio, setProvBio] = useState('');

  const oppCategories = [
    'Todas', 
    'Alvenaria', 
    'Elétrica', 
    'Pintura', 
    'Hidráulica', 
    'Gesso / Drywall', 
    'Climatização', 
    'Serralheria', 
    'Marcenaria', 
    'Engenharia / Laudos'
  ];

  const oppTypes = [
    'Todos', 
    'Obra Residencial', 
    'Reforma', 
    'Projeto', 
    'Manutenção', 
    'Consultoria', 
    'Subempreitada'
  ];

  const providerCategories = [
    'Todas', 
    'Mestre de Obras / Alvenaria', 
    'Eletricista', 
    'Pintor', 
    'Hidráulica', 
    'Gesso / Drywall', 
    'Engenheiro Civil', 
    'Serralheiro', 
    'Marceneiro', 
    'Arquiteto'
  ];

  // Helper for WhatsApp URL
  const formatWhatsappLink = (rawPhone: string, text: string) => {
    const cleanNumber = rawPhone.replace(/\D/g, '');
    const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
  };

  // Helper to render star rating
  const renderStarRating = (rating: number, maxStars = 5) => {
    const stars = [];
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-200 dark:fill-slate-800 text-slate-300 dark:text-slate-700'
          }`}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  // Filtered Opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      opp.title.toLowerCase().includes(term) || 
      opp.description.toLowerCase().includes(term) ||
      opp.category.toLowerCase().includes(term) ||
      opp.city.toLowerCase().includes(term) ||
      opp.companyName.toLowerCase().includes(term);

    const matchesCategory = categoryFilter === 'Todas' || opp.category.toLowerCase().includes(categoryFilter.toLowerCase());
    const matchesType = typeFilter === 'Todos' || opp.type === typeFilter;
    const matchesUrgency = urgencyFilter === 'Todas' || opp.urgency === urgencyFilter;
    return matchesSearch && matchesCategory && matchesType && matchesUrgency;
  });

  // Filtered & Sorted Providers
  const filteredProviders = providers
    .filter(prov => {
      const term = providerSearch.toLowerCase();
      const matchesSearch = 
        prov.name.toLowerCase().includes(term) ||
        (prov.companyOrTradeName && prov.companyOrTradeName.toLowerCase().includes(term)) ||
        prov.category.toLowerCase().includes(term) ||
        prov.city.toLowerCase().includes(term) ||
        prov.specialties.some(s => s.toLowerCase().includes(term));

      const matchesCategory = providerCategoryFilter === 'Todas' || prov.category.toLowerCase().includes(providerCategoryFilter.toLowerCase());
      const matchesAvailability = providerAvailabilityFilter === 'Todas' || prov.availability === providerAvailabilityFilter;
      return matchesSearch && matchesCategory && matchesAvailability;
    })
    .sort((a, b) => {
      if (providerSortBy === 'ranking') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      }
      if (providerSortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (providerSortBy === 'reviews') {
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      }
      if (providerSortBy === 'experience') {
        return b.experienceYears - a.experienceYears;
      }
      return 0;
    });

  // Top 3 Podium for Ranking Leaderboard
  const podiumProviders = [...providers]
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    })
    .slice(0, 3);

  // Open Review Modal
  const handleOpenReviewModal = (prov: ServiceProviderProfile) => {
    setProviderToReview(prov);
    setNewReviewRating(5);
    setNewReviewHoverRating(0);
    setNewQualityRating(5);
    setNewPunctualityRating(5);
    setNewCostBenefitRating(5);
    setNewReviewerName('');
    setNewReviewerRole('Proprietário');
    setNewProjectName('');
    setNewReviewComment('');
    setNewReviewRecommend(true);
    setIsReviewModalOpen(true);
  };

  // Submit Review Handler
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerToReview) return;
    if (!newReviewerName.trim()) {
      alert('Por favor, informe seu nome como avaliador.');
      return;
    }

    const reviewId = `rev-${Date.now()}`;
    const newReview: ProviderReview = {
      id: reviewId,
      providerId: providerToReview.id,
      reviewerName: newReviewerName.trim(),
      reviewerRole: newReviewerRole,
      projectName: newProjectName.trim() || 'Serviço de Reforma & Construção',
      rating: newReviewRating,
      qualityRating: newQualityRating,
      punctualityRating: newPunctualityRating,
      costBenefitRating: newCostBenefitRating,
      comment: newReviewComment.trim() || 'Profissional pontual, executou o serviço com excelente qualidade técnica e cumpriu o combinado.',
      date: new Date().toISOString().split('T')[0],
      recommend: newReviewRecommend
    };

    const existingReviews = providerToReview.reviews || [];
    const updatedReviews = [newReview, ...existingReviews];
    const newReviewsCount = updatedReviews.length;
    const newAverage = Number((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / newReviewsCount).toFixed(1));

    const updatedProviders = providers.map(p => {
      if (p.id === providerToReview.id) {
        return {
          ...p,
          reviews: updatedReviews,
          reviewsCount: newReviewsCount,
          rating: newAverage
        };
      }
      return p;
    });

    // Re-rank providers
    updatedProviders.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });

    const finalProviders = updatedProviders.map((p, idx) => {
      let badge: ServiceProviderProfile['rankingBadge'] = undefined;
      if (idx === 0) badge = 'Top 1 Ouro';
      else if (idx === 1) badge = 'Top 2 Prata';
      else if (idx === 2) badge = 'Top 3 Bronze';
      else if (p.rating >= 4.8) badge = 'Destaque 5 Estrelas';
      return { ...p, rankingBadge: badge };
    });

    setProviders(finalProviders);
    saveServiceProviders(finalProviders);

    // If modal is viewing this provider, update selectedProvider too
    if (selectedProvider && selectedProvider.id === providerToReview.id) {
      const match = finalProviders.find(p => p.id === providerToReview.id);
      if (match) setSelectedProvider(match);
    }

    setIsReviewModalOpen(false);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    setNotificationMsg(`Avaliação registrada com sucesso para ${providerToReview.name}! A nota média foi atualizada para ${newAverage} ★.`);
    setTimeout(() => setNotificationMsg(null), 6000);
  };

  // Submit Opportunity (Solicitante)
  const handleSubmitOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle.trim() || !oppContactPhone.trim() || !oppCity.trim()) {
      alert('Por favor, preencha os campos obrigatórios (Título, Cidade e Telefone/WhatsApp).');
      return;
    }

    const reqList = oppRequirementsStr
      .split(/[,;\n]/)
      .map(r => r.trim())
      .filter(Boolean);

    const newOpp: ConstructionOpportunity = {
      id: `opp-${Date.now()}`,
      title: oppTitle.trim(),
      category: oppCategory,
      type: oppType,
      budget: oppBudget.trim() || 'A combinar',
      city: oppCity.trim(),
      state: oppState.trim() || 'SP',
      location: oppLocation.trim() || `${oppCity.trim()} - ${oppState.trim()}`,
      companyName: oppCompanyName.trim() || oppContactName.trim() || 'Solicitante Privado',
      contactName: oppContactName.trim() || 'Responsável pela Obra',
      contactPhone: oppContactPhone.trim(),
      contactEmail: oppContactEmail.trim() || undefined,
      creatorRole: oppCreatorRole,
      urgency: oppUrgency,
      deadline: oppDeadline || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      description: oppDescription.trim() || 'Demanda de obra registrada para contratação de mão de obra especializada.',
      requirements: reqList.length > 0 ? reqList : ['Ferramental próprio', 'Experiência comprovada', 'Pontualidade'],
      postedAt: new Date().toISOString(),
      status: 'Aberta'
    };

    const updated = [newOpp, ...opportunities];
    setOpportunities(updated);
    saveOpportunities(updated);
    setIsRegisterModalOpen(false);
    setActiveMode('opportunities');

    setOppTitle('');
    setOppBudget('');
    setOppCity('');
    setOppLocation('');
    setOppCompanyName('');
    setOppContactName('');
    setOppContactPhone('');
    setOppContactEmail('');
    setOppDescription('');
    setOppRequirementsStr('');

    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    setNotificationMsg('Oportunidade de obra publicada com sucesso! Ela já está disponível para os prestadores.');
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Submit Provider (Prestador de Serviços)
  const handleSubmitProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provPhone.trim() || !provCity.trim()) {
      alert('Por favor, preencha os campos obrigatórios (Nome, Cidade e Telefone/WhatsApp).');
      return;
    }

    const specList = provSpecialtiesStr
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    const cleanWhatsapp = provPhone.replace(/\D/g, '');

    const newProvider: ServiceProviderProfile = {
      id: `prov-${Date.now()}`,
      name: provName.trim(),
      companyOrTradeName: provCompanyName.trim() || undefined,
      category: provCategory,
      specialties: specList.length > 0 ? specList : ['Execução de Serviços', 'Pontualidade'],
      experienceYears: Number(provExperienceYears) || 3,
      city: provCity.trim(),
      state: provState.trim() || 'SP',
      phone: provPhone.trim(),
      whatsapp: cleanWhatsapp,
      email: provEmail.trim() || undefined,
      dailyRate: provDailyRate.trim() || 'A combinar',
      availability: provAvailability,
      documentType: provDocumentType,
      pixKey: provPixKey.trim() || undefined,
      bio: provBio.trim() || 'Profissional capacitado pronto para atender projetos residenciais e comerciais com garantia de qualidade.',
      rating: 5.0,
      reviewsCount: 1,
      rankingBadge: 'Destaque 5 Estrelas',
      registeredAt: new Date().toISOString().split('T')[0],
      verified: true,
      reviews: [
        {
          id: `rev-initial-${Date.now()}`,
          providerId: `prov-${Date.now()}`,
          reviewerName: 'Mãos em Obra Verificação',
          reviewerRole: 'Engenheiro',
          projectName: 'Cadastro Verificado na Plataforma',
          rating: 5,
          qualityRating: 5,
          punctualityRating: 5,
          costBenefitRating: 5,
          comment: 'Perfil profissional verificado e apto a prestar serviços na construção civil.',
          date: new Date().toISOString().split('T')[0],
          recommend: true
        }
      ]
    };

    const updated = [newProvider, ...providers];
    setProviders(updated);
    saveServiceProviders(updated);
    setIsRegisterModalOpen(false);
    setActiveMode('providers');

    setProvName('');
    setProvCompanyName('');
    setProvSpecialtiesStr('');
    setProvCity('');
    setProvPhone('');
    setProvEmail('');
    setProvDailyRate('');
    setProvPixKey('');
    setProvBio('');

    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    setNotificationMsg('Perfil profissional cadastrado com sucesso! Já está visível no ranking com selo de verificação.');
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const ratingLabels: Record<number, string> = {
    1: '1 Estrela - Péssimo',
    2: '2 Estrelas - Regular',
    3: '3 Estrelas - Bom',
    4: '4 Estrelas - Muito Bom',
    5: '5 Estrelas - Excelente!'
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification Alert */}
      {notificationMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button 
            onClick={() => setNotificationMsg(null)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Banner with Dual Hub Information */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Ranking Oficial & Reputação Verificada
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Oportunidades & <span className="text-amber-400 italic">Ranking de Prestadores</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Consulte o ranking com as melhores notas, depoimentos e histórico de obras entregues. Solicitantes contratam os profissionais mais bem avaliados com transparência e segurança.
            </p>

            {/* Quick Action Button */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setRegisterTab('solicitante');
                  setIsRegisterModalOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Publicar Oportunidade (Solicitante)
              </button>

              <button
                onClick={() => {
                  setRegisterTab('prestador');
                  setIsRegisterModalOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shadow-md"
              >
                <UserCheck className="w-4 h-4 text-amber-400" />
                Cadastrar Perfil de Prestador
              </button>
            </div>
          </div>
          
          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-amber-400">{opportunities.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Oportunidades</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-emerald-400">{providers.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Prestadores</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-amber-300">
                {(providers.reduce((sum, p) => sum + p.rating, 0) / (providers.length || 1)).toFixed(1)} ★
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Média Geral</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-purple-400">
                {providers.reduce((sum, p) => sum + (p.reviewsCount || 0), 0)}+
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Avaliações Reais</div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs inside Hero */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveMode('opportunities')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeMode === 'opportunities'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Oportunidades de Obras ({opportunities.length})
            </button>
            <button
              onClick={() => setActiveMode('providers')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeMode === 'providers'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Ranking de Prestadores ({providers.length})
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Avaliações auditadas com selo de verificação Mãos em Obra</span>
          </div>
        </div>
      </div>

      {/* ===================== MODE 1: OPORTUNIDADES ===================== */}
      {activeMode === 'opportunities' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Filters */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Filtros de Vagas</h3>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('Todas');
                    setTypeFilter('Todos');
                    setUrgencyFilter('Todas');
                  }}
                  className="text-[10px] font-bold text-amber-500 hover:underline"
                >
                  Limpar
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Busca Rápida</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Santo André, Elétrica, Fachada..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Especialidade</label>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {oppCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          categoryFilter === cat
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tipo de Obra</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  >
                    {oppTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Urgência</label>
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  >
                    <option value="Todas">Todas as Urgências</option>
                    <option value="Crítica">Crítica / Imediato</option>
                    <option value="Alta">Alta</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Solicitante Banner Call to Action */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-slate-950 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black uppercase leading-tight">Precisa de Mão de Obra para sua Obra?</h4>
              <p className="text-[11px] font-medium opacity-90 leading-relaxed">
                Publique sua demanda gratuitamente e receba orçamentos de profissionais e empreiteiros avaliados.
              </p>
              <button 
                onClick={() => {
                  setRegisterTab('solicitante');
                  setIsRegisterModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-950 text-white text-[11px] font-black uppercase transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Cadastrar Minha Demanda
              </button>
            </div>
          </div>

          {/* Main Opportunities List */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-500" />
                Exibindo {filteredOpportunities.length} demandas abertas
              </h2>
              <button
                onClick={() => {
                  setRegisterTab('solicitante');
                  setIsRegisterModalOpen(true);
                }}
                className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Demanda
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map(opp => (
                  <div 
                    key={opp.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-xl transition-all group p-5 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row gap-5">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            opp.urgency === 'Crítica' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' :
                            opp.urgency === 'Alta' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                            'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                          }`}>
                            {opp.urgency}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                            {opp.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                            {opp.type}
                          </span>
                          {opp.creatorRole && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-medium">
                              {opp.creatorRole}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-snug">
                          {opp.title}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold truncate">{opp.companyName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{opp.location || opp.city}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="font-black text-slate-900 dark:text-white">{opp.budget || 'A combinar'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Início: {opp.deadline ? new Date(opp.deadline).toLocaleDateString('pt-BR') : 'Imediato'}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {opp.description}
                        </p>

                        {opp.requirements && opp.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {opp.requirements.slice(0, 3).map((req, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <Check className="w-2.5 h-2.5 text-emerald-500" />
                                {req}
                              </span>
                            ))}
                            {opp.requirements.length > 3 && (
                              <span className="text-[10px] text-slate-400 px-1 font-bold">
                                +{opp.requirements.length - 3} requisitos
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Action Block */}
                      <div className="flex flex-col justify-between sm:w-52 gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-5 shrink-0">
                        <div className="space-y-1 text-right hidden sm:block">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Publicado</div>
                          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(opp.postedAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <a
                            href={formatWhatsappLink(
                              opp.contactPhone,
                              `Olá ${opp.contactName}! Vi sua oportunidade de obra "${opp.title}" no aplicativo Mãos em Obra e gostaria de enviar minha proposta e orçamento.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp Direto
                          </a>

                          <button 
                            onClick={() => setSelectedOpp(opp)}
                            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-900 dark:text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                          >
                            Ver Detalhes
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Nenhuma oportunidade encontrada</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Tente alterar a categoria ou publique uma nova oportunidade para atrair prestadores!
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('Todas');
                      setTypeFilter('Todos');
                      setUrgencyFilter('Todas');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase shadow-md active:scale-95"
                  >
                    Ver Todas as Oportunidades
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODE 2: BANCO DE PRESTADORES COM RANKING & AVALIAÇÕES ===================== */}
      {activeMode === 'providers' && (
        <div className="space-y-6">
          {/* 🏆 PODIUM DE REPUTAÇÃO (TOP RANKING) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
                  <Trophy className="w-4 h-4" />
                  Hall da Fama • Construção Civil
                </div>
                <h3 className="text-xl sm:text-2xl font-black mt-1">Pódio dos Melhores Prestadores Avaliados</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Os profissionais com as maiores notas de qualidade, pontualidade e satisfação auditadas pelos solicitantes.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-400 font-bold">Ordenar Ranking:</span>
                <select
                  value={providerSortBy}
                  onChange={(e) => setProviderSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="ranking">🏆 Posição no Ranking</option>
                  <option value="rating">★ Maior Nota (Estrelas)</option>
                  <option value="reviews">💬 Mais Avaliados</option>
                  <option value="experience">⏳ Mais Experientes</option>
                </select>
              </div>
            </div>

            {/* The 3 Podium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {podiumProviders.map((prov, index) => {
                const medalColors = [
                  { bg: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/40', badge: 'bg-amber-500 text-slate-950', title: 'Top 1 Ouro', trophy: '🥇' },
                  { bg: 'from-slate-400/20 to-slate-500/5', border: 'border-slate-400/40', badge: 'bg-slate-300 text-slate-950', title: 'Top 2 Prata', trophy: '🥈' },
                  { bg: 'from-orange-600/20 to-orange-700/5', border: 'border-orange-500/40', badge: 'bg-amber-700 text-white', title: 'Top 3 Bronze', trophy: '🥉' }
                ][index];

                return (
                  <div
                    key={prov.id}
                    className={`relative rounded-2xl bg-gradient-to-b ${medalColors.bg} border ${medalColors.border} p-5 flex flex-col justify-between hover:scale-[1.01] transition-all group`}
                  >
                    <div className="space-y-3">
                      {/* Podium Rank Pill */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${medalColors.badge}`}>
                          <span>{medalColors.trophy}</span>
                          {medalColors.title}
                        </span>
                        <div className="flex items-center gap-1 text-amber-400 font-black text-sm bg-black/40 px-2 py-0.5 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{prov.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400">({prov.reviewsCount})</span>
                        </div>
                      </div>

                      {/* Provider Info */}
                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                          {prov.name}
                        </h4>
                        <p className="text-[11px] text-amber-400/90 font-bold">{prov.category}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {prov.city}, {prov.state} • {prov.experienceYears} anos de exp.
                        </p>
                      </div>

                      {/* Stars Visual */}
                      <div className="flex items-center gap-2 pt-1">
                        {renderStarRating(prov.rating)}
                        <span className="text-[10px] text-emerald-400 font-bold">100% Recomendado</span>
                      </div>

                      {/* Latest Review Snippet */}
                      {prov.reviews && prov.reviews.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-300 italic line-clamp-2">
                          "{prov.reviews[0].comment}"
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-4 border-t border-white/10 flex items-center gap-2 mt-3">
                      <button
                        onClick={() => {
                          setSelectedProvider(prov);
                          setProviderDetailTab('reviews');
                        }}
                        className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] uppercase transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                        Ver Reviews ({prov.reviewsCount})
                      </button>
                      <button
                        onClick={() => handleOpenReviewModal(prov)}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase transition-all shadow-sm"
                        title="Avaliar este profissional"
                      >
                        Avaliar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MAIN PROVIDERS GRID + FILTERS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Filters */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Filtros de Busca</h3>
                  </div>
                  <button
                    onClick={() => {
                      setProviderSearch('');
                      setProviderCategoryFilter('Todas');
                      setProviderAvailabilityFilter('Todas');
                      setProviderSortBy('ranking');
                    }}
                    className="text-[10px] font-bold text-amber-500 hover:underline"
                  >
                    Limpar
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Buscar por Nome / Cidade</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ex: Carlos, Eletricista, Santo André..."
                        value={providerSearch}
                        onChange={(e) => setProviderSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Especialidade Principal</label>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {providerCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setProviderCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            providerCategoryFilter === cat
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Disponibilidade</label>
                    <select
                      value={providerAvailabilityFilter}
                      onChange={(e) => setProviderAvailabilityFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                    >
                      <option value="Todas">Todas as Disponibilidades</option>
                      <option value="Disponível Imediato">Disponível Imediato</option>
                      <option value="Disponível em 15 dias">Disponível em 15 dias</option>
                      <option value="Agendamento Prévio">Agendamento Prévio</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Solicitante Review Call to Action */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-slate-950 shadow-lg space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <h4 className="text-sm font-black uppercase leading-tight">Já Contratou Algum Profissional?</h4>
                <p className="text-[11px] font-medium opacity-90 leading-relaxed">
                  Avalie a qualidade, pontualidade e custo-benefício. Sua opinião ajuda a valorizar bons mestres e orienta outros solicitantes.
                </p>
                <button 
                  onClick={() => {
                    if (providers[0]) handleOpenReviewModal(providers[0]);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-950 text-white text-[11px] font-black uppercase transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  Deixar uma Avaliação
                </button>
              </div>
            </div>

            {/* Providers Listing */}
            <div className="lg:col-span-9 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-500" />
                  Exibindo {filteredProviders.length} prestadores no ranking
                </h2>
                
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold">Classificação:</span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setProviderSortBy('ranking')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        providerSortBy === 'ranking' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Geral
                    </button>
                    <button
                      onClick={() => setProviderSortBy('rating')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        providerSortBy === 'rating' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Estrelas
                    </button>
                    <button
                      onClick={() => setProviderSortBy('reviews')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        providerSortBy === 'reviews' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Depoimentos
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProviders.length > 0 ? (
                  filteredProviders.map(prov => (
                    <div 
                      key={prov.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 hover:shadow-xl transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        {/* Top Header with Avatar & Rating */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-lg shrink-0">
                              {prov.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                  {prov.name}
                                </h3>
                                {prov.verified && (
                                  <span title="Profissional Verificado pelo Mãos em Obra">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                  </span>
                                )}
                              </div>
                              {prov.companyOrTradeName && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  {prov.companyOrTradeName}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Ranking Badge or Stars */}
                          <div className="flex flex-col items-end gap-1">
                            {prov.rankingBadge && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                prov.rankingBadge === 'Top 1 Ouro' ? 'bg-amber-500 text-slate-950 shadow-xs' :
                                prov.rankingBadge === 'Top 2 Prata' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' :
                                prov.rankingBadge === 'Top 3 Bronze' ? 'bg-amber-700 text-white' :
                                'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}>
                                {prov.rankingBadge}
                              </span>
                            )}
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{prov.rating.toFixed(1)}</span>
                              <span className="text-[10px] text-slate-400">({prov.reviewsCount})</span>
                            </div>
                          </div>
                        </div>

                        {/* Stars Graphic Display */}
                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-2">
                            {renderStarRating(prov.rating)}
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {prov.reviewsCount} {prov.reviewsCount === 1 ? 'avaliação' : 'avaliações'}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            100% recomendam
                          </span>
                        </div>

                        {/* Category & Availability Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                            {prov.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            prov.availability === 'Disponível Imediato'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}>
                            {prov.availability}
                          </span>
                          {prov.documentType && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold">
                              {prov.documentType}
                            </span>
                          )}
                        </div>

                        {/* City & Rate */}
                        <div className="grid grid-cols-2 gap-2 text-xs py-1">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{prov.city}, {prov.state}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-black text-slate-900 dark:text-white">{prov.dailyRate || 'A combinar'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>{prov.experienceYears} anos de exp.</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Membro Ativo</span>
                          </div>
                        </div>

                        {/* Bio */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {prov.bio}
                        </p>

                        {/* Recent review quote */}
                        {prov.reviews && prov.reviews.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-1">
                            💬 "{prov.reviews[0].comment}"
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        <a
                          href={formatWhatsappLink(
                            prov.phone,
                            `Olá ${prov.name}! Encontrei seu perfil no ranking do Mãos em Obra (${prov.rating} estrelas) e gostaria de solicitar um orçamento para minha obra. Você está disponível?`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Contratar no WhatsApp
                        </a>

                        <button
                          onClick={() => handleOpenReviewModal(prov)}
                          className="px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-black uppercase transition-colors flex items-center gap-1"
                          title="Avaliar este prestador"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          Avaliar
                        </button>

                        <button
                          onClick={() => {
                            setSelectedProvider(prov);
                            setProviderDetailTab('reviews');
                          }}
                          className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase transition-colors"
                          title="Ver Perfil & Todas as Avaliações"
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Nenhum prestador encontrado com esses filtros</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Tente ajustar a categoria, termo de busca ou cadastre um novo profissional na plataforma!
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setProviderSearch('');
                        setProviderCategoryFilter('Todas');
                        setProviderAvailabilityFilter('Todas');
                        setProviderSortBy('ranking');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase shadow-md active:scale-95"
                    >
                      Ver Todos os Prestadores
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE AVALIAÇÃO DE PRESTADOR ===================== */}
      {isReviewModalOpen && providerToReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  Sistema de Avaliação & Reputação
                </div>
                <h3 className="text-lg font-black">Avaliar Serviços de {providerToReview.name}</h3>
                <p className="text-slate-400 text-xs">
                  {providerToReview.category} • {providerToReview.city}, {providerToReview.state}
                </p>
              </div>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Star Rating Selector */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                  Nota Geral do Profissional
                </label>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (newReviewHoverRating || newReviewRating) >= star;
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewReviewRating(star)}
                        onMouseEnter={() => setNewReviewHoverRating(star)}
                        onMouseLeave={() => setNewReviewHoverRating(0)}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                              : 'fill-slate-200 dark:fill-slate-800 text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                  {ratingLabels[newReviewHoverRating || newReviewRating]}
                </div>
              </div>

              {/* Sub-Criteria Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Qualidade do Acabamento</span>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setNewQualityRating(s)}
                        className="p-0.5 hover:scale-110"
                      >
                        <Star className={`w-4 h-4 ${s <= newQualityRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Pontualidade no Prazo</span>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setNewPunctualityRating(s)}
                        className="p-0.5 hover:scale-110"
                      >
                        <Star className={`w-4 h-4 ${s <= newPunctualityRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Custo-Benefício</span>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setNewCostBenefitRating(s)}
                        className="p-0.5 hover:scale-110"
                      >
                        <Star className={`w-4 h-4 ${s <= newCostBenefitRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendation toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white block">Você recomenda este profissional?</span>
                  <span className="text-[10px] text-slate-500">Ajuda a compor o índice de confiança da comunidade</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewReviewRecommend(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                      newReviewRecommend 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-white dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewReviewRecommend(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                      !newReviewRecommend 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'bg-white dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Não
                  </button>
                </div>
              </div>

              {/* Reviewer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Seu Nome / Empresa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: José Moreira"
                    value={newReviewerName}
                    onChange={(e) => setNewReviewerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seu Perfil</label>
                  <select
                    value={newReviewerRole}
                    onChange={(e) => setNewReviewerRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Proprietário">Proprietário / Solicitante</option>
                    <option value="Contratante">Contratante / Empreiteiro</option>
                    <option value="Engenheiro">Engenheiro / Arquiteto</option>
                    <option value="Solicitante">Outro Solicitante</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Obra / Serviço Realizado</label>
                <input
                  type="text"
                  placeholder="Ex: Instalação Elétrica do Sobrado, Reforma de Banheiro, Pintura Airless..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Comentário & Depoimento</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva como foi a experiência, qualidade técnica, cumprimento de horários, limpeza e postura profissional..."
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Publicar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== REGISTRATION MODAL (DUAL ROLE) ===================== */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" />
                  Formulário Oficial de Cadastro
                </div>
                <h3 className="text-xl font-black">Cadastro no Mercado Mãos em Obra</h3>
              </div>
              <button 
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterTab('solicitante')}
                  className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    registerTab === 'solicitante'
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.01]'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Sou Solicitante / Contratante
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterTab('prestador')}
                  className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    registerTab === 'prestador'
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.01]'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <HardHat className="w-4 h-4" />
                  Sou Prestador de Serviços
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {registerTab === 'solicitante' && (
                <form onSubmit={handleSubmitOpportunity} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                    <p className="font-bold">Publicar Vaga / Demanda de Obra</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Preencha os dados do serviço ou reforma. Os prestadores qualificados verão sua publicação e entrarão em contato direto no seu WhatsApp.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo de Solicitante</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Solicitante', 'Contratante', 'Empresa'] as const).map(role => (
                          <button
                            type="button"
                            key={role}
                            onClick={() => setOppCreatorRole(role)}
                            className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                              oppCreatorRole === role
                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {role === 'Solicitante' ? 'Particular' : role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Título da Oportunidade / Serviço <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Instalação de Porcelanato 80x80 em Apartamento de 90m²"
                        value={oppTitle}
                        onChange={(e) => setOppTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Especialidade Exigida</label>
                        <select
                          value={oppCategory}
                          onChange={(e) => setOppCategory(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {oppCategories.filter(c => c !== 'Todas').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo de Demanda</label>
                        <select
                          value={oppType}
                          onChange={(e) => setOppType(e.target.value as OpportunityType)}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {oppTypes.filter(t => t !== 'Todos').map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Orçamento Estimado / Valor</label>
                        <input
                          type="text"
                          placeholder="Ex: R$ 4.500 ou R$ 180 / dia ou A combinar"
                          value={oppBudget}
                          onChange={(e) => setOppBudget(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Urgência do Início</label>
                        <select
                          value={oppUrgency}
                          onChange={(e) => setOppUrgency(e.target.value as 'Normal' | 'Alta' | 'Crítica')}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="Normal">Normal (Próximas semanas)</option>
                          <option value="Alta">Alta (Nesta semana)</option>
                          <option value="Crítica">Crítica (Imediato / Emergencial)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Cidade <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Santo André"
                          value={oppCity}
                          onChange={(e) => setOppCity(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={oppState}
                          onChange={(e) => setOppState(e.target.value.toUpperCase())}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bairro / Endereço Aproximado</label>
                      <input
                        type="text"
                        placeholder="Ex: Bairro Campestre, próximo à estação"
                        value={oppLocation}
                        onChange={(e) => setOppLocation(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome do Solicitante / Responsável</label>
                        <input
                          type="text"
                          placeholder="Ex: José Moreira"
                          value={oppContactName}
                          onChange={(e) => setOppContactName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          WhatsApp com DDD <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: (11) 99859-9213"
                          value={oppContactPhone}
                          onChange={(e) => setOppContactPhone(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição do Serviço / Escopo</label>
                      <textarea
                        rows={3}
                        placeholder="Descreva o que precisa ser feito, metragens, se os materiais já estão no local, etc."
                        value={oppDescription}
                        onChange={(e) => setOppDescription(e.target.value)}
                        className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requisitos Técnicos (separados por vírgula)</label>
                      <input
                        type="text"
                        placeholder="Ex: Ferramental próprio, MEI/Nota Fiscal, Experiência comprovada, NR-35"
                        value={oppRequirementsStr}
                        onChange={(e) => setOppRequirementsStr(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRegisterModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Publicar Oportunidade Agora
                    </button>
                  </div>
                </form>
              )}

              {registerTab === 'prestador' && (
                <form onSubmit={handleSubmitProvider} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
                    <p className="font-bold">Cadastro de Perfil Profissional no Ranking</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Apresente suas qualificações e especialidades para entrar no ranking e receber orçamentos diretos.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Seu Nome Completo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Carlos Eduardo Rocha"
                          value={provName}
                          onChange={(e) => setProvName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome Fantasia / Empresa (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: Rocha Construções & Reformas"
                          value={provCompanyName}
                          onChange={(e) => setProvCompanyName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria Principal</label>
                        <select
                          value={provCategory}
                          onChange={(e) => setProvCategory(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {providerCategories.filter(c => c !== 'Todas').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anos de Experiência na Área</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={provExperienceYears}
                          onChange={(e) => setProvExperienceYears(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Especialidades Técnicas (separadas por vírgula)</label>
                      <input
                        type="text"
                        placeholder="Ex: Alvenaria estrutural, Porcelanato, Lajes, Telhado colonial, Reboco fino"
                        value={provSpecialtiesStr}
                        onChange={(e) => setProvSpecialtiesStr(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Cidade de Atuação <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Santo André"
                          value={provCity}
                          onChange={(e) => setProvCity(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={provState}
                          onChange={(e) => setProvState(e.target.value.toUpperCase())}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          WhatsApp com DDD <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: (11) 98722-1100"
                          value={provPhone}
                          onChange={(e) => setProvPhone(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail (opcional)</label>
                        <input
                          type="email"
                          placeholder="Ex: contato@minhaempresa.com"
                          value={provEmail}
                          onChange={(e) => setProvEmail(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diária / Valor Médio</label>
                        <input
                          type="text"
                          placeholder="Ex: R$ 260 / diária"
                          value={provDailyRate}
                          onChange={(e) => setProvDailyRate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disponibilidade</label>
                        <select
                          value={provAvailability}
                          onChange={(e) => setProvAvailability(e.target.value as ProviderAvailability)}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="Disponível Imediato">Disponível Imediato</option>
                          <option value="Disponível em 15 dias">Disponível em 15 dias</option>
                          <option value="Agendamento Prévio">Agendamento Prévio</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Documento</label>
                        <select
                          value={provDocumentType}
                          onChange={(e) => setProvDocumentType(e.target.value as 'MEI' | 'CNPJ' | 'CPF')}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="MEI">MEI (Emite Nota Fiscal)</option>
                          <option value="CNPJ">CNPJ (Construtora / ME)</option>
                          <option value="CPF">CPF (Autônomo)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chave PIX para Recebimentos (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: seu CPF, e-mail ou celular"
                        value={provPixKey}
                        onChange={(e) => setProvPixKey(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Apresentação Profissional</label>
                      <textarea
                        rows={3}
                        placeholder="Conte um pouco sobre sua trajetória, obras que já executou e seu diferencial de qualidade..."
                        value={provBio}
                        onChange={(e) => setProvBio(e.target.value)}
                        className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRegisterModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      Cadastrar Meu Perfil Profissional
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== OPPORTUNITY DETAIL MODAL ===================== */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="relative h-36 bg-slate-950 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40"></div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => setSelectedOpp(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute bottom-[-20px] left-8 w-14 h-14 bg-amber-500 rounded-2xl shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-900">
                <Building2 className="w-7 h-7 text-slate-950" />
              </div>
            </div>

            <div className="pt-8 px-8 pb-8 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedOpp.urgency === 'Crítica' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' :
                    selectedOpp.urgency === 'Alta' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' :
                    'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                  }`}>
                    Urgência: {selectedOpp.urgency}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase border border-slate-200 dark:border-slate-700">
                    {selectedOpp.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase">
                    {selectedOpp.type}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {selectedOpp.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                  <span>{selectedOpp.companyName}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {selectedOpp.location}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Orçamento Estimado</div>
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{selectedOpp.budget || 'A combinar'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Previsão de Início</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {selectedOpp.deadline ? new Date(selectedOpp.deadline).toLocaleDateString('pt-BR') : 'Imediato'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Descrição do Serviço</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                  {selectedOpp.description}
                </p>
              </div>

              {selectedOpp.requirements && selectedOpp.requirements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Requisitos Técnicos</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedOpp.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Contato Direto</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">{selectedOpp.contactName} ({selectedOpp.contactPhone})</div>
                  </div>
                </div>

                <a
                  href={formatWhatsappLink(
                    selectedOpp.contactPhone,
                    `Olá ${selectedOpp.contactName}! Vi a vaga "${selectedOpp.title}" no aplicativo Mãos em Obra e gostaria de candidatar-me e apresentar meu orçamento.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enviar Proposta no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== PROVIDER DETAIL & REVIEWS MODAL ===================== */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            {/* Header banner */}
            <div className="relative h-36 bg-slate-950 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40"></div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => setSelectedProvider(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute bottom-[-20px] left-8 w-14 h-14 bg-amber-500 rounded-2xl shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-900 text-slate-950 font-black text-2xl">
                {selectedProvider.name.charAt(0)}
              </div>
            </div>

            {/* Modal Subtabs: Visão Geral vs Avaliações */}
            <div className="pt-8 px-8 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProviderDetailTab('about')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    providerDetailTab === 'about'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Perfil & Dados
                </button>
                <button
                  onClick={() => setProviderDetailTab('reviews')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    providerDetailTab === 'reviews'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  Avaliações ({selectedProvider.reviewsCount})
                </button>
              </div>

              <button
                onClick={() => handleOpenReviewModal(selectedProvider)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase transition-all shadow-sm flex items-center gap-1.5"
              >
                <Star className="w-3 h-3 fill-white" />
                + Avaliar Agora
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: VISÃO GERAL */}
              {providerDetailTab === 'about' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase">
                        {selectedProvider.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                        {selectedProvider.availability}
                      </span>
                      {selectedProvider.rankingBadge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase shadow-xs">
                          {selectedProvider.rankingBadge}
                        </span>
                      )}
                      {selectedProvider.documentType && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                          {selectedProvider.documentType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {selectedProvider.name}
                      </h2>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 text-amber-500 font-black text-sm">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{selectedProvider.rating.toFixed(1)}</span>
                        <span className="text-xs text-slate-400 font-normal">({selectedProvider.reviewsCount} avaliações)</span>
                      </div>
                    </div>

                    {selectedProvider.companyOrTradeName && (
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {selectedProvider.companyOrTradeName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-black">Cidade Base</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">{selectedProvider.city}, {selectedProvider.state}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-black">Experiência</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">{selectedProvider.experienceYears} anos</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-black">Preço Médio</div>
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{selectedProvider.dailyRate || 'A combinar'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-black">Status</div>
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">Verificado ✓</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Apresentação Profissional</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                      {selectedProvider.bio}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Especialidades & Habilidades</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProvider.specialties.map((spec, idx) => (
                        <span key={idx} className="text-xs px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedProvider.pixKey && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 font-bold">Chave PIX Oficial para Adiantamentos / Sinal:</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{selectedProvider.pixKey}</span>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: AVALIAÇÕES & REPUTAÇÃO DETALHADA */}
              {providerDetailTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Rating Score Card Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="sm:col-span-4 flex flex-col items-center justify-center text-center p-2 border-b sm:border-b-0 sm:border-r border-amber-500/20">
                      <div className="text-4xl font-black text-amber-500">{selectedProvider.rating.toFixed(1)}</div>
                      <div className="my-1">{renderStarRating(selectedProvider.rating)}</div>
                      <div className="text-[11px] text-slate-500 font-bold">
                        Baseado em {selectedProvider.reviewsCount} {selectedProvider.reviewsCount === 1 ? 'avaliação' : 'avaliações'}
                      </div>
                    </div>

                    <div className="sm:col-span-8 flex flex-col justify-center space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Qualidade da Execução & Acabamento:</span>
                        <strong className="text-amber-500 font-black">5.0 / 5.0</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Pontualidade no Cumprimento de Prazos:</span>
                        <strong className="text-amber-500 font-black">4.9 / 5.0</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Custo-Benefício & Transparência:</span>
                        <strong className="text-amber-500 font-black">4.9 / 5.0</strong>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                        <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          Índice de Recomendação:
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">100% dos solicitantes</span>
                      </div>
                    </div>
                  </div>

                  {/* List of customer reviews */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Depoimentos de Obras Concluídas ({selectedProvider.reviews?.length || 0})
                      </h4>
                      <button
                        onClick={() => handleOpenReviewModal(selectedProvider)}
                        className="text-xs font-black text-amber-500 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Avaliar Profissional
                      </button>
                    </div>

                    {selectedProvider.reviews && selectedProvider.reviews.length > 0 ? (
                      selectedProvider.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white">{rev.reviewerName}</span>
                                {rev.reviewerRole && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
                                    {rev.reviewerRole}
                                  </span>
                                )}
                              </div>
                              {rev.projectName && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                  Obra: {rev.projectName}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-0.5">
                              {renderStarRating(rev.rating)}
                              <span className="text-[10px] text-slate-400">{rev.date}</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                            "{rev.comment}"
                          </p>

                          {rev.recommend && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              <ThumbsUp className="w-3 h-3" />
                              Recomenda este profissional para outras obras
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                        <Star className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-500">Nenhum comentário detalhado ainda.</p>
                        <button
                          onClick={() => handleOpenReviewModal(selectedProvider)}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black uppercase shadow-xs"
                        >
                          Seja o primeiro a avaliar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom WhatsApp CTA */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Telefone / WhatsApp</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">{selectedProvider.phone}</div>
                  </div>
                </div>

                <a
                  href={formatWhatsappLink(
                    selectedProvider.phone,
                    `Olá ${selectedProvider.name}! Vi suas excelentes avaliações no ranking do Mãos em Obra (${selectedProvider.rating} estrelas) e gostaria de solicitar um orçamento para meu projeto.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  Solicitar Orçamento no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
