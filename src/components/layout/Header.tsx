import { useRef } from 'react';
import { Download, Upload, Monitor, Keyboard, Gamepad2, Blocks, AlignStartVertical } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import { ProfileSchema } from '../../types/schema';

export type ViewMode = 'sets' | 'actions' | 'keyboard' | 'deck' | 'review';

interface HeaderProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

export function Header({ view, setView }: HeaderProps) {
  const { profileData, activeActionSetId, setActiveActionSetId, importProfile } = useProfileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const fileName = profileData.profile.name.toLowerCase().endsWith('.json') 
      ? profileData.profile.name 
      : `${profileData.profile.name}.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profileData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", fileName);
    dlAnchorElem.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        const parsed = ProfileSchema.parse(json);
        importProfile(parsed);
        alert('Profile imported successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to import profile: Invalid schema format.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const menuItems: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: 'sets', label: 'Action Sets', icon: Blocks },
    { id: 'actions', label: 'Actions', icon: AlignStartVertical },
    { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
    { id: 'deck', label: 'Steam Deck', icon: Gamepad2 },
    { id: 'review', label: 'Review', icon: Monitor },
  ];

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 flex flex-col px-6 py-4 gap-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-indigo-500" />
            Binding Visualizer
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {profileData.profile.name} • {profileData.profile.game}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Action Set Switcher */}
          {profileData.actionSets.length > 0 && view !== 'sets' && (
            <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 mr-4">
              {profileData.actionSets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => setActiveActionSetId(set.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeActionSetId === set.id
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                >
                  {set.name}
                </button>
              ))}
            </div>
          )}

          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-2" 
            title="Import (.json)"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs font-medium">Import .json</span>
          </button>
          <button 
            onClick={handleExport}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-2" 
            title="Export (.json)"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs font-medium">Export .json</span>
          </button>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
