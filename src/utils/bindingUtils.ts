import type { ActionSet } from '../types/schema';

export interface ModeShiftBindingInfo {
  inputId: string;
  layerIndex: number;
  enableButton: string;
  slotId: string;
  menuType: 'radial' | 'touch';
  gridRows?: number;
  gridCols?: number;
}

/**
 * Returns all Mode Shift slots where the specified action is bound.
 */
export const getModeShiftBindingsForAction = (actionId: string, actionSet: ActionSet): ModeShiftBindingInfo[] => {
  const result: ModeShiftBindingInfo[] = [];
  const modeShifts = actionSet.bindings.deckModeShifts || {};
  
  for (const inputId in modeShifts) {
    const layers = modeShifts[inputId];
    if (Array.isArray(layers)) {
      layers.forEach((ms, layerIndex) => {
        for (const slotId in ms.slots) {
          if (ms.slots[slotId] === actionId) {
            result.push({
              inputId,
              layerIndex,
              enableButton: ms.enableButton,
              slotId,
              menuType: ms.menuType || 'radial',
              gridRows: ms.gridRows,
              gridCols: ms.gridCols
            });
          }
        }
      });
    }
  }
  
  return result;
};

/**
 * Checks if an action is bound to any input (Keyboard, Deck Primary, or Mode Shifts).
 */
export const isActionBound = (actionId: string, actionSet: ActionSet, binderType?: 'keyboard' | 'deck'): boolean => {
  // Check Keyboard
  if (!binderType || binderType === 'keyboard') {
    const kbBindings = actionSet.bindings.keyboard[actionId] || [];
    if (kbBindings.some(combo => combo.length > 0)) return true;
  }
  
  // Check Primary Deck
  if (!binderType || binderType === 'deck') {
    const deckBindings = actionSet.bindings.deck[actionId] || [];
    if (deckBindings.some(combo => combo.length > 0)) return true;
    
    // Check Mode Shifts
    const modeShifts = actionSet.bindings.deckModeShifts || {};
    for (const inputId in modeShifts) {
      const layers = modeShifts[inputId];
      if (Array.isArray(layers)) {
        if (layers.some(ms => Object.values(ms.slots).includes(actionId))) return true;
      }
    }
  }
  
  return false;
};

/**
 * Returns all Mode Shift layers and slots for a specific input ID.
 * This is useful for "Inspecting Input" to see what's bound in its mode shift layers.
 */
export const getModeShiftBindingsForInput = (inputId: string, actionSet: ActionSet) => {
  const result: (ModeShiftBindingInfo & { actionName: string; actionId: string })[] = [];
  const modeShifts = actionSet.bindings.deckModeShifts || {};
  const layers = modeShifts[inputId];
  
  if (Array.isArray(layers)) {
    layers.forEach((ms, layerIndex) => {
      for (const slotId in ms.slots) {
        const actionId = ms.slots[slotId];
        const action = actionSet.actions.find(a => a.id === actionId);
        if (action) {
          result.push({
            inputId,
            layerIndex,
            enableButton: ms.enableButton,
            slotId,
            menuType: ms.menuType || 'radial',
            gridRows: ms.gridRows,
            gridCols: ms.gridCols,
            actionName: action.name,
            actionId
          });
        }
      }
    });
  }
  
  return result;
};
