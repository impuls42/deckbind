import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ClipboardPaste, ChevronDown, ChevronRight } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import type { ActionType } from '../../types/schema';

export function ActionManager() {
  const { profileData, activeActionSetId, addAction, updateAction, deleteAction } = useProfileStore();
  const [pasteData, setPasteData] = useState('');
  const [pasteCategory, setPasteCategory] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const activeSet = profileData.actionSets.find((s) => s.id === activeActionSetId);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const groupedActions = useMemo(() => {
    if (!activeSet) return {};
    const groups: Record<string, typeof activeSet.actions> = {};
    activeSet.actions.forEach(a => {
      const c = a.category?.trim() || 'Uncategorized';
      if (!groups[c]) groups[c] = [];
      groups[c].push(a);
    });
    return groups;
  }, [activeSet]);

  const handleExpandAll = () => setCollapsedCategories(new Set());
  const handleCollapseAll = () => setCollapsedCategories(new Set(Object.keys(groupedActions)));

  if (!activeSet) {
    return <div className="text-neutral-400 text-center py-12">No active Action Set selected.</div>;
  }

  const handleAddAction = () => {
    addAction(activeSet.id, {
      id: Math.random().toString(36).substring(2, 9),
      name: 'New Action',
      type: 'digital',
    });
  };

  const handlePasteSubmit = () => {
    const lines = pasteData.split('\n').map((l) => l.trim()).filter(Boolean);
    const cat = pasteCategory.trim();
    lines.forEach((line) => {
      addAction(activeSet.id, {
        id: Math.random().toString(36).substring(2, 9),
        name: line,
        type: 'digital',
        ...(cat ? { category: cat } : {})
      });
    });
    setPasteData('');
    setPasteCategory('');
    setShowPasteModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-medium text-neutral-100">Actions in "{activeSet.name}"</h2>
          <p className="text-sm text-neutral-400">Define the logical game actions that need bindings</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 mr-2 text-neutral-400">
            <button onClick={handleExpandAll} className="px-2 py-1.5 text-xs hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors" title="Expand Categories">Expand All</button>
            <button onClick={handleCollapseAll} className="px-2 py-1.5 text-xs hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors" title="Collapse Categories">Collapse All</button>
          </div>
          <button 
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <ClipboardPaste className="w-4 h-4" />
            Bulk Paste
          </button>
          <button 
            onClick={handleAddAction}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Action
          </button>
        </div>
      </div>

      {showPasteModal && (
        <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
          <label className="text-sm text-neutral-300 font-medium">Paste new actions (one per line)</label>
          <textarea
            autoFocus
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 h-32 resize-y"
            placeholder="Attack&#10;Jump&#10;Sprint"
          />
          <div className="flex items-center gap-3 mt-1">
             <label className="text-sm text-neutral-300 font-medium whitespace-nowrap">Category:</label>
             <input 
               type="text" 
               value={pasteCategory} 
               onChange={(e) => setPasteCategory(e.target.value)} 
               placeholder="e.g. Combat (Optional)" 
               className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500" 
             />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button 
              onClick={() => setShowPasteModal(false)}
              className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handlePasteSubmit}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {activeSet.actions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl py-16 text-neutral-500">
          <p>No actions defined yet.</p>
          <button onClick={handleAddAction} className="text-indigo-400 hover:text-indigo-300 mt-2 hover:underline">Create your first action</button>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-sm flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950 border-b border-neutral-800 text-sm font-medium text-neutral-400">
                <th className="px-6 py-3 w-1/3">Name</th>
                <th className="px-6 py-3 w-1/4">Type</th>
                <th className="px-6 py-3 w-1/4">Category</th>
                <th className="px-6 py-3 w-min text-right"></th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedActions).sort((a,b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)).map(cat => (
                <React.Fragment key={cat}>
                  <tr className="bg-neutral-800/30 hover:bg-neutral-800/60 cursor-pointer border-b border-neutral-800 transition-colors" onClick={() => toggleCategory(cat)}>
                    <td colSpan={4} className="px-6 py-2 border-l-2 border-indigo-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                          {collapsedCategories.has(cat) ? <ChevronRight className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                          {cat} <span className="text-neutral-500 font-normal">({groupedActions[cat].length})</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCategoryToDelete(cat);
                          }}
                          className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded transition-colors"
                          title={`Delete all ${cat} actions`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {!collapsedCategories.has(cat) && groupedActions[cat].map((action) => (
                    <tr key={action.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors group">
                      <td className="px-4 py-3 pl-8">
                        <input
                          type="text"
                          value={action.name}
                          onChange={(e) => updateAction(activeSet.id, action.id, { name: e.target.value })}
                          className="w-full bg-transparent border-transparent hover:border-neutral-700 focus:border-indigo-500 focus:bg-neutral-950 border rounded px-2 py-1 outline-none text-neutral-100 transition-colors"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(activeSet.id, action.id, { type: e.target.value as ActionType })}
                          className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-sm text-neutral-300 outline-none focus:border-indigo-500"
                        >
                          <option value="digital">Digital (Button)</option>
                          <option value="analog">Analog (Trigger)</option>
                          <option value="directional">Directional (Stick)</option>
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={action.category || ''}
                          placeholder="e.g. Combat"
                          onChange={(e) => updateAction(activeSet.id, action.id, { category: e.target.value })}
                          className="w-full bg-transparent border-transparent hover:border-neutral-700 focus:border-indigo-500 focus:bg-neutral-950 border rounded px-2 py-1 outline-none text-neutral-100 text-sm transition-colors"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button 
                          onClick={() => deleteAction(activeSet.id, action.id)}
                          className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-neutral-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete action"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-neutral-100 mb-2">Delete Category?</h3>
            <p className="text-sm text-neutral-400 mb-6">
              Are you sure you want to delete all <strong>{groupedActions[categoryToDelete]?.length || 0}</strong> actions in <strong>"{categoryToDelete}"</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  groupedActions[categoryToDelete]?.forEach(a => deleteAction(activeSet.id, a.id));
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
