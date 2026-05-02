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
  ShoppingBag,
  Award,
  Activity,
  Heart
} from 'lucide-react';
import { sendMessageToAI, ChatMessage } from './services/chatService';

// --- Types ---
type Screen = 'welcome' | 'onboarding' | 'profile' | 'dashboard' | 'capture' | 'result' | 'login' | 'signup' | 'terms' | 'privacy' | 'mealPlan' | 'community' | 'history' | 'profile_settings' | 'chat' | 'market' | 'healthReport';

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
  const [sugarFreeDays, setSugarFreeDays] = useState(3);

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
  const avgHealthScore = allScans.length > 0 ? Math.round(allScans.reduce((acc, s) => acc + (s.score || 0), 0) / allScans.length) : 0;

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
                 <button onClick={() => onboardingStep < 1 ? setOnboardingStep(onboardingStep+1) : navigate('profile')} className="mt-auto mb-12 w-full py-4 bg-primary text-black font-bold rounded-full shrink-0">Próximo</button>
              </div>
           </motion.div>
        )}

        {screen === 'dashboard' && (
          <motion.div key="dashboard" className="h-screen pb-32 overflow-y-auto px-6 pt-12">
            <header className="flex justify-between items-center mb-8">
              <div><h2 className="text-2xl font-bold">Olá, {userProfile?.name?.split(' ')[0] || 'Kidia'}!</h2><p className="text-gray-500 text-sm">Vê o teu progresso hoje.</p></div>
              <button onClick={() => navigate('profile_settings')} className="w-12 h-12 rounded-2xl bg-card-bg border border-gray-800 flex items-center justify-center overflow-hidden">
                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : <User size={24} />}
              </button>
            </header>

            {/* Health Report Card Mini */}
            <div onClick={() => navigate('healthReport')} className="bg-gradient-to-br from-primary to-green-500 p-6 rounded-[32px] mb-6 cursor-pointer relative overflow-hidden shadow-lg shadow-primary/20 active:scale-95 transition-all">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center text-black"><Activity size={24} /></div>
                  <span className="text-black font-extrabold text-xs bg-white/20 px-3 py-1 rounded-full">VER RELATÓRIO</span>
               </div>
               <h4 className="text-black font-bold text-xl mb-1">Health Score: {avgHealthScore}%</h4>
               <p className="text-black/60 text-xs font-medium">Análise baseada em {allScans.length} refeições</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-card-bg border border-gray-800 p-6 rounded-[32px] relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-bold text-[10px] uppercase">Sem Açúcar</span><Award size={20} className="text-orange-500" /></div>
                  <span className="text-2xl font-bold">{sugarFreeDays} <span className="text-xs text-gray-500 font-normal">dias</span></span>
                  <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{ width: '40%' }} /></div>
               </div>
               <div onClick={() => setWaterCount(waterCount + 1)} className="bg-card-bg border border-gray-800 p-6 rounded-[32px] cursor-pointer active:scale-95 transition-all">
                  <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-bold text-[10px] uppercase">Água</span><Droplets size={20} className="text-blue-500" /></div>
                  <span className="text-2xl font-bold">{waterCount * 250} <span className="text-xs text-gray-500 font-normal">ml</span></span>
               </div>
            </div>

            <div className="bg-primary p-8 rounded-[40px] flex items-center justify-between mb-8 cursor-pointer shadow-xl shadow-primary/10" onClick={() => navigate('capture')}>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-black/10 rounded-2xl flex items-center justify-center text-black"><Camera size={32} /></div>
                <div><h4 className="font-bold text-black text-xl">Capturar Prato</h4><p className="text-black/60 text-sm">Análise IA Instantânea</p></div>
              </div>
              <ChevronRight className="text-black" size={28} />
            </div>

            <BottomNav active="dashboard" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'healthReport' && (
          <motion.div key="healthReport" className="h-screen overflow-y-auto px-6 pt-12 pb-32">
            <header className="flex items-center gap-4 mb-8">
              <button onClick={() => navigate('dashboard')} className="w-10 h-10 bg-card-bg rounded-xl flex items-center justify-center border border-gray-800"><ArrowLeft size={20} /></button>
              <h1 className="text-2xl font-bold">Relatório de Saúde</h1>
            </header>

            <div className="space-y-6">
               <div className="bg-card-bg border border-gray-800 p-8 rounded-[40px] text-center">
                  <div className="relative w-32 h-32 mx-auto mb-6">
                     <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path className="text-gray-800" strokeDasharray="100, 100" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-primary" strokeDasharray={`${avgHealthScore}, 100`} stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-bold">{avgHealthScore}%</span></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Índice de Saúde Kidia</h3>
                  <p className="text-gray-500 text-sm">O teu desempenho nutricional médio com base nas tuas refeições.</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-[32px]">
                     <div className="flex items-center gap-2 mb-4 text-primary"><Flame size={18} /><span className="font-bold text-xs uppercase">Calorias</span></div>
                     <span className="text-xl font-bold">{totalCaloriesToday}</span>
                     <p className="text-gray-500 text-[10px]">Média diária</p>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-[32px]">
                     <div className="flex items-center gap-2 mb-4 text-orange-500"><Award size={18} /><span className="font-bold text-xs uppercase">Açúcar</span></div>
                     <span className="text-xl font-bold">{sugarFreeDays} Dias</span>
                     <p className="text-gray-500 text-[10px]">Sequência atual</p>
                  </div>
               </div>

               <div className="bg-card-bg border border-gray-800 p-8 rounded-[40px]">
                  <h4 className="font-bold mb-6 flex items-center gap-3"><Heart size={20} className="text-red-500" /> Dicas Personalizadas</h4>
                  <ul className="space-y-4">
                     <li className="flex gap-4 items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                        <p className="text-sm text-gray-400">Aumenta o consumo de Kizaca para melhorar os níveis de ferro.</p>
                     </li>
                     <li className="flex gap-4 items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                        <p className="text-sm text-gray-400">Estás a 3 dias sem açúcar. Mantém o foco para melhorar a tua energia!</p>
                     </li>
                  </ul>
               </div>
            </div>
            <BottomNav active="dashboard" onNavigate={navigate} />
          </motion.div>
        )}

        {/* ... Rest of Screens ... */}
        {screen === 'history' && (
          <motion.div key="history" className="h-screen overflow-y-auto px-6 pt-12 pb-32">
            <header className="flex items-center gap-4 mb-8">
              <button onClick={() => navigate('dashboard')} className="w-10 h-10 bg-card-bg rounded-xl flex items-center justify-center border border-gray-800"><ArrowLeft size={20} /></button>
              <h1 className="text-3xl font-bold">Meu Histórico</h1>
            </header>
            <div className="space-y-4">
              {allScans.length === 0 ? <div className="text-center py-20 text-gray-500">Sem refeições.</div> : allScans.map((s, i) => (
                <div key={i} className="bg-card-bg border border-gray-800 p-4 rounded-3xl flex gap-4">
                  <img src={s.image_url} className="w-20 h-20 rounded-2xl object-cover" />
                  <div className="flex-1 py-1"><h4 className="font-bold">{s.item_name}</h4><p className="text-xs text-gray-500 mb-2">{new Date(s.created_at).toLocaleDateString()}</p><div className="flex gap-3"><span className="text-xs font-bold text-primary">{s.calories} kcal</span></div></div>
                </div>
              ))}
            </div>
            <BottomNav active="history" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'signup' && (
          <motion.div key="signup" className="h-screen p-8 pt-20 flex flex-col overflow-y-auto">
            <h1 className="text-4xl font-bold mb-4">Bem-vindo!</h1>
            <form onSubmit={handleSignUp} className="space-y-5">
              <input type="text" placeholder="Nome" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none" required />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none" required />
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none" required />
              <button type="submit" className="w-full py-5 bg-primary text-black font-extrabold rounded-full text-lg mt-6 shadow-xl shadow-primary/10">Criar Conta</button>
            </form>
          </motion.div>
        )}

        {screen === 'login' && (
          <motion.div key="login" className="h-screen p-8 pt-20 flex flex-col overflow-y-auto">
            <h1 className="text-4xl font-bold mb-4">Olá de novo!</h1>
            <form onSubmit={handleLogin} className="space-y-5">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none" required />
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-card-bg border border-gray-800 rounded-[24px] outline-none" required />
              <button type="submit" className="w-full py-5 bg-primary text-black font-extrabold rounded-full text-lg mt-6 shadow-xl shadow-primary/10">Entrar</button>
            </form>
          </motion.div>
        )}

        {screen === 'result' && (
          <motion.div key="result" className="h-screen overflow-y-auto px-6 pt-12 pb-32">
            <button onClick={() => navigate('dashboard')} className="mb-6"><ArrowLeft size={24} /></button>
            <div className="relative rounded-[48px] overflow-hidden mb-8 shadow-2xl">
              <img src={analysisImageUrl || ""} className="w-full aspect-square object-cover" />
              <div className="absolute top-6 right-6 bg-primary px-6 py-2 rounded-full text-black font-extrabold text-lg shadow-2xl">{analysisResult?.score}%</div>
              <div className="absolute bottom-0 inset-x-0 p-10 bg-gradient-to-t from-black to-transparent text-center">
                 <h3 className="text-4xl font-bold mb-2">{analysisResult?.item_name}</h3>
                 <span className="text-primary font-bold text-xl">{analysisResult?.calories} kcal</span>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 p-8 rounded-[40px]">
               <h5 className="text-primary font-bold mb-6 flex items-center gap-3 text-lg"><Sparkles size={24} /> Benefícios</h5>
               <ul className="space-y-4">
                 {analysisResult?.benefits?.map((b, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-4"><Check size={14} className="text-primary mt-1" /> {b}</li>)}
               </ul>
            </div>
            <button onClick={() => navigate('dashboard')} className="w-full py-5 bg-primary text-black font-extrabold rounded-full shadow-2xl mt-8">Continuar</button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
