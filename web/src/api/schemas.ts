import { z } from 'zod';

export const cardSchema = z.object({
  index: z.number(),
  reversed: z.boolean(),
  name: z.string(),
  roman: z.string(),
  meaning: z.string(),
  orientation: z.string()
});

export const quotaSchema = z.object({ freeLeft: z.number(), credits: z.number(), subscribed: z.boolean() });

export const meSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  birthDate: z.string().nullable(),
  notify: z.boolean(),
  sign: z.string().nullable(),
  quota: quotaSchema,
  freePerDay: z.number(),
  today: z.object({ day: z.string(), dateLabel: z.string(), moonLine: z.string() })
});

export const skySchema = z.object({
  day: z.string(),
  dateLabel: z.string(),
  signName: z.string(),
  sunLon: z.number(),
  moonLon: z.number(),
  natalLon: z.number(),
  natalSignIndex: z.number(),
  moonSign: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string(), wide: z.boolean() }))
});

export const daySchema = z.object({ day: z.string(), opened: z.boolean(), card: cardSchema.nullable() });

export const spreadStartSchema = z.object({ id: z.string(), size: z.number(), quota: quotaSchema });

export const pickSchema = z.object({ slot: z.number(), card: cardSchema, done: z.boolean() });

export const errorSchema = z.object({ code: z.string() });

export const streamEventSchema = z.object({
  delta: z.string().optional(),
  done: z.boolean().optional(),
  source: z.enum(['ai', 'template']).optional(),
  note: z.string().nullable().optional()
});

export type Card = z.infer<typeof cardSchema>;
export type Quota = z.infer<typeof quotaSchema>;
export type Me = z.infer<typeof meSchema>;
export type Sky = z.infer<typeof skySchema>;
export type Day = z.infer<typeof daySchema>;
export type SpreadStart = z.infer<typeof spreadStartSchema>;
export type PickResult = z.infer<typeof pickSchema>;
