import React, { useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry, DreamBlock, DreamResource, DreamHabit } from '@/domain/dreamWorkspace';
import { PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { DreamPhaseHeader, DreamPhaseSection, DreamPhaseButton, DreamPhaseField } from './DreamPhaseLayout';
import { DreamTalentSquare } from './DreamTalentSquare';

const pink = '#D71D77';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const day = () => new Date().toISOString().slice(0, 10);
const tones: Record<DreamBlock['tone'], string> = { neutral: '#F1ECE5', pink: '#FCE4EF', sage: '#E3EEDB', sand: '#F4DEC7', lavender: '#E9E1F4', blue: '#E0EBF5', peach: '#F8E5DA', charcoal: '#292B30', clear: 'transparent' };
const forms: DreamBlock['kind'][] = ['text', 'quote', 'callout', 'image', 'audio', 'video', 'document', 'link', 'accordion', 'collection'];
const formLabels = ['Texte', 'Citation', 'Encadré', 'Image', 'Musique', 'Vidéo', 'Document', 'Lien', 'Accordéon', 'Collection'];
function Action({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
 return <DreamPhaseButton label={label} onPress={onPress} secondary={secondary} />;
}
function Field({ label, value, onChange, placeholder, multiline = false }: {label:string;value:string;onChange:(v:string)=>void;placeholder?:string;multiline?:boolean}) {
 return <DreamPhaseField label={label} value={value} onChange={onChange} placeholder={placeholder} multiline={multiline} />;
}
function DreamBlockCard({ block, editable, onEdit, onMove }: {block:DreamBlock;editable:boolean;onEdit:()=>void;onMove:(step:number)=>void}) {
 const bg = tones[block.tone];
 const looksLikeImage = block.kind === 'image' && !!block.content;
 return <View style={{ width: block.size === 'small' ? '48.5%' : '100%', paddingBottom: 9 }}>
  <Pressable onPress={editable ? onEdit : () => { if (['link','audio','video','document'].includes(block.kind) && /^https?:\/\//.test(block.content)) void Linking.openURL(block.content); }} style={{ backgroundColor: bg, borderRadius: 13, overflow: 'hidden', minHeight: block.size === 'featured' ? 205 : block.size === 'small' ? 115 : 80, justifyContent: 'center' }}>
   {looksLikeImage ? <Image source={{ uri: block.content }} style={{ width: '100%', height: block.size === 'featured' ? 220 : 132 }} /> :
   <View style={{ padding: 15, gap: 7 }}>
    {block.kind !== 'text' && block.kind !== 'quote' ? <Text style={{ fontSize: 10, fontWeight: '800', color: pink }}>{formLabels[forms.indexOf(block.kind)]?.toUpperCase()}</Text> : null}
    {block.title ? <Text style={{ fontWeight: '800', fontSize: 14, color: '#282328' }}>{block.title}</Text> : null}
    <Text style={{ color: '#332B30', fontSize: block.kind === 'quote' ? 21 : block.size === 'featured' ? 22 : 14, lineHeight: block.kind === 'quote' ? 28 : undefined, fontFamily: block.kind === 'quote' ? HANDWRITING_FAMILY : undefined }} numberOfLines={block.kind === 'accordion' ? 2 : 8}>{block.content || 'Ajouter du contenu…'}</Text>
   </View>}
  </Pressable>
  {editable ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 19, paddingTop: 6 }}><Pressable onPress={()=>onMove(-1)} accessibilityLabel="Déplacer avant"><Ionicons name="arrow-back" size={17} color="#777"/></Pressable><Pressable onPress={()=>onMove(1)} accessibilityLabel="Déplacer après"><Ionicons name="arrow-forward" size={17} color="#777"/></Pressable><Pressable onPress={onEdit} accessibilityLabel="Modifier"><Ionicons name="options-outline" size={17} color="#777"/></Pressable></View> : null}
 </View>;
}
export default function DreamExperience({ dream, viewPhase, onBack, onNavigate }: {dream:DreamEntry; viewPhase?: DreamEntry['phase']; onBack?: () => void; onNavigate?: (phase: DreamPhase)=>void}) {
 const { patch, appendBlock, setResources, setHabits, transitionToGrowth, advance, remove } = useDreams();
 const theme = useAppTheme();
 const [editing, setEditing] = useState(false);
 const [picker, setPicker] = useState(false);
 const [editingBlock, setEditingBlock] = useState<string | null>(null);
 const [blockText, setBlockText] = useState('');
 const [blockTitle, setBlockTitle] = useState('');
 const [blockKind, setBlockKind] = useState<DreamBlock['kind']>('text');
 const [blockTone, setBlockTone] = useState<DreamBlock['tone']>('neutral');
 const [blockSize, setBlockSize] = useState<DreamBlock['size']>('wide');
 const [resourceTitle, setResourceTitle] = useState('');
 const [resourceAmount, setResourceAmount] = useState('');
 const [resourceCategory, setResourceCategory] = useState<DreamResource['category']>('person');
 const [resourceLink, setResourceLink] = useState('');
 const [resourceDialog,setResourceDialog]=useState(false);
 const [freezeDialog,setFreezeDialog]=useState(false);
 const [pauseDeadline,setPauseDeadline]=useState('');
 const [habitTitle, setHabitTitle] = useState('');
 const [frequency, setFrequency] = useState<DreamHabit['frequency']>('daily');
 const [milestone, setMilestone] = useState('');
 const [thought, setThought] = useState('');
 const blocks = dream.blocks || [];
 const resources: DreamResource[] = dream.resources || (dream.needs || []).map((n,i)=>({id:'legacy-'+i,title:n,category:'practical' as const,confirmed:(dream.resolvedNeeds||[]).includes(n)}));
 const habits = dream.habits || [];
 const confirm = (title:string,message:string,go:()=>void) => Platform.OS==='web' ? (typeof window !== 'undefined' && window.confirm(title+'\n'+message) ? go() : null) : Alert.alert(title,message,[{text:'Annuler',style:'cancel'},{text:'Confirmer',onPress:go}]);
 const saveBlock = () => {
  if (!blockText.trim() && !['image','collection'].includes(blockKind)) return;
  const block: DreamBlock = {id: editingBlock || uid(),kind:blockKind,content:blockText.trim(),title:blockTitle.trim(),tone:blockTone,size:blockSize};
  if(editingBlock) patch(dream.id,{blocks:blocks.map(b=>b.id===editingBlock?block:b)});
  else appendBlock(dream.id,block);
  setPicker(false);setEditingBlock(null);setBlockText('');setBlockTitle('');
 };
 const moveBlock = (id:string,dir:number) => {
  const i=blocks.findIndex(b=>b.id===id),j=i+dir;
  if(j<0||j>=blocks.length)return;
  const updated=[...blocks];[updated[i],updated[j]]=[updated[j],updated[i]];
  patch(dream.id,{blocks:updated});
 };
 const editBlock=(block:DreamBlock)=>{setEditingBlock(block.id);setBlockText(block.content);setBlockTitle(block.title||'');setBlockTone(block.tone);setBlockSize(block.size);setBlockKind(block.kind);setPicker(true);};
 const addResource=()=>{if(!resourceTitle.trim())return;const amount=resourceCategory==='financial'?Number(resourceAmount.replace(',','.')):undefined;setResources(dream.id,[...resources,{id:uid(),title:resourceTitle.trim(),category:resourceCategory,confirmed:false,linkedBlockId:resourceLink||undefined,amount:amount&&Number.isFinite(amount)&&amount>0?amount:undefined}]);setResourceTitle('');setResourceAmount('');setResourceLink('');setResourceDialog(false);};
 const confirmGrowth = () => confirm('Tout est réuni !', 'Ta date est fixée et toutes les ressources sont confirmées. Passer à la Croissance créera aussi la conversation de ce rêve sur cet appareil.', () => transitionToGrowth(dream.id));
 const checkResource = (item: DreamResource) => {
  const updated = resources.map(x => x.id===item.id ? {...x,confirmed:!x.confirmed} : x);
  setResources(dream.id,updated);
  if(dream.phase === 'Initiation' && !item.confirmed && !!dream.goalDate && /^\d{4}-\d{2}-\d{2}$/.test(dream.goalDate) && updated.every(r=>r.confirmed)) {
   confirm('Tout est prêt !', 'Toutes les ressources sont réunies. Commencer la croissance ? Une conversation dédiée sera créée sur cet appareil.', () => transitionToGrowth(dream.id));
  }
 };
 const ready = !!dream.goalDate && /^\d{4}-\d{2}-\d{2}$/.test(dream.goalDate) && !Number.isNaN(Date.parse(dream.goalDate)) && resources.every(r=>r.confirmed);
 const phase = viewPhase || dream.phase;
 const historical = phase !== dream.phase;
 const readOnly = historical || dream.phase === 'Témoignage';
 const frozen=!!dream.paused && !!dream.pauseUntil && dream.pauseUntil>=day();
 const resourceEditable=phase==='Initiation' && !historical && !frozen;
 const freeze=()=>{
   if(historical || dream.phase!=='Initiation'||frozen)return;
   if((dream.pauseCount||0)>=3){Alert.alert('Limite atteinte','Trois pauses maximum par rêve.');return;}
   if(!/^\d{4}-\d{2}-\d{2}$/.test(pauseDeadline) ||
      !Number.isFinite(Date.parse(pauseDeadline)) || pauseDeadline<=day()){
     Alert.alert('Date requise','Choisis une date de reprise future au format AAAA-MM-JJ.');return;
   }
   patch(dream.id,{paused:true,pauseUntil:pauseDeadline,pauseCount:(dream.pauseCount||0)+1});
   setFreezeDialog(false);setPauseDeadline('');
 };
 return <ScrollView style={{flex:1,backgroundColor:theme.background}} contentContainerStyle={{paddingHorizontal:19,paddingTop:10,paddingBottom:65,maxWidth:760,width:'100%',alignSelf:'center'}}>
  <DreamPhaseHeader dream={dream} phase={phase} onBack={onBack || (()=>router.replace('/my-space'))} onNavigate={onNavigate} readOnly={historical}
    summary={phase==='Témoignage'?'Le rêve est devenu réalité. Voici ce qui a pris vie.':undefined}
    action={phase==='Rêve'&&!historical?<Pressable onPress={()=>setEditing(!editing)} style={{padding:8}}><Text style={{color:theme.foreground,fontWeight:'700',fontSize:12}}>{editing?'Terminer':'Composer'}</Text></Pressable>:undefined}
  />
  {phase==='Rêve' ? <>
   <View style={{flexDirection:'row',alignItems:'center',gap:7,marginBottom:13}}>
     <Ionicons name="link-outline" size={15} color={theme.muted}/>
     <Text style={{color:theme.muted,fontSize:12}}>Semence non répertoriée jusqu'à la germination</Text>
   </View>
      {dream.image ? <Image source={{uri:dream.image}} style={{width:'100%',height:190,borderRadius:13,marginBottom:12}}/>:null}
   {editing && !historical ? <Action secondary label="Changer l'image principale" onPress={()=>pickDreamImage(uri=>patch(dream.id,{image:uri}),msg=>Alert.alert('Image',msg))}/> : null}
   {editing && !historical ? <Field label="Mon rêve, en quelques mots" value={dream.summary} onChange={v=>patch(dream.id,{summary:v})} multiline/> : dream.summary ? <Text style={{color:theme.foreground,fontSize:15,marginVertical:9,lineHeight:22}}>{dream.summary}</Text> : null}
   <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginTop:12}}>
    {blocks.map(b=><DreamBlockCard key={b.id} block={b} editable={editing} onEdit={()=>editBlock(b)} onMove={step=>moveBlock(b.id,step)}/>)}
   </View>
   {editing && !historical && picker ? <View style={{backgroundColor:theme.surface,padding:12,borderRadius:14,marginTop:8,borderWidth:1,borderColor:theme.border}}>
    <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground,marginBottom:12}}>Personnaliser un bloc</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>{forms.map((f,i)=><Pressable key={f} onPress={()=>setBlockKind(f)} style={{padding:9,marginRight:6,borderRadius:10,backgroundColor:blockKind===f?pink:'#F1ECE5'}}><Text style={{color:blockKind===f?'#fff':'#222',fontSize:12}}>{formLabels[i]}</Text></Pressable>)}</ScrollView>
    <Field label="Titre (facultatif)" value={blockTitle} onChange={setBlockTitle}/>
    <Field label={blockKind==='image'?'URL de l’image':blockKind==='audio'?'Lien de la musique':blockKind==='link'?'Adresse du lien':'Contenu'} value={blockText} onChange={setBlockText} multiline placeholder="Écris ou colle un lien…"/>
    {blockKind==='image' ? <Action secondary label="Importer une image" onPress={()=>pickDreamImage(setBlockText,msg=>Alert.alert('Image',msg))}/> : null}
    <Text style={{color:theme.foreground,fontWeight:'700',marginBottom:7}}>Format</Text>
    <View style={{flexDirection:'row',gap:7,marginBottom:10}}>{(['small','wide','featured'] as const).map(v=><Pressable key={v} onPress={()=>setBlockSize(v)} style={{backgroundColor:blockSize===v?pink:'#F1ECE5',padding:9,borderRadius:9}}><Text style={{color:blockSize===v?'#fff':'#333'}}>{v==='small'?'Petit':v==='wide'?'Large':'Vedette'}</Text></Pressable>)}</View>
    <Text style={{color:theme.foreground,fontWeight:'700',marginBottom:7}}>Couleur</Text>
    <View style={{flexDirection:'row',gap:9}}>{(Object.keys(tones) as DreamBlock['tone'][]).map(t=><Pressable key={t} accessibilityLabel={t} onPress={()=>setBlockTone(t)} style={{width:35,height:35,borderRadius:11,backgroundColor:tones[t],borderWidth:blockTone===t?2:0,borderColor:pink}}/>)}</View>
    <Action label="Enregistrer le bloc" onPress={saveBlock}/>
    {editingBlock?<Action secondary label="Supprimer ce bloc" onPress={()=>{patch(dream.id,{blocks:blocks.filter(b=>b.id!==editingBlock)});setPicker(false);setEditingBlock(null);}}/>:null}
   </View>:null}
   {editing && !historical && !picker ? <Action label="+ Ajouter un bloc" onPress={()=>{setBlockKind('text');setEditingBlock(null);setPicker(true);}}/>:null}
   {!historical ? <Action label="Faire germer ce rêve" onPress={()=>confirm('Faire germer','Ton rêve deviendra public. Tu pourras toujours retrouver tes inspirations dans son histoire.',()=>{patch(dream.id,{visibility:'public'});advance(dream.id);})}/> : null}
  </> : null}
  {phase==='Initiation' ? <>
   <DreamPhaseSection title="Préparer mon rêve" subtitle="Donne une date à ce rêve et rassemble les ressources nécessaires.">
    {!resourceEditable ? <Text style={{color:theme.muted,marginBottom:12}}>Date cible : {dream.goalDate||'Non définie'}</Text> : <Field label="Date cible" value={dream.goalDate||''} onChange={v=>patch(dream.id,{goalDate:v})} placeholder="AAAA-MM-JJ"/>}
    <View style={{height:7,backgroundColor:theme.dark?'#35412C':'#EFEEC9',borderRadius:6,marginBottom:8}}><View style={{height:7,width:((resources.length?resources.filter(r=>r.confirmed).length/resources.length*100:0)+'%') as any,backgroundColor:'#A1BA44',borderRadius:6}}/></View>
    <Text style={{color:theme.muted,fontSize:12,marginBottom:16}}>{resources.filter(r=>r.confirmed).length} / {resources.length} ressources confirmées</Text>
    </DreamPhaseSection>
   <DreamPhaseSection title="Mes ressources" subtitle="Personnes, matériel et financement à réunir.">
   {(['person','practical','financial'] as const).map(category=><View key={category} style={{marginBottom:17}}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground,marginBottom:9}}>{category==='person'?'Talents':category==='practical'?'Autres ressources':'Financement'}</Text>
      {category === 'person' ? (
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:8}}>
          {resources.filter(r=>r.category==='person').map(r=><DreamTalentSquare key={r.id} resource={r} size={100}
            onToggle={resourceEditable ? ()=>checkResource(r) : undefined}
            onRemove={resourceEditable ? ()=>setResources(dream.id,resources.filter(x=>x.id!==r.id)) : undefined}
          />)}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 8 }}>
          {resources.filter(r=>r.category===category).map(r=>
            <View key={r.id} style={{
              width: 100, minHeight: 108, borderRadius: 10,
              backgroundColor: theme.dark ? '#28343A' : '#EAF0F2',
              borderWidth: 1, borderColor: theme.dark ? '#3C515C' : '#DCE5E9',
              justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <Pressable disabled={!resourceEditable} onPress={()=>checkResource(r)}
                accessibilityRole="button" accessibilityLabel={r.title + ', ' + (r.confirmed?'trouvé':'à trouver')}
                style={{ paddingHorizontal: 5, paddingVertical: 10, flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
                <Ionicons
                  name={r.confirmed ? 'checkmark-circle-outline' : category === 'financial' ? 'wallet-outline' : 'cube-outline'}
                  size={23} color={r.confirmed ? '#43875B' : '#577E93'}
                />
                <Text numberOfLines={2} style={{
                  color:theme.foreground, fontSize: 11, lineHeight: 14,
                  fontWeight:'600', textAlign:'center',
                }}>{r.title}</Text>
                {r.amount ? <Text style={{ fontSize: 10, color: '#577E93' }}>{r.amount.toLocaleString('fr-FR')} €</Text> : null}
                <Text style={{ fontSize: 9, color: r.confirmed ? '#43875B' : theme.muted }}>{r.confirmed?'Trouvé':'À trouver'}</Text>
              </Pressable>
              {resourceEditable ? (
                <Pressable onPress={()=>setResources(dream.id,resources.filter(x=>x.id!==r.id))}
                  accessibilityRole="button" accessibilityLabel={'Retirer ' + r.title}
                  style={{ position:'absolute',right:1,top:1,padding:5 }}>
                  <Ionicons name="close-outline" size={14} color={theme.muted}/>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      )}
      {category==='person' ? <Pressable onPress={()=>router.push('/discover?filter=Talents')}>
       <Text style={{color:pink,fontSize:12,marginTop:5}}>Trouver des talents sur JenLow ↗</Text>
     </Pressable> : category==='practical' ?
     <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://jenlow-tools.patatas-bravas.chatgpt.site/')}>
       <Text style={{color:'#387D9F',fontSize:12,marginTop:6}}>Trouver des ressources sur JenLow Tools ↗</Text>
     </Pressable> : null}
    </View>)}
    </DreamPhaseSection>
   {resourceEditable ? <DreamPhaseSection title="Ajouter un besoin">
    <View style={{flexDirection:'row',gap:7,marginBottom:12}}>{(['person','practical','financial'] as const).map(k=><Pressable key={k} onPress={()=>setResourceCategory(k)} style={{padding:9,backgroundColor:resourceCategory===k?pink:'#F1ECE5',borderRadius:9}}><Text style={{color:resourceCategory===k?'#fff':'#333',fontSize:12}}>{k==='person'?'Personne':k==='practical'?'Matériel / autre':'Financier'}</Text></Pressable>)}</View>
    <Field label="Ressource nécessaire" value={resourceTitle} onChange={setResourceTitle} placeholder="De quoi as-tu besoin ?"/>
    {resourceCategory==='financial'?<Field label="Montant estimé en € (facultatif)" value={resourceAmount} onChange={setResourceAmount} placeholder="Ex. 300"/>:null}
    {blocks.length ? <><Text style={{fontSize:12,color:theme.muted,marginBottom:7}}>Lier une inspiration (facultatif)</Text><ScrollView horizontal style={{marginBottom:10}}>{blocks.map(b=><Pressable key={b.id} onPress={()=>setResourceLink(resourceLink===b.id?'':b.id)} style={{padding:9,marginRight:7,backgroundColor:resourceLink===b.id?'#FBD8E9':'#F1ECE5',borderRadius:9}}><Text style={{fontSize:11,color:theme.foreground}} numberOfLines={1}>{b.title||b.content.slice(0,24)||'Image'}</Text></Pressable>)}</ScrollView></>:null}
    <Action secondary label="+ Ajouter cette ressource" onPress={addResource}/>
    {!historical ? <Action label={ready?'Faire grandir cette plante':'Préparatifs en cours'} onPress={()=>{if(!ready){Alert.alert('Encore un peu','Définis la date et confirme les ressources nécessaires.');return;}confirmGrowth();}}/> : null}</DreamPhaseSection> : null}
  </> : null}
  {phase==='Croissance' ? <>
   <DreamPhaseSection title="Mes habitudes" subtitle="Petits pas, grands changements.">
   <Pressable onPress={()=>router.push({pathname:'/chat/[id]',params:{id:'dream-'+dream.id}})} style={{padding:14,borderRadius:12,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,flexDirection:'row',alignItems:'center',gap:10,marginBottom:18}}><Ionicons name="chatbubbles-outline" size={20} color="#27845B"/><Text style={{color:theme.foreground,fontWeight:'600',fontSize:13}}>Conversation de ce rêve</Text></Pressable>
   
   {habits.map(h=><View key={h.id} style={{padding:14,backgroundColor:theme.surface,borderRadius:12,borderWidth:1,borderColor:theme.border,marginBottom:10}}>
    <Text style={{color:theme.foreground,fontWeight:'700',marginBottom:8}}>{h.title} · {h.frequency==='daily'?'Chaque jour':'Chaque semaine'}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:4}}>{Array.from({length: (()=>{const from=new Date(dream.growthStartedAt||dream.createdAt);const until=new Date(dream.goalDate||day());const days=Math.max(1,Math.ceil((until.getTime()-from.getTime())/86400000)+1);return Math.min(2000,h.frequency==='daily'?days:Math.ceil(days/7));})()},(_,i)=>{
     const d=new Date(dream.growthStartedAt||dream.createdAt);d.setDate(d.getDate()+i*(h.frequency==='daily'?1:7));const key=d.toISOString().slice(0,10);const done=h.completed.includes(key);
     const future = key > day();
     return <Pressable disabled={future || historical} accessibilityLabel={'Période '+key} key={i} onPress={()=>setHabits(dream.id,habits.map(x=>x.id===h.id?{...x,completed:done?x.completed.filter(z=>z!==key):[...x.completed,key]}:x))} style={{width:20,height:20,backgroundColor:done?'#6A996F':future?'#F2F2EF':'#E5E7DE',borderRadius:4,justifyContent:'center',alignItems:'center'}}>{done?<Ionicons name="checkmark" size={12} color="#fff"/>:null}</Pressable>;
    })}</View>
   </View>)}
   {!historical ? <><Field label="Nouvelle habitude" value={habitTitle} onChange={setHabitTitle} placeholder="Ex. Répéter 20 minutes"/>
   <View style={{flexDirection:'row',gap:8}}>{(['daily','weekly'] as const).map(f=><Pressable key={f} onPress={()=>setFrequency(f)} style={{padding:10,backgroundColor:frequency===f?'#DDEBD9':'#F1ECE5',borderRadius:8}}><Text style={{color:theme.foreground}}>{f==='daily'?'Quotidienne':'Hebdomadaire'}</Text></Pressable>)}</View>
   <Action secondary label="+ Ajouter l’habitude" onPress={()=>{if(!habitTitle.trim())return;setHabits(dream.id,[...habits,{id:uid(),title:habitTitle.trim(),frequency,completed:[]}]);setHabitTitle('');}}/>
   <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground,marginTop:33,paddingTop:20,borderTopWidth:1,borderColor:theme.border,marginBottom:16}}>Étapes marquantes</Text>
   {(dream.milestones||[]).map(m=><Text key={m.id} style={{padding:12,marginBottom:6,backgroundColor:theme.surface,borderRadius:10,color:theme.foreground}}>★ {m.title}  ·  {m.date}</Text>)}
   <Field label="Nouvelle étape" value={milestone} onChange={setMilestone}/>
   <Action secondary label="+ Conserver ce moment" onPress={()=>{if(milestone.trim())patch(dream.id,{milestones:[...(dream.milestones||[]),{id:uid(),title:milestone.trim(),date:day()}]});setMilestone('');}}/>
   <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground,marginTop:33,paddingTop:20,borderTopWidth:1,borderColor:theme.border,marginBottom:16}}>Mon journal</Text>
   {(dream.thoughts||[]).map(t=><Text key={t.id} style={{fontFamily:HANDWRITING_FAMILY,fontSize:23,color:theme.foreground,padding:12,backgroundColor:theme.surface,marginBottom:7,borderRadius:10}}>{t.text}</Text>)}
   <Field label="Une pensée à garder" value={thought} onChange={setThought} multiline/>
   <Action secondary label="+ Ajouter ma pensée" onPress={()=>{if(thought.trim())patch(dream.id,{thoughts:[...(dream.thoughts||[]),{id:uid(),text:thought.trim(),date:day()}]});setThought('');}}/>
   <Action label="Admirer les fleurs de cette plante" onPress={()=>router.push({pathname:'/my-dream/flower/[id]',params:{id:dream.id}})}/></> : null}
   </DreamPhaseSection>
  </> : null}
  {phase==='Témoignage' ? <>
    <DreamPhaseSection title="Au commencement">
      <Text style={{fontSize:22,fontFamily:HANDWRITING_FAMILY,color:theme.foreground,lineHeight:32,marginBottom:14}}>{dream.summary}</Text>
      {dream.image?<Image source={{uri:dream.image}} resizeMode="cover" style={{width:'100%',height:190,borderRadius:12,marginBottom:8}}/>:null}
    </DreamPhaseSection>
    <DreamPhaseSection title="Et aujourd'hui" subtitle="Le résultat de ce qui a été semé.">
      <Text style={{color:theme.foreground,fontSize:16,lineHeight:26,marginBottom:14}}>{dream.testimony?.comment}</Text>
      {(dream.testimony?.mediaItems||[]).map((m,i)=><Pressable key={i} onPress={()=>void Linking.openURL(m.uri)} style={{backgroundColor:theme.surface,borderRadius:12,padding:13,marginTop:9,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:theme.border}}>
        {m.kind==='photo'?<Image source={{uri:m.uri}} style={{width:64,height:64,borderRadius:8}}/>:<Ionicons name={m.kind==='document'?'document-text-outline':m.kind==='audio'?'musical-notes':'videocam-outline'} size={28} color={theme.foreground}/>}
        <Text style={{color:theme.foreground,flex:1,fontSize:12}}>{m.name}</Text><Ionicons name="open-outline" size={17} color={theme.muted}/>
      </Pressable>)}
    </DreamPhaseSection>
    {(dream.milestones||[]).length>0?<DreamPhaseSection title="Le chemin parcouru">
      {(dream.milestones||[]).map(m=><View key={m.id} style={{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:9}}><Ionicons name="checkmark-circle-outline" size={18} color="#27845B"/><Text style={{color:theme.foreground,fontSize:13}}>{m.title}</Text></View>)}
    </DreamPhaseSection>:null}
  </> : null}
 {(!historical && phase !== 'Rêve') ? <Pressable
    onPress={()=>confirm('Arracher ' + ('cette plante') + ' ?', 'Cette action supprimera définitivement ce rêve et ses données enregistrées sur cet appareil.', ()=>{remove(dream.id);router.replace('/my-space');})}
    accessibilityRole="button" style={{alignItems:'center',marginTop:26,padding:15}}>
      <Text style={{color:'#B24C59',fontSize:12}}>{'Arracher cette plante'}</Text>
   </Pressable> : null}
 </ScrollView>;
}
