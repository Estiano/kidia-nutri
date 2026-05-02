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
  Sparkles,
  Droplets,
  Zap,
  TrendingUp,
  ShoppingBag
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
  }
];

const PROFILES: Profile[] = [
  { id: 'me', label: 'Para Mim', desc: 'Quero ter mais energia, controlar o peso e viver com saúde.', emoji: '👦' },
  { id: 'child', label: 'Para o meu Filho(a)', desc: 'Cuide da alimentação do seu filho e garanta que ele cresça forte e saudável.', emoji: '👶' },
  { id: 'grandparent', label: 'Para o meu Avô/Avó', desc: 'Dê mais qualidade de vida e vitalidade para quem você ama.', emoji: '👴' },
];

const MARKET_ITEMS = [
  { name: 'Funge de Bombo', price: '450 AOA', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200', category: 'Base' },
  { name: 'Cacusso Fresco', price: '2.500 AOA', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=200', category: 'Peixe' },
  { name: 'Kizaca', price: '300 AOA', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=200', category: 'Verduras' },
  { name: 'Óleo de Palma', price: '1.200 AOA', img: 'https://images.unsplash.com/photo-1474979266404-7eaacbad88c5?q=80&w=200', category: 'Óleos' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [scansToday, setScansToday] = useState<any[]>([]);
  const [allScans, setAllScans] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<NutritionAnalysis | null>(null);
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [waterCount, setWaterCount] = useState(0);

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

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profile } = await db.profiles.get(userId);
      if (profile) setUserProfile(profile);
      const { data: scans } = await db.scans.getToday(userId);
      if (scans) setScansToday(scans);
      const { data: all } = await db.scans.getAll(userId);
      if (all) setAllScans(all);
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
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Erro ao processar mensagem.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAvatarChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setAvatarLoading(true);
    try {
      const { data: url, error } = await db.profiles.uploadAvatar(session.user.id, file);
      if (error) throw error;
      if (url) {
        await db.profiles.update(session.user.id, { avatar_url: url });
        await fetchUserData(session.user.id);
      }
    } catch (err: any) {
      setErrorMessage("Erro no upload.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleFileSelect = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setLoading(true);
    try {
      const { analysis, imageUrl } = await uploadAndAnalyze(file, session.user.id);
      setAnalysisResult(analysis);
      setAnalysisImageUrl(imageUrl);
      await saveMealToHistory(session.user.id, analysis, imageUrl);
      await fetchUserData(session.user.id);
      navigate('result');
    } catch (err: any) {
      setErrorMessage("Erro na análise.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await db.auth.signUp(email, password, fullName, selectedProfile || 'self');
    if (error) setErrorMessage(error.message);
    else if (data.user) {
      await db.profiles.insert({ id: data.user.id, email, name: fullName, profile_type: selectedProfile || 'self', daily_calorie_target: 2000, is_onboarded: true });
      if (data.session) navigate('dashboard');
      else setErrorMessage('Verifica o teu e-mail.');
    }
    setLoading(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await db.auth.signIn(email, password);
    if (error) setErrorMessage(error.message);
    else navigate('dashboard');
    setLoading(false);
  };

  const totalCaloriesToday = scansToday.reduce((acc, s) => acc + (s.calories || 0), 0);
  const calorieProgress = Math.min((totalCaloriesToday / 2000) * 100, 100);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-dark-bg text-white shadow-2xl overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {screen === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen flex flex-col overflow-y-auto">
            <div className="h-[55%] relative shrink-0">
              <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-bg to-transparent" />
            </div>
            <div className="flex-1 px-8 pt-10 rounded-t-[40px] -mt-12 bg-dark-bg z-10 flex flex-col">
               <h1 className="text-5xl font-bold font-display mb-4">Kidia Nutri</h1>
               <p className="text-gray-400 mb-10 text-lg">Nutrição inteligente para famílias angolanas.</p>
               <div className="mt-auto pb-12 space-y-4">
                 <button onClick={() => navigate('onboarding')} className="w-full py-4 bg-primary text-black font-bold rounded-full text-lg shadow-lg shadow-primary/20">Começar Agora</button>
                 <button onClick={() => navigate('login')} className="w-full py-4 border border-gray-700 text-gray-400 rounded-full font-bold">Já tenho conta</button>
               </div>
            </div>
          </motion.div>
        )}

        {screen === 'onboarding' && (
           <motion.div key="onboarding" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="h-screen flex flex-col overflow-y-auto">
              <img src={ONBOARDING_STEPS[onboardingStep].image} className="h-[50%] object-cover shrink-0" />
              <div className="flex-1 px-8 pt-10 bg-dark-bg flex flex-col">
                 <h2 className="text-3xl font-bold mb-4">{ONBOARDING_STEPS[onboardingStep].title}</h2>
                 <p className="text-gray-400 text-lg leading-relaxed">{ONBOARDING_STEPS[onboardingStep].desc}</p>
                 <button onClick={() => onboardingStep < 2 ? setOnboardingStep(onboardingStep+1) : navigate('profile')} className="mt-auto mb-12 w-full py-4 bg-primary text-black font-bold rounded-full shrink-0">Próximo</button>
              </div>
           </motion.div>
        )}

        {screen === 'profile' && (
           <motion.div key="profile" className="h-screen p-8 pt-20 flex flex-col overflow-y-auto">
              <h2 className="text-3xl font-bold mb-8">Quem vamos cuidar?</h2>
              <div className="space-y-4 mb-8">
                {PROFILES.map(p => (
                  <button key={p.id} onClick={() => setSelectedProfile(p.id)} className={`w-full p-6 rounded-3xl border-2 text-left transition-all ${selectedProfile === p.id ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-gray-800 bg-card-bg'}`}>
                    <span className="text-4xl block mb-2">{p.emoji}</span>
                    <h3 className="font-bold text-lg">{p.label}</h3>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </button>
                ))}
              </div>
              <button disabled={!selectedProfile} onClick={() => navigate('signup')} className="mt-auto mb-12 w-full py-4 bg-primary text-black font-bold rounded-full disabled:opacity-50 shrink-0">Continuar</button>
           </motion.div>
        )}

        {screen === 'dashboard' && (
          <motion.div key="dashboard" className="h-screen pb-32 overflow-y-auto px-6 pt-12">
            <header className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-bold">Olá, {userProfile?.name?.split(' ')[0] || 'Kidia'}! 👋</h2>
                <p className="text-gray-500 text-sm">Pronto para a tua meta diária?</p>
              </div>
              <button onClick={() => navigate('profile_settings')} className="w-12 h-12 rounded-2xl bg-card-bg border border-gray-800 flex items-center justify-center overflow-hidden">
                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : <User size={24} />}
              </button>
            </header>

            {/* Calorie Card */}
            <div className="bg-card-bg border border-gray-800 p-6 rounded-[32px] mb-8 relative overflow-hidden">
               <div className="flex justify-between items-end mb-6">
                 <div>
                   <span className="text-gray-500 text-xs uppercase font-bold block mb-1">Calorias Consumidas</span>
                   <span className="text-4xl font-bold text-primary">{totalCaloriesToday} <span className="text-sm text-gray-500 font-normal">/ 2000 kcal</span></span>
                 </div>
                 <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Flame size={24} /></div>
               </div>
               <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${calorieProgress}%` }} className="h-full bg-primary" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div onClick={() => setWaterCount(waterCount + 1)} className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-[32px] cursor-pointer active:scale-95 transition-all">
                  <div className="flex justify-between items-center mb-4"><span className="text-blue-500 font-bold text-sm">Água</span><Droplets size={20} className="text-blue-500" /></div>
                  <span className="text-2xl font-bold">{waterCount * 250} <span className="text-xs text-gray-500 font-normal">ml</span></span>
               </div>
               <div onClick={() => navigate('history')} className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-[32px] cursor-pointer active:scale-95 transition-all">
                  <div className="flex justify-between items-center mb-4"><span className="text-purple-500 font-bold text-sm">Histórico</span><History size={20} className="text-purple-500" /></div>
                  <span className="text-2xl font-bold">{allScans.length} <span className="text-xs text-gray-500 font-normal">total</span></span>
               </div>
            </div>

            <h3 className="text-xl font-bold mb-6">Analisa a tua refeição</h3>
            <div className="bg-primary p-8 rounded-[40px] flex items-center justify-between mb-8 cursor-pointer shadow-xl shadow-primary/10" onClick={() => navigate('capture')}>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-black/10 rounded-2xl flex items-center justify-center text-black"><Camera size={32} /></div>
                <div><h4 className="font-bold text-black text-xl">Capturar Agora</h4><p className="text-black/60 text-sm">IA Nutricional Instantânea</p></div>
              </div>
              <ChevronRight className="text-black" size={28} />
            </div>

            <BottomNav active="dashboard" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'history' && (
          <motion.div key="history" className="h-screen overflow-y-auto px-6 pt-12 pb-32">
            <header className="flex items-center gap-4 mb-8">
              <button onClick={() => navigate('dashboard')} className="w-10 h-10 bg-card-bg rounded-xl flex items-center justify-center border border-gray-800"><ArrowLeft size={20} /></button>
              <h1 className="text-3xl font-bold">Meu Histórico</h1>
            </header>
            
            <div className="space-y-4">
              {allScans.length === 0 ? (
                <div className="text-center py-20 text-gray-500">Ainda não tens refeições analisadas.</div>
              ) : (
                allScans.map((s, i) => (
                  <div key={i} className="bg-card-bg border border-gray-800 p-4 rounded-3xl flex gap-4">
                    <img src={s.image_url} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1 py-1">
                      <h4 className="font-bold">{s.item_name}</h4>
                      <p className="text-xs text-gray-500 mb-2">{new Date(s.created_at).toLocaleDateString('pt-PT')}</p>
                      <div className="flex gap-3">
                         <span className="text-xs font-bold text-primary">{s.calories} kcal</span>
                         <span className="text-xs text-gray-400">P: {s.protein}g | C: {s.carbs}g</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <BottomNav active="history" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'market' && (
           <motion.div key="market" className="h-screen p-6 pt-12 overflow-y-auto pb-32">
              <h1 className="text-3xl font-bold mb-2">A Nossa Feira 🧺</h1>
              <p className="text-gray-500 mb-8">Produtos locais com preços médios em Luanda.</p>
              
              <div className="grid grid-cols-2 gap-4">
                {MARKET_ITEMS.map((item, i) => (
                  <div key={i} className="bg-card-bg border border-gray-800 rounded-[32px] overflow-hidden group">
                    <div className="h-32 relative">
                      <img src={item.img} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold">{item.category}</div>
                    </div>
                    <div className="p-4">
                       <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                       <span className="text-primary font-bold text-xs">{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
              <BottomNav active="market" onNavigate={navigate} />
           </motion.div>
        )}

        {screen === 'result' && (
          <motion.div key="result" className="h-screen overflow-y-auto px-6 pt-12 pb-32">
            <button onClick={() => navigate('dashboard')} className="mb-6 w-10 h-10 bg-card-bg rounded-xl flex items-center justify-center border border-gray-800"><ArrowLeft size={20} /></button>
            <div className="relative rounded-[48px] overflow-hidden mb-8 shadow-2xl">
              <img src={analysisImageUrl || ""} className="w-full aspect-square object-cover" />
              <div className="absolute top-6 right-6 bg-primary px-6 py-2 rounded-full text-black font-extrabold text-lg shadow-2xl">{analysisResult?.score}%</div>
              <div className="absolute bottom-0 inset-x-0 p-10 bg-gradient-to-t from-black to-transparent text-center">
                 <h3 className="text-4xl font-bold mb-2">{analysisResult?.item_name}</h3>
                 <div className="flex justify-center gap-4">
                    <span className="bg-primary/20 text-primary border border-primary/30 px-4 py-1 rounded-full text-xs font-bold">{analysisResult?.calories} kcal</span>
                    <span className="bg-white/10 backdrop-blur border border-white/20 px-4 py-1 rounded-full text-xs font-bold">{analysisResult?.score_label}</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-10">
              {[{ l: 'Prot', v: analysisResult?.protein, c: 'text-primary' }, { l: 'Carb', v: analysisResult?.carbs, c: 'text-orange-500' }, { l: 'Gord', v: analysisResult?.fat, c: 'text-blue-500' }, { l: 'Fibra', v: analysisResult?.fiber, c: 'text-purple-500' }].map(m => (
                <div key={m.l} className="bg-card-bg p-4 rounded-3xl border border-gray-800 text-center">
                  <span className="text-[10px] text-gray-500 block mb-1 uppercase font-extrabold tracking-widest">{m.l}</span>
                  <span className={`text-sm font-bold ${m.c}`}>{m.v}g</span>
                </div>
              ))}
            </div>

            <div className="space-y-6 mb-10">
               <div className="bg-primary/5 border border-primary/20 p-8 rounded-[40px]">
                  <h5 className="text-primary font-bold mb-6 flex items-center gap-3 text-lg"><Sparkles size={24} /> Benefícios para a Saúde</h5>
                  <ul className="space-y-4">
                    {analysisResult?.benefits?.map((b, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-4"><div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0"><Check size={14} className="text-primary" /></div> {b}</li>)}
                  </ul>
               </div>
               
               <div className="bg-card-bg border border-gray-800 p-8 rounded-[40px]">
                  <h5 className="text-orange-500 font-bold mb-6 flex items-center gap-3 text-lg"><Lightbulb size={24} /> Dica do Kidia</h5>
                  <p className="text-gray-400 text-sm leading-relaxed">{analysisResult?.recommendation}</p>
               </div>
            </div>

            <button onClick={() => navigate('dashboard')} className="w-full py-5 bg-primary text-black font-extrabold rounded-full shadow-2xl shadow-primary/20 text-lg">Continuar Acompanhamento</button>
          </motion.div>
        )}

        {/* ... Telas de Login, Signup, Profile Settings e Chat permanecem com melhorias visuais ... */}
        {screen === 'signup' && (
          <motion.div key="signup" className="h-screen p-8 pt-20 flex flex-col overflow-y-auto">
            <h1 className="text-4xl font-bold mb-4">Bem-vindo!</h1>
            <p className="text-gray-500 mb-10">Cria a tua conta para começares a cuidar da tua família.</p>
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-4">NOME COMPLETO</label><input type="text" placeholder="Ex: João Manuel" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none focus:border-primary transition-all" required /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-4">EMAIL</label><input type="email" placeholder="nome@email.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none focus:border-primary transition-all" required /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-4">SENHA</label><input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none focus:border-primary transition-all" required /></div>
              <button type="submit" className="w-full py-5 bg-primary text-black font-extrabold rounded-full text-lg mt-6 shadow-xl shadow-primary/10">Criar Conta</button>
            </form>
            <p className="mt-10 text-center text-gray-500 pb-12">Já tens conta? <span onClick={() => navigate('login')} className="text-primary font-bold cursor-pointer hover:underline">Entrar aqui</span></p>
          </motion.div>
        )}

        {screen === 'login' && (
          <motion.div key="login" className="h-screen p-8 pt-20 flex flex-col overflow-y-auto">
            <h1 className="text-4xl font-bold mb-4">Olá de novo!</h1>
            <p className="text-gray-500 mb-10">Entra na tua conta para ver o teu progresso.</p>
            <form onSubmit={handleLogin} className="space-y-5">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none focus:border-primary transition-all" required />
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none focus:border-primary transition-all" required />
              <button type="submit" className="w-full py-5 bg-primary text-black font-extrabold rounded-full text-lg mt-6 shadow-xl shadow-primary/10">Entrar</button>
            </form>
            <p className="mt-10 text-center text-gray-500">Não tens conta? <span onClick={() => navigate('welcome')} className="text-primary font-bold cursor-pointer hover:underline">Criar aqui</span></p>
          </motion.div>
        )}

        {screen === 'profile_settings' && (
          <motion.div key="profile_settings" className="h-screen p-8 pt-20 flex flex-col overflow-y-auto pb-24">
             <div className="flex flex-col items-center mb-10">
                <div className="w-32 h-32 bg-primary/20 rounded-[40px] flex items-center justify-center text-5xl border-2 border-primary/40 mb-6 overflow-hidden relative shadow-2xl">
                   {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : '👦'}
                   {avatarLoading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
                </div>
                <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                <button onClick={() => avatarInputRef.current?.click()} className="bg-primary/10 text-primary px-6 py-2 rounded-full text-xs font-extrabold mb-10 border border-primary/20">Mudar Foto</button>
                
                <h2 className="text-3xl font-bold text-center mb-2">{userProfile?.name || 'Utilizador'}</h2>
                <p className="text-gray-500 font-medium mb-12">{userEmail}</p>
                
                <div className="w-full space-y-4">
                   <div className="bg-card-bg p-6 rounded-[32px] border border-gray-800 flex justify-between items-center">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><TrendingUp size={20} /></div> <span className="font-bold">Meta Calórica</span></div>
                      <span className="font-bold">2000 kcal</span>
                   </div>
                   <button onClick={() => db.auth.signOut()} className="w-full py-5 border border-red-500/20 text-red-500 font-extrabold rounded-[32px] flex items-center justify-center gap-3 bg-red-500/5 hover:bg-red-500/10 transition-all">Sair da Conta</button>
                </div>
             </div>
             <BottomNav active="profile_settings" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'chat' && (
          <motion.div key="chat" className="h-screen flex flex-col">
            <div className="p-8 pt-20 flex justify-between items-center shrink-0 border-b border-gray-800/50 bg-dark-bg/80 backdrop-blur-xl z-20">
              <div><h1 className="text-3xl font-bold">Kidia IA</h1><p className="text-xs text-primary font-bold uppercase tracking-widest">Especialista em Nutrição</p></div>
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-black shadow-lg shadow-primary/20"><Sparkles size={24} /></div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 space-y-6 py-8 pb-32">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-5 rounded-[28px] max-w-[85%] text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-black font-medium shadow-lg shadow-primary/10 rounded-tr-none' : 'bg-card-bg border border-gray-800 text-gray-200 rounded-tl-none'}`}>{m.content}</div>
                </div>
              ))}
              {isChatLoading && <div className="flex justify-start"><div className="bg-card-bg border border-gray-800 p-4 rounded-3xl rounded-tl-none"><Loader2 className="animate-spin text-primary" size={20} /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="absolute bottom-24 inset-x-0 p-6 flex gap-3 bg-gradient-to-t from-dark-bg via-dark-bg to-transparent">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-card-bg border border-gray-800 p-5 rounded-[24px] outline-none focus:border-primary transition-all text-sm shadow-2xl" placeholder="Ex: Que benefícios tem a Kizaca?" />
              <button onClick={handleSendMessage} className="w-14 h-14 bg-primary rounded-[24px] flex items-center justify-center text-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"><Send size={20} /></button>
            </div>
            <BottomNav active="chat" onNavigate={navigate} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
