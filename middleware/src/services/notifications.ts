import type { Sql } from '../lib/util';
import type { D1PreparedStatement } from '../platform/cf';
import type { Locale } from '../http/context';
import { newId, parseJson } from '../lib/util';

/**
 * In-app notifications. Persisted rows store a message key in `title` and JSON parameters in
 * `body`; text is rendered per reader locale at read time, so no language is baked into data.
 * Push and email delivery need provider credentials and are recorded as not configured.
 */
export type NotificationCategory = 'dreams' | 'collaboration' | 'music' | 'social' | 'messages' | 'agenda' | 'prayer' | 'safety';

export type NotifyInput = {
  userId: string;
  type: string;
  category: NotificationCategory;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  params?: Record<string, string | number | null>;
  deepLink?: string | null;
  dedupeKey?: string | null;
  scheduledAt?: string | null;
};

/**
 * Statement for inclusion in a transaction. Skips: inactive recipients (including demo
 * profiles), recipients who opted out of the category, recipients who blocked the actor,
 * and duplicates (same dedupe key). Safety notices ignore opt-outs.
 */
export function notifyStmt(sql: Sql, n: NotifyInput): D1PreparedStatement {
  const actor = n.actorId ?? null;
  return sql.stmt(
    `INSERT OR IGNORE INTO notifications(id,user_id,notification_type,actor_id,entity_type,entity_id,title,body,
       scheduled_at,delivered_at,status,category,deep_link,dedupe_key)
     SELECT ?1,?2,?3,?4,?5,?6,?3,?7,?8,CASE WHEN ?8 IS NULL THEN CURRENT_TIMESTAMP END,CASE WHEN ?8 IS NULL THEN 'sent' ELSE 'queued' END,?9,?10,?11
     WHERE EXISTS(SELECT 1 FROM users WHERE id=?2 AND account_status='active')
       AND (?9='safety' OR NOT EXISTS(SELECT 1 FROM user_preferences p, json_each(p.notification_opt_outs) j WHERE p.user_id=?2 AND j.value=?9))
       AND (?4 IS NULL OR NOT EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id=?2 AND blocked_id=?4))
       AND (?4 IS NULL OR ?4<>?2)`,
    newId(), n.userId, n.type, actor, n.entityType ?? null, n.entityId ?? null,
    JSON.stringify(n.params ?? {}), n.scheduledAt ?? null, n.category, n.deepLink ?? null, n.dedupeKey ?? null,
  );
}

export async function notify(sql: Sql, n: NotifyInput): Promise<void> {
  await notifyStmt(sql, n).run();
}

