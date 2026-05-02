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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  return (
    <div className="min-h-screen max-w-md mx-auto bg-dark-bg text-white shadow-2xl overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {screen === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen flex flex-col">
            <div className="h-[55%] relative">
              <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-bg to-transparent" />
            </div>
            <div className="flex-1 px-8 pt-10 rounded-t-[40px] -mt-12 bg-dark-bg z-10 flex flex-col">
               <h1 className="text-5xl font-bold font-display mb-4">Kidia Nutri</h1>
               <p className="text-gray-400 mb-10">O teu guia nutricional pessoal. Come bem com o que tens na mesa.</p>
               <div className="mt-auto pb-12 space-y-4">
                 <button onClick={() => navigate('onboarding')} className="w-full py-4 bg-primary text-black font-bold rounded-full text-lg">Começar</button>
                 <button onClick={() => navigate('login')} className="w-full py-4 border border-gray-700 text-gray-400 rounded-full">Já tenho conta</button>
               </div>
            </div>
          </motion.div>
        )}

        {screen === 'onboarding' && (
           <motion.div key="onboarding" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="h-screen flex flex-col">
              <img src={ONBOARDING_STEPS[onboardingStep].image} className="h-[50%] object-cover" />
              <div className="flex-1 px-8 pt-10 bg-dark-bg flex flex-col">
                 <h2 className="text-3xl font-bold mb-4">{ONBOARDING_STEPS[onboardingStep].title}</h2>
                 <p className="text-gray-400">{ONBOARDING_STEPS[onboardingStep].desc}</p>
                 <button onClick={() => onboardingStep < 3 ? setOnboardingStep(onboardingStep+1) : navigate('profile')} className="mt-auto mb-12 w-full py-4 bg-primary text-black font-bold rounded-full">Próximo</button>
              </div>
           </motion.div>
        )}

        {screen === 'profile' && (
           <motion.div key="profile" className="h-screen p-8 pt-20 flex flex-col">
              <h2 className="text-3xl font-bold mb-8">Para quem vais cuidar hoje?</h2>
              <div className="space-y-4">
                {PROFILES.map(p => (
                  <button key={p.id} onClick={() => setSelectedProfile(p.id)} className={`w-full p-6 rounded-3xl border-2 text-left ${selectedProfile === p.id ? 'border-primary bg-primary/5' : 'border-gray-800 bg-card-bg'}`}>
                    <span className="text-4xl block mb-2">{p.emoji}</span>
                    <h3 className="font-bold text-lg">{p.label}</h3>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </button>
                ))}
              </div>
              <button disabled={!selectedProfile} onClick={() => navigate('signup')} className="mt-auto mb-12 w-full py-4 bg-primary text-black font-bold rounded-full disabled:opacity-50">Continuar</button>
           </motion.div>
        )}

        {screen === 'signup' && (
          <motion.div key="signup" className="h-screen p-8 pt-20 flex flex-col">
            <h1 className="text-3xl font-bold mb-8">Criar Conta</h1>
            <form onSubmit={handleSignUp} className="space-y-4">
              <input type="text" placeholder="Nome" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl outline-none" required />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl outline-none" required />
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl outline-none" required />
              <button type="submit" className="w-full py-4 bg-primary text-black font-bold rounded-full">Registar</button>
            </form>
            <p className="mt-8 text-center text-gray-500">Já tens conta? <span onClick={() => navigate('login')} className="text-primary font-bold cursor-pointer">Entrar</span></p>
          </motion.div>
        )}

        {screen === 'login' && (
          <motion.div key="login" className="h-screen p-8 pt-20 flex flex-col">
            <h1 className="text-3xl font-bold mb-8">Login</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl outline-none" required />
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl outline-none" required />
              <button type="submit" className="w-full py-4 bg-primary text-black font-bold rounded-full">Entrar</button>
            </form>
          </motion.div>
        )}

        {screen === 'dashboard' && (
          <motion.div key="dashboard" className="h-screen pb-24 overflow-y-auto px-6 pt-12">
            <header className="flex justify-between items-center mb-8">
              <div><h2 className="text-2xl font-bold">Olá, {userProfile?.name || 'Kidia'}!</h2><p className="text-gray-500 text-sm">Vê o teu progresso hoje.</p></div>
              <button onClick={() => navigate('profile_settings')} className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center"><User size={20} /></button>
            </header>
            <div className="bg-primary p-6 rounded-[32px] flex items-center justify-between mb-8 cursor-pointer" onClick={() => navigate('capture')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center text-black"><Camera size={24} /></div>
                <div><h4 className="font-bold text-black text-lg">Analisar Prato</h4><p className="text-black/60 text-xs">Usa a câmara</p></div>
              </div>
              <ChevronRight className="text-black" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-card-bg p-6 rounded-3xl border border-gray-800">
                 <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Calorias</span>
                 <span className="text-2xl font-bold text-primary">{scansToday.reduce((acc, s) => acc + (s.calories || 0), 0)}</span>
               </div>
               <div className="bg-card-bg p-6 rounded-3xl border border-gray-800">
                 <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Refeições</span>
                 <span className="text-2xl font-bold">{scansToday.length}</span>
               </div>
            </div>
            <BottomNav active="dashboard" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'capture' && (
          <motion.div key="capture" className="h-screen bg-dark-bg p-8 pt-20">
            <button onClick={() => navigate('dashboard')} className="mb-8"><ArrowLeft size={24} /></button>
            <h1 className="text-3xl font-bold mb-2">Capturar Foto</h1>
            <p className="text-gray-500 mb-8">Tira uma foto do teu prato para analisar.</p>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-square bg-card-bg rounded-[40px] border-2 border-dashed border-gray-800 flex flex-col items-center justify-center gap-4">
              {loading ? <Loader2 className="animate-spin text-primary" size={48} /> : <Camera size={48} className="text-gray-600" />}
              <span className="text-gray-500 font-bold">{loading ? 'Analisando...' : 'Abrir Câmara'}</span>
            </button>
            <BottomNav active="capture" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'result' && (
          <motion.div key="result" className="h-screen overflow-y-auto px-6 pt-12 pb-24">
            <button onClick={() => navigate('dashboard')} className="mb-6"><ArrowLeft size={24} /></button>
            <div className="relative rounded-[40px] overflow-hidden mb-8 shadow-2xl">
              <img src={analysisImageUrl || ""} className="w-full aspect-square object-cover" />
              <div className="absolute top-4 right-4 bg-primary px-4 py-1.5 rounded-full text-black font-bold text-sm shadow-xl">{analysisResult?.score}%</div>
              <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black to-transparent text-center">
                 <h3 className="text-3xl font-bold">{analysisResult?.item_name}</h3>
                 <span className="text-primary font-bold text-xl">{analysisResult?.calories} kcal</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {[{ l: 'Prot', v: analysisResult?.protein, c: 'text-primary' }, { l: 'Carb', v: analysisResult?.carbs, c: 'text-orange-500' }, { l: 'Gord', v: analysisResult?.fat, c: 'text-blue-500' }, { l: 'Fibra', v: analysisResult?.fiber, c: 'text-purple-500' }].map(m => (
                <div key={m.l} className="bg-card-bg p-3 rounded-2xl border border-gray-800 text-center">
                  <span className="text-[8px] text-gray-500 block mb-1 uppercase font-bold">{m.l}</span>
                  <span className={`text-xs font-bold ${m.c}`}>{m.v}g</span>
                </div>
              ))}
            </div>
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl mb-8">
               <h5 className="text-primary font-bold mb-4 flex items-center gap-2"><Sparkles size={16} /> Benefícios</h5>
               <ul className="space-y-2">
                 {analysisResult?.benefits?.map((b, i) => <li key={i} className="text-xs text-gray-300 flex items-start gap-2"><Check size={12} className="text-primary mt-0.5" /> {b}</li>)}
               </ul>
            </div>
            <button onClick={() => navigate('dashboard')} className="w-full py-4 bg-primary text-black font-bold rounded-full shadow-lg">Fechar Resultado</button>
          </motion.div>
        )}

        {screen === 'profile_settings' && (
          <motion.div key="profile_settings" className="h-screen p-8 pt-20 flex flex-col">
             <div className="flex flex-col items-center mb-10">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-4xl border-2 border-primary/40 mb-4 overflow-hidden">
                   {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : '👦'}
                </div>
                <h2 className="text-2xl font-bold">{userProfile?.name || 'Utilizador'}</h2>
                <p className="text-gray-500 text-sm">{userEmail}</p>
                <button onClick={() => db.auth.signOut()} className="mt-12 text-red-500 font-bold flex items-center gap-2"><Moon size={18} /> Sair da Conta</button>
             </div>
             <BottomNav active="profile_settings" onNavigate={navigate} />
          </motion.div>
        )}

        {screen === 'chat' && (
          <motion.div key="chat" className="h-screen flex flex-col">
            <div className="p-8 pt-20 flex justify-between items-center"><h1 className="text-3xl font-bold">Kidia Chat</h1><Sparkles className="text-primary" /></div>
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-32">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-3xl max-w-[80%] ${m.role === 'user' ? 'bg-primary text-black' : 'bg-card-bg border border-gray-800'}`}>{m.content}</div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-24 inset-x-0 p-6 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-card-bg border border-gray-800 p-4 rounded-full outline-none" placeholder="Pergunta-me algo..." />
              <button onClick={handleSendMessage} className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-black"><Send size={18} /></button>
            </div>
            <BottomNav active="chat" onNavigate={navigate} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
