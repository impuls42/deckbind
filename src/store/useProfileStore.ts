import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PROFILE } from '../types/schema';
import type { Action, ActionSet, ModeShift, Profile, ProfileInfo } from '../types/schema';

interface ProfileState {
  profileData: Profile;
  activeActionSetId: string | null;
  
  // Store Actions
  setActiveActionSetId: (id: string | null) => void;
  setProfileInfo: (info: ProfileInfo) => void;
  importProfile: (profile: Profile) => void;
  
  // Action Set CRUD
  createActionSet: (set: ActionSet) => void;
  updateActionSet: (id: string, updates: Partial<ActionSet>) => void;
  deleteActionSet: (id: string) => void;
  duplicateActionSet: (id: string) => void;
  
  // Action CRUD
  addAction: (setId: string, action: Action) => void;
  updateAction: (setId: string, actionId: string, updates: Partial<Action>) => void;
  deleteAction: (setId: string, actionId: string) => void;
  
  // Binding Management
  setBindings: (setId: string, device: 'keyboard' | 'deck', actionId: string, bindings: string[][]) => void;
  addBinding: (setId: string, device: 'keyboard' | 'deck', actionId: string, binding: string[]) => void;
  removeBinding: (setId: string, device: 'keyboard' | 'deck', actionId: string, bindingIndex: number) => void;
  moveBinding: (setId: string, device: 'keyboard' | 'deck', actionId: string, fromIndex: number, toIndex: number) => void;
  swapModeShiftSlotActions: (setId: string, inputId: string, index: number, slotA: string, slotB: string) => void;
  
