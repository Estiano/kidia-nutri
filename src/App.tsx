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

// --- Components ---
// Removidos (estão em ./components)

// --- Main App ---

// --- Main App ---

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

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch Profile
      const { data: profile } = await db.profiles.get(userId);
      if (profile) setUserProfile(profile);

      // Fetch Scans for today
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
      await fetchUserData(session.user.id); // Refresh dashboard stats
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
      // Profile is handled inside db.auth.signUp for mock, 
      // or we can manually insert for real supabase if needed (db handles it)
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

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-dark-bg text-white shadow-2xl">
      <AnimatePresence mode="wait">
        
        {/* --- Welcome Screen --- */}
        {screen === 'welcome' && (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-screen bg-black"
          >
            <div className="relative h-[55%]">
              <img 
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop" 
                alt="Healthy food" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-dark-bg to-transparent" />
            </div>
            
            <div className="flex-1 bg-dark-bg px-8 pt-10 rounded-t-[40px] -mt-12 relative z-10 flex flex-col items-center">
              <div className="w-full">
                <div className="inline-block px-4 py-1.5 border border-primary text-primary rounded-full text-[10px] font-bold tracking-widest uppercase font-display mb-6">
                  Nutrição Personalizada
                </div>
                <h1 className="text-5xl font-bold font-display mb-4 text-white">Kidia Nutri</h1>
                <p className="text-gray-400 text-base leading-relaxed mb-10 max-w-[90%]">
                  O teu guia nutricional pessoal. Fotografa qualquer prato e descobre tudo sobre a tua alimentação.
                </p>
              </div>

              <div className="w-full space-y-4 mt-auto pb-12">
                <button 
                  onClick={() => { setOnboardingStep(0); navigate('onboarding'); }}
                  className="w-full py-4 bg-primary text-black font-extrabold rounded-full flex items-center justify-center gap-2 text-lg active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  Começar a jornada <ChevronRight size={20} />
                </button>
                
                <button 
                  onClick={() => navigate('dashboard')}
                  className="w-full py-4 bg-transparent border border-gray-700 text-gray-400 font-bold rounded-full flex items-center justify-center gap-2 text-sm active:scale-95 transition-all hover:border-gray-600"
                >
                  <div className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-600 rounded-full" />
                  </div>
                  Testar sem conta (limitado)
                </button>

                <p className="text-center text-sm text-gray-400 pt-2">
                  Já tenho conta — <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('login')}>Entrar</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- Onboarding Screens --- */}
        {screen === 'onboarding' && (() => {
          const step = ONBOARDING_STEPS[onboardingStep];
          const Icon = step.icon;
          
          return (
            <motion.div 
              key={`onboarding-${onboardingStep}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="flex flex-col h-screen bg-black overflow-y-auto"
            >
              <div className="relative shrink-0 h-[55%]">
                <img 
                  src={step.image} 
                  alt="Onboarding" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-dark-bg to-transparent" />
                
                <button 
                  onClick={prevOnboardingStep}
                  className="absolute top-12 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>
              
              <div className="flex-1 bg-dark-bg px-8 pt-10 rounded-t-[40px] -mt-12 relative z-10 flex flex-col items-center">
                <div className="w-full">
                  {step.tag ? (
                    <div className={`inline-block px-4 py-1.5 border rounded-full text-[10px] font-bold tracking-widest uppercase font-display mb-6 ${step.tagColor}`}>
                      {step.tag}
                    </div>
                  ) : Icon ? (
                    <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mb-6">
                      <Icon size={22} />
                    </div>
                  ) : null}
                  
                  <h2 className="text-3xl font-bold font-display mb-4 text-white leading-tight">
                    {step.title}
                  </h2>
                  <p className="text-gray-400 text-base leading-relaxed mb-10">
                    {step.desc}
                  </p>
                </div>

                <div className="w-full mt-auto pb-12 flex flex-col items-center gap-8">
                  {/* Dots indicator */}
                  <div className="flex gap-2">
                    {ONBOARDING_STEPS.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === idx ? 'w-8 bg-primary' : 'w-1.5 bg-gray-800'}`}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={nextOnboardingStep}
                    className="w-full py-4 bg-primary text-black font-extrabold rounded-full flex items-center justify-center gap-2 text-lg active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Continuar' : 'Próximo'}
                    {onboardingStep < ONBOARDING_STEPS.length - 1 && <ChevronRight size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* --- Login Screen --- */}
        {screen === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col h-screen px-8 pt-20 overflow-y-auto"
          >
            <button 
              onClick={() => navigate('welcome')}
              className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center mb-8 border border-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
            
            <h1 className="text-4xl font-bold font-display mb-2">Bem-vindo de volta!</h1>
            <p className="text-gray-500 mb-10 text-lg">Faz login para continuar a cuidar da tua saúde.</p>
            
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl mb-6 text-sm">
                {errorMessage}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">Palavra-passe</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
                <p className="text-right text-xs text-primary font-bold cursor-pointer pt-1">Esqueci-me da senha</p>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-black font-extrabold rounded-full text-lg shadow-lg shadow-primary/20 mt-4 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
              </button>
            </form>

            <div className="mt-auto pb-12 pt-8 text-center">
              <p className="text-gray-500 text-sm">
                Não tens conta? <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('signup')}>Regista-te agora</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* --- Signup Screen --- */}
        {screen === 'signup' && (
          <motion.div 
            key="signup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-screen px-8 pt-20 overflow-y-auto"
          >
            <button 
              onClick={() => navigate('login')}
              className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center mb-8 border border-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
            
            <h1 className="text-4xl font-bold font-display mb-2">Cria a tua conta</h1>
            <p className="text-gray-500 mb-10 text-lg">Começa hoje a tua jornada para uma vida mais saudável.</p>
            
            {errorMessage && (
              <div className={`p-4 rounded-2xl mb-6 text-sm ${errorMessage.includes('confirmar') ? 'bg-primary/10 border border-primary/50 text-white' : 'bg-red-500/10 border border-red-500/50 text-red-500'}`}>
                {errorMessage}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSignUp}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">Nome completo</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="O teu nome"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">Palavra-passe</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>

              <div className="flex items-start gap-3 px-1">
                <button 
                  type="button"
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`flex items-center justify-center w-6 h-6 rounded border transition-colors mt-0.5 shrink-0 ${termsAccepted ? 'bg-primary border-primary' : 'bg-card-bg border-gray-700'}`}
                >
                  {termsAccepted && <Check size={14} className="text-black" />}
                </button>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ao criar uma conta, aceito os <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('terms')}>Termos de Uso</span> e a <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('privacy')}>Política de Privacidade</span> do Kidia Nutri.
                </p>
              </div>

              <button 
                type="submit"
                disabled={loading || !termsAccepted}
                className={`w-full py-4 font-extrabold rounded-full text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                  loading || !termsAccepted 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-primary text-black shadow-primary/20 active:scale-95'
                }`}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Registar conta'}
              </button>
            </form>

            <div className="mt-8 pb-12 text-center">
              <p className="text-gray-500 text-sm">
                Já tens conta? <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('login')}>Faz login</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* --- Terms of Use Screen --- */}
        {screen === 'terms' && (
          <motion.div 
            key="terms"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex flex-col h-screen px-8 pt-12 overflow-y-auto bg-dark-bg"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-display">Termos de Uso</h2>
              <button onClick={() => navigate('signup')} className="text-gray-500 font-bold">Fechar</button>
            </div>
            
            <div className="prose prose-invert max-w-none text-gray-400 text-sm space-y-6 pb-12">
              <section>
                <h3 className="text-white font-bold text-lg mb-2">1. Aceitação dos Termos</h3>
                <p>Ao utilizar o Kidia Nutri, você concorda em cumprir e ficar vinculado a estes termos. O Kidia Nutri é um guia nutricional baseado em IA e não substitui o aconselhamento médico profissional.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">2. Uso do Serviço</h3>
                <p>Você é responsável por manter a confidencialidade de sua conta. O serviço deve ser utilizado apenas para fins lícitos e de acordo com as leis de Angola e internacionais aplicáveis.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">3. Limitação de Responsabilidade</h3>
                <p>As análises nutricionais são estimativas geradas por inteligência artificial. Sempre consulte um nutricionista ou médico antes de fazer mudanças significativas em sua dieta.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">4. Propriedade Intelectual</h3>
                <p>Todo o conteúdo do aplicativo, incluindo logotipos e algoritmos, é propriedade exclusiva do Kidia Nutri.</p>
              </section>
            </div>
          </motion.div>
        )}

        {/* --- Privacy Policy Screen --- */}
        {screen === 'privacy' && (
          <motion.div 
            key="privacy"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex flex-col h-screen px-8 pt-12 overflow-y-auto bg-dark-bg"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-display">Privacidade</h2>
              <button onClick={() => navigate('signup')} className="text-gray-500 font-bold">Fechar</button>
            </div>
            
            <div className="prose prose-invert max-w-none text-gray-400 text-sm space-y-6 pb-12">
              <section>
                <h3 className="text-white font-bold text-lg mb-2">1. Coleta de Dados</h3>
                <p>Coletamos seu nome, e-mail e fotos de refeições para processar a análise nutricional. Para personalizar o serviço, também coletamos dados de perfil como idade e objetivos.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">2. Uso de Imagens</h3>
                <p>As fotos dos pratos são processadas pela nossa IA para identificar alimentos e não são compartilhadas com terceiros fora do escopo funcional do serviço.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">3. Segurança</h3>
                <p>Utilizamos tecnologias de ponta e protocolos de segurança para garantir que seus dados pessoais permaneçam protegidos contra acesso não autorizado.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">4. Seus Direitos</h3>
                <p>Você pode solicitar a exclusão de sua conta e de todos os seus dados a qualquer momento diretamente nas configurações do seu perfil.</p>
              </section>
            </div>
          </motion.div>
        )}

        {/* --- Profile Choice Screen --- */}
        {screen === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="flex flex-col h-screen px-8 pt-20 overflow-y-auto"
          >
            <div className="shrink-0">
              <h2 className="text-4xl font-bold font-display mb-2 flex items-center gap-3">
                Para quem vais cuidar hoje? 💚
              </h2>
              <p className="text-gray-400 mb-10 text-lg">
                Escolhe o perfil para personalizar as recomendações
              </p>
            </div>
            
            <div className="space-y-4 mb-12">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfile(p.id)}
                  className={`w-full p-5 rounded-3xl text-left transition-all border-2 flex items-start gap-4 ${
                    selectedProfile === p.id 
                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' 
                    : 'bg-card-bg border-transparent hover:border-gray-800'
                  }`}
                >
                  <span className="text-4xl shrink-0">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`font-bold text-lg ${selectedProfile === p.id ? 'text-primary' : 'text-white'}`}>{p.label}</h3>
                      {selectedProfile === p.id && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <Check size={14} className="text-black" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-snug">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-auto pb-12 shrink-0">
              <button 
                disabled={!selectedProfile}
                onClick={() => navigate('signup')}
                className={`w-full py-4 rounded-full font-bold text-lg transition-all ${
                  selectedProfile 
                  ? 'bg-primary text-black active:scale-95' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continuar
              </button>
            </div>
          </motion.div>
        )}

        {/* --- Dashboard Screen --- */}
        {screen === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen pb-24 overflow-y-auto px-6 pt-12"
          >
            <header className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold font-display leading-tight flex items-center gap-2">
                  Olá, {userProfile?.name || userEmail.split('@')[0]} 👋
                </h2>
                <p className="text-gray-500">Sábado, 18 De Abril</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('profile_settings')} className="text-gray-500 hover:text-primary transition-colors">
                  <User size={24} />
                </button>
                <div className="relative">
                  <Bell size={24} className="text-gray-400" />
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-bg" />
                </div>
              </div>
            </header>

            <section className="bg-primary/5 border border-primary/30 rounded-2xl p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Flame className="text-orange-500" fill="currentColor" size={28} />
                <div>
                  <h4 className="font-bold text-sm">{userProfile?.current_streak || 0} Dias Seguidos Cuidando de Ti</h4>
                  <p className="text-xs text-primary">Continua assim — és incrível!</p>
                </div>
              </div>
              <button className="bg-primary text-black text-xs font-bold px-4 py-2 rounded-full">Manter</button>
            </section>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-card-bg p-4 rounded-2xl text-center flex flex-col items-center">
                <span className="text-2xl font-bold font-display">{scansToday.length}</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">🍽️ Refeições</span>
              </div>
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl text-center flex flex-col items-center">
                <span className="text-2xl font-bold font-display text-primary">
                  {scansToday.reduce((acc, s) => acc + (Number(s.calories) || 0), 0).toFixed(0)}
                </span>
                <span className="text-[10px] text-primary flex items-center gap-1 mt-1">🔥 kcal hoje</span>
              </div>
              <div className="bg-card-bg p-4 rounded-2xl text-center flex flex-col items-center">
                <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center mb-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </div>
                <span className="text-[10px] font-bold">Controlar</span>
                <span className="text-[10px] text-gray-500">Objectivo</span>
              </div>
            </div>

            <section className="bg-card-bg p-6 rounded-3xl mb-8 border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Calorias hoje</h3>
                <span className="text-gray-500 text-sm font-display">
                  {scansToday.reduce((acc, s) => acc + (Number(s.calories) || 0), 0).toFixed(0)} / {userProfile?.daily_calorie_target || 2000} kcal
                </span>
              </div>
              <div className="w-full h-3 bg-gray-900 rounded-full mb-8">
                <div 
                  className="h-full bg-primary rounded-full blur-[1px] transition-all duration-500" 
                  style={{ width: `${Math.min(100, (scansToday.reduce((acc, s) => acc + (Number(s.calories) || 0), 0) / (userProfile?.daily_calorie_target || 2000)) * 100)}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-primary/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="block text-[10px] text-primary font-bold ml-4 mb-2">Proteína</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.protein) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.protein), 0))} />
                </div>
                <div className="p-3 border border-orange-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="block text-[10px] text-orange-500 font-bold ml-4 mb-2">Carbs</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.carbs) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.carbs), 0) / 2)} colorClass="bg-orange-500" />
                </div>
                <div className="p-3 border border-blue-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="block text-[10px] text-blue-500 font-bold ml-4 mb-2">Gordura</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.fat) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.fat), 0))} colorClass="bg-blue-500" />
                </div>
                <div className="p-3 border border-purple-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="block text-[10px] text-purple-500 font-bold ml-4 mb-2">Fibras</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.fiber) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.fiber), 0) * 2)} colorClass="bg-purple-500" />
                </div>
              </div>
            </section>

            <button 
              onClick={() => navigate('capture')}
              className="bg-primary p-6 rounded-3xl flex items-center justify-between mb-8 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-black/10 rounded-full flex items-center justify-center">
                  <Camera size={28} className="text-black" />
                </div>
                <div className="text-left">
                  <h4 className="text-black font-bold text-lg leading-tight">Consultar Análise da Nossa Equipa</h4>
                  <p className="text-black/60 text-sm leading-snug max-w-[180px]">Fotografa a tua refeição e recebe a análise completa</p>
                </div>
              </div>
              <ChevronRight className="text-black" />
            </button>

            <section className="bg-card-bg p-6 rounded-3xl border border-gray-800 relative z-0">
               <div className="absolute -top-3 -left-3">
                  <div className="w-10 h-10 bg-[#d97706]/20 border border-[#d97706]/30 rounded-full flex items-center justify-center">
                    <Lightbulb size={20} className="text-[#d97706]" />
                  </div>
               </div>
               <h4 className="text-[#d97706] font-bold text-sm mb-3">Dica do Especialista</h4>
               <p className="italic text-gray-300 leading-relaxed">
                 "As folhas de mandioca (saka-saka) são riquíssimas em ferro e cálcio. Um superfood local essencial para atingir as tuas metas."
               </p>
            </section>

            <BottomNav active="dashboard" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- History Screen --- */}
        {screen === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen pb-24 overflow-y-auto"
          >
            <div className="px-8 pt-12 mb-8">
              <h1 className="text-3xl font-bold font-display mb-1">Histórico</h1>
              <p className="text-gray-500 text-sm">Tuas análises nutricionais passadas</p>
            </div>

            <div className="px-6 space-y-4">
              {scansToday.length > 0 ? (
                scansToday.map((scan) => (
                  <button 
                    key={scan.id} 
                    onClick={() => {
                      setAnalysisResult({
                        item_name: scan.item_name,
                        calories: scan.calories,
                        protein: scan.protein,
                        carbs: scan.carbs,
                        fat: scan.fat,
                        fiber: scan.fiber,
                        score: scan.score,
                        score_label: scan.score_label,
                        recommendation: scan.recommendation
                      });
                      setAnalysisImageUrl(scan.image_url);
                      navigate('result');
                    }}
                    className="w-full bg-card-bg border border-gray-800 p-4 rounded-3xl flex items-center gap-4 text-left active:scale-95 transition-transform"
                  >
                    <img 
                      src={scan.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"} 
                      className="w-16 h-16 rounded-2xl object-cover" 
                      alt={scan.item_name}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm mb-0.5">{scan.item_name}</h4>
                        <ChevronRight size={14} className="text-gray-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 mb-2">{new Date(scan.created_at || scan.date).toLocaleDateString()}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-primary">{scan.calories} kcal</span>
                        <div className="flex items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                           <span className="text-[10px] text-gray-400">{scan.score_label}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-800">
                    <History size={32} className="text-gray-700" />
                  </div>
                  <p className="text-gray-500">Ainda não tens histórico de hoje.</p>
                </div>
              )}
            </div>
            <BottomNav active="history" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Meal Plan Screen --- */}
        {screen === 'mealPlan' && (
          <motion.div 
            key="mealPlan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen pb-24 overflow-y-auto"
          >
            <div className="px-8 pt-12 mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold font-display mb-1">Plano alimentar</h1>
                <p className="text-gray-500 text-sm italic">Manutenção · 2000 kcal/dia</p>
              </div>
              <button className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center text-primary active:scale-95 transition-transform">
                <Calendar size={20} />
              </button>
            </div>

            <div className="flex gap-2 px-8 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {['Hoje', 'Amanhã', 'Depois'].map((day, i) => (
                <button 
                  key={day} 
                  className={`px-8 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${i === 0 ? 'bg-primary text-black' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="px-8 mb-8">
              <div className="bg-card-bg border border-gray-800 p-6 rounded-[32px]">
                <div className="grid grid-cols-3 gap-4 mb-6">
                   <div className="text-center">
                      <span className="block text-xl font-bold">1600</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest">kcal no plano</span>
                   </div>
                   <div className="text-center">
                      <span className="block text-xl font-bold">2000</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest">kcal objectivo</span>
                   </div>
                   <div className="text-center">
                      <span className="block text-xl font-bold text-red-500">-400</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest">diferença</span>
                   </div>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                   <div className="h-full bg-primary w-[80%] rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                </div>
              </div>
            </div>

            <div className="px-8 space-y-6">
               <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Sun size={16} className="text-orange-500" />
                      </div>
                      <h4 className="font-bold">Café da manhã</h4>
                    </div>
                    <span className="text-primary font-bold text-sm">280 kcal</span>
                  </div>
                  
                  <div className="bg-card-bg border border-gray-800 rounded-3xl overflow-hidden group">
                     <div className="p-4 flex gap-4">
                        <img 
                          src="https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=400&auto=format&fit=crop" 
                          className="w-20 h-20 rounded-2xl object-cover" 
                          alt="Meal"
                        />
                        <div className="flex-1">
                           <h5 className="font-bold text-sm mb-1">Papaia com Mel</h5>
                           <p className="text-[10px] text-gray-500 leading-relaxed">Papaia madura com uma colher de mel orgânico. Perfeito para digestão.</p>
                           <div className="flex gap-2 mt-2">
                             <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded-full uppercase">Fibras</span>
                             <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[8px] font-bold rounded-full uppercase">Vitamina C</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col gap-4 pb-12">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Sun size={16} className="text-primary" />
                      </div>
                      <h4 className="font-bold">Almoço</h4>
                    </div>
                    <span className="text-primary font-bold text-sm">620 kcal</span>
                  </div>
                  
                  <div className="bg-card-bg border border-gray-800 rounded-3xl overflow-hidden group">
                     <img 
                      src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop" 
                      className="w-full h-40 object-cover" 
                      alt="Mufete"
                    />
                     <div className="p-4">
                        <h5 className="font-bold text-base mb-1">Mufete Completo</h5>
                        <p className="text-xs text-gray-500 leading-relaxed mb-4">Peixe grelhado (tilápia ou cacusso), funge de milho, feijão de óleo de palma e banana da terra. O prato mais nutritivo de Angola!</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {['Proteína', 'Ferro', 'Energia', 'Tradicional'].map(tag => (
                             <span key={tag} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-full">
                               {tag}
                             </span>
                          ))}
                        </div>
                        <button 
                          onClick={async () => {
                            if (!session) return;
                            setLoading(true);
                            try {
                              const planMeal = {
                                item_name: "Mufete Completo",
                                calories: 620,
                                protein: 45,
                                carbs: 65,
                                fat: 22,
                                fiber: 12,
                                score: 95,
                                score_label: "Excelente",
                                recommendation: "Excelente escolha tradicional e completa."
                              };
                              await saveMealToHistory(session.user.id, planMeal, "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop");
                              await fetchUserData(session.user.id);
                              navigate('dashboard');
                            } catch (err: any) {
                              setErrorMessage('Erro: ' + err.message);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="w-full py-3 bg-primary text-black font-bold rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                        >
                          <Check size={16} /> {loading ? 'A adicionar...' : 'Adicionar ao diário'}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
            <BottomNav active="mealPlan" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Community Screen (Nossa Terra) --- */}
        {screen === 'community' && (
          <motion.div 
            key="community"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen pb-24 overflow-y-auto"
          >
            <div className="px-8 pt-12 mb-6">
              <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold font-display flex items-center gap-2">
                   Nossa Terra 🌍
                 </h1>
                 <button className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center active:scale-95 transition-transform">
                   <ChevronRight className="rotate-[-90deg]" size={20} />
                 </button>
              </div>
              <p className="text-gray-500 text-sm mb-6">Receitas e dicas da comunidade angolana</p>
              
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {['Tudo', 'Receitas', 'Dicas', 'Desafios', 'Família'].map((cat, i) => (
                  <button 
                    key={cat} 
                    className={`px-6 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${i === 0 ? 'bg-primary text-black' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-8 mb-8">
               <div className="bg-primary/5 border-2 border-primary/20 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-primary">+2.400 angolanos a cuidar da saúde</h4>
                      <p className="text-[10px] text-gray-400">A maior comunidade nutricional de Angola</p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="px-8 space-y-8 pb-12">
               {/* Community Post 1 */}
               <div className="bg-card-bg border border-gray-800 rounded-3xl overflow-hidden">
                  <div className="p-5 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30">
                        KN
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <h4 className="font-bold text-sm">Equipa Kidia Nutri</h4>
                           <span className="px-2 py-0.5 bg-primary text-black text-[8px] font-bold rounded flex items-center gap-0.5">
                             <Check size={8} /> Equipa
                           </span>
                        </div>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          📍 Luanda, Angola · 3d atrás
                        </p>
                     </div>
                  </div>
                  
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=600&auto=format&fit=crop" 
                      className="w-full h-64 object-cover" 
                      alt="Post"
                    />
                    <div className="absolute top-4 left-4">
                       <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white flex items-center gap-2 border border-white/10">
                          🍽️ Papaia com mel angolano
                       </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">
                      A papaia é rica em vitamina C e enzimas digestivas. Com mel puro angolano, é o pequeno-almoço perfeito para começar o dia com energia e saúde! ☀️🍯
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                       {['#Papaia', '#Mel', '#PequenoAlmoço', '#VitaminaC'].map(tag => (
                          <span key={tag} className="text-primary font-bold text-[10px] bg-primary/5 px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                       ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-800 text-gray-500">
                       <div className="flex gap-6">
                          <button className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                            <Flame size={18} className="text-orange-500" /> 157
                          </button>
                          <button className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                            <History size={18} className="rotate-[-90deg]" /> 12
                          </button>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Community Post 2 */}
               <div className="bg-card-bg border border-gray-800 rounded-3xl overflow-hidden">
                  <div className="p-5 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center text-white font-bold border border-gray-700">
                        AM
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <h4 className="font-bold text-sm">António Manuel</h4>
                        </div>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          📍 Benguela, Angola · 5h atrás
                        </p>
                     </div>
                  </div>
                  
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop" 
                      className="w-full h-64 object-cover" 
                      alt="Post"
                    />
                    <div className="absolute top-4 left-4">
                       <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white flex items-center gap-2 border border-white/10">
                          💪 Almoço de Campeão
                       </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">
                      Hoje o Mufete estava especial! Muita proteína e energia para o treino de logo. Kidia Nutri ajudou-me a equilibrar as porções. 🇦🇴
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                       {['#Mufete', '#Treino', '#AngolaSaudavel'].map(tag => (
                          <span key={tag} className="text-primary font-bold text-[10px] bg-primary/5 px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                       ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-800 text-gray-500">
                       <div className="flex gap-6">
                          <button className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                            <Flame size={18} /> 42
                          </button>
                          <button className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                            <History size={18} className="rotate-[-90deg]" /> 3
                          </button>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
            <BottomNav active="community" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Chat Assistant Screen --- */}
        {screen === 'chat' && (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-screen"
          >
            <div className="pt-12 px-8 mb-4">
               <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                       Chat IA <Sparkles className="text-primary fill-primary" size={24} />
                    </h1>
                    <p className="text-gray-500 text-sm italic">O teu assistente de nutrição 🇦🇴</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20">
                     <div className="text-primary font-bold">KN</div>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-4 py-4 scroll-smooth">
              {chatMessages.map((msg, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-primary text-black font-medium rounded-tr-none shadow-lg shadow-primary/10' 
                        : 'bg-card-bg border border-gray-800 text-white rounded-tl-none shadow-xl'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-card-bg border border-gray-800 p-4 rounded-3xl rounded-tl-none flex items-center gap-2 text-gray-400 italic text-xs">
                    <Loader2 size={14} className="animate-spin text-primary" /> Kidia está a pensar...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-6 py-4 pb-28">
               <div className="relative group">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Pergunta sobre mufete, quizaca..."
                    className="w-full bg-card-bg border border-gray-800 rounded-3xl px-6 py-4 pr-16 text-sm focus:border-primary outline-none transition-all shadow-2xl focus:ring-1 focus:ring-primary/20"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="absolute right-2 top-2 bottom-2 w-12 bg-primary rounded-2xl flex items-center justify-center text-black active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
                  >
                    <Send size={18} />
                  </button>
               </div>
            </div>
            
            <BottomNav active="chat" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Profile Settings Screen --- */}
        {screen === 'profile_settings' && (
          <motion.div 
            key="profile_settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-screen pb-24 overflow-y-auto px-8 pt-12"
          >
            <div className="flex justify-between items-center mb-8">
              <button 
                onClick={() => navigate('dashboard')}
                className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center border border-gray-800"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold font-display">O Meu Perfil</h1>
              <div className="w-10" />
            </div>

            <div className="flex flex-col items-center mb-10">
               <div className="relative mb-4">
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-4xl border-2 border-primary/40">
                     {selectedProfile === 'me' ? '👦' : selectedProfile === 'child' ? '👶' : '👴'}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-dark-bg text-black">
                     <Camera size={14} />
                  </button>
               </div>
               <h2 className="text-2xl font-bold mb-1">{userProfile?.name || 'Utilizador'}</h2>
               <p className="text-gray-500 text-sm">{userEmail}</p>
            </div>

            <div className="space-y-4 mb-10">
               <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Objectivos e Preferências</h3>
               <div className="bg-card-bg border border-gray-800 rounded-3xl p-4 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                     <span className="text-sm">Objectivo</span>
                     <span className="text-primary font-bold text-sm">Comer saudável</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                     <span className="text-sm">Dieta</span>
                     <span className="text-primary font-bold text-sm">Omnívora</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                     <span className="text-sm">Actividade</span>
                     <span className="text-primary font-bold text-sm">Moderada</span>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Conta</h3>
               <div className="bg-card-bg border border-gray-800 rounded-3xl overflow-hidden">
                  <button className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors">
                     <div className="flex items-center gap-3">
                        <User size={18} className="text-gray-400" />
                        <span className="text-sm">Editar Perfil</span>
                     </div>
                     <ChevronRight size={16} className="text-gray-600" />
                  </button>
                  <button className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors">
                     <div className="flex items-center gap-3">
                        <Bell size={18} className="text-gray-400" />
                        <span className="text-sm">Notificações</span>
                     </div>
                     <ChevronRight size={16} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full p-4 flex items-center gap-3 text-red-500 hover:bg-red-500/5 transition-colors"
                  >
                     <Moon size={18} />
                     <span className="text-sm font-bold">Terminar Sessão</span>
                  </button>
               </div>
            </div>

            <BottomNav active="profile_settings" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Analysis Capture Screen --- */}
        {screen === 'capture' && (
          <motion.div 
            key="capture"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-screen bg-dark-bg overflow-y-auto pb-32"
          >
            <div className="px-8 pt-12 mb-6">
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => navigate('dashboard')}
                  className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center border border-gray-800"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>
              <h1 className="text-3xl font-bold font-display mb-1">Analisar refeição</h1>
              <p className="text-gray-500 text-sm">Fotografa o teu prato para uma análise completa</p>
            </div>

            <div className="px-6 mb-8">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
              />
              <div className="relative h-64 rounded-[32px] overflow-hidden border border-gray-800">
                <img 
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop" 
                  className="w-full h-full object-cover opacity-60" 
                  alt="Food background"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 bg-primary/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-primary/30">
                    {loading ? <Loader2 size={32} className="text-primary animate-spin" /> : <Camera size={32} className="text-primary" />}
                  </div>
                  <h3 className="text-xl font-bold font-display mb-1">{loading ? 'A analisar...' : 'Fotografa o teu prato'}</h3>
                  <p className="text-xs text-gray-400 max-w-[200px]">
                    {loading ? 'A nossa equipa está a identificar os nutrientes. Aguarda um momento.' : 'Aponta a câmara para a refeição e recebe a análise nutricional completa em segundos'}
                  </p>
                  
                  {!loading && (
                    <div className="flex gap-3 mt-6">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-full text-xs font-bold shadow-lg"
                      >
                        <Camera size={14} /> Câmara
                      </button>
                      <button 
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.removeAttribute('capture');
                            fileInputRef.current.click();
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#d97706] text-black rounded-full text-xs font-bold shadow-lg"
                      >
                        <ImageIcon size={14} /> Galeria
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 mb-8">
              <h3 className="font-bold text-gray-400 text-xs mb-4 uppercase tracking-widest">Tipo de refeição</h3>
              <div className="grid grid-cols-2 gap-4">
                {MEAL_TYPES.map((meal) => (
                  <button 
                    key={meal.id}
                    onClick={() => setSelectedMealType(meal.id)}
                    className={`p-4 rounded-2xl border transition-all text-left ${
                      selectedMealType === meal.id ? 'bg-primary/5 border-primary' : 'bg-card-bg border-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <meal.icon size={18} className={selectedMealType === meal.id ? 'text-primary' : 'text-gray-500'} />
                       {selectedMealType === meal.id && <Check size={14} className="text-primary bg-primary/10 rounded-full" />}
                    </div>
                    <h4 className="font-bold text-sm">{meal.label}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{meal.time}</p>
                    <p className="text-[9px] text-gray-600 italic mt-1">Ex: {meal.ex}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-8 mb-8">
               <h3 className="font-bold text-gray-400 text-xs mb-4 uppercase tracking-widest">Como obter a melhor análise</h3>
               <div className="space-y-3">
                  {[
                    "Boa iluminação melhora muito a precisão",
                    "Enquadra todo o prato na foto",
                    "Evita sombras ou reflexos",
                    "Funciona com pratos angolanos e internacionais"
                  ].map((tip, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check size={10} className="text-primary" />
                      </div>
                      <span className="text-xs text-gray-400">{tip}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="px-8 space-y-4">
               <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full py-4 bg-primary text-black font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-50"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <Camera size={20} />}
                 {loading ? 'Analisando...' : 'Abrir câmara'}
               </button>
               <button className="w-full py-4 bg-gray-900 border border-primary/20 text-primary font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                 <FlaskConical size={18} />
                 Identificar Produto Rapidamente
               </button>
            </div>

            <BottomNav active="capture" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Analysis Result Screen --- */}
        {screen === 'result' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen overflow-y-auto"
          >
            <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-dark-bg/80 backdrop-blur sticky top-0 z-20">
              <button 
                onClick={() => navigate('capture')}
                className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center transition-colors hover:bg-gray-800"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-bold font-display">Resultado da Análise</h2>
              <div className="w-10" />
            </div>

            <div className="px-6 pb-24">
              <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl">
                <img 
                  src={analysisImageUrl || "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1000&auto=format&fit=crop"} 
                  alt="Result meal" 
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-primary">{analysisResult?.score || 0}% {analysisResult?.score_label || 'Saúde'}</span>
                </div>
                
                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center text-center">
                   <h3 className="text-4xl font-bold font-display mb-1">{analysisResult?.item_name || 'Analisando'}</h3>
                   <span className="text-primary font-bold text-2xl font-display">{analysisResult?.calories || 0} kcal</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-10">
                {[
                  { l: 'Protein', v: `${analysisResult?.protein || 0}g`, c: 'border-primary text-primary', i: Dumbbell },
                  { l: 'Carbs', v: `${analysisResult?.carbs || 0}g`, c: 'border-orange-500 text-orange-500', i: Flame },
                  { l: 'Fat', v: `${analysisResult?.fat || 0}g`, c: 'border-blue-500 text-blue-500', i: FlaskConical },
                  { l: 'Fiber', v: `${analysisResult?.fiber || 0}g`, c: 'border-purple-500 text-purple-500', i: Bone },
                ].map((m) => (
                  <div key={m.l} className={`p-3 rounded-2xl border bg-card-bg flex flex-col items-center text-center ${m.c.split(' ')[0]}`}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">{m.l}</span>
                      <m.i size={10} className={m.c.split(' ')[1]} />
                    </div>
                    <span className="text-base font-bold font-display">{m.v}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#d97706]/10 border-2 border-[#d97706]/30 p-6 rounded-3xl mb-12 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-[#d97706]" />
                 <h4 className="text-[#d97706] font-bold text-lg mb-2">Sugestão do Nutricionista</h4>
                 <p className="text-sm text-gray-300 leading-relaxed italic">
                   "{analysisResult?.recommendation || 'Carregando conselho...'}"
                 </p>
              </div>

              <div className="flex gap-4">
                 <button 
                  onClick={async () => {
                    if (!session || !analysisResult || !analysisImageUrl) return;
                    setLoading(true);
                    try {
                      await saveMealToHistory(session.user.id, analysisResult, analysisImageUrl);
                      await fetchUserData(session.user.id);
                      navigate('dashboard');
                    } catch (err: any) {
                      setErrorMessage('Erro ao guardar: ' + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 py-4 bg-primary text-black font-extrabold rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                   {loading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                   {loading ? 'A guardar...' : 'Adicionar ao Diário'}
                 </button>
                 <button 
                  onClick={() => navigate('dashboard')}
                  className="flex-1 py-4 bg-transparent border-2 border-primary text-primary font-bold rounded-full active:scale-95 transition-transform"
                >
                   Sair
                 </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- Market Screen (A Nossa Feira) --- */}
        {screen === 'market' && (
          <motion.div 
            key="market"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen pb-24 overflow-y-auto px-8 pt-12"
          >
            <div className="flex justify-between items-center mb-6">
               <h1 className="text-3xl font-bold font-display flex items-center gap-2">
                 A Nossa Feira 🧺
               </h1>
            </div>
            <p className="text-gray-500 text-sm mb-8">Preços estimados e nutrientes dos produtos da terra</p>

            <div className="space-y-4 pb-12">
              {[
                { name: 'Funge de Milho', price: '500 AOA', unit: 'kg', icon: '🌽', protein: '2g', cal: '350' },
                { name: 'Tilápia (Cacusso)', price: '2.500 AOA', unit: 'kg', icon: '🐟', protein: '18g', cal: '120' },
                { name: 'Folhas de Quizaca', price: '300 AOA', unit: 'molho', icon: '🥬', protein: '4g', cal: '45' },
                { name: 'Banana da Terra', price: '200 AOA', unit: 'unid', icon: '🍌', protein: '1g', cal: '120' },
                { name: 'Feijão de Óleo de Palma', price: '800 AOA', unit: 'kg', icon: '🍲', protein: '8g', cal: '210' },
                { name: 'Abacate', price: '400 AOA', unit: 'unid', icon: '🥑', protein: '2g', cal: '160' },
              ].map((item) => (
                <div key={item.name} className="bg-card-bg border border-gray-800 p-4 rounded-3xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-primary font-bold text-xs">{item.price} <span className="text-gray-600 font-normal">/{item.unit}</span></span>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{item.protein} prot</span>
                        <div className="w-1 h-1 bg-gray-700 rounded-full" />
                        <span>{item.cal} kcal</span>
                      </div>
                    </div>
                  </div>
                  <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-primary">
                    <Sparkles size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <BottomNav active="market" onNavigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
