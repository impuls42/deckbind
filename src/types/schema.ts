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

export const ActionSetSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  actions: z.array(ActionSchema),
  bindings: z.object({
    keyboard: BindingsSchema,
    deck: BindingsSchema,
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
      },
    },
  ],
};