  // Mode Shift Management
  addModeShift: (setId: string, inputId: string, modeShift: ModeShift) => void;
  setModeShift: (setId: string, inputId: string, index: number, modeShift: ModeShift) => void;
  removeModeShift: (setId: string, inputId: string, index: number) => void;
  setModeShiftSlot: (setId: string, inputId: string, index: number, slotId: string, actionId: string | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profileData: DEFAULT_PROFILE,
      activeActionSetId: DEFAULT_PROFILE.actionSets[0] ? DEFAULT_PROFILE.actionSets[0].id : null,

      setActiveActionSetId: (id) => set({ activeActionSetId: id }),
      
      setProfileInfo: (info) =>
        set((state) => ({
          profileData: { ...state.profileData, profile: info },
        })),

      importProfile: (profile) =>
        set({
          profileData: profile,
          activeActionSetId: profile.actionSets[0] ? profile.actionSets[0].id : null,
        }),

      createActionSet: (newSet) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: [...state.profileData.actionSets, newSet],
          },
        })),

      updateActionSet: (id, updates) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          },
        })),

      deleteActionSet: (id) =>
        set((state) => {
          const newSets = state.profileData.actionSets.filter((s) => s.id !== id);
          return {
            profileData: {
              ...state.profileData,
              actionSets: newSets,
            },
            activeActionSetId: state.activeActionSetId === id ? (newSets[0]?.id || null) : state.activeActionSetId,
          };
        }),

      duplicateActionSet: (id) =>
        set((state) => {
          const setSource = state.profileData.actionSets.find((s) => s.id === id);
          if (!setSource) return state;

          const newSet: ActionSet = {
            ...JSON.parse(JSON.stringify(setSource)),
            id: generateId(),
            name: `${setSource.name} (Copy)`,
          };

          return {
            profileData: {
              ...state.profileData,
              actionSets: [...state.profileData.actionSets, newSet],
            },
          };
        }),

      addAction: (setId, action) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) =>
              s.id === setId ? { ...s, actions: [...s.actions, action] } : s
            ),
          },
        })),

      updateAction: (setId, actionId, updates) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) =>
              s.id === setId
                ? {
                    ...s,
                    actions: s.actions.map((a) =>
                      a.id === actionId ? { ...a, ...updates } : a
                    ),
                  }
                : s
            ),
          },
        })),

      deleteAction: (setId, actionId) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              
              const newActions = s.actions.filter((a) => a.id !== actionId);
              const newBindings = JSON.parse(JSON.stringify(s.bindings));
              if (newBindings.keyboard[actionId]) delete newBindings.keyboard[actionId];
              if (newBindings.deck[actionId]) delete newBindings.deck[actionId];
              
              // Clean up mode shift slots referencing deleted action
              if (newBindings.deckModeShifts) {
                for (const inputId in newBindings.deckModeShifts) {
                  const msList = newBindings.deckModeShifts[inputId];
                  if (Array.isArray(msList)) {
                    msList.forEach(ms => {
                      for (const slotId in ms.slots) {
                        if (ms.slots[slotId] === actionId) {
                          delete ms.slots[slotId];
                        }
                      }
                    });
                  }
                }
              }

              return {
                ...s,
                actions: newActions,
                bindings: newBindings,
              };
            }),
          },
        })),

      setBindings: (setId, device, actionId, bindings) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  [device]: {
                    ...s.bindings[device],
                    [actionId]: bindings,
                  },
                },
              };
            }),
          },
        })),

      addBinding: (setId, device, actionId, binding) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const currentBindings = s.bindings[device][actionId] || [];
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  [device]: {
                    ...s.bindings[device],
                    [actionId]: [...currentBindings, binding],
                  },
                },
              };
            }),
          },
        })),

      removeBinding: (setId, device, actionId, bindingIndex) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const currentBindings = s.bindings[device][actionId] || [];
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  [device]: {
                    ...s.bindings[device],
                    [actionId]: currentBindings.filter((_, i) => i !== bindingIndex),
                  },
                },
              };
            }),
          },
        })),

      moveBinding: (setId, device, actionId, fromIndex, toIndex) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const bindings = [...(s.bindings[device][actionId] || [])];
              const [moved] = bindings.splice(fromIndex, 1);
              bindings.splice(toIndex, 0, moved);
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  [device]: {
                    ...s.bindings[device],
                    [actionId]: bindings,
                  },
                },
              };
            }),
          },
        })),

      swapModeShiftSlotActions: (setId, inputId, index, slotA, slotB) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const msList = [...(Array.isArray(s.bindings.deckModeShifts?.[inputId]) ? s.bindings.deckModeShifts![inputId] : [])];
              const ms = msList[index];
              if (!ms) return s;
              
              const newSlots = { ...ms.slots };
              const tempA = newSlots[slotA];
              const tempB = newSlots[slotB];
              
              if (tempB) newSlots[slotA] = tempB;
              else delete newSlots[slotA];
              
              if (tempA) newSlots[slotB] = tempA;
              else delete newSlots[slotB];
              
              msList[index] = { ...ms, slots: newSlots };
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  deckModeShifts: {
                    ...(s.bindings.deckModeShifts || {}),
                    [inputId]: msList,
                  },
                },
              };
            }),
          },
        })),

      // Mode Shift Management
      addModeShift: (setId, inputId, modeShift) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const currentShifts = Array.isArray(s.bindings.deckModeShifts?.[inputId]) 
                ? s.bindings.deckModeShifts![inputId] 
                : [];
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  deckModeShifts: {
                    ...(s.bindings.deckModeShifts || {}),
                    [inputId]: [...currentShifts, modeShift],
                  },
                },
              };
            }),
          },
        })),

      setModeShift: (setId, inputId, index, modeShift) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const currentShifts = [...(Array.isArray(s.bindings.deckModeShifts?.[inputId]) ? s.bindings.deckModeShifts![inputId] : [])];
              currentShifts[index] = modeShift;
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  deckModeShifts: {
                    ...(s.bindings.deckModeShifts || {}),
                    [inputId]: currentShifts,
                  },
                },
              };
            }),
          },
        })),

      removeModeShift: (setId, inputId, index) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const currentShifts = Array.isArray(s.bindings.deckModeShifts?.[inputId]) ? s.bindings.deckModeShifts![inputId] : [];
              const newShifts = currentShifts.filter((_, i) => i !== index);
              const newModeShifts = { ...(s.bindings.deckModeShifts || {}) };
              if (newShifts.length === 0) {
                delete newModeShifts[inputId];
              } else {
                newModeShifts[inputId] = newShifts;
              }
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  deckModeShifts: newModeShifts,
                },
              };
            }),
          },
        })),

      setModeShiftSlot: (setId, inputId, index, slotId, actionId) =>
        set((state) => ({
          profileData: {
            ...state.profileData,
            actionSets: state.profileData.actionSets.map((s) => {
              if (s.id !== setId) return s;
              const currentShifts = [...(Array.isArray(s.bindings.deckModeShifts?.[inputId]) ? s.bindings.deckModeShifts![inputId] : [])];
              const ms = currentShifts[index];
              if (!ms) return s;
              const newSlots = { ...ms.slots };
              if (actionId === null) {
                delete newSlots[slotId];
              } else {
                newSlots[slotId] = actionId;
              }
              currentShifts[index] = { ...ms, slots: newSlots };
              return {
                ...s,
                bindings: {
                  ...s.bindings,
                  deckModeShifts: {
                    ...(s.bindings.deckModeShifts || {}),
                    [inputId]: currentShifts,
                  },
                },
              };
            }),
          },
        })),
    }),
    {
      name: 'binding-visualizer-storage',
    }
  )
);
