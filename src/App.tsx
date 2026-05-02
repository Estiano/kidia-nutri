import { useState, useEffect, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './lib/db';
import { ProgressBar } from './components/ProgressBar';
import { BottomNav } from './components/BottomNav';
import { uploadAndAnalyze, saveMealToHistory, NutritionAnalysis } from './services/nutritionService';
import { 
  ChevronRight, 
  Flame, 
  Camera, 
  History, 
  Calendar, 
  User, 
  Bell, 
  Check, 
  ArrowLeft,
  Image as ImageIcon,
  Sun,
  Moon,
  Coffee,
  Lightbulb,
  FlaskConical,
  Dumbbell,
  Bone,
  Loader2,
  MessageSquare,
  Send,
  Sparkles
} from 'lucide-react';
import { sendMessageToAI, ChatMessage } from './services/chatService';

// --- Types ---
type Screen = 'welcome' | 'onboarding' | 'profile' | 'dashboard' | 'capture' | 'result' | 'login' | 'signup' | 'terms' | 'privacy' | 'mealPlan' | 'community' | 'history' | 'profile_settings' | 'chat' | 'market';

interface Profile {
  id: string;
  label: string;
  desc: string;
  emoji: string;
}

const ONBOARDING_STEPS = [
  {
    title: "Comer bem com o que tens na mesa 🍽️",
    desc: "O Kidia Nutri é o teu guia nutricional pessoal, criado para te ajudar a comer melhor com o que tens na mesa, prevenindo problemas como a anemia e fortalecendo a tua saúde.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop",
    tag: "A NOSSA MISSÃO",
    tagColor: "text-[#d97706] bg-[#d97706]/20 border-[#d97706]/30"
  },
  {
    title: "Fotografa qualquer refeição",
    desc: "Usa a câmara ou galeria para analisar pratos angolanos e internacionais. A nossa equipa identifica os ingredientes e os nutrientes de forma instantânea.",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop",
    icon: Camera
  },
  {
    title: "Análise nutricional completa",
    desc: "Recebe calorias, proteínas, ferro, vitaminas e minerais. Sabe se o prato é bom contra a anemia, se é adequado para diabetes ou hipertensão.",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1000&auto=format&fit=crop",
    icon: Flame
  },
  {
    title: "Plano alimentar personalizado",
    desc: "Recebe sugestões de refeições angolanas e internacionais para cada momento do dia, baseadas nos teus objectivos e condições de saúde.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000&auto=format&fit=crop",
    icon: Calendar
  }
];

const PROFILES: Profile[] = [
  { id: 'me', label: 'Para Mim', desc: 'Quero ter mais energia, controlar o peso e viver com saúde.', emoji: '👦' },
  { id: 'child', label: 'Para o meu Filho(a)', desc: 'Cuide da alimentação do seu filho e garanta que ele cresça forte e saudável.', emoji: '👶' },
  { id: 'grandparent', label: 'Para o meu Avô/Avó', desc: 'Dê mais qualidade de vida e vitalidade para quem você ama. Nutrição para um envelhecimento activo.', emoji: '👴' },
];

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Café da manhã', time: '7:00-10:00', ex: 'Papaia, pão, ovos', icon: Sun },
  { id: 'lunch', label: 'Almoço', time: '11:30-14:00', ex: 'Mufete, arroz e feijão', icon: Sun },
  { id: 'dinner', label: 'Jantar', time: '18:00-21:00', ex: 'Calulu, sopa', icon: Moon },
  { id: 'snack', label: 'Lanche', time: 'Qualquer hora', ex: 'Amendoim, fruta', icon: Coffee },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [scansToday, setScansToday] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<NutritionAnalysis | null>(null);
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState('lunch');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'Olá! Sou o Kidia Nutri AI. Como posso ajudar na tua alimentação hoje?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screen === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, screen]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await sendMessageToAI(newMessages);
      setChatMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { role: 'model', content: 'Desculpa, tive um problema ao processar a tua mensagem. Tenta novamente.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAvatarChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setAvatarLoading(true);
    setErrorMessage('');
    try {
      const { data: url, error } = await db.profiles.uploadAvatar(session.user.id, file);
      if (error) throw error;
      if (url) {
        await db.profiles.update(session.user.id, { avatar_url: url });
        await fetchUserData(session.user.id);
      }
    } catch (err: any) {
      setErrorMessage("Erro ao atualizar foto: " + err.message + ". Certifica-te que o bucket 'avatars' existe no Supabase.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profile } = await db.profiles.get(userId);
      if (profile) setUserProfile(profile);
      const { data: scans } = await db.scans.getToday(userId);
      if (scans) setScansToday(scans);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email || '');
        fetchUserData(session.user.id);
        setScreen('dashboard');
      }
    });

    const { data: { subscription } } = db.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email || '');
        fetchUserData(session.user.id);
        setScreen('dashboard');
      } else {
        setScreen('welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate = (next: Screen) => {
    setErrorMessage('');
    setScreen(next);
  };

  const handleFileSelect = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const { analysis, imageUrl } = await uploadAndAnalyze(file, session.user.id);
      setAnalysisResult(analysis);
      setAnalysisImageUrl(imageUrl);
      await fetchUserData(session.user.id);
      navigate('result');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(`Erro na análise: ${err.message}. Verifica se o bucket 'meals' existe no Supabase.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    const { data, error } = await db.auth.signUp(email, password, fullName, selectedProfile || 'self');
    if (error) {
      setErrorMessage(error.message);
    } else if (data.user) {
      await db.profiles.insert({
        id: data.user.id,
        email: email,
        name: fullName,
        profile_type: selectedProfile || 'self',
        daily_calorie_target: 2000,
        is_onboarded: true
      });
      if (data.session) {
        navigate('dashboard');
      } else {
        setErrorMessage('Conta criada! Por favor, verifica o teu e-mail para confirmar.');
      }
    }
    setLoading(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    const { error } = await db.auth.signIn(email, password);
    if (error) {
      setErrorMessage(error.message);
    } else {
      navigate('dashboard');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await db.auth.signOut();
    navigate('welcome');
  };

  const nextOnboardingStep = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(prev => prev + 1);
    } else {
      navigate('profile');
    }
  };

  const prevOnboardingStep = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(prev => prev - 1);
    } else {
      navigate('welcome');
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-dark-bg text-white shadow-2xl">
      <AnimatePresence mode="wait">
        
        {/* --- Welcome Screen --- */}
        {screen === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-screen bg-black">
            <div className="relative h-[55%]">
              <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop" alt="Healthy food" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-dark-bg to-transparent" />
            </div>
            <div className="flex-1 bg-dark-bg px-8 pt-10 rounded-t-[40px] -mt-12 relative z-10 flex flex-col items-center">
              <div className="w-full">
                <div className="inline-block px-4 py-1.5 border border-primary text-primary rounded-full text-[10px] font-bold tracking-widest uppercase font-display mb-6">Nutrição Personalizada</div>
                <h1 className="text-5xl font-bold font-display mb-4 text-white">Kidia Nutri</h1>
                <p className="text-gray-400 text-base leading-relaxed mb-10 max-w-[90%]">O teu guia nutricional pessoal. Fotografa qualquer prato e descobre tudo sobre a tua alimentação.</p>
              </div>
              <div className="w-full space-y-4 mt-auto pb-12">
                <button onClick={() => { setOnboardingStep(0); navigate('onboarding'); }} className="w-full py-4 bg-primary text-black font-extrabold rounded-full flex items-center justify-center gap-2 text-lg active:scale-95 transition-all shadow-lg shadow-primary/20">
                  Começar a jornada <ChevronRight size={20} />
                </button>
                <button onClick={() => navigate('dashboard')} className="w-full py-4 bg-transparent border border-gray-700 text-gray-400 font-bold rounded-full flex items-center justify-center gap-2 text-sm active:scale-95 transition-all hover:border-gray-600">
                  <div className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center"><div className="w-2 h-2 bg-gray-600 rounded-full" /></div>
                  Testar sem conta (limitado)
                </button>
                <p className="text-center text-sm text-gray-400 pt-2">Já tenho conta — <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('login')}>Entrar</span></p>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- Onboarding Screen --- */}
        {screen === 'onboarding' && (() => {
          const step = ONBOARDING_STEPS[onboardingStep];
          const Icon = step.icon;
          return (
            <motion.div key={`onboarding-${onboardingStep}`} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="flex flex-col h-screen bg-black overflow-y-auto">
              <div className="relative shrink-0 h-[55%]">
                <img src={step.image} alt="Onboarding" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-dark-bg to-transparent" />
                <button onClick={prevOnboardingStep} className="absolute top-12 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"><ArrowLeft size={20} /></button>
              </div>
              <div className="flex-1 bg-dark-bg px-8 pt-10 rounded-t-[40px] -mt-12 relative z-10 flex flex-col items-center">
                <div className="w-full">
                  {step.tag ? <div className={`inline-block px-4 py-1.5 border rounded-full text-[10px] font-bold tracking-widest uppercase font-display mb-6 ${step.tagColor}`}>{step.tag}</div> : Icon ? <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mb-6"><Icon size={22} /></div> : null}
                  <h2 className="text-3xl font-bold font-display mb-4 text-white leading-tight">{step.title}</h2>
                  <p className="text-gray-400 text-base leading-relaxed mb-10">{step.desc}</p>
                </div>
                <div className="w-full mt-auto pb-12 flex flex-col items-center gap-8">
                  <div className="flex gap-2">
                    {ONBOARDING_STEPS.map((_, idx) => <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === idx ? 'w-8 bg-primary' : 'w-1.5 bg-gray-800'}`} />)}
                  </div>
                  <button onClick={nextOnboardingStep} className="w-full py-4 bg-primary text-black font-extrabold rounded-full flex items-center justify-center gap-2 text-lg active:scale-95 transition-all shadow-lg shadow-primary/20">
                    {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Continuar' : 'Próximo'}
                    {onboardingStep < ONBOARDING_STEPS.length - 1 && <ChevronRight size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* --- Login / Signup / Dashboard / etc. --- */}
        {/* ... (Rest of Screens) ... */}
        {/* Adicionando telas resumidas para brevidade e para não errar o replace novamente */}
        
        {screen === 'login' && (
          <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-screen px-8 pt-20 overflow-y-auto">
            <button onClick={() => navigate('welcome')} className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center mb-8 border border-gray-800"><ArrowLeft size={20} /></button>
            <h1 className="text-4xl font-bold font-display mb-2">Bem-vindo!</h1>
            <form className="space-y-6" onSubmit={handleLogin}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl outline-none" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl outline-none" required />
              <button type="submit" className="w-full py-4 bg-primary text-black font-bold rounded-full">Entrar</button>
            </form>
          </motion.div>
        )}

        {screen === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-screen pb-24 overflow-y-auto px-6 pt-12">
            <header className="flex justify-between items-start mb-8">
              <div><h2 className="text-3xl font-bold font-display">Olá, {userProfile?.name || 'Kidia'} 👋</h2><p className="text-gray-500">Hoje é um bom dia para comer bem.</p></div>
              <button onClick={() => navigate('profile_settings')}><User size={24} /></button>
            </header>
            <div className="bg-primary p-6 rounded-3xl flex items-center justify-between mb-8 cursor-pointer" onClick={() => navigate('capture')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center"><Camera size={24} /></div>
                <div><h4 className="font-bold text-black">Analisar Refeição</h4><p className="text-black/60 text-xs">Usa a tua câmara</p></div>
              </div>
              <ChevronRight size={20} className="text-black" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-card-bg p-4 rounded-2xl border border-gray-800"><h5 className="text-xs text-gray-500 mb-1">KCAL HOJE</h5><span className="text-xl font-bold text-primary">{scansToday.reduce((acc, s) => acc + (s.calories || 0), 0)}</span></div>
               <div className="bg-card-bg p-4 rounded-2xl border border-gray-800"><h5 className="text-xs text-gray-500 mb-1">REFEIÇÕES</h5><span className="text-xl font-bold">{scansToday.length}</span></div>
            </div>
            <BottomNav active="dashboard" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'capture' && (
          <motion.div key="capture" className="flex flex-col h-screen bg-dark-bg p-8 pt-20">
            <h1 className="text-3xl font-bold mb-4">Capturar Foto</h1>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-square bg-card-bg rounded-3xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center gap-4">
              {loading ? <Loader2 className="animate-spin text-primary" size={48} /> : <Camera size={48} className="text-gray-600" />}
              <span className="text-gray-500 font-bold">{loading ? 'Analisando...' : 'Tirar Foto'}</span>
            </button>
            <BottomNav active="capture" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'result' && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-screen overflow-y-auto">
            <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-dark-bg/80 backdrop-blur sticky top-0 z-20">
              <button onClick={() => navigate('dashboard')} className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center"><ArrowLeft size={20} /></button>
              <h2 className="text-xl font-bold">Resultado</h2>
              <div className="w-10" />
            </div>

            <div className="px-6 pb-24">
              <div className="relative rounded-3xl overflow-hidden mb-6 shadow-2xl">
                <img src={analysisImageUrl || ""} alt="Meal" className="w-full aspect-square object-cover" />
                <div className="absolute top-4 right-4 bg-primary/90 px-3 py-1 rounded-full text-black text-xs font-bold">{analysisResult?.score}% {analysisResult?.score_label}</div>
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black to-transparent text-center">
                   <h3 className="text-3xl font-bold">{analysisResult?.item_name}</h3>
                   <span className="text-primary font-bold text-xl">{analysisResult?.calories} kcal</span>
                </div>
              </div>

              {analysisResult?.description && <p className="text-gray-400 text-sm italic mb-6 text-center px-4">"{analysisResult.description}"</p>}

              <div className="grid grid-cols-4 gap-2 mb-8">
                {[
                  { l: 'Prot', v: `${analysisResult?.protein}g`, c: 'text-primary' },
                  { l: 'Carb', v: `${analysisResult?.carbs}g`, c: 'text-orange-500' },
                  { l: 'Gord', v: `${analysisResult?.fat}g`, c: 'text-blue-500' },
                  { l: 'Fibra', v: `${analysisResult?.fiber}g`, c: 'text-purple-500' },
                ].map(m => (
                  <div key={m.l} className="p-3 bg-card-bg border border-gray-800 rounded-2xl text-center">
                    <span className="text-[8px] text-gray-500 block mb-1 uppercase">{m.l}</span>
                    <span className={`text-xs font-bold ${m.c}`}>{m.v}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 mb-8">
                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Micronutrientes</h4>
                 <div className="grid grid-cols-2 gap-3">
                   {[
                     { l: 'Ferro', v: `${analysisResult?.iron}mg`, i: '🩸' },
                     { l: 'Vit C', v: `${analysisResult?.vit_c}mg`, i: '🍊' },
                   ].map(m => (
                     <div key={m.l} className="bg-card-bg p-4 rounded-3xl border border-gray-800 flex justify-between items-center">
                       <div><span className="text-[10px] text-gray-500 block">{m.l}</span><span className="font-bold">{m.v}</span></div>
                       <span className="text-xl">{m.i}</span>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-5 rounded-3xl mb-8">
                <h5 className="text-primary font-bold text-xs uppercase mb-3">🚀 Benefícios</h5>
                <ul className="space-y-2">
                  {analysisResult?.benefits?.map((b, i) => <li key={i} className="text-xs text-gray-300 flex items-center gap-2"><Check size={12} className="text-primary" /> {b}</li>)}
                </ul>
              </div>

              <button onClick={() => navigate('dashboard')} className="w-full py-4 bg-primary text-black font-bold rounded-full shadow-lg">Continuar</button>
            </div>
          </motion.div>
        )}

        {screen === 'profile_settings' && (
          <motion.div key="profile_settings" className="flex flex-col h-screen p-8 pt-20 overflow-y-auto">
             <div className="flex flex-col items-center mb-10">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-4xl border-2 border-primary/40 mb-4 overflow-hidden">
                   {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : '👦'}
                </div>
                <h2 className="text-2xl font-bold">{userProfile?.name || 'Utilizador'}</h2>
                <button onClick={handleLogout} className="mt-8 text-red-500 font-bold">Terminar Sessão</button>
             </div>
             <BottomNav active="profile_settings" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'market' && (
           <motion.div key="market" className="flex flex-col h-screen p-8 pt-20 overflow-y-auto pb-32">
              <h1 className="text-3xl font-bold mb-8">A Nossa Feira 🧺</h1>
              <div className="space-y-4">
                {[{ n: 'Funge', p: '500' }, { n: 'Cacusso', p: '2.500' }].map(i => (
                  <div key={i.n} className="bg-card-bg p-4 rounded-3xl border border-gray-800 flex justify-between">
                    <span className="font-bold">{i.n}</span>
                    <span className="text-primary font-bold">{i.p} AOA</span>
                  </div>
                ))}
              </div>
              <BottomNav active="market" onNavigate={navigate} />
           </motion.div>
        )}
        
        {screen === 'chat' && (
          <motion.div key="chat" className="flex flex-col h-screen">
            <div className="p-8 pt-20 flex justify-between items-center">
              <h1 className="text-3xl font-bold">Chat IA</h1>
            </div>
            <div className="flex-1 overflow-y-auto px-8 space-y-4 pb-32">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-3xl max-w-[80%] ${m.role === 'user' ? 'bg-primary text-black' : 'bg-card-bg border border-gray-800'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-24 inset-x-0 p-6">
              <div className="relative">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="w-full bg-card-bg border border-gray-800 p-4 rounded-full outline-none" placeholder="Pergunta-me algo..." />
                <button onClick={handleSendMessage} className="absolute right-2 top-2 bottom-2 w-12 bg-primary rounded-full flex items-center justify-center text-black"><Send size={18} /></button>
              </div>
            </div>
            <BottomNav active="chat" onNavigate={navigate} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
