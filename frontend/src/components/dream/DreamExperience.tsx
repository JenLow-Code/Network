import React, { useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry, DreamBlock, DreamResource, DreamHabit } from '@/domain/dreamWorkspace';
import { PHASE_LABELS } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { pickDreamImage } from '@/lib/pickDreamImage';

const pink = '#D71D77';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const day = () => new Date().toISOString().slice(0, 10);
const tones: Record<DreamBlock['tone'], string> = { neutral: '#F1ECE5', pink: '#FCE4EF', sage: '#E3EEDB', sand: '#F4DEC7', lavender: '#E9E1F4' };
const forms: DreamBlock['kind'][] = ['text', 'quote', 'callout', 'image', 'audio', 'video', 'document', 'link', 'accordion', 'collection'];
const formLabels = ['Texte', 'Citation', 'Encadré', 'Image', 'Musique', 'Vidéo', 'Document', 'Lien', 'Accordéon', 'Collection'];
function Action({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
 return <Pressable onPress={onPress} style={{ backgroundColor: secondary ? '#F0EBE6' : pink, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 8 }}><Text style={{ color: secondary ? '#262326' : '#fff', fontWeight: '700', fontSize: 13 }}>{label}</Text></Pressable>;
}
function Field({ label, value, onChange, placeholder, multiline = false }: {label:string;value:string;onChange:(v:string)=>void;placeholder?:string;multiline?:boolean}) {
 return <View style={{ marginBottom: 12 }}><Text style={{ color: '#555', fontWeight: '700', fontSize: 12, marginBottom: 6 }}>{label}</Text><TextInput multiline={multiline} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#999" style={{ backgroundColor: '#F4F0EB', borderRadius: 11, padding: 12, fontSize: 14, color: '#222', minHeight: multiline ? 68 : 42, textAlignVertical: 'top' }} /></View>;
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
export default function DreamExperience({ dream, viewPhase, onBack }: {dream:DreamEntry; viewPhase?: DreamEntry['phase']; onBack?: () => void}) {
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
 const addResource=()=>{if(!resourceTitle.trim())return;const amount=resourceCategory==='financial'?Number(resourceAmount.replace(',','.')):undefined;setResources(dream.id,[...resources,{id:uid(),title:resourceTitle.trim(),category:resourceCategory,confirmed:false,linkedBlockId:resourceLink||undefined,amount:amount&&Number.isFinite(amount)&&amount>0?amount:undefined}]);setResourceTitle('');setResourceAmount('');setResourceLink('');};
 const confirmGrowth = () => confirm('Tout est réuni !', 'Ta date est fixée et toutes les ressources sont confirmées. Passer à la Croissance créera aussi la conversation de ce rêve sur cet appareil.', () => transitionToGrowth(dream.id));
 const checkResource = (item: DreamResource) => {
  const updated = resources.map(x => x.id===item.id ? {...x,confirmed:!x.confirmed} : x);
  setResources(dream.id,updated);
  if(!item.confirmed && !!dream.goalDate && /^\d{4}-\d{2}-\d{2}$/.test(dream.goalDate) && updated.every(r=>r.confirmed)) {
   confirm('Tout est prêt !', 'Toutes les ressources sont réunies. Commencer la croissance ? Une conversation dédiée sera créée sur cet appareil.', () => transitionToGrowth(dream.id));
  }
 };
 const ready = !!dream.goalDate && /^\d{4}-\d{2}-\d{2}$/.test(dream.goalDate) && !Number.isNaN(Date.parse(dream.goalDate)) && resources.every(r=>r.confirmed);
 const phase = viewPhase || dream.phase;
 const historical = phase !== dream.phase;
 return <ScrollView style={{flex:1}} contentContainerStyle={{ paddingHorizontal:16,paddingTop:8,paddingBottom:45,maxWidth:760,width:'100%',alignSelf:'center' }}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:13}}>
   <Pressable onPress={onBack || (()=>router.replace('/my-space'))}><Ionicons name="chevron-back" size={25} color={theme.foreground}/></Pressable>
   <Text style={{fontSize:12,color:theme.muted}}>{PHASE_LABELS[phase]}</Text>
   {phase==='Rêve' && !historical ? <Pressable onPress={()=>setEditing(!editing)}><Text style={{color:pink,fontWeight:'700'}}>{editing?'Terminer':'Composer'}</Text></Pressable> : <Ionicons name="ellipsis-horizontal" size={22} color={theme.foreground}/>}
  </View>
  <Text style={{fontSize:30,fontWeight:'800',color:theme.foreground,marginBottom:6}}>{dream.title}</Text>
  {phase==='Rêve' ? <>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginVertical:10}}>
    <Text style={{color:theme.muted,fontSize:12}}>Mon espace d'inspiration</Text>
    <Pressable disabled={historical} onPress={()=>patch(dream.id,{visibility:dream.visibility==='public'?'private':'public'})} style={{flexDirection:'row',alignItems:'center',gap:5}}>
     <Ionicons name={dream.visibility==='public'?'globe-outline':'lock-closed-outline'} size={16} color={pink}/>
     <Text style={{color:pink,fontSize:12}}>{dream.visibility==='public'?'Public':'Privé'}</Text>
    </Pressable>
   </View>
   {dream.image ? <Image source={{uri:dream.image}} style={{width:'100%',height:190,borderRadius:13,marginBottom:12}}/>:null}
   {editing && !historical ? <Action secondary label="Changer l'image principale" onPress={()=>pickDreamImage(uri=>patch(dream.id,{image:uri}),msg=>Alert.alert('Image',msg))}/> : null}
   {editing && !historical ? <Field label="Mon rêve, en quelques mots" value={dream.summary} onChange={v=>patch(dream.id,{summary:v})} multiline/> : dream.summary ? <Text style={{color:theme.foreground,fontSize:15,marginVertical:9,lineHeight:22}}>{dream.summary}</Text> : null}
   <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginTop:12}}>
    {blocks.map(b=><DreamBlockCard key={b.id} block={b} editable={editing} onEdit={()=>editBlock(b)} onMove={step=>moveBlock(b.id,step)}/>)}
   </View>
   {editing && !historical && picker ? <View style={{backgroundColor:theme.surface,padding:12,borderRadius:14,marginTop:8,borderWidth:1,borderColor:theme.border}}>
    <Text style={{fontSize:17,fontWeight:'800',color:theme.foreground,marginBottom:12}}>Personnaliser un bloc</Text>
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
    {dream.image ? <Image source={{uri:dream.image}} style={{width:'100%',height:105,borderRadius:12,marginVertical:10}}/>:null}
    <Text style={{color:theme.muted,fontSize:12,marginBottom:10}}>{dream.summary}</Text>
    {historical ? <Text style={{color:theme.muted,marginBottom:12}}>Date cible : {dream.goalDate||'Non définie'}</Text> : <Field label="Date cible" value={dream.goalDate||''} onChange={v=>patch(dream.id,{goalDate:v})} placeholder="AAAA-MM-JJ"/>}
    <View style={{height:7,backgroundColor:'#ECEDE6',borderRadius:6,marginBottom:8}}><View style={{height:7,width:((resources.length?resources.filter(r=>r.confirmed).length/resources.length*100:0)+'%') as any,backgroundColor:'#98AE51',borderRadius:6}}/></View>
    <Text style={{color:theme.muted,fontSize:12,marginBottom:16}}>{resources.filter(r=>r.confirmed).length} / {resources.length} ressources confirmées</Text>
    {(['person','practical','financial'] as const).map(category=><View key={category} style={{marginBottom:17}}>
      <Text style={{fontSize:17,fontWeight:'800',color:theme.foreground,marginBottom:9}}>{category==='person'?'Personnes':category==='practical'?'Autres ressources':'Financement'}</Text>
      {resources.filter(r=>r.category===category).map(r=><View key={r.id} style={{backgroundColor:theme.surface,borderRadius:11,padding:12,marginBottom:7,borderWidth:1,borderColor:theme.border}}>
       <Pressable disabled={historical} onPress={()=>checkResource(r)} style={{flexDirection:'row',gap:10,alignItems:'center'}}><Ionicons name={r.confirmed?'checkmark-circle':'ellipse-outline'} color={r.confirmed?'#5B965C':pink} size={23}/><Text style={{color:theme.foreground,flex:1}}>{r.title}</Text><Text style={{fontSize:11,color:theme.muted}}>{r.confirmed?'Trouvé':'À trouver'}</Text></Pressable>
       {r.amount ? <Text style={{marginTop:6,fontSize:12,color:theme.muted}}>Montant prévu : {r.amount.toLocaleString('fr-FR')} €</Text> : null}
       <Pressable disabled={historical} onPress={()=>setResources(dream.id,resources.filter(x=>x.id!==r.id))} style={{alignSelf:'flex-end',paddingTop:5}}><Text style={{fontSize:11,color:theme.muted}}>Retirer</Text></Pressable>
       {r.linkedBlockId ? <Text style={{marginTop:7,fontSize:11,color:pink}}>↳ Lié à « {blocks.find(b=>b.id===r.linkedBlockId)?.title||blocks.find(b=>b.id===r.linkedBlockId)?.content.slice(0,30)||'inspiration'} »</Text> : null}
      </View>)}
      {category==='person' ? <Pressable onPress={()=>router.push('/discover?filter=Talents')}><Text style={{color:pink,fontSize:12,marginTop:5}}>Trouver des talents sur JenLow ↗</Text></Pressable>:null}
    </View>)}
    {!historical ? <><Text style={{fontWeight:'800',color:theme.foreground,marginBottom:7}}>Ajouter un besoin</Text>
    <View style={{flexDirection:'row',gap:7,marginBottom:12}}>{(['person','practical','financial'] as const).map(k=><Pressable key={k} onPress={()=>setResourceCategory(k)} style={{padding:9,backgroundColor:resourceCategory===k?pink:'#F1ECE5',borderRadius:9}}><Text style={{color:resourceCategory===k?'#fff':'#333',fontSize:12}}>{k==='person'?'Personne':k==='practical'?'Matériel / autre':'Financier'}</Text></Pressable>)}</View>
    <Field label="Ressource nécessaire" value={resourceTitle} onChange={setResourceTitle} placeholder="De quoi as-tu besoin ?"/>
    {resourceCategory==='financial'?<Field label="Montant estimé en € (facultatif)" value={resourceAmount} onChange={setResourceAmount} placeholder="Ex. 300"/>:null}
    {blocks.length ? <><Text style={{fontSize:12,color:theme.muted,marginBottom:7}}>Lier une inspiration (facultatif)</Text><ScrollView horizontal style={{marginBottom:10}}>{blocks.map(b=><Pressable key={b.id} onPress={()=>setResourceLink(resourceLink===b.id?'':b.id)} style={{padding:9,marginRight:7,backgroundColor:resourceLink===b.id?'#FBD8E9':'#F1ECE5',borderRadius:9}}><Text style={{fontSize:11,color:'#333'}} numberOfLines={1}>{b.title||b.content.slice(0,24)||'Image'}</Text></Pressable>)}</ScrollView></>:null}
    <Action secondary label="+ Ajouter cette ressource" onPress={addResource}/>
    <Action label={ready?'Confirmer et commencer la croissance':'Préparatifs en cours'} onPress={()=>{if(!ready){Alert.alert('Encore un peu','Définis la date et confirme les ressources nécessaires.');return;}confirmGrowth();}}/></> : null}
  </> : null}
  {phase==='Croissance' ? <>
   <Text style={{color:theme.muted,marginBottom:14}}>Petits pas, grands changements.</Text>
   <Pressable onPress={()=>router.push({pathname:'/chat/[id]',params:{id:'dream-'+dream.id}})} style={{padding:12,borderRadius:12,backgroundColor:'#E8EEE4',flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}}><Ionicons name="chatbubbles-outline" size={21} color="#3A6743"/><Text style={{color:'#3A6743',fontWeight:'700'}}>Conversation de ce rêve</Text></Pressable>
   <Text style={{fontSize:21,fontWeight:'800',color:theme.foreground,marginBottom:10}}>Mes habitudes</Text>
   {habits.map(h=><View key={h.id} style={{padding:12,backgroundColor:theme.surface,borderRadius:12,marginBottom:10}}>
    <Text style={{color:theme.foreground,fontWeight:'700',marginBottom:8}}>{h.title} · {h.frequency==='daily'?'Chaque jour':'Chaque semaine'}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:4}}>{Array.from({length: (()=>{const from=new Date(dream.growthStartedAt||dream.createdAt);const until=new Date(dream.goalDate||day());const days=Math.max(1,Math.ceil((until.getTime()-from.getTime())/86400000)+1);return Math.min(2000,h.frequency==='daily'?days:Math.ceil(days/7));})()},(_,i)=>{
     const d=new Date(dream.growthStartedAt||dream.createdAt);d.setDate(d.getDate()+i*(h.frequency==='daily'?1:7));const key=d.toISOString().slice(0,10);const done=h.completed.includes(key);
     const future = key > day();
     return <Pressable disabled={future || historical} accessibilityLabel={'Période '+key} key={i} onPress={()=>setHabits(dream.id,habits.map(x=>x.id===h.id?{...x,completed:done?x.completed.filter(z=>z!==key):[...x.completed,key]}:x))} style={{width:20,height:20,backgroundColor:done?'#6A996F':future?'#F2F2EF':'#E5E7DE',borderRadius:4,justifyContent:'center',alignItems:'center'}}>{done?<Ionicons name="checkmark" size={12} color="#fff"/>:null}</Pressable>;
    })}</View>
   </View>)}
   {!historical ? <><Field label="Nouvelle habitude" value={habitTitle} onChange={setHabitTitle} placeholder="Ex. Répéter 20 minutes"/>
   <View style={{flexDirection:'row',gap:8}}>{(['daily','weekly'] as const).map(f=><Pressable key={f} onPress={()=>setFrequency(f)} style={{padding:10,backgroundColor:frequency===f?'#DDEBD9':'#F1ECE5',borderRadius:8}}><Text style={{color:'#333'}}>{f==='daily'?'Quotidienne':'Hebdomadaire'}</Text></Pressable>)}</View>
   <Action secondary label="+ Ajouter l’habitude" onPress={()=>{if(!habitTitle.trim())return;setHabits(dream.id,[...habits,{id:uid(),title:habitTitle.trim(),frequency,completed:[]}]);setHabitTitle('');}}/>
   <Text style={{fontSize:21,fontWeight:'800',color:theme.foreground,marginTop:22,marginBottom:10}}>Étapes marquantes</Text>
   {(dream.milestones||[]).map(m=><Text key={m.id} style={{padding:12,marginBottom:6,backgroundColor:theme.surface,borderRadius:10,color:theme.foreground}}>★ {m.title}  ·  {m.date}</Text>)}
   <Field label="Nouvelle étape" value={milestone} onChange={setMilestone}/>
   <Action secondary label="+ Conserver ce moment" onPress={()=>{if(milestone.trim())patch(dream.id,{milestones:[...(dream.milestones||[]),{id:uid(),title:milestone.trim(),date:day()}]});setMilestone('');}}/>
   <Text style={{fontSize:21,fontWeight:'800',color:theme.foreground,marginTop:22,marginBottom:10}}>Mes pensées</Text>
   {(dream.thoughts||[]).map(t=><Text key={t.id} style={{fontFamily:HANDWRITING_FAMILY,fontSize:23,color:theme.foreground,padding:12,backgroundColor:theme.surface,marginBottom:7,borderRadius:10}}>{t.text}</Text>)}
   <Field label="Une pensée à garder" value={thought} onChange={setThought} multiline/>
   <Action secondary label="+ Ajouter ma pensée" onPress={()=>{if(thought.trim())patch(dream.id,{thoughts:[...(dream.thoughts||[]),{id:uid(),text:thought.trim(),date:day()}]});setThought('');}}/>
   <Action label="Préparer ma floraison" onPress={()=>router.push({pathname:'/my-dream/flower/[id]',params:{id:dream.id}})}/></> : null}
  </> : null}
  {phase==='Témoignage' ? <>
   <View style={{height:5,backgroundColor:pink,borderRadius:3,marginVertical:12}}/>
   <Text style={{fontWeight:'800',color:pink,fontSize:12,letterSpacing:2}}>LÀ OÙ TOUT A COMMENCÉ</Text>
   <Text style={{fontSize:18,fontFamily:HANDWRITING_FAMILY,color:theme.foreground,marginTop:12}}>{dream.summary}</Text>
   {dream.image?<Image source={{uri:dream.image}} style={{width:'100%',height:155,borderRadius:11,marginVertical:12}}/>:null}
   <Text style={{fontWeight:'800',color:pink,fontSize:12,letterSpacing:2,marginTop:24}}>ET AUJOURD’HUI</Text>
   <Text style={{fontWeight:'800',fontSize:25,color:theme.foreground,marginVertical:12}}>{dream.title}</Text>
   <Text style={{color:theme.foreground,fontSize:16,lineHeight:24}}>{dream.testimony?.comment}</Text>
   {(dream.testimony?.mediaItems||[]).map((m,i)=><Pressable key={i} onPress={()=>void Linking.openURL(m.uri)} style={{backgroundColor:theme.surface,borderRadius:12,padding:13,marginTop:12,flexDirection:'row',alignItems:'center',gap:12}}>{m.kind==='photo'?<Image source={{uri:m.uri}} style={{width:64,height:64,borderRadius:7}}/>:<Ionicons name={m.kind==='document'?'document-text-outline':m.kind==='audio'?'musical-notes':'videocam-outline'} size={30} color={pink}/>}<Text style={{color:theme.foreground,flex:1}}>{m.name}</Text><Ionicons name="open-outline" size={18} color={pink}/></Pressable>)}
   <Text style={{fontSize:18,fontWeight:'800',color:theme.foreground,marginTop:24}}>Le chemin parcouru</Text>
   {(dream.milestones||[]).map(m=><Text key={m.id} style={{color:theme.foreground,marginTop:10}}>★ {m.title}</Text>)}
  </> : null}
 {!historical ? <Pressable onPress={()=>confirm('Supprimer ce rêve ?', 'Cette suppression effacera ce rêve et ses données locales.', ()=>{remove(dream.id);router.replace('/my-space');})} style={{alignItems:'center',marginTop:35,padding:15}}><Text style={{color:'#B24C59',fontSize:12}}>Supprimer ce rêve</Text></Pressable> : null}
 </ScrollView>;
}
