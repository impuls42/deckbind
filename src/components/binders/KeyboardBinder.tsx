import React, { useState, useMemo, useEffect } from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { isActionBound } from '../../utils/bindingUtils';
import { Plus, X, Search, ChevronLeft, Delete, CornerDownLeft, ArrowBigUp, ArrowRightToLine, Command, CaseSensitive, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Menu, ChevronDown, ChevronRight, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

const MAIN_KEYS = [
  ['kb.escape', 'gap_1', 'kb.f1', 'kb.f2', 'kb.f3', 'kb.f4', 'gap_0.5', 'kb.f5', 'kb.f6', 'kb.f7', 'kb.f8', 'gap_0.5', 'kb.f9', 'kb.f10', 'kb.f11', 'kb.f12'],
  ['kb.backquote', 'kb.1', 'kb.2', 'kb.3', 'kb.4', 'kb.5', 'kb.6', 'kb.7', 'kb.8', 'kb.9', 'kb.0', 'kb.minus', 'kb.equal', 'kb.backspace'],
  ['kb.tab', 'kb.q', 'kb.w', 'kb.e', 'kb.r', 'kb.t', 'kb.y', 'kb.u', 'kb.i', 'kb.o', 'kb.p', 'kb.bracket_left', 'kb.bracket_right', 'kb.backslash'],
  ['kb.caps_lock', 'kb.a', 'kb.s', 'kb.d', 'kb.f', 'kb.g', 'kb.h', 'kb.j', 'kb.k', 'kb.l', 'kb.semicolon', 'kb.quote', 'kb.enter'],
  ['kb.shift', 'kb.z', 'kb.x', 'kb.c', 'kb.v', 'kb.b', 'kb.n', 'kb.m', 'kb.comma', 'kb.period', 'kb.slash', 'kb.shift_right'],
  ['kb.ctrl', 'kb.meta', 'kb.alt', 'kb.space', 'kb.alt_right', 'kb.meta_right', 'kb.menu', 'kb.ctrl_right']
];

const NAV_KEYS = [
  ['kb.print_screen', 'kb.scroll_lock', 'kb.pause'],
  ['kb.insert', 'kb.home', 'kb.page_up'],
  ['kb.delete', 'kb.end', 'kb.page_down'],
  [null, null, null],
  [null, 'kb.arrow_up', null],
  ['kb.arrow_left', 'kb.arrow_down', 'kb.arrow_right'],
];

export function KeyboardBinder() {
  const { profileData, activeActionSetId, setBindings } = useProfileStore();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeBindingIndex, setActiveBindingIndex] = useState<number>(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedInputId, setInspectedInputId] = useState<string | null>(null);

  const activeSet = profileData.actionSets.find((s) => s.id === activeActionSetId);

  const groupedActions = useMemo(() => {
    if (!activeSet) return {};
    const groups: Record<string, NonNullable<typeof activeSet>['actions']> = {};
    activeSet.actions.forEach(a => {
      const c = a.category?.trim() || 'Uncategorized';
      if (!groups[c]) groups[c] = [];
      groups[c].push(a);
    });
    return groups;
  }, [activeSet]);

  const handleExpandAll = () => setExpandedCategories(new Set(Object.keys(groupedActions)));
  const handleCollapseAll = () => setExpandedCategories(new Set());

  const filteredGroupedActions = useMemo(() => {
    if (!searchTerm.trim()) return groupedActions;
    const lowerTerm = searchTerm.toLowerCase();
    const filtered: Record<string, NonNullable<typeof activeSet>['actions']> = {};
    Object.keys(groupedActions).forEach(cat => {
      const catMatches = cat.toLowerCase().includes(lowerTerm);
      const matchingActions = groupedActions[cat].filter(a => 
        a.name.toLowerCase().includes(lowerTerm) || catMatches
      );
      if (matchingActions.length > 0) filtered[cat] = matchingActions;
    });
    return filtered;
  }, [groupedActions, searchTerm]);

  type SidebarView = 'list' | 'binding' | 'inspect';

  const getSidebarView = (): SidebarView => {
    if (activeActionId) return 'binding';
    if (inspectedInputId) return 'inspect';
    return 'list';
  };

  const sidebarView = getSidebarView();

  const visibleActionsList = useMemo(() => {
    const sortedCats = Object.keys(filteredGroupedActions).sort((a,b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b));
    const visible: string[] = [];
    sortedCats.forEach(cat => {
      if (expandedCategories.has(cat)) {
        filteredGroupedActions[cat].forEach(a => visible.push(a.id));
      }
    });
    return visible;
  }, [filteredGroupedActions, expandedCategories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeActionId) setActiveActionId(null);
        else if (inspectedInputId) setInspectedInputId(null);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (activeActionId) return;

      if (sidebarView === 'list' && visibleActionsList.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const currentIndex = selectedActionId ? visibleActionsList.indexOf(selectedActionId) : -1;
          const nextIndex = currentIndex === -1 || currentIndex === visibleActionsList.length - 1 ? 0 : currentIndex + 1;
          setSelectedActionId(visibleActionsList[nextIndex]);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const currentIndex = selectedActionId ? visibleActionsList.indexOf(selectedActionId) : -1;
          const prevIndex = currentIndex <= 0 ? visibleActionsList.length - 1 : currentIndex - 1;
          setSelectedActionId(visibleActionsList[prevIndex]);
        } else if (e.key === 'Enter' && selectedActionId) {
          e.preventDefault();
          setActiveActionId(selectedActionId);
          setActiveBindingIndex(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarView, selectedActionId, visibleActionsList, activeActionId, inspectedInputId]);

  useEffect(() => {
    if (selectedActionId && sidebarView === 'list') {
      const el = document.getElementById(`action-item-${selectedActionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedActionId, sidebarView]);

  if (!activeSet) return <div className="p-8 text-neutral-400">No active set.</div>;

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };



  const currentAction = activeActionId ? activeSet.actions.find(a => a.id === activeActionId) : null;
  const currentBindings = currentAction ? (activeSet.bindings.keyboard[currentAction.id] || []) : [];

  const handleKeyClick = (inputId: string) => {
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
    setBindings(activeSet.id, 'keyboard', currentAction.id, newBindings);
  };

  const getHighlightState = (inputId: string) => {
    let isBoundGlobally = false;
    for (const actId in activeSet.bindings.keyboard) {
      if (currentAction && actId === currentAction.id) continue;
      const combos = activeSet.bindings.keyboard[actId];
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

  const getKeyDots = (inputId: string) => {
    const dots: { type: 'solo' | 'combo' }[] = [];
    for (const actId in activeSet.bindings.keyboard) {
      const combos = activeSet.bindings.keyboard[actId];
      if (!combos) continue;
      combos.forEach((combo) => {
        if (combo.includes(inputId)) {
           dots.push({ type: combo.length === 1 ? 'solo' : 'combo' });
        }
      });
    }
    return dots;
  };

  const getMainKeyWidthStyle = (keyId: string) => {
    if (keyId.startsWith('gap_')) {
      const u = parseFloat(keyId.split('_')[1]);
      return { width: `${u * 48 + (u - 1) * 8}px`, flexShrink: 0, opacity: 0, pointerEvents: 'none' as const };
    }

    let u = 1;
    switch (keyId) {
      case 'kb.backspace': u = 2; break;
      case 'kb.tab': u = 1.5; break;
      case 'kb.backslash': u = 1.5; break;
      case 'kb.caps_lock': u = 1.75; break;
      case 'kb.enter': u = 2.25; break;
      case 'kb.shift': u = 2.25; break;
      case 'kb.shift_right': u = 2.75; break;
      case 'kb.ctrl': 
      case 'kb.meta': 
      case 'kb.alt':
      case 'kb.alt_right':
      case 'kb.meta_right':
      case 'kb.menu':
      case 'kb.ctrl_right': u = 1.25; break;
      case 'kb.space': u = 6.25; break;
      default: u = 1; break;
    }
    return { width: `${u * 48 + (u - 1) * 8}px`, flexShrink: 0 };
  };

  const renderKeyLabel = (keyId: string) => {
    switch (keyId) {
      case 'kb.backspace': return <Delete className="w-5 h-5 text-neutral-400" />;
      case 'kb.enter': 
      case 'kb.numpad_enter': return <CornerDownLeft className="w-5 h-5 text-neutral-400" />;
      case 'kb.shift':
      case 'kb.shift_right': return <ArrowBigUp className="w-5 h-5 text-neutral-400" />;
      case 'kb.tab': return <ArrowRightToLine className="w-5 h-5 text-neutral-400" />;
      case 'kb.caps_lock': return <CaseSensitive className="w-5 h-5 text-neutral-400" />;
      case 'kb.meta':
      case 'kb.meta_right': return <Command className="w-5 h-5 text-neutral-400" />;
      case 'kb.menu': return <Menu className="w-5 h-5 text-neutral-400" />;
      case 'kb.space': return '';
      case 'kb.backquote': return '`';
      case 'kb.minus': return '-';
      case 'kb.equal': return '=';
      case 'kb.bracket_left': return '[';
      case 'kb.bracket_right': return ']';
      case 'kb.backslash': return '\\';
      case 'kb.semicolon': return ';';
      case 'kb.quote': return "'";
      case 'kb.comma': return ',';
      case 'kb.period': return '.';
      case 'kb.slash': return '/';
      
      case 'kb.escape': return 'Esc';
      case 'kb.ctrl':
      case 'kb.ctrl_right': return 'Ctrl';
      case 'kb.alt':
      case 'kb.alt_right': return 'Alt';

      case 'kb.print_screen': return 'PrtSc';
      case 'kb.scroll_lock': return 'ScrLk';
      case 'kb.pause': return 'Pause';
      case 'kb.insert': return 'Ins';
      case 'kb.home': return 'Home';
      case 'kb.page_up': return 'PgUp';
      case 'kb.delete': return 'Del';
      case 'kb.end': return 'End';
      case 'kb.page_down': return 'PgDn';

      case 'kb.arrow_up': return <ArrowUp className="w-5 h-5" />;
      case 'kb.arrow_down': return <ArrowDown className="w-5 h-5" />;
      case 'kb.arrow_left': return <ArrowLeft className="w-5 h-5" />;
      case 'kb.arrow_right': return <ArrowRight className="w-5 h-5" />;

      case 'kb.num_lock': return 'Num';
      case 'kb.numpad_divide': return '/';
      case 'kb.numpad_multiply': return '*';
      case 'kb.numpad_minus': return '-';
      case 'kb.numpad_plus': return '+';
      case 'kb.numpad_decimal': return '.';
      case 'kb.numpad_7': return '7';
      case 'kb.numpad_8': return '8';
      case 'kb.numpad_9': return '9';
      case 'kb.numpad_4': return '4';
      case 'kb.numpad_5': return '5';
      case 'kb.numpad_6': return '6';
      case 'kb.numpad_1': return '1';
      case 'kb.numpad_2': return '2';
      case 'kb.numpad_3': return '3';
      case 'kb.numpad_0': return '0';

      case 'kb.mouse_left': return 'LMB';
      case 'kb.mouse_right': return 'RMB';
      case 'kb.mouse_middle': return 'MMB';
      case 'kb.mouse_wheel_up': return 'WU';
      case 'kb.mouse_wheel_down': return 'WD';
      case 'kb.mouse_forward': return 'M4';
      case 'kb.mouse_back': return 'M5';

      default: return keyId.replace('kb.', '').toUpperCase();
    }
  };

  const renderKeyButton = (keyId: string | null, customClass: string = '', styleObj: React.CSSProperties = {}) => {
    if (!keyId) return <div className={customClass} style={styleObj} />;
    if (keyId.startsWith('gap_')) return <div style={getMainKeyWidthStyle(keyId)} className={customClass} />;

    const hl = getHighlightState(keyId);
    const dots = getKeyDots(keyId);

    const bg = hl === 'active' 
      ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10' 
      : hl === 'alternate' 
        ? 'bg-indigo-900/50 text-indigo-200 border-indigo-500/50' 
        : hl === 'inspect'
        ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 scale-105'
        : hl === 'bound'
        ? 'bg-neutral-700 text-neutral-200 border-neutral-500/50 shadow-[inset_0_1px_rgba(255,255,255,0.1)]'
        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-white shadow-sm';
    
    return (
      <button
        key={keyId}
        style={styleObj}
        onClick={() => handleKeyClick(keyId)}
        className={`relative rounded border ${bg} transition-all duration-200 flex items-center justify-center text-sm font-semibold cursor-pointer select-none ${customClass}`}
        title={keyId}
      >
        {dots.length > 0 && (
          <div className="absolute top-1 right-1 flex flex-wrap max-w-[70%] justify-end gap-0.5 pointer-events-none">
            {dots.map((d, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm drop-shadow-md ${d.type === 'solo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            ))}
          </div>
        )}
        {renderKeyLabel(keyId)}
      </button>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row flex-1 h-full gap-4 xl:gap-6 min-h-0">
      <div className="flex-[2] xl:flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-4 xl:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-0">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-neutral-900 to-neutral-900"></div>
        
        <div className="flex gap-4 xl:gap-6 p-4 xl:p-6 bg-neutral-950 rounded-lg shadow-xl border border-neutral-800 z-10 overflow-x-auto w-full xl:w-max xl:max-w-full justify-start custom-scrollbar">
          
          <div className="flex flex-col gap-2 shrink-0 min-w-max">
            {MAIN_KEYS.map((row, _rIdx) => (
              <div key={_rIdx} className="flex gap-2">
                {row.map(keyId => renderKeyButton(keyId, 'h-12', getMainKeyWidthStyle(keyId)))}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 auto-rows-[3rem] h-max shrink-0 min-w-max">
            {NAV_KEYS.map((row) => 
               row.map((keyId) => renderKeyButton(keyId, 'w-12 h-12', {}))
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 auto-rows-[3rem] h-max shrink-0 min-w-max">
            <div className="col-span-4 h-12" />
            
            {renderKeyButton('kb.num_lock', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_divide', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_multiply', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_minus', 'w-12 h-12')}

            {renderKeyButton('kb.numpad_7', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_8', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_9', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_plus', 'w-12 h-full row-span-2')}

            {renderKeyButton('kb.numpad_4', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_5', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_6', 'w-12 h-12')}

            {renderKeyButton('kb.numpad_1', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_2', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_3', 'w-12 h-12')}
            {renderKeyButton('kb.numpad_enter', 'w-12 h-full row-span-2')}

            {renderKeyButton('kb.numpad_0', 'w-full h-12 col-span-2')}
            {renderKeyButton('kb.numpad_decimal', 'w-12 h-12')}
          </div>

          <div className="flex flex-col shrink-0 min-w-max ml-6 pt-[1rem]">
             <div className="flex flex-col gap-2 shrink-0 min-w-max bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-3 shadow-inner items-center relative">
               <div className="flex gap-2 isolate">
                 {renderKeyButton('kb.mouse_left', 'w-16 h-[5.5rem] rounded-tl-[1.5rem] rounded-bl-md rounded-r-md')}
                 <div className="flex flex-col gap-1 w-10">
                   {renderKeyButton('kb.mouse_wheel_up', 'h-6 rounded-t-xl text-[10px]')}
                   {renderKeyButton('kb.mouse_middle', 'h-8 text-[10px]')}
                   {renderKeyButton('kb.mouse_wheel_down', 'h-6 rounded-b-xl text-[10px]')}
                 </div>
                 {renderKeyButton('kb.mouse_right', 'w-16 h-[5.5rem] rounded-tr-[1.5rem] rounded-br-md rounded-l-md')}
               </div>
               <div className="w-full h-32 bg-neutral-950/20 border-t border-neutral-800 rounded-[2rem] mt-1 flex flex-col justify-end p-3 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/40 to-transparent pointer-events-none" />
                 <span className="text-[10px] font-bold text-neutral-600 text-center tracking-widest relative z-10 w-full mb-1">MOUSE</span>
               </div>

               <div className="absolute top-20 -left-6 flex flex-col gap-2">
                 {renderKeyButton('kb.mouse_forward', 'w-10 h-8 rounded-l-xl text-xs')}
                 {renderKeyButton('kb.mouse_back', 'w-10 h-8 rounded-l-xl text-xs')}
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 xl:flex-none xl:w-96 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden z-10 shrink-0 min-h-0">
        
        <div className={sidebarView === 'binding' ? 'flex flex-col h-full min-h-0' : 'hidden'}>
          {currentAction && (
            <div className="flex flex-col h-full min-h-0">
              <div className="p-4 border-b border-neutral-800 flex items-center gap-3 bg-neutral-950 rounded-t-xl shrink-0">
                <button onClick={() => setActiveActionId(null)} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Back to List">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-medium text-neutral-100">{currentAction.name}</h3>
                  <p className="text-xs text-neutral-500">Keyboard Binding</p>
                </div>
              </div>
              
              <div className="p-4 flex-1 overflow-auto flex flex-col gap-4">
                {(activeSet.bindings.keyboard[currentAction.id] || []).map((combo, idx) => (
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
                          setBindings(activeSet.id, 'keyboard', currentAction.id, currentBindings.filter((_, i) => i !== idx));
                          setActiveBindingIndex(Math.max(0, idx - 1));
                        }}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {combo.length === 0 ? (
                        <span className="text-sm text-neutral-500 italic">Click keys to map</span>
                      ) : (
                        combo.map(key => (
                          <span key={key} className="px-2 py-1 bg-neutral-800 rounded text-sm text-neutral-200 shadow-sm border border-neutral-700 flex items-center gap-1">
                            {key.replace('kb.', '').toUpperCase()}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => {
                    setBindings(activeSet.id, 'keyboard', currentAction.id, [...currentBindings, []]);
                    setActiveBindingIndex(currentBindings.length);
                  }}
                  className="flex items-center justify-center gap-2 py-3 border border-dashed border-neutral-700 rounded-lg text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Alternate Binding
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={sidebarView === 'inspect' ? 'flex flex-col h-full bg-neutral-950 min-h-0' : 'hidden'}>
          {inspectedInputId && (
            <div className="flex flex-col h-full bg-neutral-950 min-h-0">
              <div className="p-4 border-b border-neutral-800 bg-neutral-900 shrink-0 flex items-center gap-3">
                <button onClick={() => setInspectedInputId(null)} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Back to List">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-medium text-neutral-100">Inspecting Key</h3>
                  <p className="text-xs text-neutral-500 font-mono">{inspectedInputId.replace('kb.', '').toUpperCase()}</p>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 min-h-0">
                {(() => {
                  const inspectedActions = Object.values(groupedActions).flat().filter(a => {
                     const combos = activeSet.bindings.keyboard[a.id];
                     return combos && combos.some(c => c.includes(inspectedInputId));
                  });
                  
                  if (inspectedActions.length === 0) {
                    return <p className="text-neutral-500 text-sm text-center mt-8">No actions bound to this key.</p>;
                  }
                  
                  return inspectedActions.map(action => (
                    <div key={action.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-medium text-neutral-200 truncate">{action.name}</span>
                         <span className="text-xs text-neutral-500 ml-2 shrink-0">{action.category || 'Uncategorized'}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {(activeSet.bindings.keyboard[action.id] || [])
                           .map((combo, idx) => {
                             if (!combo.includes(inspectedInputId)) return null;
                             return (
                               <div key={idx} className="flex gap-1 flex-wrap">
                                 {combo.map(k => <span key={k} className={`px-1.5 py-0.5 bg-neutral-800 border ${k === inspectedInputId ? 'border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'border-neutral-700 text-neutral-400'} rounded text-[10px] font-mono leading-none flex items-center`}>{k.replace('kb.', '').toUpperCase()}</span>)}
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
          )}
        </div>

        <div className={sidebarView === 'list' ? 'flex flex-col h-full bg-neutral-950 min-h-0' : 'hidden'}>
          <div className="p-4 border-b border-neutral-800 bg-neutral-900 shrink-0 flex items-center justify-between">
            <h3 className="font-medium text-neutral-100 flex items-center gap-2">
              Actions
              <span className="text-xs text-neutral-500 font-normal">({activeSet.actions.filter(a => isActionBound(a.id, activeSet, 'keyboard')).length}/{activeSet.actions.length})</span>
            </h3>
            <div className="flex gap-1">
              <button onClick={handleExpandAll} title="Expand All" className="p-1 hover:bg-neutral-800 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCollapseAll} title="Collapse All" className="p-1 hover:bg-neutral-800 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
                <ChevronsDownUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.trim()) {
                    setExpandedCategories(new Set(Object.keys(groupedActions)));
                  }
                }}
                placeholder="Search actions or categories..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-9 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 min-h-0">
            {Object.keys(filteredGroupedActions).sort((a,b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)).map(cat => (
              <div key={cat} className="mb-2">
                <button 
                  onClick={() => toggleCategory(cat)} 
                  className="flex items-center gap-2 w-full p-2 hover:bg-neutral-800/50 rounded-lg text-left transition-colors"
                >
                {!expandedCategories.has(cat) ? <ChevronRight className="w-4 h-4 text-neutral-500"/> : <ChevronDown className="w-4 h-4 text-neutral-500"/>}
                <span className="text-sm font-semibold text-neutral-400">{cat}</span>
                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded ml-auto flex items-center gap-1 font-mono">
                  <span className="text-indigo-400 font-bold">{filteredGroupedActions[cat].filter(a => isActionBound(a.id, activeSet, 'keyboard')).length}</span>
                  <span className="opacity-30">/</span>
                  <span>{filteredGroupedActions[cat].length}</span>
                </span>
              </button>
              
              {expandedCategories.has(cat) && (
                <div className="flex flex-col gap-1 mt-1 pl-2">
                    {filteredGroupedActions[cat].map(action => {
                      const isMapped = isActionBound(action.id, activeSet, 'keyboard');
                      return (
                        <button
                          key={action.id}
                          id={`action-item-${action.id}`}
                          onClick={() => {
                            setActiveActionId(action.id);
                            setActiveBindingIndex(0);
                            setSelectedActionId(action.id);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800 border transition-colors text-left ${
                            selectedActionId === action.id ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20' : 'border-transparent'
                          }`}
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
      </div>
    </div>
  );
}
