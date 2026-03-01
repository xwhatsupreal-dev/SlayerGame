import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Dumbbell, 
  LogOut, 
  Shield, 
  Sword, 
  Zap, 
  Heart, 
  Coins, 
  Gem, 
  ChevronRight, 
  Plus, 
  Minus,
  Globe,
  User as UserIcon,
  Lock,
  MessageSquare,
  Save,
  Menu,
  X,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Settings as SettingsIcon,
  Palette
} from 'lucide-react';
import axios from 'axios';
import { User, Player, Language, Achievement } from './types';
import { translations } from './translations';

// --- NOTIFICATION SYSTEM ---
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'achievement';
  icon?: React.ReactNode;
}

const NotificationContext = createContext<{
  notify: (n: Omit<Notification, 'id'>) => void;
}>({ notify: () => {} });

export const useNotification = () => useContext(NotificationContext);

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (n: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...n, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto w-80 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex gap-4 ${
                n.type === 'achievement' 
                  ? 'bg-accent/20 border-accent/30 text-accent' 
                  : n.type === 'error'
                  ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-neutral-900/90 border-white/10 text-white'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {n.icon || (
                  n.type === 'achievement' ? <Trophy size={20} /> :
                  n.type === 'error' ? <AlertCircle size={20} /> :
                  <CheckCircle2 size={20} className="text-green-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold uppercase tracking-tight">{n.title}</div>
                <div className="text-xs opacity-70 mt-0.5 leading-relaxed">{n.message}</div>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="opacity-40 hover:opacity-100 transition-opacity self-start"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

// --- Contexts ---
interface AuthContextType {
  user: User | null;
  player: Player | null;
  loading: boolean;
  login: (userData: any) => void;
  logout: () => void;
  refreshData: () => Promise<void>;
  lang: Language;
  setLang: (l: Language) => void;
  activePage: 'dashboard' | 'status' | 'profile' | 'settings';
  setActivePage: (p: 'dashboard' | 'status' | 'profile' | 'settings') => void;
  updateName: (name: string) => Promise<void>;
  checkAchievements: () => Promise<void>;
  updateTheme: (color: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Components ---

const ProgressBar = ({ value, max, color = "bg-accent" }: { value: number; max: number; color?: string }) => (
  <div className="w-full bg-white/5 rounded-full h-1.5 sm:h-2 overflow-hidden">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${(value / max) * 100}%` }}
      className={`${color} h-full`}
    />
  </div>
);

const StatCard = ({ icon: Icon, label, value, subValue, color = "text-white" }: any) => (
  <div className="card-gradient p-4 sm:p-5 flex flex-col gap-2 sm:gap-3 hover:border-white/20 transition-all group">
    <div className="flex justify-between items-start">
      <div className={`p-1.5 sm:p-2 rounded-lg bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={16} className="sm:w-5 sm:h-5" />
      </div>
      <div className="text-[9px] sm:text-xs font-mono opacity-40 uppercase tracking-widest">{label}</div>
    </div>
    <div>
      <div className="text-lg sm:text-2xl font-bold data-value truncate leading-none">{value}</div>
      {subValue && <div className="text-[9px] sm:text-xs opacity-40 mt-1 truncate">{subValue}</div>}
    </div>
  </div>
);

const Sidebar = () => {
  const { logout, lang, setLang, player, activePage, setActivePage, refreshData, checkAchievements } = useAuth();
  const t = translations[lang];
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await axios.post('/api/player/save');
      await refreshData();
      await checkAchievements();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus('idle');
    }
  };

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'status', label: t.training, icon: Dumbbell },
    { id: 'profile', label: t.profile, icon: UserIcon },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  const handleNavClick = (page: 'dashboard' | 'status' | 'profile' | 'settings') => {
    setActivePage(page);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 border-r border-white/10 h-screen flex-col p-6 bg-neutral-950/50 backdrop-blur-xl sticky top-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <Sword className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tighter">SLAYER<span className="text-accent">GAME</span></h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => handleNavClick(item.id as any)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${activePage === item.id ? 'bg-white/5 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={20} className={activePage === item.id ? 'text-accent' : ''} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={handleSave}
            disabled={saveStatus !== 'idle'}
            className={`w-full flex items-center justify-center gap-3 p-2.5 sm:p-3 rounded-xl border border-white/10 font-bold transition-all ${saveStatus === 'saved' ? 'bg-green-500/20 border-green-500/40 text-green-500' : 'hover:bg-white/5'}`}
          >
            <Save size={18} className={saveStatus === 'saving' ? 'animate-pulse' : ''} />
            <span className="text-sm">
              {saveStatus === 'saving' ? t.saving : saveStatus === 'saved' ? t.saved : t.save}
            </span>
          </button>

          <button 
            onClick={() => setActivePage('profile')}
            className={`p-4 card-gradient flex items-center gap-3 text-left transition-all hover:border-white/20 ${activePage === 'profile' ? 'border-accent/40 bg-accent/5' : ''}`}
          >
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold shrink-0">
              {player?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{player?.name || 'Slayer'}</div>
              <div className="text-[10px] font-mono opacity-50 uppercase">LVL {player?.level || 1}</div>
            </div>
          </button>

          <div className="flex gap-2">
            <button 
              onClick={() => setLang(lang === 'EN' ? 'TH' : 'EN')}
              className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5"
            >
              <Globe size={14} />
              {lang}
            </button>
            <button 
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-accent/10 text-accent text-xs font-bold hover:bg-accent/20"
            >
              <LogOut size={14} />
              {t.logout}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-neutral-950/80 backdrop-blur-xl border-t border-white/10 p-1 sm:p-2 flex justify-around items-center z-50">
        <button 
          onClick={() => setActivePage('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 flex-1 ${activePage === 'dashboard' ? 'text-accent' : 'text-white/40'}`}
        >
          <LayoutDashboard className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase">{t.dashboard}</span>
        </button>
        <button 
          onClick={() => setActivePage('status')}
          className={`flex flex-col items-center gap-1 p-2 flex-1 ${activePage === 'status' ? 'text-accent' : 'text-white/40'}`}
        >
          <Dumbbell className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase">{t.training}</span>
        </button>
        <button 
          onClick={() => setActivePage('profile')}
          className={`flex flex-col items-center gap-1 p-2 flex-1 ${activePage === 'profile' ? 'text-accent' : 'text-white/40'}`}
        >
          <UserIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase">{t.profile}</span>
        </button>
        <button 
          onClick={handleSave}
          disabled={saveStatus !== 'idle'}
          className={`flex flex-col items-center gap-1 p-2 flex-1 transition-all ${saveStatus === 'saved' ? 'text-green-500' : 'text-white/40'}`}
        >
          <Save className={`w-[18px] h-[18px] sm:w-5 sm:h-5 ${saveStatus === 'saving' ? 'animate-pulse' : ''}`} />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase">
            {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? 'OK' : t.save.split(' ')[0]}
          </span>
        </button>
        <button 
          onClick={() => setLang(lang === 'EN' ? 'TH' : 'EN')}
          className="flex flex-col items-center gap-1 p-2 flex-1 text-white/40"
        >
          <Globe className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase">{lang}</span>
        </button>
        <button 
          onClick={logout}
          className="flex flex-col items-center gap-1 p-2 flex-1 text-white/40"
        >
          <LogOut className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase">{t.logout}</span>
        </button>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden w-full p-4 border-b border-white/10 flex justify-between items-center bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <Sword className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tighter">SLAYER<span className="text-accent">GAME</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActivePage('profile')}
            className="flex items-center gap-2 text-left"
          >
            <div className="text-right">
              <div className="text-xs font-bold">{player?.name}</div>
              <div className="text-[8px] font-mono opacity-50 uppercase">LVL {player?.level}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
              {player?.name?.[0]?.toUpperCase()}
            </div>
          </button>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 w-[280px] bg-neutral-950 border-l border-white/10 p-6 z-[70] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold uppercase tracking-widest opacity-40 font-mono">Menu</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <nav className="flex flex-col gap-2 mb-8">
                {navItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleNavClick(item.id as any)}
                    className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activePage === item.id ? 'bg-accent/10 text-accent border border-accent/20' : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'}`}
                  >
                    <item.icon size={20} />
                    <span className="font-bold">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-auto space-y-4">
                <button 
                  onClick={() => { handleSave(); setIsMenuOpen(false); }}
                  disabled={saveStatus !== 'idle'}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-white/10 font-bold transition-all ${saveStatus === 'saved' ? 'bg-green-500/20 border-green-500/40 text-green-500' : 'hover:bg-white/5'}`}
                >
                  <Save size={20} className={saveStatus === 'saving' ? 'animate-pulse' : ''} />
                  <span>{saveStatus === 'saving' ? t.saving : saveStatus === 'saved' ? t.saved : t.save}</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setLang(lang === 'EN' ? 'TH' : 'EN')}
                    className="flex items-center justify-center gap-2 p-4 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5"
                  >
                    <Globe size={18} />
                    {lang}
                  </button>
                  <button 
                    onClick={logout}
                    className="flex items-center justify-center gap-2 p-4 rounded-xl bg-accent/10 text-accent text-xs font-bold hover:bg-accent/20"
                  >
                    <LogOut size={18} />
                    {t.logout}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const Dashboard = () => {
  const { player, lang } = useAuth();
  const t = translations[lang];

  if (!player) return null;

  const damage = 1 + (player.str * 2);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 lg:p-8 flex-1 overflow-y-auto pb-24 lg:pb-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{t.dashboard}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
            <p className="text-white/50 text-sm">Welcome back, {player.name}. Ready for the hunt?</p>
            {player.last_save && (
              <span className="text-[10px] font-mono text-white/20 uppercase hidden sm:inline">
                • Last Saved: {new Date(player.last_save).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
          <AlertCircle size={14} className="text-accent" />
          <span className="text-[10px] sm:text-xs font-bold text-accent uppercase tracking-wider">
            {t.betaTester}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-6 mb-8">
        <StatCard icon={Heart} label={t.hp} value={`${player.hp}/${player.max_hp}`} color="text-green-500" />
        <StatCard icon={Sword} label={t.damage} value={damage} color="text-accent" />
        <StatCard icon={Shield} label={t.maxHp} value={player.max_hp} color="text-blue-500" />
        <StatCard icon={Zap} label={t.exp} value={player.exp} subValue={`Next: ${player.level * 100}`} color="text-yellow-500" />
        <StatCard icon={Coins} label={t.gold} value={player.gold} color="text-yellow-500" />
        <StatCard icon={Gem} label={t.gems} value={player.gems} color="text-blue-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:gap-8">
        <div className="flex flex-col gap-6">
          <div className="card-gradient p-5 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Shield size={18} className="text-accent sm:w-5 sm:h-5" />
                Character Progress
              </h3>
              <div className="text-[10px] sm:text-xs font-mono opacity-40 uppercase">LVL {player.level}</div>
            </div>
            
            <div className="space-y-5 sm:space-y-6">
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs font-mono mb-2 uppercase opacity-40">
                  <span>{t.hp}</span>
                  <span>{Math.round((player.hp / player.max_hp) * 100)}%</span>
                </div>
                <ProgressBar value={player.hp} max={player.max_hp} color="bg-green-500" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs font-mono mb-2 uppercase opacity-40">
                  <span>{t.exp}</span>
                  <span>{Math.round((player.exp / (player.level * 100)) * 100)}%</span>
                </div>
                <ProgressBar value={player.exp} max={player.level * 100} color="bg-yellow-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:gap-6">
            <div className="card-gradient p-4 lg:p-6 text-center">
              <div className="text-[8px] lg:text-[10px] font-mono opacity-50 uppercase mb-1">{t.strength}</div>
              <div className="text-xl lg:text-3xl font-bold data-value">{player.str}</div>
            </div>
            <div className="card-gradient p-4 lg:p-6 text-center">
              <div className="text-[8px] lg:text-[10px] font-mono opacity-50 uppercase mb-1">{t.dexterity}</div>
              <div className="text-xl lg:text-3xl font-bold data-value">{player.dex}</div>
            </div>
            <div className="card-gradient p-4 lg:p-6 text-center">
              <div className="text-[8px] lg:text-[10px] font-mono opacity-50 uppercase mb-1">{t.vitality}</div>
              <div className="text-xl lg:text-3xl font-bold data-value">{player.vit}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StatusPage = () => {
  const { player, lang } = useAuth();
  const t = translations[lang];

  if (!player) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 lg:p-8 flex-1 overflow-y-auto pb-24 lg:pb-8"
    >
      <div className="mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{t.training}</h2>
        <p className="text-white/50 text-sm mt-1">Enhance your slayer's capabilities.</p>
      </div>

      <div className="max-w-3xl mx-auto w-full">
        <div className="card-gradient p-5 sm:p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Dumbbell size={20} className="text-accent" />
            {t.train}
          </h3>
          <TrainingSection />
        </div>
      </div>
    </motion.div>
  );
};

const TrainingSection = () => {
  const { player, lang, refreshData, checkAchievements } = useAuth();
  const t = translations[lang];
  const [pendingStats, setPendingStats] = useState({ str: 0, dex: 0, vit: 0 });
  const [loading, setLoading] = useState(false);

  if (!player) return null;

  const totalSpent = pendingStats.str + pendingStats.dex + pendingStats.vit;
  const remaining = player.stat_points - totalSpent;

  const handleAdjust = (stat: 'str' | 'dex' | 'vit', amount: number) => {
    if (amount > 0 && remaining <= 0) return;
    if (amount < 0 && pendingStats[stat] <= 0) return;
    setPendingStats(prev => ({ ...prev, [stat]: prev[stat] + amount }));
  };

  const handleConfirm = async () => {
    if (totalSpent === 0) return;
    setLoading(true);
    try {
      await axios.post('/api/player/train', { ...pendingStats, pointsSpent: totalSpent });
      await refreshData();
      await checkAchievements();
      setPendingStats({ str: 0, dex: 0, vit: 0 });
    } catch (error) {
      console.error("Training error:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatRow = ({ label, value, pending, onAdd, onSub }: any) => (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
      <div className="min-w-0">
        <div className="text-[10px] sm:text-xs font-mono opacity-40 uppercase truncate">{label}</div>
        <div className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <span className="data-value">{value}</span>
          {pending > 0 && <span className="text-accent text-sm sm:text-base">+{pending}</span>}
        </div>
      </div>
      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <button 
          onClick={onSub}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-colors"
          disabled={pending === 0}
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={onAdd}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 text-accent flex items-center justify-center hover:bg-accent/30 disabled:opacity-20 transition-colors"
          disabled={remaining === 0}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="p-4 bg-accent/10 rounded-xl border border-accent/20 mb-2">
        <div className="text-xs font-mono text-accent uppercase mb-1">{t.statPoints}</div>
        <div className="text-3xl font-bold text-accent data-value">{remaining}</div>
      </div>

      <div className="space-y-3">
        <StatRow label={t.strength} value={player.str} pending={pendingStats.str} onAdd={() => handleAdjust('str', 1)} onSub={() => handleAdjust('str', -1)} />
        <StatRow label={t.dexterity} value={player.dex} pending={pendingStats.dex} onAdd={() => handleAdjust('dex', 1)} onSub={() => handleAdjust('dex', -1)} />
        <StatRow label={t.vitality} value={player.vit} pending={pendingStats.vit} onAdd={() => handleAdjust('vit', 1)} onSub={() => handleAdjust('vit', -1)} />
      </div>

      <div className="mt-auto pt-6 flex gap-3">
        <button 
          onClick={() => setPendingStats({ str: 0, dex: 0, vit: 0 })}
          className="flex-1 p-3 rounded-xl border border-white/10 font-bold text-sm hover:bg-white/5 transition-all"
        >
          {t.cancel}
        </button>
        <button 
          onClick={handleConfirm}
          disabled={totalSpent === 0 || loading}
          className="flex-2 p-3 rounded-xl bg-accent text-white font-bold text-sm shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          {loading ? "..." : t.confirm}
        </button>
      </div>
    </div>
  );
};

const AuthScreen = () => {
  const { login, lang, setLang } = useAuth();
  const t = translations[lang];
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', gender: 'Male' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(endpoint, formData);
      if (isLogin) {
        login(res.data.user);
      } else {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    setError('');
    try {
      const res = await axios.get('/api/auth/discord/url');
      const authWindow = window.open(res.data.url, 'discord_auth', 'width=600,height=700');
      
      if (!authWindow) {
        setError('Popup blocked! Please allow popups for this site.');
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.location.reload();
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      console.error("Discord login error:", err);
      const msg = err.response?.data?.error || 'Discord login failed. Please check server configuration.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md card-gradient p-6 sm:p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-2xl shadow-accent/40 mb-6">
            <Sword className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter">SLAYER<span className="text-accent">GAME</span></h1>
          <p className="text-white/40 text-sm mt-2 uppercase tracking-widest font-mono">Technical Dashboard RPG</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase opacity-50 flex items-center gap-2">
              <UserIcon size={12} /> {t.username}
            </label>
            <input 
              type="text" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent transition-all"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase opacity-50 flex items-center gap-2">
              <Lock size={12} /> {t.password}
            </label>
            <input 
              type="password" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent transition-all"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase opacity-50 flex items-center gap-2">
                <UserIcon size={12} /> {t.gender}
              </label>
              <div className="flex gap-4">
                {['Male', 'Female'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({...formData, gender: g})}
                    className={`flex-1 p-3 rounded-xl border transition-all font-bold text-sm ${formData.gender === g ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    {t[g.toLowerCase() as 'male' | 'female']}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="text-accent text-xs font-mono bg-accent/10 p-3 rounded-lg border border-accent/20">{error}</div>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-bold py-4 rounded-xl shadow-xl shadow-accent/20 hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? "..." : (isLogin ? t.login : t.register)}
            <ChevronRight size={18} />
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-white/10" />
            <span className="relative px-4 bg-neutral-950 text-[10px] font-mono uppercase opacity-30">Or continue with</span>
          </div>

          <button 
            onClick={handleDiscordLogin}
            className="w-full bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] font-bold py-4 rounded-xl hover:bg-[#5865F2]/20 transition-all flex items-center justify-center gap-3"
          >
            <MessageSquare size={20} />
            {t.discordLogin}
          </button>

          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-center text-xs text-white/40 hover:text-white transition-all mt-2"
          >
            {isLogin ? t.noAccount : t.hasAccount} <span className="text-accent font-bold">{isLogin ? t.register : t.login}</span>
          </button>
        </div>

        <button 
          onClick={() => setLang(lang === 'EN' ? 'TH' : 'EN')}
          className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 text-xs font-bold flex items-center gap-2 hover:bg-white/10"
        >
          <Globe size={14} />
          {lang}
        </button>
      </motion.div>
    </div>
  );
};

// --- Provider ---

export const ProfilePage = () => {
  const { player, lang, updateName, checkAchievements, updateTheme } = useAuth();
  const t = translations[lang];
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(player?.name || '');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await axios.get('/api/achievements');
        setAchievements(res.data.achievements);
        setUnlockedIds(res.data.unlockedIds);
      } catch (err) {
        console.error("Failed to fetch achievements:", err);
      } finally {
        setLoadingAchievements(false);
      }
    };
    fetchAchievements();
    checkAchievements();
  }, []);

  if (!player) return null;

  const handleSaveName = async () => {
    try {
      await updateName(newName);
      setIsEditing(false);
    } catch (err) {
      // Error handled in updateName
    }
  };

  const totalStats = player.str + player.dex + player.vit;
  const joinDate = player.created_at ? new Date(player.created_at).toLocaleDateString(lang === 'TH' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '---';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 lg:p-8 flex-1 overflow-y-auto pb-24 lg:pb-8"
    >
      <div className="mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{t.profile}</h2>
        <p className="text-white/50 text-sm mt-1">Slayer identity and history.</p>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="card-gradient p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-2xl shadow-accent/10">
            <UserIcon size={48} />
          </div>
          <div className="text-center sm:text-left flex-1 w-full">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-2xl font-bold focus:outline-none focus:border-accent/50 w-full sm:w-auto"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveName}
                    className="bg-accent text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-accent/80 transition-all"
                  >
                    {t.update}
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); setNewName(player.name); }}
                    className="bg-white/5 text-white/60 px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-4 mb-2">
                <h3 className="text-3xl sm:text-4xl font-bold tracking-tighter">{player.name}</h3>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase opacity-60">
                {player.gender === 'Male' ? t.male : t.female}
              </span>
              <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-mono uppercase text-accent font-bold">
                LVL {player.level}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase opacity-60">
                {t.joined}: {joinDate}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-gradient p-6">
            <h4 className="text-xs font-mono uppercase opacity-40 mb-6 tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-accent" /> {t.stats}
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-sm opacity-60">{t.strength}</span>
                <span className="font-bold font-mono">{player.str}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-sm opacity-60">{t.dexterity}</span>
                <span className="font-bold font-mono">{player.dex}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-sm opacity-60">{t.vitality}</span>
                <span className="font-bold font-mono">{player.vit}</span>
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-sm font-bold text-accent uppercase">{t.stats}</span>
                <span className="text-xl font-bold font-mono text-accent">{totalStats}</span>
              </div>
            </div>
          </div>

          <div className="card-gradient p-6">
            <h4 className="text-xs font-mono uppercase opacity-40 mb-6 tracking-widest flex items-center gap-2">
              <Sword size={14} className="text-accent" /> {t.equipment}
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Sword size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-mono opacity-40 uppercase">{t.weapon}</div>
                  <div className="font-bold">{player.weapon}</div>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-4 opacity-30">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-mono opacity-40 uppercase">Armor</div>
                  <div className="font-bold italic">None</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-gradient p-6">
          <h4 className="text-xs font-mono uppercase opacity-40 mb-6 tracking-widest flex items-center gap-2">
            <Trophy size={14} className="text-accent" /> {t.achievements}
          </h4>
          {loadingAchievements ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);
                return (
                  <div 
                    key={ach.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                      isUnlocked 
                        ? 'bg-accent/5 border-accent/20' 
                        : 'bg-white/5 border-white/5 opacity-40 grayscale'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isUnlocked ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/40'
                    }`}>
                      {ach.icon === 'Sword' ? <Sword size={20} /> : 
                       ach.icon === 'Dumbbell' ? <Dumbbell size={20} /> : 
                       <Coins size={20} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{lang === 'TH' ? ach.title_th : ach.title_en}</div>
                      <div className="text-[10px] opacity-60 leading-tight mt-0.5">
                        {lang === 'TH' ? ach.description_th : ach.description_en}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const SettingsPage = () => {
  const { player, lang, updateTheme, setLang } = useAuth();
  const t = translations[lang];
  const [customColor, setCustomColor] = useState(player?.theme_color || '#ef4444');

  if (!player) return null;

  const themeColors = [
    { name: 'Default Red', color: '#ef4444' },
    { name: 'Royal Purple', color: '#a855f7' },
    { name: 'Emerald Green', color: '#10b981' },
    { name: 'Ocean Blue', color: '#3b82f6' },
    { name: 'Golden Sun', color: '#f59e0b' },
    { name: 'Pink Rose', color: '#ec4899' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 lg:p-8 flex-1 overflow-y-auto pb-24 lg:pb-8"
    >
      <div className="mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{t.settings}</h2>
        <p className="text-white/50 text-sm mt-1">Manage your preferences and interface.</p>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="card-gradient p-6">
          <h4 className="text-xs font-mono uppercase opacity-40 mb-6 tracking-widest flex items-center gap-2">
            <Globe size={14} className="text-accent" /> Language
          </h4>
          <div className="flex gap-4">
            <button 
              onClick={() => setLang('EN')}
              className={`flex-1 p-4 rounded-xl border transition-all font-bold ${lang === 'EN' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
            >
              English
            </button>
            <button 
              onClick={() => setLang('TH')}
              className={`flex-1 p-4 rounded-xl border transition-all font-bold ${lang === 'TH' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
            >
              ภาษาไทย
            </button>
          </div>
        </div>

        <div className="card-gradient p-6">
          <h4 className="text-xs font-mono uppercase opacity-40 mb-6 tracking-widest flex items-center gap-2">
            <Palette size={14} className="text-accent" /> {t.theme}
          </h4>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-white/40 mb-4">{t.selectTheme}</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {themeColors.map((theme) => (
                  <button
                    key={theme.color}
                    onClick={() => { updateTheme(theme.color); setCustomColor(theme.color); }}
                    className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center ${
                      player.theme_color === theme.color
                        ? 'border-white scale-105 shadow-lg'
                        : 'border-transparent hover:border-white/20'
                    }`}
                    style={{ backgroundColor: theme.color }}
                    title={theme.name}
                  >
                    {player.theme_color === theme.color && (
                      <CheckCircle2 size={20} className="text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <p className="text-xs text-white/40 mb-4">{t.customColor}</p>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                />
                <input 
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-mono text-sm focus:outline-none focus:border-accent/50 flex-1"
                />
                <button 
                  onClick={() => updateTheme(customColor)}
                  className="bg-accent text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-accent/80 transition-all"
                >
                  {t.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>('EN');
  const [activePage, setActivePage] = useState<'dashboard' | 'status' | 'profile' | 'settings'>('dashboard');
  const { notify } = useNotification();
  const t = translations[lang];

  useEffect(() => {
    if (player?.theme_color) {
      document.documentElement.style.setProperty('--color-accent', player.theme_color);
    } else {
      document.documentElement.style.setProperty('--color-accent', '#ef4444');
    }
  }, [player?.theme_color]);

  const refreshData = async () => {
    try {
      const res = await axios.get('/api/me');
      setUser(res.data.user);
      setPlayer(res.data.player);
      if (res.data.player?.language) {
        setLang(res.data.player.language);
      }
    } catch (err) {
      setUser(null);
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  };

  const checkAchievements = async () => {
    try {
      const res = await axios.post('/api/player/check-achievements');
      if (res.data.newlyUnlocked && res.data.newlyUnlocked.length > 0) {
        res.data.newlyUnlocked.forEach((ach: Achievement) => {
          notify({
            title: t.newAchievement,
            message: lang === 'TH' ? ach.title_th : ach.title_en,
            type: 'achievement',
            icon: <Trophy size={20} className="text-accent" />
          });
        });
      }
    } catch (err) {
      console.error("Check achievements error:", err);
    }
  };

  const updateName = async (name: string) => {
    try {
      const res = await axios.post('/api/player/update-name', { name });
      setPlayer(res.data.player);
      notify({
        title: t.saved,
        message: lang === 'TH' ? 'อัปเดตชื่อเรียบร้อยแล้ว' : 'Username updated successfully',
        type: 'success'
      });
    } catch (err: any) {
      notify({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to update name',
        type: 'error'
      });
      throw err;
    }
  };

  const updateTheme = async (color: string) => {
    try {
      const res = await axios.post('/api/player/settings', { theme_color: color });
      setPlayer(res.data.player);
      notify({
        title: t.saved,
        message: lang === 'TH' ? 'อัปเดตธีมเรียบร้อยแล้ว' : 'Theme updated successfully',
        type: 'success'
      });
    } catch (err: any) {
      notify({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to update theme',
        type: 'error'
      });
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    refreshData();
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
    setPlayer(null);
    setActivePage('dashboard');
  };

  const handleSetLang = async (newLang: Language) => {
    setLang(newLang);
    if (user) {
      try {
        await axios.post('/api/player/settings', { language: newLang });
      } catch (err) {
        console.error("Failed to save language setting:", err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, player, loading, login, logout, refreshData, lang, setLang: handleSetLang, 
      activePage, setActivePage, updateName, checkAchievements, updateTheme 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Main App ---

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}

function AppContent() {
  const { user, loading, activePage } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-neutral-950 text-white selection:bg-accent selection:text-white">
      {!user ? (
        <AuthScreen />
      ) : (
        <>
          <Sidebar />
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'status' && <StatusPage />}
          {activePage === 'profile' && <ProfilePage />}
          {activePage === 'settings' && <SettingsPage />}
        </>
      )}
    </div>
  );
}
