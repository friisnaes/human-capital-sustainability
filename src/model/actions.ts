/** Handlinger set fra en given dato. */
import type { Action, ActionStatus, ISODate } from '../domain/types';

/** Er handlingen besluttet på datoen? */
export function actionVisibleAt(a: Action, date: ISODate): boolean {
  return a.registered <= date;
}

/**
 * Status på en historisk dato: før start er handlingen planlagt, og en
 * forsinkelse kan først konstateres, når fristen er overskredet.
 */
export function actionStatusAt(a: Action, date: ISODate): ActionStatus {
  if (date < a.start) return 'planlagt';
  if (a.status === 'forsinket' && date <= a.due) return 'igangsat';
  return a.status;
}
