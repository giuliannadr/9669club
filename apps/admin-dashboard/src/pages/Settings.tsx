import React, { useState } from 'react';
import { User, Link2, Radio, Camera, Save, Eye, EyeOff, Check, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'profile' | 'integrations' | 'rooms';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',      label: 'Perfil',          icon: <User className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integraciones',   icon: <Link2 className="w-4 h-4" /> },
  { id: 'rooms',        label: 'Config. Salas',   icon: <Radio className="w-4 h-4" /> },
];

const SettingsInput: React.FC<{
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange?: (v: string) => void;
}> = ({ label, value, type = 'text', placeholder, onChange }) => {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input
          type={isPass && !show ? 'password' : 'text'}
          defaultValue={value}
          placeholder={placeholder}
          onChange={e => onChange?.(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-neutral-600"
        />
        {isPass && (
          <button onClick={() => setShow(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const IntegrationCard: React.FC<{
  name: string;
  desc: string;
  icon: string;
  connected: boolean;
  onToggle: () => void;
}> = ({ name, desc, icon, connected, onToggle }) => (
  <div className="flex items-center justify-between p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-all">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-2xl">{icon}</div>
      <div>
        <p className="font-bold text-white text-sm">{name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {connected && <span className="flex items-center gap-1 text-[10px] font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> Activo</span>}
      <button
        onClick={onToggle}
        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${connected ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-orange-500 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'}`}
      >
        {connected ? 'Desconectar' : 'Conectar'}
      </button>
    </div>
  </div>
);

const ToggleSwitch: React.FC<{ label: string; desc?: string; value: boolean; onChange: () => void }> = ({ label, desc, value, onChange }) => (
  <div className="flex items-center justify-between py-4 border-b border-neutral-800 last:border-0">
    <div>
      <p className="text-sm font-medium text-white">{label}</p>
      {desc && <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>}
    </div>
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${value ? 'bg-orange-500' : 'bg-neutral-800'}`}
    >
      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${value ? 'translate-x-6' : ''}`} />
    </button>
  </div>
);

const ProfileTab: React.FC = () => (
  <div className="space-y-8">
    {/* Avatar */}
    <div className="flex items-center gap-6">
      <div className="relative group">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-400 to-rose-500 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-orange-500/20">
          GP
        </div>
        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </div>
      <div>
        <p className="font-bold text-white">Matias Morales</p>
        <p className="text-sm text-neutral-500">matiasmorales@gmail.com</p>
        <button className="text-xs text-orange-400 font-bold mt-1 hover:text-orange-300 transition-colors">Cambiar foto →</button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SettingsInput label="Nombre" value="Matias Morales" />
      <SettingsInput label="Apellido" value="" />
      <SettingsInput label="Email" value="[EMAIL_ADDRESS]" />
      <SettingsInput label="Teléfono" value="+54 9 11 2298-2271" />
      <SettingsInput label="Nombre del Estudio" value="9669.studio" />
      <SettingsInput label="Sitio Web" value="https://9669.studio" />
    </div>

    <div>
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">Bio del Estudio</label>
      <textarea rows={4} defaultValue="Estudio audiovisual especializado en eventos sociales y corporativos. Coberturas en vivo, edición premium y streaming 4K." className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-none placeholder:text-neutral-600" />
    </div>

    <div className="space-y-2">
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Nueva Contraseña</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsInput label="" value="" type="password" placeholder="Nueva contraseña" />
        <SettingsInput label="" value="" type="password" placeholder="Confirmar contraseña" />
      </div>
    </div>

    <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
      <Save className="w-4 h-4" /> Guardar Cambios
    </button>
  </div>
);

const IntegrationsTab: React.FC = () => {
  const [conns, setConns] = useState({ mp: true, vercel: true, mux: false, livekit: false, instagram: false });
  const toggle = (k: keyof typeof conns) => setConns(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-black text-neutral-300 uppercase tracking-widest mb-4">Pagos & Billing</h3>
        <div className="space-y-3">
          <IntegrationCard name="Mercado Pago" desc="Cobros y links de pago para presupuestos" icon="💳" connected={conns.mp} onToggle={() => toggle('mp')} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-black text-neutral-300 uppercase tracking-widest mb-4">Infraestructura</h3>
        <div className="space-y-3">
          <IntegrationCard name="Vercel" desc="Deploy automático del portfolio web público" icon="▲" connected={conns.vercel} onToggle={() => toggle('vercel')} />
          <IntegrationCard name="Mux Video" desc="Streaming HLS y almacenamiento de videos" icon="📹" connected={conns.mux} onToggle={() => toggle('mux')} />
          <IntegrationCard name="LiveKit" desc="WebRTC para el sistema de salas en vivo" icon="🎙️" connected={conns.livekit} onToggle={() => toggle('livekit')} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-black text-neutral-300 uppercase tracking-widest mb-4">Redes Sociales</h3>
        <div className="space-y-3">
          <IntegrationCard name="Instagram" desc="Publicación y programación de reels y posts" icon="📸" connected={conns.instagram} onToggle={() => toggle('instagram')} />
        </div>
      </div>
      {/* API Keys section */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-black text-neutral-300 uppercase tracking-widest">API Keys</h3>
        </div>
        <SettingsInput label="Mercado Pago Public Key" value="APP_USR-xxxxxxxx-xxxx-xxxx" type="password" />
        <SettingsInput label="Mux Token ID" value="xxxxxxxx-xxxx-xxxx" type="password" />
        <SettingsInput label="LiveKit API Key" value="APIxxxxxxxxxxxx" type="password" />
        <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
          <Save className="w-4 h-4" /> Guardar Keys
        </button>
      </div>
    </div>
  );
};

const RoomsTab: React.FC = () => {
  const [settings, setSettings] = useState({
    autoClose: true,
    maxGuests: false,
    recordStreams: true,
    notifications: true,
    watermark: false,
    autoSwitch: false,
  });
  const toggle = (k: keyof typeof settings) => setSettings(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-8">
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Radio className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-black text-neutral-300 uppercase tracking-widest">Comportamiento de Salas</h3>
        </div>
        <div className="space-y-1">
          <ToggleSwitch label="Cerrar sala automáticamente" desc="La sala se cierra 30 minutos después del último stream" value={settings.autoClose} onChange={() => toggle('autoClose')} />
          <ToggleSwitch label="Límite de invitados" desc="Máximo 8 streams simultáneos por sala" value={settings.maxGuests} onChange={() => toggle('maxGuests')} />
          <ToggleSwitch label="Grabar streams entrantes" desc="Almacena los vivos de invitados en Mux" value={settings.recordStreams} onChange={() => toggle('recordStreams')} />
          <ToggleSwitch label="Notificaciones de conexión" desc="Alerta cuando un invitado ingresa a la sala" value={settings.notifications} onChange={() => toggle('notifications')} />
          <ToggleSwitch label="Marca de agua en streams" desc="Añade el logo del estudio en el Master View" value={settings.watermark} onChange={() => toggle('watermark')} />
          <ToggleSwitch label="Auto-switch inteligente" desc="Cambia al stream con mejor señal automáticamente" value={settings.autoSwitch} onChange={() => toggle('autoSwitch')} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Calidad máxima de stream</label>
          <select className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none">
            <option>4K (3840x2160)</option>
            <option>1080p (1920x1080)</option>
            <option>720p (1280x720)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tiempo de expiración del QR</label>
          <select className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none">
            <option>4 horas</option>
            <option>8 horas</option>
            <option>24 horas</option>
            <option>Sin expiración</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">URL base de sala pública</label>
        <div className="flex gap-3">
          <input defaultValue="https://av-production.com/live" className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors" />
          <button className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl border border-neutral-700 text-sm font-bold transition-colors">
            <Zap className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-neutral-600">Los invitados accederán a: av-production.com/live?room=ID_DE_SALA</p>
      </div>

      <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
        <Save className="w-4 h-4" /> Guardar Configuración
      </button>
    </div>
  );
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="pb-16">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white tracking-tight">Configuración</h2>
        <p className="text-neutral-500 mt-1">Preferencias del sistema, perfil e integraciones.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-neutral-900/60 border border-neutral-800 rounded-2xl mb-10 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === tab.id ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {activeTab === tab.id && (
              <motion.div layoutId="settings-pill" className="absolute inset-0 bg-neutral-800 rounded-xl border border-neutral-700" />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'profile'      && <ProfileTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'rooms'        && <RoomsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Settings;
