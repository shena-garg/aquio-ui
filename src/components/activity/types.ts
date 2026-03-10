import type { AuditEvent } from "@/services/activity";

export interface ParsedEvent {
  event: AuditEvent;
  userName: string;
  formattedDate: string;
}
