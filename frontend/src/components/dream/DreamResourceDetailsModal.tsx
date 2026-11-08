import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamResource } from '@/domain/dreamWorkspace';
import { useAppTheme } from '@/theme/AppTheme';
import { DREAM_TALENT_CHOICES } from './dreamTalentCatalog';
import { TalentLevelSelector } from '@/components/talent/TalentLevelSelector';

/** Edits the exact saved wording of a dream need. No remote Tools publication is implied. */
export function DreamResourceDetailsModal({
  resource, editable, onClose, onSave, onToggle, onRemove,
}: {
  resource?: DreamResource | null;
  editable: boolean;
  onClose: () => void;
  onSave: (resource: DreamResource) => void;
  onToggle: (resource: DreamResource) => void;
  onRemove: (resource: DreamResource) => void;
}) {
  const theme = useAppTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedIllustration, setSelectedIllustration] = useState<DreamResource['illustration']>();
  const [toolsRequested, setToolsRequested] = useState(false);
  const [talentListOpen, setTalentListOpen] = useState(false);
  const [requiredLevel,setRequiredLevel]=useState('Quelques notions');

  useEffect(() => {
    if (!resource) return;
    setTitle(resource.title);
    setRequiredLevel(resource.requiredLevel||'Quelques notions');
    setDescription(resource.description || '');
    setAmount(typeof resource.amount === 'number' ? String(resource.amount) : '');
    setSelectedIllustration(resource.illustration);
    setToolsRequested(!!resource.toolsPublicationRequested);
    setTalentListOpen(false);
  }, [resource?.id]);

  if (!resource) return null;
  const financial = resource.category === 'financial';
  const practical = resource.category === 'practical';
  const person = resource.category === 'person';
  const save = () => {
    if (!title.trim()) return;
    const parsedAmount = Number(amount.replace(',', '.'));
    if (financial && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) return;
    onSave({
      ...resource,
      title: title.trim(),
      description: description.trim(),
      amount: financial ? parsedAmount : resource.amount,
      illustration: person ? selectedIllustration : resource.illustration,
      requiredLevel:person?requiredLevel:resource.requiredLevel,
      toolsPublicationRequested: practical ? toolsRequested : resource.toolsPublicationRequested,
    });
    onClose();
  };
  const field = {
    color: theme.foreground, fontSize: 14, lineHeight: 20,
    borderWidth: 1, borderColor: theme.border, borderRadius: 10,
    backgroundColor: theme.background, paddingHorizontal: 13, paddingVertical: 12,
  } as const;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 18, backgroundColor: 'rgba(0,0,0,0.53)',
        alignItems: 'center', justifyContent: 'center' }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <ScrollView keyboardShouldPersistTaps="handled"
          style={{ width: '100%', maxWidth: 430, maxHeight: '85%', backgroundColor: theme.surface, borderRadius: 16 }}
          contentContainerStyle={{ padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.foreground, fontSize: 20, fontWeight: '700' }}>
              {person ? 'Talent nécessaire' : practical ? 'Ressource nécessaire' : 'Financement nécessaire'}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer"
              style={{ padding: 7 }}><Ionicons name="close-outline" size={22} color={theme.foreground}/></Pressable>
          </View>
          {person && editable ? (
            <>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Talent recherché</Text>
              <Pressable onPress={() => setTalentListOpen(!talentListOpen)} accessibilityRole="button"
                accessibilityState={{ expanded: talentListOpen }}
                style={{ ...field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.foreground, fontSize: 14 }}>{title}</Text>
                <Ionicons name="chevron-down" size={18} color={theme.foreground}/>
              </Pressable>
              {talentListOpen ? <View style={{ gap: 0, borderWidth: 1, borderColor: theme.border,
                borderRadius: 10, overflow: 'hidden' }}>
                {DREAM_TALENT_CHOICES.map(option => (
                  <Pressable key={option.title} onPress={() => {
                    setTitle(option.title); setSelectedIllustration(option.illustration); setTalentListOpen(false);
                  }} accessibilityRole="button"
                    style={{ padding: 11, borderBottomWidth: .5, borderColor: theme.border }}>
                    <Text style={{ color: theme.foreground, fontSize: 13 }}>{option.title}</Text>
                  </Pressable>
                ))}
              </View> : null}
            </>
          ) : (
            <>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Intitulé</Text>
              {editable ? <TextInput value={title} onChangeText={setTitle} style={field}
                accessibilityLabel="Modifier le nom du besoin" maxLength={90}/> :
                <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '600' }}>{title}</Text>}
            </>
          )}
          {person ? <View style={{gap:8}}>
            <Text style={{color:theme.muted,fontSize:12}}>Niveau recherché</Text>
            <TalentLevelSelector value={requiredLevel} onChange={setRequiredLevel} disabled={!editable}/>
          </View>:null}
          <Text style={{ color: theme.muted, fontSize: 12 }}>Décris précisément ton besoin</Text>
          {editable ? <TextInput accessibilityLabel="Description de ce besoin"
            value={description} onChangeText={setDescription}
            placeholder="Précise ce que tu recherches, pourquoi, et les conditions souhaitées…"
            placeholderTextColor={theme.muted} multiline textAlignVertical="top"
            style={{ ...field, minHeight: 112 }} maxLength={1200}/> :
            <Text style={{ color: theme.foreground, fontSize: 13, lineHeight: 21 }}>
              {description || 'Aucune description enregistrée.'}
            </Text>}
          {financial ? (
            <>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Montant nécessaire (€)</Text>
              {editable ? <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
                accessibilityLabel="Montant nécessaire" style={field} /> :
                <Text style={{ color: theme.foreground }}>{amount} €</Text>}
            </>
          ) : null}
          {practical ? (
            <View style={{ marginTop: 4, gap: 7 }}>
              <Pressable onPress={() => editable && setToolsRequested(!toolsRequested)}
                disabled={!editable} accessibilityRole="checkbox"
                accessibilityState={{ checked: toolsRequested, disabled: !editable }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }}>
                <Ionicons name={toolsRequested ? 'checkbox-outline' : 'square-outline'}
                  size={22} color={toolsRequested ? '#387D9F' : theme.muted}/>
                <Text style={{ flex: 1, color: theme.foreground, fontSize: 12, fontWeight: '600' }}>
                  Demander la publication sur JenLow Tools
                </Text>
              </Pressable>
              {toolsRequested ? <Text style={{ fontSize: 11, color: theme.muted, lineHeight: 18 }}>
                Préférence enregistrée dans Network. La demande ne sera pas publiée automatiquement avant la connexion à JenLow Tools.
              </Text> : null}
            </View>
          ) : null}
          {editable ? <>
            <Pressable accessibilityRole="button" onPress={save}
              style={{ minHeight: 47, borderRadius: 10, marginTop: 8,
                alignItems: 'center', justifyContent: 'center', backgroundColor: '#242322' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Enregistrer les modifications</Text>
            </Pressable>
            {!person ? <Pressable accessibilityRole="button" onPress={() => { onToggle(resource); onClose(); }}
              style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10,
                minHeight: 45, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.foreground, fontWeight: '600', fontSize: 12 }}>
                {resource.confirmed ? 'Marquer comme encore recherché' : 'Marquer comme trouvé'}
              </Text>
            </Pressable> : <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
              Un talent ne peut être marqué comme trouvé qu'après l'acceptation de la personne invitée. Aucune validation manuelle.
            </Text>}
            <Pressable accessibilityRole="button" onPress={() => { onRemove(resource); onClose(); }}
              style={{ padding: 11, alignItems: 'center' }}>
              <Text style={{ color: '#B55164', fontSize: 12 }}>Retirer ce besoin</Text>
            </Pressable>
          </> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
