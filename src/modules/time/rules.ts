// Chi può modificare una registrazione di ore, senza database. Le ore le modifica solo chi le ha
// inserite, e solo finché non le hanno confermate tutti i soci: dopo sono nei conti e restano
// bloccate per tutti, amministratori compresi (che possono solo eliminarle).

export type EditableEntry = { createdById: string; approvedAt: Date | null };

export type EditBlock = "confirmed" | "not-author";

export function editBlock(entry: EditableEntry, partnerId: string): EditBlock | null {
  if (entry.approvedAt) return "confirmed";
  if (entry.createdById !== partnerId) return "not-author";
  return null;
}

export function canEditTimeEntry(entry: EditableEntry, partnerId: string): boolean {
  return editBlock(entry, partnerId) === null;
}

export function editBlockMessage(block: EditBlock, authorName: string): string {
  return block === "confirmed"
    ? "Queste ore sono già state confermate da tutti i soci: non si possono più modificare."
    : `Queste ore le può modificare solo ${authorName}, che le ha inserite.`;
}
