// Regole di approvazione delle spese, senza database. Una spesa entra nei conti solo quando
// l'hanno approvata tutti i soci che possono entrare nel programma (attivi, con nome utente e
// password); chi la inserisce o la modifica la approva in automatico. Con un socio solo, la spesa
// è approvata subito.

export type Approver = { id: string; name: string };

export function missingApprovers<A extends Approver>(
  required: A[],
  approvedBy: Iterable<string>,
): A[] {
  const done = new Set(approvedBy);
  return required.filter((p) => !done.has(p.id));
}

export function isFullyApproved(required: Approver[], approvedBy: Iterable<string>): boolean {
  return missingApprovers(required, approvedBy).length === 0;
}

// Chi ha inserito una spesa in attesa aspetta una risposta se l'ultimo messaggio non è suo.
export function awaitsReply(
  createdById: string,
  partnerId: string,
  lastMessageAuthorId: string | null,
): boolean {
  return createdById === partnerId && !!lastMessageAuthorId && lastMessageAuthorId !== partnerId;
}
