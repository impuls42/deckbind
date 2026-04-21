import React, { useState, useMemo } from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { Plus, X, ChevronLeft, ChevronDown, ChevronRight, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

// Removed DECK_LAYOUT since we'll use inline structural rendering

export function DeckBinder() {
  const { profileData, activeActionSetId, setBindings } = useProfileStore();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeBindingIndex, setActiveBindingIndex] = useState<number>(0);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [inspectedInputId, setInspectedInputId] = useState<string | null>(null);

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

  if (!activeSet) return <div className="p-8 text-neutral-400">No active set.</div>;

  const currentAction = activeActionId ? activeSet.actions.find(a => a.id === activeActionId) : null;
  const currentBindings = currentAction ? (activeSet.bindings.deck[currentAction.id] || []) : [];

  const handleInputClick = (inputId: string) => {
    if (!currentAction) {
      setInspectedInputId(inputId === inspectedInputId ? null : inputId);
      return;
    }

    let newBindings = [...currentBindings];
    if (newBindings.length === 0) {
      newBindings = [[inputId]];
    } else {
      const currentCombo = newBindings[activeBindingIndex] || [];
      if (currentCombo.includes(inputId)) {
        newBindings[activeBindingIndex] = currentCombo.filter(id => id !== inputId);
      } else {
        newBindings[activeBindingIndex] = [...currentCombo, inputId];
      }
    }
    setBindings(activeSet.id, 'deck', currentAction.id, newBindings);
  };

  const getHighlightState = (inputId: string) => {
    let isBoundGlobally = false;
    for (const actId in activeSet.bindings.deck) {
      if (currentAction && actId === currentAction.id) continue;
      const combos = activeSet.bindings.deck[actId];
      if (combos?.some(c => c.includes(inputId))) {
        isBoundGlobally = true;
        break;
      }
    }

    if (!currentAction) {
      if (inputId === inspectedInputId) return 'inspect';
      return isBoundGlobally ? 'bound' : 'idle';
    }

    const presentInActiveCombo = currentBindings[activeBindingIndex]?.includes(inputId);
    const presentInOtherCombo = currentBindings.some((combo, i) => i !== activeBindingIndex && combo.includes(inputId));
    
    if (presentInActiveCombo) return 'active';
    if (presentInOtherCombo) return 'alternate';
    return isBoundGlobally ? 'bound' : 'idle';
  };

  const getButtonDots = (inputId: string) => {
    const dots: { type: 'solo' | 'combo' }[] = [];
    for (const actId in activeSet.bindings.deck) {
      const combos = activeSet.bindings.deck[actId];
      if (!combos) continue;
      combos.forEach((combo) => {
        if (combo.includes(inputId)) {
           dots.push({ type: combo.length === 1 ? 'solo' : 'combo' });
        }
      });
    }
    return dots;
  };

  const renderButton = (btnId: string, label: string | React.ReactNode, customClass: string = '') => {
    const hl = getHighlightState(btnId);
    const dots = getButtonDots(btnId);

    const bg = hl === 'active' 
      ? 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.6)] z-10 border-indigo-400' 
      : hl === 'alternate' 
      ? 'bg-indigo-900/50 text-indigo-200 border-indigo-500/50' 
      : hl === 'inspect'
      ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 scale-105'
      : hl === 'bound'
      ? 'bg-neutral-700 text-neutral-200 border-neutral-500/50 shadow-[inset_0_1px_rgba(255,255,255,0.1)]'
      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-white';
    
    return (
      <button
        key={btnId}
        onClick={() => handleInputClick(btnId)}
        className={`relative border ${bg} transition-colors flex items-center justify-center text-sm font-medium cursor-pointer ${customClass}`}
      >
        {dots.length > 0 && (
          <div className="absolute top-1 right-1 flex flex-wrap max-w-[70%] justify-end gap-0.5 pointer-events-none">
            {dots.map((d, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm drop-shadow-md ${d.type === 'solo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            ))}
          </div>
        )}
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row flex-1 h-full gap-4 xl:gap-6 min-h-0">
      <div className="flex-[2] xl:flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-4 xl:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-0">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-neutral-900 to-neutral-900"></div>
        {/* Steam Deck Mockup */}
        <div className="flex w-full xl:w-max xl:max-w-full z-10 overflow-x-auto overflow-y-hidden items-center justify-start custom-scrollbar">
          
          {/* Left Handle */}
          <div className="flex flex-col gap-2 p-6 bg-neutral-950 rounded-l-3xl border-y border-l border-neutral-800 w-[240px] shrink-0">
            {/* Top row */}
            <div className="flex gap-2 items-center">
              {renderButton('deck.l2', 'L2', 'w-16 h-8 rounded-lg')}
              {renderButton('deck.l1', 'L1', 'w-16 h-8 rounded-lg')}
              <div className="flex-1" />
              {renderButton('deck.view', 'View', 'w-10 h-8 rounded-full text-xs')}
            </div>
            
            {/* D-Pad & Left Stick */}
            <div className="flex items-center justify-between mt-2">
              <div className="grid grid-cols-3 grid-rows-3 gap-0 bg-neutral-900 border border-neutral-800 rounded-full p-1 w-[90px] h-[90px] place-items-center">
                <div />
                {renderButton('deck.dpad_up', '▲', 'w-7 h-7 rounded-t-md text-[10px]')}
                <div />
                {renderButton('deck.dpad_left', '◀', 'w-7 h-7 rounded-l-md text-[10px]')}
                <div className="w-6 h-6 flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                </div>
                {renderButton('deck.dpad_right', '▶', 'w-7 h-7 rounded-r-md text-[10px]')}
                <div />
                {renderButton('deck.dpad_down', '▼', 'w-7 h-7 rounded-b-md text-[10px]')}
                <div />
              </div>
              <div className="mr-1">
                {renderButton('deck.lstick_click', 'L3', 'w-[4.5rem] h-[4.5rem] rounded-full shadow-inner shadow-black/50')}
              </div>
            </div>

            {/* Left Trackpad */}
            <div className="mt-2 flex justify-center">
              {renderButton('deck.ltrackpad_click', 'L-Pad', 'w-28 h-28 rounded-xl bg-neutral-900')}
            </div>

            {/* Back Grips */}
            <div className="flex justify-between gap-3 mt-3">
              {renderButton('deck.l4', 'L4', 'flex-1 py-1.5 rounded-lg text-xs')}
              {renderButton('deck.l5', 'L5', 'flex-1 py-1.5 rounded-lg text-xs')}
            </div>
          </div>

          {/* Center Screen */}
          <div className="w-64 bg-neutral-950 border-y border-neutral-800 flex items-center justify-center shrink-0 self-stretch relative">
            <div className="w-full h-[360px] bg-neutral-900/50 rounded-xl mx-2 border border-neutral-800 flex items-center justify-center shadow-inner overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
               <span className="text-neutral-500 text-sm font-medium tracking-widest opacity-30">SCREEN</span>
            </div>
          </div>

          {/* Right Handle */}
          <div className="flex flex-col gap-2 p-6 bg-neutral-950 rounded-r-3xl border-y border-r border-neutral-800 w-[240px] shrink-0">
            {/* Top row */}
            <div className="flex gap-2 items-center justify-end">
              {renderButton('deck.menu', 'Menu', 'w-10 h-8 rounded-full text-xs')}
              <div className="flex-1" />
              {renderButton('deck.r1', 'R1', 'w-16 h-8 rounded-lg')}
              {renderButton('deck.r2', 'R2', 'w-16 h-8 rounded-lg')}
            </div>
            
            {/* Right Stick & ABXY */}
            <div className="flex items-center justify-between mt-2">
              <div className="ml-1">
                {renderButton('deck.rstick_click', 'R3', 'w-[4.5rem] h-[4.5rem] rounded-full shadow-inner shadow-black/50')}
              </div>
              <div className="grid grid-cols-3 grid-rows-3 gap-1 bg-neutral-900 border border-neutral-800 rounded-full p-2 w-[90px] h-[90px] place-items-center">
                <div />
                {renderButton('deck.y', 'Y', 'w-7 h-7 rounded-full text-xs font-bold text-yellow-500')}
                <div />
                {renderButton('deck.x', 'X', 'w-7 h-7 rounded-full text-xs font-bold text-blue-500')}
                <div className="w-6 h-6 flex items-center justify-center" />
                {renderButton('deck.b', 'B', 'w-7 h-7 rounded-full text-xs font-bold text-red-500')}
                <div />
                {renderButton('deck.a', 'A', 'w-7 h-7 rounded-full text-xs font-bold text-green-500')}
                <div />
              </div>
            </div>

            {/* Right Trackpad */}
            <div className="mt-2 flex justify-center">
              {renderButton('deck.rtrackpad_click', 'R-Pad', 'w-28 h-28 rounded-xl bg-neutral-900')}
            </div>

            {/* Back Grips */}
            <div className="flex justify-between gap-3 mt-3">
              {renderButton('deck.r4', 'R4', 'flex-1 py-1.5 rounded-lg text-xs')}
              {renderButton('deck.r5', 'R5', 'flex-1 py-1.5 rounded-lg text-xs')}
            </div>
          </div>
        </div>
        <p className="mt-8 text-neutral-500 text-sm z-10 hidden xl:block">Select an action on the right, then click Deck inputs here to bind.</p>
      </div>

      <div className="flex-1 xl:flex-none xl:w-96 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden z-10 shrink-0 min-h-0">
        {currentAction ? (
          <div className="flex flex-col h-full min-h-0">
            <div className="p-4 border-b border-neutral-800 flex items-center gap-3 bg-neutral-950 rounded-t-xl shrink-0">
              <button onClick={() => setActiveActionId(null)} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-medium text-neutral-100">{currentAction.name}</h3>
                <p className="text-xs text-neutral-500">Steam Deck Binding</p>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-auto flex flex-col gap-4">
              {currentBindings.map((combo, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveBindingIndex(idx)}
                  className={`p-3 rounded-lg border ${activeBindingIndex === idx ? 'border-indigo-500 bg-indigo-500/10' : 'border-neutral-800 bg-neutral-800/50 hover:border-neutral-700'} cursor-pointer transition-colors`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-neutral-400">Binding Alternate {idx + 1}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setBindings(activeSet.id, 'deck', currentAction.id, currentBindings.filter((_, i) => i !== idx));
                        setActiveBindingIndex(Math.max(0, idx - 1));
                      }}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {combo.length === 0 ? (
                      <span className="text-sm text-neutral-500 italic">Click inputs to map</span>
                    ) : (
                      combo.map(inputId => {
                        const lbl = inputId.replace('deck.', '').toUpperCase();
                        return (
                          <span key={inputId} className="px-2 py-1 bg-neutral-800 rounded text-sm text-neutral-200 shadow-sm border border-neutral-700 flex items-center gap-1">
                            {lbl}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}

              <button 
                onClick={() => {
                  setBindings(activeSet.id, 'deck', currentAction.id, [...currentBindings, []]);
                  setActiveBindingIndex(currentBindings.length);
                }}
                className="flex items-center justify-center gap-2 py-3 border border-dashed border-neutral-700 rounded-lg text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Alternate Binding
              </button>
            </div>
          </div>
        ) : inspectedInputId ? (
          <div className="flex flex-col h-full bg-neutral-950 min-h-0">
            <div className="p-4 border-b border-neutral-800 bg-neutral-900 shrink-0 flex items-center gap-3">
              <button 
                onClick={() => setInspectedInputId(null)} 
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
                title="Back to Actions"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-medium text-neutral-100">Inspecting Input</h3>
                <p className="text-xs text-neutral-500 font-mono">{inspectedInputId.replace('deck.', '').toUpperCase()}</p>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 min-h-0">
              {(() => {
                const inspectedActions = Object.values(groupedActions).flat().filter(a => {
                   const combos = activeSet.bindings.deck[a.id];
                   return combos && combos.some(c => c.includes(inspectedInputId));
                });
                
                if (inspectedActions.length === 0) {
                  return <p className="text-neutral-500 text-sm text-center mt-8">No actions bound to this input.</p>;
                }
                
                return inspectedActions.map(action => (
                  <div key={action.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-sm font-medium text-neutral-200 truncate">{action.name}</span>
                       <span className="text-xs text-neutral-500 ml-2 shrink-0">{action.category || 'Uncategorized'}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {(activeSet.bindings.deck[action.id] || [])
                         .map((combo, idx) => {
                           if (!combo.includes(inspectedInputId)) return null;
                           return (
                             <div key={idx} className="flex gap-1 flex-wrap">
                               {combo.map(k => <span key={k} className={`px-1.5 py-0.5 bg-neutral-800 border ${k === inspectedInputId ? 'border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'border-neutral-700 text-neutral-400'} rounded text-[10px] font-mono leading-none flex items-center`}>{k.replace('deck.', '').toUpperCase()}</span>)}
                             </div>
                           );
                         })}
                    </div>
                    <button 
                      onClick={() => {
                        setInspectedInputId(null);
                        setActiveActionId(action.id);
                        setActiveBindingIndex(0);
                      }}
                      className="mt-3 w-full py-1.5 bg-neutral-800 hover:bg-indigo-500/20 hover:text-indigo-400 text-neutral-400 rounded text-xs transition-colors flex items-center justify-center gap-1 font-medium"
                    >
                      Edit Binding
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full rounded-xl overflow-hidden min-h-0">
            <div className="p-4 border-b border-neutral-800 shrink-0 flex items-center justify-between">
              <h3 className="font-medium text-neutral-100">Actions ({activeSet.actions.length})</h3>
              <div className="flex gap-1">
                <button onClick={handleExpandAll} title="Expand All" className="p-1.5 hover:bg-neutral-800 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleCollapseAll} title="Collapse All" className="p-1.5 hover:bg-neutral-800 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 min-h-0">
              {Object.keys(groupedActions).sort((a,b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)).map(cat => (
                <div key={cat} className="mb-2">
                  <button 
                    onClick={() => toggleCategory(cat)} 
                    className="flex items-center gap-2 w-full p-2 hover:bg-neutral-800/50 rounded-lg text-left transition-colors"
                  >
                    {collapsedCategories.has(cat) ? <ChevronRight className="w-4 h-4 text-neutral-500"/> : <ChevronDown className="w-4 h-4 text-neutral-500"/>}
                    <span className="text-sm font-semibold text-neutral-400">{cat}</span>
                    <span className="text-xs text-neutral-600 ml-auto">{groupedActions[cat].length}</span>
                  </button>
                  
                  {!collapsedCategories.has(cat) && (
                    <div className="flex flex-col gap-1 mt-1 pl-2">
                      {groupedActions[cat].map(action => {
                        const isMapped = (activeSet.bindings.deck[action.id] || []).length > 0;
                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              setActiveActionId(action.id);
                              setActiveBindingIndex(0);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800 border border-transparent transition-colors text-left"
                          >
                            <span className="text-sm font-medium text-neutral-200">{action.name}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isMapped ? 'bg-indigo-500 drop-shadow-[0_0_5px_rgba(99,102,241,0.8)]' : 'bg-neutral-700'}`} title={isMapped ? 'Mapped' : 'Unmapped'} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
