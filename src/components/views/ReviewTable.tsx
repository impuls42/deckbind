import { useState, useMemo } from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { detectConflicts } from '../../utils/conflictDetector';
import type { ActionConflict } from '../../utils/conflictDetector';
import { AlertCircle, AlertTriangle, FileCode, FileText, CheckCircle2, Layers } from 'lucide-react';
import { getModeShiftBindingsForAction } from '../../utils/bindingUtils';

export function ReviewTable() {
  const { profileData } = useProfileStore();
  const [activeSetId, setActiveSetId] = useState<string>(profileData.actionSets[0]?.id || '');

  const activeSet = profileData.actionSets.find(s => s.id === activeSetId);

  const { kbConflicts, deckConflicts } = useMemo(() => {
    if (!activeSet) return { kbConflicts: [], deckConflicts: [] };
    return {
      kbConflicts: detectConflicts(activeSet, 'keyboard'),
      deckConflicts: detectConflicts(activeSet, 'deck')
    };
  }, [activeSet]);

  const getConflictBadge = (conflicts: ActionConflict[], actionId: string) => {
    const c = conflicts.find(x => x.actionId === actionId);
    if (!c) return <span title="Valid"><CheckCircle2 className="w-4 h-4 text-green-500" /></span>;
    
    if (c.level === 'hard') return <span title={`Hard conflict: ${c.message}`}><AlertCircle className="w-4 h-4 text-red-500" /></span>;
    if (c.level === 'subset') return <span title={`Subset conflict: ${c.message}`}><AlertTriangle className="w-4 h-4 text-yellow-500" /></span>;
    return <span className="w-2 h-2 rounded-full bg-neutral-600 block mx-1" title="Unbound"></span>;
  };

  const handleCopyMarkdown = () => {
    if (!activeSet) return;
    let md = `## ${activeSet.name} Bindings\n\n`;
    md += `| Action | Keyboard | Steam Deck |\n`;
    md += `|---|---|---|\n`;
    activeSet.actions.forEach(a => {
      const kb = (activeSet.bindings.keyboard[a.id] || [])
        .filter(combo => combo.length > 0)
        .map(combo => combo.map(k => k.replace('kb.', '').toUpperCase()).join(' + '))
        .join(' OR ') || '*unbound*';
      
      const deckPrimary = (activeSet.bindings.deck[a.id] || [])
        .filter(combo => combo.length > 0)
        .map(combo => combo.map(k => k.replace('deck.', '').toUpperCase()).join(' + '))
        .join(' OR ');
      const modeShiftData = getModeShiftBindingsForAction(a.id, activeSet);
      const deckModeShift = modeShiftData.map(ms => {
        const inputLabel = ms.inputId.replace('deck.', '').toUpperCase();
        const enableLabel = ms.enableButton.replace('deck.', '').toUpperCase();
        const slotLabel = ms.menuType === 'touch' 
          ? `R${Math.floor(parseInt(ms.slotId) / (ms.gridCols || 2)) + 1}C${(parseInt(ms.slotId) % (ms.gridCols || 2)) + 1}`
          : `Slot ${parseInt(ms.slotId) + 1}`;
        return `[Hold ${enableLabel}] ${inputLabel} ${ms.menuType === 'touch' ? 'Grid' : 'Radial'} ${slotLabel}`;
      }).join(' OR ');

      const deck = [deckPrimary, deckModeShift].filter(Boolean).join(' OR ') || '*unbound*';
      md += `| ${a.name} | ${kb} | ${deck} |\n`;
    });
    navigator.clipboard.writeText(md).then(() => alert('Copied to clipboard'));
  };

  const handleCopyJSON = () => {
    const json = JSON.stringify(profileData, null, 2);
    navigator.clipboard.writeText(json).then(() => alert('Copied to clipboard'));
  };

  if (!activeSet) return <div className="p-8 text-neutral-400">No active set.</div>;

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-medium text-neutral-100">Review & Export</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleCopyMarkdown}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Copy as Markdown
          </button>
          <button 
            onClick={handleCopyJSON}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FileCode className="w-4 h-4" />
            Copy JSON
          </button>
        </div>
      </div>

      {profileData.actionSets.length > 1 && (
        <div className="flex gap-2 mb-2 shrink-0">
          {profileData.actionSets.map(set => (
            <button
              key={set.id}
              onClick={() => setActiveSetId(set.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeSetId === set.id ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-neutral-200'}`}
            >
              {set.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex-1 overflow-y-auto min-h-0 shadow-sm relative">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-medium">
              <th className="px-6 py-4 w-1/4">Action</th>
              <th className="px-6 py-4 w-1/4">Category</th>
              <th className="px-6 py-4">Keyboard</th>
              <th className="px-6 py-4">Steam Deck</th>
            </tr>
          </thead>
          <tbody>
            {activeSet.actions.map(action => {
              const kbCombos = (activeSet.bindings.keyboard[action.id] || []).filter(c => c.length > 0);
              const deckCombos = (activeSet.bindings.deck[action.id] || []).filter(c => c.length > 0);
              
              return (
                <tr key={action.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-200">
                    <div className="flex flex-col">
                      <span>{action.name}</span>
                      <span className="text-xs text-neutral-500 capitalize">{action.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-400">{action.category || <span className="text-neutral-600">-</span>}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 mt-1">{getConflictBadge(kbConflicts, action.id)}</div>
                      <div className="flex flex-col gap-1">
                        {kbCombos.length === 0 && <span className="text-neutral-600 italic mt-0.5">Unbound</span>}
                        {kbCombos.map((combo, idx) => (
                          <div key={idx} className="flex flex-wrap gap-1">
                            {combo.map(k => (
                              <span key={k} className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300 font-mono">
                                {k.replace('kb.', '').toUpperCase()}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 mt-1">{getConflictBadge(deckConflicts, action.id)}</div>
                      <div className="flex flex-col gap-2">
                        {/* Primary Bindings */}
                        {deckCombos.map((combo, idx) => (
                          <div key={idx} className="flex flex-wrap gap-1">
                            {combo.map(k => (
                              <span key={k} className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300 font-mono">
                                {k.replace('deck.', '').toUpperCase()}
                              </span>
                            ))}
                          </div>
                        ))}
                        
                        {/* Mode Shift Bindings */}
                        {getModeShiftBindingsForAction(action.id, activeSet).map((ms, idx) => {
                          const inputLabel = ms.inputId.replace('deck.', '').replace('_click', '').toUpperCase();
                          const enableLabel = ms.enableButton.replace('deck.', '').toUpperCase();
                          const slotIndex = parseInt(ms.slotId);
                          
                          // Format slot label based on menu type
                          const slotLabel = ms.menuType === 'touch'
                            ? `R${Math.floor(slotIndex / (ms.gridCols || 2)) + 1}C${(slotIndex % (ms.gridCols || 2)) + 1}`
                            : `Slot ${slotIndex + 1}`;

                          return (
                            <div key={`ms-${idx}`} className="flex items-center gap-2 text-[11px] whitespace-nowrap">
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-950/40 border border-violet-500/30 rounded text-violet-300 font-bold shrink-0 leading-none">
                                <Layers className="w-2.5 h-2.5" />
                                <span className="uppercase tracking-tighter text-[9px]">Layer {ms.layerIndex + 1}</span>
                              </div>
                              <div className="flex items-center gap-1 text-neutral-400">
                                <span className="text-neutral-500 text-[10px]">via</span>
                                <span className="px-1 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[9px] font-mono text-neutral-300 leading-none">{enableLabel}</span>
                                <span className="text-neutral-500 text-[10px]">on</span>
                                <span className="text-neutral-300 font-medium">{inputLabel}</span>
                                <span className="text-neutral-500">→</span>
                                <span className="text-indigo-400 font-bold">{slotLabel}</span>
                              </div>
                            </div>
                          );
                        })}

                        {deckCombos.length === 0 && getModeShiftBindingsForAction(action.id, activeSet).length === 0 && (
                          <span className="text-neutral-600 italic mt-0.5">Unbound</span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {activeSet.actions.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            No actions defined in this set.
          </div>
        )}
      </div>
    </div>
  );
}
