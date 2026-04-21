import React, { useState, useMemo, useEffect } from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { Plus, X, ChevronLeft, ChevronDown, ChevronRight, ChevronsUpDown, ChevronsDownUp, Layers, Settings, Minus, Trash2, Grid3x3, Circle } from 'lucide-react';
import type { ModeShift } from '../../types/schema';
import { isActionBound, getModeShiftBindingsForAction, getModeShiftBindingsForInput } from '../../utils/bindingUtils';

// Inputs that support mode shift
const MODE_SHIFTABLE_INPUTS = [
  'deck.lstick_click',
  'deck.rstick_click',
  'deck.ltrackpad_click',
  'deck.rtrackpad_click',
];

// Trackpad inputs (support touch menu)
const TRACKPAD_INPUTS = [
  'deck.ltrackpad_click',
  'deck.rtrackpad_click',
];

// All deck buttons that can serve as enable buttons
const DECK_BUTTONS = [
  { id: 'deck.l1', label: 'L1' },
  { id: 'deck.l2', label: 'L2' },
  { id: 'deck.r1', label: 'R1' },
  { id: 'deck.r2', label: 'R2' },
  { id: 'deck.l4', label: 'L4' },
  { id: 'deck.l5', label: 'L5' },
  { id: 'deck.r4', label: 'R4' },
  { id: 'deck.r5', label: 'R5' },
  { id: 'deck.a', label: 'A' },
  { id: 'deck.b', label: 'B' },
  { id: 'deck.x', label: 'X' },
  { id: 'deck.y', label: 'Y' },
  { id: 'deck.view', label: 'View' },
  { id: 'deck.menu', label: 'Menu' },
  { id: 'deck.dpad_up', label: 'D-Up' },
  { id: 'deck.dpad_down', label: 'D-Down' },
  { id: 'deck.dpad_left', label: 'D-Left' },
  { id: 'deck.dpad_right', label: 'D-Right' },
];

// Sidebar view states
type SidebarView = 'actions' | 'binding' | 'inspect' | 'modeshift' | 'modeshift-pick-action';

