import { z } from 'zod';

export const ActionTypeSchema = z.enum(['digital', 'analog', 'directional']);

export const ActionSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  type: ActionTypeSchema,
  category: z.string().optional(),
  description: z.string().optional(),
});

export const BindingsSchema = z.record(z.string(), z.array(z.array(z.string())));

export const ModeShiftSchema = z.object({
  enableButton: z.string(),                    // e.g. "deck.l1"
  menuType: z.enum(['radial', 'touch']).default('radial'),
  slotCount: z.number().min(1).max(16),        // for radial: expandable 1-16
  gridRows: z.number().min(1).max(4).default(2),  // for touch: rows
  gridCols: z.number().min(1).max(4).default(2),  // for touch: columns
  slots: z.record(z.string(), z.string()),     // slotIndex ("0","1",...) -> actionId
});

export const ModeShiftsSchema = z.record(z.string(), z.array(ModeShiftSchema)); // inputId -> ModeShift[]

export const ActionSetSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  actions: z.array(ActionSchema),
  bindings: z.object({
    keyboard: BindingsSchema,
    deck: BindingsSchema,
    deckModeShifts: ModeShiftsSchema.default({}),
  }),
});

export const ProfileInfoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  game: z.string().min(1, 'Game is required'),
});

export const ProfileSchema = z.object({
  version: z.string(),
  profile: ProfileInfoSchema,
  actionSets: z.array(ActionSetSchema),
});

export type ActionType = z.infer<typeof ActionTypeSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Bindings = z.infer<typeof BindingsSchema>;
export type ModeShift = z.infer<typeof ModeShiftSchema>;
export type ModeShifts = z.infer<typeof ModeShiftsSchema>;
export type ActionSet = z.infer<typeof ActionSetSchema>;
export type ProfileInfo = z.infer<typeof ProfileInfoSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

export const DEFAULT_PROFILE: Profile = {
  version: '1.0',
  profile: {
    name: 'New Profile',
    game: 'Unknown Game',
  },
  actionSets: [
    {
      id: 'default',
      name: 'Default',
      actions: [],
      bindings: {
        keyboard: {},
        deck: {},
        deckModeShifts: {},
      },
    },
  ],
};
