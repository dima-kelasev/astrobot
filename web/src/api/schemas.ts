import { z } from 'zod';

export const cardSchema = z.object({
  index: z.number(),
  reversed: z.boolean(),
  name: z.string(),
  roman: z.string(),
  meaning: z.string(),
  orientation: z.string()
});

const limitSchema = z.object({ used: z.number(), max: z.number() });

export const limitsSchema = z.object({ spread: limitSchema, question: limitSchema, partner: limitSchema });

const placeSchema = z.object({ name: z.string(), label: z.string() });

export const meSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  birth: z.object({ date: z.string(), time: z.string().nullable(), place: placeSchema.nullable() }).nullable(),
  consent: z.boolean(),
  notifyMorning: z.boolean(),
  notifyEvening: z.boolean(),
  sign: z.string().nullable(),
  ascSign: z.string().nullable(),
  limits: limitsSchema,
  subscribed: z.boolean(),
  payments: z.boolean(),
  privacyUrl: z.string(),
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

export const themeSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  positions: z.array(z.string()),
  questionRequired: z.boolean(),
  hint: z.string()
});

export const themesSchema = z.object({ themes: z.array(themeSchema) });

export const spreadStartSchema = z.object({
  id: z.string(),
  theme: z.string(),
  title: z.string(),
  positions: z.array(z.string()),
  size: z.number(),
  limits: limitsSchema
});

export const pickSchema = z.object({ slot: z.number(), card: cardSchema, done: z.boolean() });

export const citiesSchema = z.object({ cities: z.array(z.object({ id: z.number(), name: z.string(), label: z.string() })) });

const pointSchema = z.object({
  key: z.string(),
  name: z.string(),
  glyph: z.string(),
  lon: z.number(),
  signIndex: z.number(),
  sign: z.string(),
  degree: z.number(),
  minute: z.number(),
  retro: z.boolean(),
  house: z.number().nullable()
});

const aspectViewSchema = z.object({ text: z.string(), nature: z.string(), tone: z.enum(['soft', 'hard', 'mixed']) });

const houseLinkSchema = z.object({ key: z.string(), name: z.string(), house: z.number().nullable() });

export const natalSchema = z.object({
  hasTime: z.boolean(),
  hasPlace: z.boolean(),
  houseSystem: z.enum(['placidus', 'porphyry']).nullable(),
  points: z.array(pointSchema),
  cusps: z.array(z.number()).nullable(),
  asc: z.number().nullable(),
  mc: z.number().nullable(),
  aspects: z.array(aspectViewSchema),
  extras: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      glyph: z.string(),
      meaning: z.string(),
      sign: z.string(),
      degree: z.number(),
      minute: z.number(),
      house: z.number().nullable()
    })
  ),
  figures: z.array(z.object({ title: z.string(), points: z.string(), meaning: z.string() })),
  items: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      glyph: z.string(),
      title: z.string(),
      position: z.string(),
      meaning: z.string(),
      sign: z.string(),
      signText: z.string(),
      house: z.number().nullable(),
      houseText: z.string().nullable(),
      rules: z.array(z.number()),
      retro: z.boolean(),
      aspects: z.array(z.object({ text: z.string(), nature: z.string(), tone: z.enum(['soft', 'hard', 'mixed']), orb: z.number() }))
    })
  ),
  houseItems: z.array(
    z.object({
      house: z.number(),
      title: z.string(),
      position: z.string(),
      meaning: z.string(),
      rulers: z.array(houseLinkSchema),
      planets: z.array(houseLinkSchema)
    })
  ),
  houses: z.array(z.string()),
  planets: z.array(z.object({ key: z.string(), meaning: z.string() }))
});

export const ascSchema = z.object({
  available: z.boolean(),
  reason: z.enum(['no_time', 'no_place']).nullable(),
  sign: z.string().nullable(),
  degree: z.number().nullable(),
  signIndex: z.number().nullable()
});

export const whySchema = z.object({ hasTime: z.boolean(), transits: z.array(z.string()), houses: z.array(z.string()), retro: z.array(z.string()) });

export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthDate: z.string(),
  birthTime: z.string().nullable(),
  place: placeSchema.nullable(),
  sign: z.string()
});

export const partnersSchema = z.object({ partners: z.array(partnerSchema) });
export const partnerAddSchema = z.object({ partner: partnerSchema, limits: limitsSchema });
export const partnerDetailSchema = z.object({ partner: partnerSchema, userSign: z.string(), aspects: z.array(z.string()) });

export const questionStartSchema = z.object({
  id: z.string(),
  tool: z.enum(['tarot', 'chart', 'both']),
  cards: z.array(cardSchema),
  needBirth: z.boolean(),
  limits: limitsSchema
});

export const historySchema = z.object({
  items: z.array(z.object({ kind: z.string(), key: z.string(), title: z.string(), subtitle: z.string(), date: z.string() }))
});

export const historyItemSchema = z.object({
  kind: z.string(),
  key: z.string(),
  date: z.string(),
  title: z.string(),
  subtitle: z.string(),
  cards: z.array(cardSchema),
  positions: z.array(z.string()),
  text: z.string()
});

export const deletedSchema = z.object({ deleted: z.boolean() });

export const errorSchema = z.object({ code: z.string() });

export const streamEventSchema = z.object({
  delta: z.string().optional(),
  done: z.boolean().optional(),
  source: z.enum(['ai', 'template']).optional(),
  note: z.string().nullable().optional()
});

export type Card = z.infer<typeof cardSchema>;
export type Limits = z.infer<typeof limitsSchema>;
export type Me = z.infer<typeof meSchema>;
export type Sky = z.infer<typeof skySchema>;
export type Day = z.infer<typeof daySchema>;
export type Theme = z.infer<typeof themeSchema>;
export type SpreadStart = z.infer<typeof spreadStartSchema>;
export type PickResult = z.infer<typeof pickSchema>;
export type City = z.infer<typeof citiesSchema>['cities'][number];
export type Natal = z.infer<typeof natalSchema>;
export type NatalItem = Natal['items'][number];
export type NatalHouse = Natal['houseItems'][number];
export type NatalPoint = z.infer<typeof pointSchema>;
export type Asc = z.infer<typeof ascSchema>;
export type Why = z.infer<typeof whySchema>;
export type Partner = z.infer<typeof partnerSchema>;
export type PartnerDetail = z.infer<typeof partnerDetailSchema>;
export type QuestionStart = z.infer<typeof questionStartSchema>;
export type HistoryEntry = z.infer<typeof historySchema>['items'][number];
export type HistoryItem = z.infer<typeof historyItemSchema>;
