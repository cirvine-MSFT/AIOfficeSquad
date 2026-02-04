import { z } from "zod";

export const StatusSchema = z.enum(["available", "thinking", "replied", "error"]);
export type AgentStatus = z.infer<typeof StatusSchema>;

export const AgentStatusPayloadSchema = z.object({
  status: StatusSchema,
  summary: z.string().min(1)
});
export type AgentStatusPayload = z.infer<typeof AgentStatusPayloadSchema>;

export const AgentMessagePayloadSchema = z.object({
  text: z.string().min(1),
  channel: z.enum(["log", "reply", "task"]),
  collapsible: z.boolean().optional()
});
export type AgentMessagePayload = z.infer<typeof AgentMessagePayloadSchema>;

export const AgentPositionPayloadSchema = z.object({
  x: z.number(),
  y: z.number()
});
export type AgentPositionPayload = z.infer<typeof AgentPositionPayloadSchema>;

export const TaskAssignPayloadSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1),
  details: z.string().optional()
});
export type TaskAssignPayload = z.infer<typeof TaskAssignPayloadSchema>;

export const EventTypeSchema = z.enum([
  "agent.status",
  "agent.message",
  "agent.position",
  "task.assign",
  "snapshot"
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EventEnvelopeSchema = z.object({
  type: EventTypeSchema,
  agentId: z.string().min(1),
  timestamp: z.string().min(1),
  payload: z.record(z.unknown())
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export function validatePayload(type: EventType, payload: unknown) {
  switch (type) {
    case "agent.status":
      return AgentStatusPayloadSchema.parse(payload);
    case "agent.message":
      return AgentMessagePayloadSchema.parse(payload);
    case "agent.position":
      return AgentPositionPayloadSchema.parse(payload);
    case "task.assign":
      return TaskAssignPayloadSchema.parse(payload);
    case "snapshot":
      return z.record(z.unknown()).parse(payload);
    default:
      return payload;
  }
}
