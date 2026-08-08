// Transient (in-memory only) flag set right after a reporter submits their join request, so the
// dashboard gate can show a "pending" state immediately instead of racing the Firestore listener
// for the new record to arrive. Cleared once the real record is confirmed or on logout.
let justSubmittedReporterId: string | null = null;

export function setJustSubmittedReporterId(id: string) {
  justSubmittedReporterId = id;
}

export function getJustSubmittedReporterId() {
  return justSubmittedReporterId;
}

export function clearJustSubmittedReporterId() {
  justSubmittedReporterId = null;
}