export function DeckBinder() {
  const { profileData, activeActionSetId, setBindings, addModeShift, setModeShift, removeModeShift, setModeShiftSlot } = useProfileStore();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeBindingIndex, setActiveBindingIndex] = useState<number>(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [inspectedInputId, setInspectedInputId] = useState<string | null>(null);

  // Mode shift state
  const [modeShiftInputId, setModeShiftInputId] = useState<string | null>(null);
  const [activeModeShiftIndex, setActiveModeShiftIndex] = useState<number>(0);
  const [modeShiftPickSlot, setModeShiftPickSlot] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [modalExpandedCategories, setModalExpandedCategories] = useState<Set<string>>(new Set());

  const activeSet = profileData.actionSets.find((s) => s.id === activeActionSetId);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
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

  const handleExpandAll = () => setExpandedCategories(new Set(Object.keys(groupedActions)));
  const handleCollapseAll = () => setExpandedCategories(new Set());

  // Determine current sidebar view
  const getSidebarView = (): SidebarView => {
    if (modeShiftPickSlot !== null) return 'modeshift-pick-action';
    if (modeShiftInputId !== null) return 'modeshift';
    if (activeActionId) return 'binding';
    if (inspectedInputId) return 'inspect';
    return 'actions';
  };

  const sidebarView = getSidebarView();

  const visibleActionsList = useMemo(() => {
    const sortedCats = Object.keys(groupedActions).sort((a, b) =>
      a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)
    );
    const visible: string[] = [];
    sortedCats.forEach(cat => {
      if (expandedCategories.has(cat)) {
        groupedActions[cat].forEach(a => visible.push(a.id));
      }
    });
    return visible;
  }, [groupedActions, expandedCategories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (modeShiftPickSlot !== null) setModeShiftPickSlot(null);
        else if (modeShiftInputId !== null) setModeShiftInputId(null);
        else if (activeActionId) setActiveActionId(null);
        else if (inspectedInputId) setInspectedInputId(null);
        return;
      }

      if (sidebarView === 'actions' && visibleActionsList.length > 0) {
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
  }, [sidebarView, selectedActionId, visibleActionsList, modeShiftPickSlot, modeShiftInputId, activeActionId, inspectedInputId]);

  useEffect(() => {
    if (selectedActionId && sidebarView === 'actions') {
      const el = document.getElementById(`action-item-${selectedActionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedActionId, sidebarView]);

  const modeShifts = useMemo(() => activeSet?.bindings.deckModeShifts || {}, [activeSet]);

  const activatorButtons = useMemo(() => {
    const activators = new Set<string>();
    Object.values(modeShifts).forEach(layers => {
      layers.forEach(layer => {
        if (layer.enableButton) {
          activators.add(layer.enableButton);
        }
      });
    });
    return activators;
  }, [modeShifts]);

  if (!activeSet) return <div className="p-8 text-neutral-400">No active set.</div>;

  const currentAction = activeSet.actions.find(a => a.id === activeActionId);
  const currentBindings = currentAction ? (activeSet.bindings.deck[currentAction.id] || []) : [];

  // Helper: get total slot count for any mode shift
  const getMsSlotCount = (ms: ModeShift) => {
    if (!ms) return 0;
    if (ms.menuType === 'touch') return (ms.gridRows || 2) * (ms.gridCols || 2);
    return ms.slotCount;
  };

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

  const hasModeShift = (inputId: string) => {
    const list = modeShifts[inputId];
    return Array.isArray(list) && list.length > 0;
  };

  const openModeShiftEditor = (inputId: string) => {
    setActiveActionId(null);
    setInspectedInputId(null);
    setModeShiftPickSlot(null);
    setActiveModeShiftIndex(0);

    const existing = modeShifts[inputId];
    if (!Array.isArray(existing) || existing.length === 0) {
      addModeShift(activeSet.id, inputId, {
        enableButton: 'deck.l1',
        menuType: 'radial',
        slotCount: 4,
        gridRows: 2,
        gridCols: 2,
        slots: {},
      });
    }
    setModeShiftInputId(inputId);
  };

  const closeModeShiftEditor = () => {
    setModeShiftInputId(null);
    setModeShiftPickSlot(null);
  };

  const handleModeShiftSlotCountChange = (delta: number) => {
    if (!modeShiftInputId) return;
    const msList = modeShifts[modeShiftInputId];
    if (!Array.isArray(msList)) return;
    const ms = msList[activeModeShiftIndex];
    if (!ms) return;
    const newCount = Math.min(16, Math.max(1, ms.slotCount + delta));
    const newSlots = { ...ms.slots };
    for (const key in newSlots) {
      if (parseInt(key) >= newCount) delete newSlots[key];
    }
    setModeShift(activeSet.id, modeShiftInputId, activeModeShiftIndex, { ...ms, slotCount: newCount, slots: newSlots });
  };

  const handleGridDimensionChange = (dim: 'gridRows' | 'gridCols', delta: number) => {
    if (!modeShiftInputId) return;
    const msList = modeShifts[modeShiftInputId];
    if (!Array.isArray(msList)) return;
    const ms = msList[activeModeShiftIndex];
    if (!ms) return;
    const current = ms[dim] || 2;
    const newVal = Math.min(4, Math.max(1, current + delta));
    const newRows = dim === 'gridRows' ? newVal : (ms.gridRows || 2);
    const newCols = dim === 'gridCols' ? newVal : (ms.gridCols || 2);
    const totalSlots = newRows * newCols;
    // Remove slots exceeding new grid size
    const newSlots = { ...ms.slots };
    for (const key in newSlots) {
      if (parseInt(key) >= totalSlots) delete newSlots[key];
    }
    setModeShift(activeSet.id, modeShiftInputId, activeModeShiftIndex, { ...ms, [dim]: newVal, slots: newSlots });
  };

  const handleMenuTypeChange = (newType: 'radial' | 'touch') => {
    if (!modeShiftInputId) return;
    const msList = modeShifts[modeShiftInputId];
    if (!Array.isArray(msList)) return;
    const ms = msList[activeModeShiftIndex];
    if (!ms) return;
    // Preserve slots that fit the new layout, clear those that don't
    const newSlots = { ...ms.slots };
    const maxSlots = newType === 'touch' ? (ms.gridRows || 2) * (ms.gridCols || 2) : ms.slotCount;
    for (const key in newSlots) {
      if (parseInt(key) >= maxSlots) delete newSlots[key];
    }
    setModeShift(activeSet.id, modeShiftInputId, activeModeShiftIndex, { ...ms, menuType: newType, slots: newSlots });
    setModeShiftPickSlot(null);
  };

  const handleEnableButtonChange = (newBtn: string) => {
    if (!modeShiftInputId) return;
    const msList = modeShifts[modeShiftInputId];
    if (!Array.isArray(msList)) return;
    const ms = msList[activeModeShiftIndex];
    if (!ms) return;
    setModeShift(activeSet.id, modeShiftInputId, activeModeShiftIndex, { ...ms, enableButton: newBtn });
  };

  const renderButton = (btnId: string, label: string | React.ReactNode, customClass: string = '') => {
    const hl = getHighlightState(btnId);
    const dots = getButtonDots(btnId);
    const isShiftable = MODE_SHIFTABLE_INPUTS.includes(btnId);
    const hasShift = hasModeShift(btnId);
    const isActivator = activatorButtons.has(btnId);
    const isEditingShift = modeShiftInputId === btnId;

    const bg = isEditingShift
      ? 'bg-violet-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.6)] z-10 border-violet-400 ring-2 ring-violet-400/30'
      : hl === 'active'
        ? 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.6)] z-10 border-indigo-400'
        : hl === 'alternate'
          ? 'bg-indigo-900/50 text-indigo-200 border-indigo-500/50'
          : hl === 'inspect'
            ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 scale-105'
            : hl === 'bound'
              ? 'bg-neutral-700 text-neutral-200 border-neutral-500/50 shadow-[inset_0_1px_rgba(255,255,255,0.1)]'
              : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-white';

    return (
      <div key={btnId} className="relative group">
        <button
          onClick={() => handleInputClick(btnId)}
          className={`relative border ${bg} transition-all flex items-center justify-center text-sm font-medium cursor-pointer ${customClass}`}
        >
          {dots.length > 0 && (
            <div className="absolute top-1 right-1 flex flex-wrap max-w-[70%] justify-end gap-0.5 pointer-events-none">
              {dots.map((d, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm drop-shadow-md ${d.type === 'solo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              ))}
            </div>
          )}
          {hasShift && !isEditingShift && (
            <div className="absolute -top-1.5 -left-1.5 min-w-[1rem] h-4 px-1 bg-violet-500 rounded-full flex items-center justify-center shadow-md pointer-events-none z-20 gap-0.5">
              {modeShifts[btnId]?.length > 1 && <span className="text-[9px] font-bold text-white">{modeShifts[btnId].length}</span>}
              {modeShifts[btnId]?.[0]?.menuType === 'touch'
                ? <Grid3x3 className="w-2.5 h-2.5 text-white" />
                : <Layers className="w-2.5 h-2.5 text-white" />
              }
            </div>
          )}
          {isActivator && !isEditingShift && (
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-violet-600 rounded-full flex items-center justify-center border border-violet-400 shadow-sm z-20 pointer-events-none" title="Mode Shift Activator">
              <Layers className="w-2 h-2 text-white" />
            </div>
          )}
          {isActivator && !isEditingShift && (
            <div className="absolute inset-0 ring-2 ring-violet-500/50 rounded-[inherit] pointer-events-none animate-pulse duration-[3000ms]" />
          )}
          {label}
        </button>
        {isShiftable && !currentAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openModeShiftEditor(btnId);
            }}
            className="absolute -bottom-2 -right-2 w-6 h-6 bg-neutral-700 hover:bg-violet-600 border border-neutral-600 hover:border-violet-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-30 cursor-pointer shadow-lg"
            title="Configure Mode Shift"
          >
            <Settings className="w-3 h-3 text-neutral-300" />
          </button>
        )}
      </div>
    );
  };

  // ---- Radial Menu SVG Widget ----
  const renderRadialMenu = (ms: ModeShift, size: number = 220) => {
    const center = size / 2;
    const outerRadius = size / 2 - 8;
    const innerRadius = outerRadius * 0.32;
    const slotCount = ms.slotCount;
    const angleStep = (2 * Math.PI) / slotCount;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-xl">
        <circle cx={center} cy={center} r={outerRadius} fill="rgba(23,23,23,0.95)" stroke="rgba(82,82,91,0.6)" strokeWidth="1.5" />
        <circle cx={center} cy={center} r={innerRadius} fill="rgba(38,38,42,1)" stroke="rgba(82,82,91,0.4)" strokeWidth="1" />

        {Array.from({ length: slotCount }).map((_, i) => {
          const startAngle = i * angleStep - Math.PI / 2 - angleStep / 2;
          const endAngle = startAngle + angleStep;
          const midAngle = startAngle + angleStep / 2;

          const outerStart = { x: center + outerRadius * Math.cos(startAngle), y: center + outerRadius * Math.sin(startAngle) };
          const outerEnd = { x: center + outerRadius * Math.cos(endAngle), y: center + outerRadius * Math.sin(endAngle) };
          const innerStart = { x: center + innerRadius * Math.cos(startAngle), y: center + innerRadius * Math.sin(startAngle) };
          const innerEnd = { x: center + innerRadius * Math.cos(endAngle), y: center + innerRadius * Math.sin(endAngle) };

          const largeArc = angleStep > Math.PI ? 1 : 0;
          const path = [
            `M ${innerStart.x} ${innerStart.y}`,
            `L ${outerStart.x} ${outerStart.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
            `L ${innerEnd.x} ${innerEnd.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
            'Z',
          ].join(' ');

          const slotId = String(i);
          const actionId = ms.slots[slotId];
          const action = actionId ? activeSet.actions.find(a => a.id === actionId) : null;
          const isSelected = modeShiftPickSlot === slotId;

          const labelRadius = (outerRadius + innerRadius) / 2;
          const labelX = center + labelRadius * Math.cos(midAngle);
          const labelY = center + labelRadius * Math.sin(midAngle);

          return (
            <g key={i}>
              <path
                d={path}
                fill={isSelected ? 'rgba(139,92,246,0.4)' : action ? 'rgba(99,102,241,0.2)' : 'rgba(38,38,42,0.6)'}
                stroke={isSelected ? 'rgba(139,92,246,0.8)' : 'rgba(82,82,91,0.4)'}
                strokeWidth="1"
                className="cursor-pointer transition-colors hover:fill-[rgba(139,92,246,0.3)]"
                onClick={() => setModeShiftPickSlot(isSelected ? null : slotId)}
              />
              <line
                x1={innerStart.x} y1={innerStart.y}
                x2={outerStart.x} y2={outerStart.y}
                stroke="rgba(82,82,91,0.3)"
                strokeWidth="0.5"
              />
              <text
                x={labelX} y={labelY}
                textAnchor="middle" dominantBaseline="central"
                fill={action ? '#c7d2fe' : '#71717a'}
                fontSize={action ? Math.max(8, 11 - Math.floor(slotCount / 6)) : 10}
                fontWeight={action ? '500' : '400'}
                className="pointer-events-none select-none"
              >
                {action ? (action.name.length > 8 ? action.name.slice(0, 7) + '…' : action.name) : (i + 1)}
              </text>
            </g>
          );
        })}

        <text x={center} y={center - 4} textAnchor="middle" dominantBaseline="central" fill="#a1a1aa" fontSize="9" fontWeight="600" className="pointer-events-none select-none">
          MODE
        </text>
        <text x={center} y={center + 8} textAnchor="middle" dominantBaseline="central" fill="#a1a1aa" fontSize="7" fontWeight="400" className="pointer-events-none select-none">
          SHIFT
        </text>
      </svg>
    );
  };

  // ---- Touch Menu Grid Widget ----
  const renderTouchMenu = (ms: ModeShift, size: number = 220) => {
    const rows = ms.gridRows || 2;
    const cols = ms.gridCols || 2;
    const padding = 6;
    const gap = 3;
    const cellW = (size - padding * 2 - gap * (cols - 1)) / cols;
    const cellH = (size - padding * 2 - gap * (rows - 1)) / rows;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-xl">
        {/* Background */}
        <rect x="0" y="0" width={size} height={size} rx="12" fill="rgba(23,23,23,0.95)" stroke="rgba(82,82,91,0.6)" strokeWidth="1.5" />

        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const idx = r * cols + c;
            const slotId = String(idx);
            const actionId = ms.slots[slotId];
            const action = actionId ? activeSet.actions.find(a => a.id === actionId) : null;
            const isSelected = modeShiftPickSlot === slotId;

            const x = padding + c * (cellW + gap);
            const y = padding + r * (cellH + gap);

            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={x} y={y}
                  width={cellW} height={cellH}
                  rx="6"
                  fill={isSelected ? 'rgba(139,92,246,0.4)' : action ? 'rgba(99,102,241,0.2)' : 'rgba(38,38,42,0.7)'}
                  stroke={isSelected ? 'rgba(139,92,246,0.8)' : 'rgba(82,82,91,0.4)'}
                  strokeWidth="1"
                  className="cursor-pointer transition-colors hover:fill-[rgba(139,92,246,0.3)]"
                  onClick={() => setModeShiftPickSlot(isSelected ? null : slotId)}
                />
                <text
                  x={x + cellW / 2} y={y + cellH / 2}
                  textAnchor="middle" dominantBaseline="central"
                  fill={action ? '#c7d2fe' : '#71717a'}
                  fontSize={action ? Math.max(8, 11 - Math.max(rows, cols)) : 10}
                  fontWeight={action ? '500' : '400'}
                  className="pointer-events-none select-none"
                >
                  {action ? (action.name.length > (cols <= 2 ? 10 : 6) ? action.name.slice(0, cols <= 2 ? 9 : 5) + '…' : action.name) : (idx + 1)}
                </text>
              </g>
            );
          })
        )}
      </svg>
    );
  };

  // ---- Compact overlay on the deck mockup (supports both types) ----
  const renderModeShiftOverlay = (inputId: string) => {
    const msList = modeShifts[inputId];
    if (!Array.isArray(msList) || msList.length === 0 || modeShiftInputId !== inputId) return null;
    
    // Only render the active index being edited
    const ms = msList[activeModeShiftIndex];
    if (!ms) return null;

    if (ms.menuType === 'touch') {
      return renderTouchOverlay(inputId, ms);
    }
    return renderRadialOverlay(inputId, ms);
  };

  const renderRadialOverlay = (_inputId: string, ms: ModeShift) => {
    const size = 120;
    const center = size / 2;
    const outerRadius = size / 2 - 4;
    const innerRadius = outerRadius * 0.3;
    const slotCount = ms.slotCount;
    const angleStep = (2 * Math.PI) / slotCount;

    return (
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg opacity-90">
          <circle cx={center} cy={center} r={outerRadius} fill="rgba(23,23,23,0.85)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" />
          <circle cx={center} cy={center} r={innerRadius} fill="rgba(38,38,42,0.9)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />

          {Array.from({ length: slotCount }).map((_, i) => {
            const startAngle = i * angleStep - Math.PI / 2 - angleStep / 2;
            const endAngle = startAngle + angleStep;
            const midAngle = startAngle + angleStep / 2;

            const outerStart = { x: center + outerRadius * Math.cos(startAngle), y: center + outerRadius * Math.sin(startAngle) };
            const outerEnd = { x: center + outerRadius * Math.cos(endAngle), y: center + outerRadius * Math.sin(endAngle) };
            const innerStart = { x: center + innerRadius * Math.cos(startAngle), y: center + innerRadius * Math.sin(startAngle) };
            const innerEnd = { x: center + innerRadius * Math.cos(endAngle), y: center + innerRadius * Math.sin(endAngle) };

            const largeArc = angleStep > Math.PI ? 1 : 0;
            const path = [
              `M ${innerStart.x} ${innerStart.y}`,
              `L ${outerStart.x} ${outerStart.y}`,
              `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
              `L ${innerEnd.x} ${innerEnd.y}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
              'Z',
            ].join(' ');

            const actionId = ms.slots[String(i)];
            const action = actionId ? activeSet.actions.find(a => a.id === actionId) : null;
            const labelRadius = (outerRadius + innerRadius) / 2;
            const labelX = center + labelRadius * Math.cos(midAngle);
            const labelY = center + labelRadius * Math.sin(midAngle);

            return (
              <g key={i}>
                <path d={path} fill={action ? 'rgba(99,102,241,0.25)' : 'rgba(38,38,42,0.4)'} stroke="rgba(82,82,91,0.3)" strokeWidth="0.5" />
                <line x1={innerStart.x} y1={innerStart.y} x2={outerStart.x} y2={outerStart.y} stroke="rgba(82,82,91,0.2)" strokeWidth="0.5" />
                <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" fill={action ? '#c7d2fe' : '#52525b'} fontSize={Math.max(6, 8 - Math.floor(slotCount / 6))} fontWeight="500" className="pointer-events-none select-none">
                  {action ? (action.name.length > 5 ? action.name.slice(0, 4) + '…' : action.name) : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderTouchOverlay = (_inputId: string, ms: ModeShift) => {
    const size = 112;
    const rows = ms.gridRows || 2;
    const cols = ms.gridCols || 2;
    const pad = 4;
    const gap = 2;
    const cellW = (size - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (size - pad * 2 - gap * (rows - 1)) / rows;

    return (
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg opacity-90">
          <rect x="0" y="0" width={size} height={size} rx="10" fill="rgba(23,23,23,0.85)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" />
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const idx = r * cols + c;
              const actionId = ms.slots[String(idx)];
              const action = actionId ? activeSet.actions.find(a => a.id === actionId) : null;
              const x = pad + c * (cellW + gap);
              const y = pad + r * (cellH + gap);
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x} y={y} width={cellW} height={cellH} rx="4" fill={action ? 'rgba(99,102,241,0.25)' : 'rgba(38,38,42,0.5)'} stroke="rgba(82,82,91,0.3)" strokeWidth="0.5" />
                  <text x={x + cellW / 2} y={y + cellH / 2} textAnchor="middle" dominantBaseline="central" fill={action ? '#c7d2fe' : '#52525b'} fontSize={Math.max(5, 7 - Math.max(rows, cols))} fontWeight="500" className="pointer-events-none select-none">
                    {action ? (action.name.length > 4 ? action.name.slice(0, 3) + '…' : action.name) : ''}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>
    );
  };

  // ---- Sidebar: Mode Shift Editor ----
  const renderModeShiftEditor = () => {
    if (!modeShiftInputId) return null;
    const msList = modeShifts[modeShiftInputId];
    if (!Array.isArray(msList)) return null;

    const ms = msList[activeModeShiftIndex];
    if (!ms) return null;

    const inputLabel = modeShiftInputId.replace('deck.', '').replace('_click', '').replace('lstick', 'Left Stick').replace('rstick', 'Right Stick').replace('ltrackpad', 'Left Trackpad').replace('rtrackpad', 'Right Trackpad');
    const isTrackpad = TRACKPAD_INPUTS.includes(modeShiftInputId);
    const menuType = ms.menuType || 'radial';
    const totalSlots = getMsSlotCount(ms);

    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-3 bg-neutral-950 rounded-t-xl shrink-0">
          <button onClick={closeModeShiftEditor} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-neutral-100 flex items-center gap-2">
              {menuType === 'touch' ? <Grid3x3 className="w-4 h-4 text-teal-400" /> : <Layers className="w-4 h-4 text-violet-400" />}
              Mode Shift
            </h3>
            <p className="text-xs text-neutral-500 truncate">{inputLabel}</p>
          </div>
          <button
            onClick={() => {
              removeModeShift(activeSet.id, modeShiftInputId, activeModeShiftIndex);
              if (msList.length <= 1) closeModeShiftEditor();
              else setActiveModeShiftIndex(Math.max(0, activeModeShiftIndex - 1));
            }}
            className="p-1.5 hover:bg-red-900/30 rounded text-neutral-500 hover:text-red-400 transition-colors"
            title="Remove This Mode Shift"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Shift Tabs */}
        <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {msList.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveModeShiftIndex(idx);
                setModeShiftPickSlot(null);
              }}
              className={`px-3 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                activeModeShiftIndex === idx 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20' 
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border border-neutral-700'
              }`}
            >
              Layer {idx + 1}
            </button>
          ))}
          <button
            onClick={() => {
              const newIndex = msList.length;
              addModeShift(activeSet.id, modeShiftInputId, {
                enableButton: 'deck.l2',
                menuType: isTrackpad ? 'touch' : 'radial',
                slotCount: 4,
                gridRows: 2,
                gridCols: 2,
                slots: {},
              });
              setActiveModeShiftIndex(newIndex);
              setModeShiftPickSlot(null);
            }}
            className="p-1 bg-neutral-950 border border-neutral-800 border-dashed rounded text-neutral-500 hover:text-violet-400 hover:border-violet-500 transition-colors shrink-0"
            title="Add Mode Shift Layer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto flex flex-col gap-5 min-h-0">
          {/* Enable Button Select */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Enable Button</label>
            <select
              value={ms.enableButton}
              onChange={(e) => handleEnableButtonChange(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              {DECK_BUTTONS.map(btn => (
                <option key={btn.id} value={btn.id}>{btn.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-600 mt-1">Hold this button to activate mode shift Layer {activeModeShiftIndex + 1}</p>
          </div>

          {/* Menu Type Selector — only show for trackpads */}
          {isTrackpad && (
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Menu Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMenuTypeChange('radial')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${menuType === 'radial'
                      ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300'
                    }`}
                >
                  <Circle className="w-4 h-4" />
                  Radial
                </button>
                <button
                  onClick={() => handleMenuTypeChange('touch')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${menuType === 'touch'
                      ? 'bg-teal-600/20 border-teal-500/50 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)]'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300'
                    }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Touch
                </button>
              </div>
            </div>
          )}

          {/* Slot Count / Grid Dimensions */}
          {menuType === 'radial' ? (
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Slots ({ms.slotCount})</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleModeShiftSlotCountChange(-1)}
                  disabled={ms.slotCount <= 1}
                  className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg h-8 relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600/30 to-violet-500/10 transition-all duration-300"
                    style={{ width: `${(ms.slotCount / 16) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-neutral-200">
                    {ms.slotCount}
                  </span>
                </div>
                <button
                  onClick={() => handleModeShiftSlotCountChange(1)}
                  disabled={ms.slotCount >= 16}
                  className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Grid Size ({ms.gridRows || 2} × {ms.gridCols || 2} = {totalSlots} slots)</label>
              <div className="flex flex-col gap-3">
                {/* Rows */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 w-10 shrink-0">Rows</span>
                  <button
                    onClick={() => handleGridDimensionChange('gridRows', -1)}
                    disabled={(ms.gridRows || 2) <= 1}
                    className="p-1 bg-neutral-800 border border-neutral-700 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded h-7 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-600/30 to-teal-500/10 transition-all duration-300"
                      style={{ width: `${((ms.gridRows || 2) / 4) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-neutral-200">
                      {ms.gridRows || 2}
                    </span>
                  </div>
                  <button
                    onClick={() => handleGridDimensionChange('gridRows', 1)}
                    disabled={(ms.gridRows || 2) >= 4}
                    className="p-1 bg-neutral-800 border border-neutral-700 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Cols */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 w-10 shrink-0">Cols</span>
                  <button
                    onClick={() => handleGridDimensionChange('gridCols', -1)}
                    disabled={(ms.gridCols || 2) <= 1}
                    className="p-1 bg-neutral-800 border border-neutral-700 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded h-7 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-600/30 to-teal-500/10 transition-all duration-300"
                      style={{ width: `${((ms.gridCols || 2) / 4) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-neutral-200">
                      {ms.gridCols || 2}
                    </span>
                  </div>
                  <button
                    onClick={() => handleGridDimensionChange('gridCols', 1)}
                    disabled={(ms.gridCols || 2) >= 4}
                    className="p-1 bg-neutral-800 border border-neutral-700 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Menu Layout Preview */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 block">
              {menuType === 'touch' ? 'Grid Layout' : 'Radial Layout'}
            </label>
            <div className="flex justify-center">
              {menuType === 'touch' ? renderTouchMenu(ms) : renderRadialMenu(ms)}
            </div>
            <p className="text-[10px] text-neutral-600 mt-2 text-center">
              Click a {menuType === 'touch' ? 'cell' : 'sector'} to assign an action
            </p>
          </div>

          {/* Selected slot details */}
          {modeShiftPickSlot !== null && (
            <div className={`${menuType === 'touch' ? 'bg-teal-900/20 border-teal-500/30' : 'bg-violet-900/20 border-violet-500/30'} border rounded-lg p-3`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${menuType === 'touch' ? 'text-teal-300' : 'text-violet-300'}`}>Slot {parseInt(modeShiftPickSlot) + 1}</span>
                {ms.slots[modeShiftPickSlot] && (
                  <button
                    onClick={() => setModeShiftSlot(activeSet.id, modeShiftInputId!, activeModeShiftIndex, modeShiftPickSlot, null)}
                    className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    Unbind
                  </button>
                )}
              </div>
              {ms.slots[modeShiftPickSlot] ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-neutral-800 rounded text-sm text-indigo-300 border border-indigo-500/30">
                    {activeSet.actions.find(a => a.id === ms.slots[modeShiftPickSlot!])?.name || 'Unknown'}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 italic">No action assigned</p>
              )}
            </div>
          )}



          {/* Slot list (compact) */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Slot Bindings</label>
            <div className="flex flex-col gap-1">
              {Array.from({ length: totalSlots }).map((_, i) => {
                const slotId = String(i);
                const actionId = ms.slots[slotId];
                const action = actionId ? activeSet.actions.find(a => a.id === actionId) : null;
                const isSelected = modeShiftPickSlot === slotId;

                // For touch menu show row/col label
                const touchLabel = menuType === 'touch'
                  ? `R${Math.floor(i / (ms.gridCols || 2)) + 1}C${(i % (ms.gridCols || 2)) + 1}`
                  : null;

                return (
                  <button
                    key={i}
                    onClick={() => setModeShiftPickSlot(isSelected ? null : slotId)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${isSelected
                        ? (menuType === 'touch' ? 'bg-teal-600/20 border border-teal-500/40 text-teal-200' : 'bg-violet-600/20 border border-violet-500/40 text-violet-200')
                        : 'bg-neutral-800/50 border border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                  >
                    <span className={`shrink-0 flex items-center justify-center text-[10px] font-bold ${menuType === 'touch'
                        ? `px-1.5 py-0.5 rounded ${action ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-neutral-700 text-neutral-500'}`
                        : `w-5 h-5 rounded-full ${action ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-neutral-700 text-neutral-500'}`
                      }`}>
                      {touchLabel || (i + 1)}
                    </span>
                    <span className={`flex-1 truncate ${action ? 'text-neutral-200' : 'text-neutral-500 italic'}`}>
                      {action ? action.name : 'Empty'}
                    </span>
                    {action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModeShiftSlot(activeSet.id, modeShiftInputId!, activeModeShiftIndex, slotId, null);
                        }}
                        className="p-0.5 hover:bg-red-900/30 rounded text-neutral-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const toggleModalCategory = (cat: string) => {
    setModalExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const renderActionSelectorModal = () => {
    if (modeShiftPickSlot === null || !modeShiftInputId) return null;

    const msList = modeShifts[modeShiftInputId];
    if (!Array.isArray(msList)) return null;
    const ms = msList[activeModeShiftIndex];
    if (!ms) return null;
    const menuType = ms.menuType || 'radial';

    const totalActions = activeSet.actions.length;
    const mappedActions = activeSet.actions.filter(a => isActionBound(a.id, activeSet, 'deck')).length;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModeShiftPickSlot(null)}
        />
        <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-neutral-100">Select Action</h3>
                <span className="text-xs text-neutral-500 font-mono">({mappedActions}/{totalActions})</span>
              </div>
              <p className="text-sm text-neutral-500 font-medium">Assigning to Slot {parseInt(modeShiftPickSlot) + 1}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 mr-2 px-2 border-r border-neutral-800">
                <button 
                  onClick={() => setModalExpandedCategories(new Set(Object.keys(groupedActions)))}
                  title="Expand All"
                  className="p-1.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                >
                  <ChevronsUpDown className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setModalExpandedCategories(new Set())}
                  title="Collapse All"
                  className="p-1.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                >
                  <ChevronsDownUp className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => setModeShiftPickSlot(null)}
                className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-3 bg-neutral-900/50 custom-scrollbar">
            {Object.keys(groupedActions).sort((a, b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)).map(cat => {
              const isExpanded = modalExpandedCategories.has(cat);
              const catMapped = groupedActions[cat].filter(a => isActionBound(a.id, activeSet, 'deck')).length;
              const catTotal = groupedActions[cat].length;

              return (
                <div key={cat} className="mb-2 last:mb-0">
                  <button 
                    onClick={() => toggleModalCategory(cat)}
                    className="w-full px-3 py-2 text-xs font-bold text-neutral-500 uppercase tracking-widest bg-neutral-900/80 sticky top-0 backdrop-blur-md z-10 rounded-lg flex items-center gap-2 hover:bg-neutral-800 transition-colors"
                  >
                    {!isExpanded ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {cat}
                    <span className="text-[10px] text-neutral-600 font-mono ml-auto">({catMapped}/{catTotal})</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="flex flex-col gap-1.5 mt-2 px-1">
                      {groupedActions[cat].map(action => {
                        const isCurrent = ms.slots[modeShiftPickSlot!] === action.id;
                        const isMapped = isActionBound(action.id, activeSet, 'deck');
                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              setModeShiftSlot(activeSet.id, modeShiftInputId!, activeModeShiftIndex, modeShiftPickSlot!, action.id);
                              setModeShiftPickSlot(null);
                            }}
                            className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group border ${isCurrent 
                                ? (menuType === 'touch' ? 'bg-teal-600/10 border-teal-500/50 text-teal-300' : 'bg-violet-600/10 border-violet-500/50 text-violet-300')
                                : 'bg-neutral-800/40 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-700 hover:text-neutral-100 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMapped ? 'bg-indigo-500/50' : 'bg-neutral-700'}`} />
                              <span className="truncate font-medium">{action.name}</span>
                            </div>
                            {isCurrent && (
                              <div className={`w-2 h-2 rounded-full shrink-0 ${menuType === 'touch' ? 'bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.8)]' : 'bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]'}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
            <button 
              onClick={() => setModeShiftPickSlot(null)}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-semibold transition-colors border border-neutral-700 shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
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
              <div className="mr-1 relative">
                {renderButton('deck.lstick_click', 'L3', 'w-[4.5rem] h-[4.5rem] rounded-full shadow-inner shadow-black/50')}
                {renderModeShiftOverlay('deck.lstick_click')}
              </div>
            </div>

            {/* Left Trackpad */}
            <div className="mt-2 flex justify-center relative">
              {renderButton('deck.ltrackpad_click', 'L-Pad', 'w-28 h-28 rounded-xl bg-neutral-900')}
              {renderModeShiftOverlay('deck.ltrackpad_click')}
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
              <div className="ml-1 relative">
                {renderButton('deck.rstick_click', 'R3', 'w-[4.5rem] h-[4.5rem] rounded-full shadow-inner shadow-black/50')}
                {renderModeShiftOverlay('deck.rstick_click')}
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
            <div className="mt-2 flex justify-center relative">
              {renderButton('deck.rtrackpad_click', 'R-Pad', 'w-28 h-28 rounded-xl bg-neutral-900')}
              {renderModeShiftOverlay('deck.rtrackpad_click')}
            </div>

            {/* Back Grips */}
            <div className="flex justify-between gap-3 mt-3">
              {renderButton('deck.r4', 'R4', 'flex-1 py-1.5 rounded-lg text-xs')}
              {renderButton('deck.r5', 'R5', 'flex-1 py-1.5 rounded-lg text-xs')}
            </div>
          </div>
        </div>
        <p className="mt-8 text-neutral-500 text-sm z-10 hidden xl:block">Select an action on the right, then click Deck inputs here to bind. Hover over sticks/trackpads for ⚙ to configure Mode Shift.</p>
      </div>

    <div className="flex-1 xl:flex-none xl:w-96 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden z-10 shrink-0 min-h-0">
      {/* View: Mode Shift Editor */}
      <div className={sidebarView === 'modeshift' || sidebarView === 'modeshift-pick-action' ? 'flex flex-col h-full' : 'hidden'}>
        {(sidebarView === 'modeshift' || sidebarView === 'modeshift-pick-action') && renderModeShiftEditor()}
      </div>

      {/* View: Action Details / Binding */}
      <div className={sidebarView === 'binding' ? 'flex flex-col h-full min-h-0' : 'hidden'}>
        {currentAction && (
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

              {/* Mode Shift Mappings */}
              {(() => {
                const msBindings = getModeShiftBindingsForAction(currentAction.id, activeSet);
                if (msBindings.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Layers className="w-3 h-3" />
                      Mode Shift Layers
                    </h4>
                    <div className="flex flex-col gap-2">
                      {msBindings.map((ms, idx) => {
                        const inputLabel = ms.inputId.replace('deck.', '').replace('_click', '').toUpperCase();
                        const enableLabel = ms.enableButton.replace('deck.', '').toUpperCase();
                        const slotIndex = parseInt(ms.slotId);
                        const slotLabel = ms.menuType === 'touch'
                          ? `R${Math.floor(slotIndex / (ms.gridCols || 2)) + 1}C${(slotIndex % (ms.gridCols || 2)) + 1}`
                          : `Slot ${slotIndex + 1}`;

                        return (
                          <div key={idx} className="flex flex-col gap-2 p-3 bg-violet-900/10 border border-violet-500/20 rounded-xl hover:bg-violet-900/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Layer {ms.layerIndex + 1}</span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/20 rounded text-violet-400 font-bold uppercase">{ms.menuType}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-300">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono text-neutral-200">{enableLabel}</span>
                                <span className="text-neutral-500 font-bold">+</span>
                                <span className="font-semibold text-neutral-200">{inputLabel}</span>
                              </div>
                              <span className="text-neutral-500 ml-auto">→</span>
                              <span className="text-indigo-400 font-bold shrink-0">{slotLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* View: Inspect Input */}
      <div className={sidebarView === 'inspect' ? 'flex flex-col h-full bg-neutral-950 min-h-0' : 'hidden'}>
        {inspectedInputId && (
          <div className="flex flex-col h-full bg-neutral-950 min-h-0">
            <div className="p-4 border-b border-neutral-800 bg-neutral-900 shrink-0 flex items-center gap-3">
              <button
                onClick={() => setInspectedInputId(null)}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
                title="Back to Actions"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h3 className="font-medium text-neutral-100">Inspecting Input</h3>
                <p className="text-xs text-neutral-500 font-mono">{inspectedInputId.replace('deck.', '').toUpperCase()}</p>
              </div>
              {MODE_SHIFTABLE_INPUTS.includes(inspectedInputId) && (
                <button
                  onClick={() => openModeShiftEditor(inspectedInputId)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-lg text-violet-300 text-xs font-medium transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Mode Shift
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 min-h-0">
              {(() => {
                const inspectedActions = Object.values(groupedActions).flat().filter(a => {
                  const combos = activeSet.bindings.deck[a.id];
                  return combos && combos.some(c => c.includes(inspectedInputId));
                });
                
                const msBindingsForInput = getModeShiftBindingsForInput(inspectedInputId, activeSet);

                if (inspectedActions.length === 0 && msBindingsForInput.length === 0) {
                  return <p className="text-neutral-500 text-sm text-center mt-8">No actions bound to this input.</p>;
                }

                return (
                  <>
                    {inspectedActions.map(action => (
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
                    ))}

                    {msBindingsForInput.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                          <Layers className="w-3 h-3" />
                          Mode Shift Layers
                        </h4>
                        <div className="flex flex-col gap-2">
                          {msBindingsForInput.map((ms, idx) => {
                            const slotIndex = parseInt(ms.slotId);
                            const slotLabel = ms.menuType === 'touch'
                              ? `R${Math.floor(slotIndex / (ms.gridCols || 2)) + 1}C${(slotIndex % (ms.gridCols || 2)) + 1}`
                              : `Slot ${slotIndex + 1}`;
                            const enableLabel = ms.enableButton.replace('deck.', '').toUpperCase();

                            return (
                              <div key={idx} className="p-3 bg-violet-950/30 border border-violet-500/20 rounded-xl shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Layer {ms.layerIndex + 1}</span>
                                  </div>
                                  <div className="px-1.5 py-0.5 bg-violet-500/20 rounded text-[9px] font-bold text-violet-400 uppercase leading-none">
                                    {ms.menuType}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-medium text-neutral-200 truncate">{ms.actionName}</span>
                                  <span className="text-xs text-indigo-400 font-bold shrink-0">{slotLabel}</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-neutral-900/50 rounded-lg border border-neutral-800 mb-3">
                                  <span className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono text-neutral-300 leading-none">{enableLabel}</span>
                                  <span className="text-[10px] text-neutral-500 font-bold">+</span>
                                  <span className="text-[10px] text-neutral-300 font-medium leading-none">{inspectedInputId.replace('deck.', '').toUpperCase()}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setInspectedInputId(null);
                                    setActiveActionId(ms.actionId);
                                    setActiveBindingIndex(0);
                                  }}
                                  className="w-full py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 font-bold border border-violet-500/20 uppercase tracking-wider"
                                >
                                  View Action Details
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* View: Action List (Always mounted to preserve scroll) */}
      <div className={sidebarView === 'actions' ? 'flex flex-col h-full bg-neutral-950 rounded-xl overflow-hidden min-h-0' : 'hidden'}>
        <div className="p-4 border-b border-neutral-800 bg-neutral-900 shrink-0 flex items-center justify-between">
          <h3 className="font-medium text-neutral-100 flex items-center gap-2">
            Actions
            <span className="text-xs text-neutral-500 font-normal">({activeSet.actions.filter(a => isActionBound(a.id, activeSet, 'deck')).length}/{activeSet.actions.length})</span>
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
        <div className="flex-1 overflow-auto p-2 min-h-0">
          {Object.keys(groupedActions).sort((a, b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)).map(cat => (
            <div key={cat} className="mb-2">
              <button
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-2 w-full p-2 hover:bg-neutral-800/50 rounded-lg text-left transition-colors"
              >
                {!expandedCategories.has(cat) ? <ChevronRight className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                <span className="text-sm font-semibold text-neutral-400">{cat}</span>
                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded ml-auto flex items-center gap-1 font-mono">
                  <span className="text-indigo-400 font-bold">{groupedActions[cat].filter(a => isActionBound(a.id, activeSet, 'deck')).length}</span>
                  <span className="opacity-30">/</span>
                  <span>{groupedActions[cat].length}</span>
                </span>
              </button>

              {expandedCategories.has(cat) && (
                <div className="flex flex-col gap-1 mt-1 pl-2">
                  {groupedActions[cat].map(action => {
                    const isMapped = isActionBound(action.id, activeSet, 'deck');
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
      {renderActionSelectorModal()}
    </div>
  );
}
