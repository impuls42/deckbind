import { useState } from 'react';
import { Plus, Copy, Trash2, Edit2, Check, X, Gamepad2 } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';

export function ActionSetManager() {
  const { profileData, setProfileInfo, createActionSet, updateActionSet, deleteActionSet, duplicateActionSet, setActiveActionSetId, activeActionSetId } = useProfileStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    createActionSet({
      id: Math.random().toString(36).substring(2, 9),
      name: 'New Action Set',
      actions: [],
      bindings: { keyboard: {}, deck: {} },
    });
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      updateActionSet(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
      <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-neutral-100 flex items-center gap-2 mb-4">
          <Gamepad2 className="w-5 h-5 text-indigo-400" />
          Profile Configuration
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-neutral-400 mb-1">Profile Name</label>
            <input
              type="text"
              value={profileData.profile.name}
              onChange={(e) => setProfileInfo({ ...profileData.profile, name: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-neutral-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-neutral-400 mb-1">Game</label>
            <input
              type="text"
              value={profileData.profile.game}
              onChange={(e) => setProfileInfo({ ...profileData.profile, game: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-neutral-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-100">Action Sets</h2>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Action Set
          </button>
        </div>

        <div className="grid gap-3">
          {profileData.actionSets.map((set) => (
            <div 
              key={set.id}
              className={`bg-neutral-900 border ${activeActionSetId === set.id ? 'border-indigo-500/50' : 'border-neutral-800'} rounded-xl p-4 flex items-center justify-between transition-colors`}
            >
              <div className="flex-1 flex items-center gap-4">
                <input 
                  type="radio"
                  checked={activeActionSetId === set.id}
                  onChange={() => setActiveActionSetId(set.id)}
                  className="w-4 h-4 text-indigo-500 bg-neutral-950 border-neutral-800 focus:ring-indigo-500/50 focus:ring-offset-neutral-900"
                />
                
                {editingId === set.id ? (
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(set.id)}
                      className="flex-1 bg-neutral-950 border border-indigo-500 rounded px-2 py-1 text-neutral-100 focus:outline-none"
                    />
                    <button onClick={() => saveEdit(set.id)} className="p-1 text-green-400 hover:bg-neutral-800 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-red-400 hover:bg-neutral-800 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 cursor-pointer" onClick={() => setActiveActionSetId(set.id)}>
                    <h3 className="font-medium text-neutral-200">{set.name}</h3>
                    <p className="text-sm text-neutral-500">{set.actions.length} actions</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {editingId !== set.id && (
                  <button onClick={() => startEdit(set.id, set.name)} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => duplicateActionSet(set.id)} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors" title="Duplicate">
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteActionSet(set.id)}
                  disabled={profileData.actionSets.length === 1}
                  className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
