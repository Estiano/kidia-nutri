import { 
  Sun, 
  History, 
  Camera, 
  Calendar, 
  User, 
  MessageSquare,
  Lightbulb
} from 'lucide-react';

type Screen = 'welcome' | 'onboarding' | 'profile' | 'dashboard' | 'capture' | 'result' | 'login' | 'signup' | 'terms' | 'privacy' | 'mealPlan' | 'community' | 'history' | 'profile_settings' | 'chat' | 'market';

interface BottomNavProps {
  active: string;
  onNavigate: (screen: Screen) => void;
}

export const BottomNav = ({ active, onNavigate }: BottomNavProps) => (
  <div className="fixed bottom-0 left-0 right-0 bg-[#0a0c10]/90 backdrop-blur-md border-t border-gray-800 px-6 py-4 flex justify-between items-center z-50">
    <button onClick={() => onNavigate('dashboard')} className={`flex flex-col items-center gap-1 ${active === 'dashboard' ? 'text-primary' : 'text-gray-500'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${active === 'dashboard' ? 'bg-primary/20' : ''}`}>
        <Sun size={20} className={active === 'dashboard' ? 'text-primary' : 'text-gray-500'} />
      </div>
      <span className="text-[10px]">Início</span>
    </button>
    <button onClick={() => onNavigate('history')} className={`flex flex-col items-center gap-1 ${active === 'history' ? 'text-primary' : 'text-gray-500'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${active === 'history' ? 'bg-primary/20' : ''}`}>
        <History size={20} className={active === 'history' ? 'text-primary' : 'text-gray-500'} />
      </div>
      <span className="text-[10px]">Histórico</span>
    </button>
    <div className="relative -mt-12">
      <button 
        onClick={() => onNavigate('capture')}
        className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20 border-4 border-[#0a0c10] active:scale-90 transition-transform"
      >
        <Camera size={28} className="text-black" />
      </button>
    </div>
    <button onClick={() => onNavigate('market')} className={`flex flex-col items-center gap-1 ${active === 'market' ? 'text-primary' : 'text-gray-500'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${active === 'market' ? 'bg-primary/20' : ''}`}>
        <Lightbulb size={20} className={active === 'market' ? 'text-primary' : 'text-gray-500'} />
      </div>
      <span className="text-[10px]">Feira</span>
    </button>
    <button onClick={() => onNavigate('community')} className={`flex flex-col items-center gap-1 ${active === 'community' ? 'text-primary' : 'text-gray-500'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${active === 'community' ? 'bg-primary/20' : ''}`}>
        <User size={20} className={active === 'community' ? 'text-primary' : 'text-gray-500'} />
      </div>
      <span className="text-[10px]">Povo</span>
    </button>
    <button onClick={() => onNavigate('chat')} className={`flex flex-col items-center gap-1 ${active === 'chat' ? 'text-primary' : 'text-gray-500'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${active === 'chat' ? 'bg-primary/20' : ''}`}>
        <MessageSquare size={20} className={active === 'chat' ? 'text-primary' : 'text-gray-500'} />
      </div>
      <span className="text-[10px]">Chat IA</span>
    </button>
  </div>
);
