import { z } from "zod";

// Squad member parsed from .squad/team.md
export const SquadMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  scope: z.string(),
  badge: z.string(),
  status: z.enum(["available", "thinking", "replied", "error"]).default("available"),
  charterPath: z.string().optional(),
  historyPath: z.string().optional(),
});
export type SquadMember = z.infer<typeof SquadMemberSchema>;

// Squad config entry in squadoffice.config.json
export const SquadConfigEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
});
export type SquadConfigEntry = z.infer<typeof SquadConfigEntrySchema>;

// Root config file
export const SquadOfficeConfigSchema = z.object({
  squads: z.array(SquadConfigEntrySchema),
});
export type SquadOfficeConfig = z.infer<typeof SquadOfficeConfigSchema>;

// Runtime squad state
export const SquadInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  members: z.array(SquadMemberSchema),
  active: z.boolean().default(true),
});
export type SquadInfo = z.infer<typeof SquadInfoSchema>;

// Decision entry parsed from .squad/decisions.md
export const DecisionEntrySchema = z.object({
  timestamp: z.string(),
  title: z.string(),
  author: z.string(),
  content: z.string(),
  raw: z.string(),
});
export type DecisionEntry = z.infer<typeof DecisionEntrySchema>;

// Ceremony types
export type CeremonyType = "design-review" | "retro";

export const CeremonyStateSchema = z.object({
  ceremonyId: z.string(),
  type: z.enum(["design-review", "retro"]),
  squadId: z.string(),
  participants: z.array(z.string()),
  startedAt: z.string(),
  active: z.boolean(),
});
export type CeremonyState = z.infer<typeof CeremonyStateSchema>;

// Ceremony config parsed from .squad/ceremonies.md
export interface CeremonyConfig {
  type: CeremonyType;
  name: string;
  trigger: string;
  when: string;
  condition: string;
  facilitator: string;
  participants: string;
  timeBudget: string;
  enabled: boolean;
  agenda: string[];
}

// Building overview (all squads)
export const BuildingOverviewSchema = z.object({
  squads: z.array(z.object({
    id: z.string(),
    name: z.string(),
    memberCount: z.number(),
    active: z.boolean(),
  })),
});
export type BuildingOverview = z.infer<typeof BuildingOverviewSchema>;