type Catalog = Record<string, { title: string; body: string }>;
const FR: Catalog = {
  'dream.offer.received': { title: 'Nouvelle proposition d’aide', body: '{actor} propose son aide pour « {need} » dans {dream}.' },
  'dream.offer.accepted': { title: 'Ton aide est acceptée', body: 'Ta proposition pour « {need} » dans {dream} a été acceptée.' },
  'dream.offer.declined': { title: 'Proposition non retenue', body: 'Ta proposition pour « {need} » dans {dream} n’a pas été retenue.' },
  'dream.offer.released': { title: 'Participation terminée', body: 'Ta participation à « {need} » dans {dream} a pris fin.' },
  'dream.need.filled': { title: 'Ressource trouvée', body: '« {need} » est complet pour {dream}.' },
  'dream.owner_invitation.received': { title: 'Invitation à co-porter un rêve', body: '{actor} t’invite à co-porter {dream}.' },
  'dream.owner_invitation.accepted': { title: 'Nouveau co-porteur', body: '{actor} co-porte maintenant {dream}.' },
  'dream.collaborator.invited': { title: 'Invitation à collaborer', body: '{actor} t’invite à collaborer sur {dream}.' },
  'dream.phase.changed': { title: 'Le rêve avance', body: '{dream} entre en {phase}.' },
  'dream.conversation.created': { title: 'Conversation du rêve ouverte', body: 'La conversation de {dream} est ouverte.' },
  'dream.inspired': { title: 'Un fruit est né', body: '{dream} a inspiré un nouveau rêve : {inspired}.' },
  'music.proposal.received': { title: 'Nouvelle adaptation proposée', body: '{actor} propose une adaptation de {track}.' },
  'music.proposal.accepted': { title: 'Adaptation acceptée', body: 'Ton adaptation de {track} a été acceptée.' },
  'music.proposal.rejected': { title: 'Adaptation non retenue', body: 'Ton adaptation de {track} n’a pas été retenue.' },
  'music.proposal.published': { title: 'Adaptation publiée', body: 'Ton adaptation de {track} est publiée avec tes crédits.' },
  'introduction.consent_requested': { title: 'Présentation proposée', body: '{actor} propose une mise en relation autour de {dream}.' },
  'introduction.connected': { title: 'Mise en relation acceptée', body: 'La conversation autour de {dream} est ouverte.' },
  'introduction.declined': { title: 'Mise en relation non aboutie', body: 'La présentation autour de {dream} n’a pas abouti.' },
  'contact.request.received': { title: 'Demande de contact', body: '{actor} souhaite t’ajouter à ses contacts.' },
  'contact.request.accepted': { title: 'Contact accepté', body: '{actor} a accepté ta demande de contact.' },
  'circle.request.received': { title: 'Invitation à Mon cercle', body: '{actor} t’invite dans son cercle.' },
  'circle.request.accepted': { title: 'Cercle confirmé', body: '{actor} fait maintenant partie de ton cercle.' },
  'message.received': { title: 'Nouveau message', body: '{actor} t’a écrit.' },
  'event.invitation.received': { title: 'Invitation à un rendez-vous', body: '{actor} t’invite : {event}.' },
  'event.invitation.responded': { title: 'Réponse à ton invitation', body: '{actor} a répondu : {event}.' },
  'event.updated': { title: 'Rendez-vous modifié', body: '{event} a été modifié.' },
  'event.cancelled': { title: 'Rendez-vous annulé', body: '{event} a été annulé.' },
  'prayer.reminder': { title: 'Rappel de prière', body: 'Un moment pour prier : {subject}.' },
  'call.invitation': { title: 'Appel vidéo', body: '{actor} souhaite t’appeler.' },
  'moderation.action': { title: 'Information de modération', body: 'Un contenu a été examiné par l’équipe JenLow.' },
};
const EN: Catalog = {
  'dream.offer.received': { title: 'New offer of help', body: '{actor} offered help with “{need}” on {dream}.' },
  'dream.offer.accepted': { title: 'Your help was accepted', body: 'Your offer for “{need}” on {dream} was accepted.' },
  'dream.offer.declined': { title: 'Offer not selected', body: 'Your offer for “{need}” on {dream} was not selected.' },
  'dream.offer.released': { title: 'Participation ended', body: 'Your participation in “{need}” on {dream} has ended.' },
  'dream.need.filled': { title: 'Resource found', body: '“{need}” is complete for {dream}.' },
  'dream.owner_invitation.received': { title: 'Co-owner invitation', body: '{actor} invites you to co-own {dream}.' },
  'dream.owner_invitation.accepted': { title: 'New co-owner', body: '{actor} now co-owns {dream}.' },
  'dream.collaborator.invited': { title: 'Collaboration invitation', body: '{actor} invites you to collaborate on {dream}.' },
  'dream.phase.changed': { title: 'The dream moves forward', body: '{dream} enters {phase}.' },
  'dream.conversation.created': { title: 'Dream conversation opened', body: 'The conversation for {dream} is open.' },
  'dream.inspired': { title: 'A fruit was born', body: '{dream} inspired a new dream: {inspired}.' },
  'music.proposal.received': { title: 'New adaptation proposed', body: '{actor} proposed an adaptation of {track}.' },
  'music.proposal.accepted': { title: 'Adaptation accepted', body: 'Your adaptation of {track} was accepted.' },
  'music.proposal.rejected': { title: 'Adaptation not selected', body: 'Your adaptation of {track} was not selected.' },
  'music.proposal.published': { title: 'Adaptation published', body: 'Your adaptation of {track} is published with your credits.' },
  'introduction.consent_requested': { title: 'Introduction proposed', body: '{actor} proposed an introduction around {dream}.' },
  'introduction.connected': { title: 'Introduction accepted', body: 'The conversation around {dream} is open.' },
  'introduction.declined': { title: 'Introduction not completed', body: 'The introduction around {dream} did not go ahead.' },
  'contact.request.received': { title: 'Contact request', body: '{actor} wants to add you as a contact.' },
  'contact.request.accepted': { title: 'Contact accepted', body: '{actor} accepted your contact request.' },
  'circle.request.received': { title: 'My Circle invitation', body: '{actor} invites you into their circle.' },
  'circle.request.accepted': { title: 'Circle confirmed', body: '{actor} is now in your circle.' },
  'message.received': { title: 'New message', body: '{actor} wrote to you.' },
  'event.invitation.received': { title: 'Appointment invitation', body: '{actor} invites you: {event}.' },
  'event.invitation.responded': { title: 'Invitation reply', body: '{actor} replied: {event}.' },
  'event.updated': { title: 'Appointment changed', body: '{event} was changed.' },
  'event.cancelled': { title: 'Appointment cancelled', body: '{event} was cancelled.' },
  'prayer.reminder': { title: 'Prayer reminder', body: 'A moment to pray: {subject}.' },
  'call.invitation': { title: 'Video call', body: '{actor} would like to call you.' },
  'moderation.action': { title: 'Moderation notice', body: 'Content was reviewed by the JenLow team.' },
};
const CATALOGS: Partial<Record<Locale, Catalog>> = { fr: FR, en: EN };

export function renderNotification(type: string, rawParams: unknown, locale: Locale): { title: string; body: string } {
  const entry = (CATALOGS[locale] ?? FR)[type] ?? FR[type] ?? { title: type, body: '' };
  const params = parseJson<Record<string, unknown>>(rawParams, {});
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_m, k: string) => (params[k] === undefined || params[k] === null ? '' : String(params[k])));
  return { title: fill(entry.title), body: fill(entry.body) };
}
