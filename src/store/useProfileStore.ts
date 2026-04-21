import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PROFILE } from '../types/schema';
import type { Action, ActionSet, Profile, ProfileInfo } from '../types/schema';

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
    }),
    {
      name: 'binding-visualizer-storage',
    }
  )
);
