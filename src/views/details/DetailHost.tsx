/** Viser den detaljevisning, adressen peger på (?vis=type:id). */
import type { ReactNode } from 'react';
import { CATEGORY_LABEL } from '../../model/risk';
import { useApp, useLookup } from '../../state/AppState';
import { Drawer } from '../../ui/Overlay';
import { ActionDetail, CapabilityDetail, KnowledgeDetail, PracticeDetail } from './OtherDetails';
import { RiskDetail } from './RiskDetail';
import { RoleDetail } from './RoleDetail';

export function DetailHost() {
  const { detail, closeDetail, allRisks, data } = useApp();
  const { roles, caps, knowledge, practices, actions } = useLookup();
  if (!detail) return null;

  let eyebrow = '';
  let title = '';
  let body: ReactNode = null;
  switch (detail.type) {
    case 'risiko': {
      const r = allRisks.find((x) => x.id === detail.id);
      if (r) {
        eyebrow = `Risiko · ${CATEGORY_LABEL[r.category]}`;
        title = r.title;
        body = <RiskDetail risk={r} />;
      } else if (data.riskTreatments.some((t) => t.riskId === detail.id) || /^(SUC|VID|KAP|KUL)-/.test(detail.id)) {
        eyebrow = 'Risiko';
        title = 'Risikoen er ikke til stede i den valgte periode';
        body = <p className="text-sm text-ink-2">Risikoen {detail.id} opfylder ikke modellens kriterier i den valgte periode. Vælg en anden periode for at se den.</p>;
      }
      break;
    }
    case 'rolle': {
      const r = roles.get(detail.id);
      if (r) {
        eyebrow = 'Rolle';
        title = r.title;
        body = <RoleDetail role={r} />;
      }
      break;
    }
    case 'kapabilitet': {
      const c = caps.get(detail.id);
      if (c) {
        eyebrow = 'Kapabilitet';
        title = c.name;
        body = <CapabilityDetail cap={c} />;
      }
      break;
    }
    case 'viden': {
      const k = knowledge.get(detail.id);
      if (k) {
        eyebrow = 'Kritisk viden';
        title = k.name;
        body = <KnowledgeDetail area={k} />;
      }
      break;
    }
    case 'praksis': {
      const p = practices.get(detail.id);
      if (p) {
        eyebrow = 'Praksis';
        title = p.name;
        body = <PracticeDetail practice={p} />;
      }
      break;
    }
    case 'handling': {
      const a = actions.get(detail.id);
      if (a) {
        eyebrow = 'Handling';
        title = a.title;
        body = <ActionDetail action={a} />;
      }
      break;
    }
  }
  if (!body) {
    eyebrow = 'Detaljer';
    title = 'Elementet findes ikke';
    body = <p className="text-sm text-ink-2">Linket peger på et element, der ikke findes i datagrundlaget.</p>;
  }
  return (
    <Drawer open onClose={closeDetail} eyebrow={eyebrow} title={title}>
      {body}
    </Drawer>
  );
}
