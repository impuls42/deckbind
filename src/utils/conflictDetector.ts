import type { ActionSet } from '../types/schema';

export type ConflictLevel = 'hard' | 'subset' | 'unbound' | 'none';

export interface ActionConflict {
  actionId: string;
  level: ConflictLevel;
  relatedActionIds?: string[];
  message: string;
}

export function detectConflicts(actionSet: ActionSet, device: 'keyboard' | 'deck'): ActionConflict[] {
  const conflicts: ActionConflict[] = [];
  const bindings = actionSet.bindings[device] || {};
  
  // Array of all discrete bindings across all actions for this device
  // Shape: { actionId: string, bindingIndex: number, inputs: string[] }
  const allCombos: { actionId: string, bindingIndex: number, inputs: string[] }[] = [];
  
  actionSet.actions.forEach(action => {
    const actionBindings = bindings[action.id] || [];
    if (actionBindings.length === 0) {
      conflicts.push({
        actionId: action.id,
        level: 'unbound',
        message: 'No binding assigned'
      });
      return;
    }
    
    actionBindings.forEach((combo, idx) => {
      allCombos.push({ actionId: action.id, bindingIndex: idx, inputs: [...combo].sort() });
    });
  });

  // Check hard and subset conflicts
  for (let i = 0; i < allCombos.length; i++) {
    for (let j = i + 1; j < allCombos.length; j++) {
      const a = allCombos[i];
      const b = allCombos[j];

      // Don't compare combos of the same action against each other (if they want to map WASD and Arrows to same action, no conflict)
      if (a.actionId === b.actionId) continue;

      if (a.inputs.length === 0 || b.inputs.length === 0) continue;

      const isSame = a.inputs.length === b.inputs.length && a.inputs.every((val, index) => val === b.inputs[index]);
      
      if (isSame) {
        addConflict(conflicts, a.actionId, 'hard', b.actionId, `Conflicts with "${actionSet.actions.find(act => act.id === b.actionId)?.name}"`);
        addConflict(conflicts, b.actionId, 'hard', a.actionId, `Conflicts with "${actionSet.actions.find(act => act.id === a.actionId)?.name}"`);
      } else {
        const isASubsetOfB = a.inputs.every(val => b.inputs.includes(val));
        const isBSubsetOfA = b.inputs.every(val => a.inputs.includes(val));
        
        if (isASubsetOfB) {
          addConflict(conflicts, b.actionId, 'subset', a.actionId, `Subsumed by "${actionSet.actions.find(act => act.id === a.actionId)?.name}"`);
          addConflict(conflicts, a.actionId, 'subset', b.actionId, `Subsets "${actionSet.actions.find(act => act.id === b.actionId)?.name}"`);
        } else if (isBSubsetOfA) {
          addConflict(conflicts, a.actionId, 'subset', b.actionId, `Subsumed by "${actionSet.actions.find(act => act.id === b.actionId)?.name}"`);
          addConflict(conflicts, b.actionId, 'subset', a.actionId, `Subsets "${actionSet.actions.find(act => act.id === a.actionId)?.name}"`);
        }
      }
    }
  }

  return conflicts;
}

function addConflict(conflicts: ActionConflict[], actionId: string, level: ConflictLevel, relatedId: string, message: string) {
  const existing = conflicts.find(c => c.actionId === actionId && c.level === level);
  if (existing) {
    if (!existing.relatedActionIds?.includes(relatedId)) {
      existing.relatedActionIds?.push(relatedId);
      // Simplify message for multiples
      existing.message = 'Multiple conflicts detected';
    }
  } else {
    conflicts.push({
      actionId,
      level,
      relatedActionIds: [relatedId],
      message
    });
  }
}
