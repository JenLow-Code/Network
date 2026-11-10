import React, { useState } from 'react';
import { lostFoundNeeds, isNeedFound } from '@/domain/dreamResourceRecovery';
import { api } from '@/lib/api/client';
import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry, DreamBlock, DreamResource, DreamHabit, DreamMilestone } from '@/domain/dreamWorkspace';
import { PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { DreamPhaseHeader, DreamPhaseSection, DreamPhaseButton, DreamPhaseField } from './DreamPhaseLayout';
import { DreamTalentSquare } from './DreamTalentSquare';
import { DreamGoalDatePicker } from './DreamGoalDatePicker';
import { DreamResourceDetailsModal } from './DreamResourceDetailsModal';
import { DREAM_TALENT_CHOICES } from './dreamTalentCatalog';
import { TalentLevelSelector } from '@/components/talent/TalentLevelSelector';
import { habitDayKey, habitKey } from '@/domain/habitProgress';
import { GrowthLogbook } from './GrowthLogbook';
import { canEditGrowthLog } from '@/domain/growthTimeline';

const pink = '#D71D77';
const HABIT_PALETTE = ['#C68FBF','#D7AE62','#80B8BC','#7DBA99','#D78C9F','#A1A0CF','#A9BF78'];
const HABIT_EMOJIS = ['🌱','🙏','🎹','🎸','🎼','📖','🎨','📷','🧘','🏃','💧','✍️','🏡','❤️','☀️','🎯'];
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
export default function DreamExperience({
 dream,viewPhase,onBack,onNavigate,recoveryCategory,onRecoverResource,
}:{
 dream:DreamEntry;
 viewPhase?:DreamEntry['phase'];
 onBack?:()=>void;
 onNavigate?:(phase:DreamPhase)=>void;
 recoveryCategory?:DreamResource['category']|null;
 onRecoverResource?:(category:DreamResource['category'])=>void;
}) {
 const { patch, appendBlock, setResources, setHabits, detachHabit, setGoalAndGrow, advance, remove, addGrowthLog, setGrowthLogPublication } = useDreams();
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
 const [resourceDescription, setResourceDescription] = useState('');
 const [toolsPublicationRequested, setToolsPublicationRequested] = useState(false);
 const [talentChoicesOpen, setTalentChoicesOpen] = useState(false);
 const [resourceLevel,setResourceLevel]=useState('Quelques notions');
 const [selectedResourceId, setSelectedResourceId] = useState<string|null>(null);
 const [resourceAmount, setResourceAmount] = useState('');
 const [resourceCategory, setResourceCategory] = useState<DreamResource['category']>('person');
 const [resourceLink, setResourceLink] = useState('');
 const [resourceDialog,setResourceDialog]=useState(false);
 const [freezeDialog,setFreezeDialog]=useState(false);
 const [goalDateDialog,setGoalDateDialog]=useState(false);
 const [growthDialog,setGrowthDialog]=useState<'habit'|'habits'|'log'|null>(null);
 const [preparationOpen,setPreparationOpen]=useState(false);
 const [recoveryDialog,setRecoveryDialog]=useState(false);
 const [reportLostDialog,setReportLostDialog]=useState(false);
 const [habitTitle, setHabitTitle] = useState('');
 const [habitEmoji,setHabitEmoji]=useState('🌱');
 const [habitColor,setHabitColor]=useState(HABIT_PALETTE[0]);
 const [habitDescription,setHabitDescription]=useState('');
 const [habitUnit,setHabitUnit]=useState('fois');
 const [habitTarget,setHabitTarget]=useState('1');
 const [editingHabitId,setEditingHabitId]=useState<string|null>(null);
 const [frequency, setFrequency] = useState<DreamHabit['frequency']>('daily');
 const [milestone, setMilestone] = useState('');
 const [editingLogId,setEditingLogId]=useState<string|null>(null);

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
 const addResource=()=>{
   if(!resourceTitle.trim())return;
   const catalogTalent=resourceCategory==='person'
     ? DREAM_TALENT_CHOICES.find(x=>x.title===resourceTitle) : undefined;
   if(resourceCategory==='person' && !catalogTalent){
     Alert.alert('Talent requis','Choisis un talent dans la liste proposée.');
     return;
   }
   const amount=resourceCategory==='financial'?Number(resourceAmount.replace(',','.')):undefined;
   if(resourceCategory==='financial' && (!Number.isFinite(amount)||!amount||amount<=0)){
     Alert.alert('Montant requis','Saisis un montant supérieur à zéro.');
     return;
   }
   setResources(dream.id,[...resources,{
     id:uid(),title:resourceTitle.trim(),category:resourceCategory,confirmed:false,
     description:resourceDescription.trim(),
     illustration:catalogTalent?.illustration,
     requiredLevel:resourceCategory==='person'?resourceLevel:undefined,
     linkedBlockId:resourceLink||undefined,
     amount:amount&&Number.isFinite(amount)&&amount>0?amount:undefined,
     toolsPublicationRequested:resourceCategory==='practical'?toolsPublicationRequested:undefined,
   }]);
   setResourceTitle('');setResourceDescription('');setResourceAmount('');setResourceLink('');
   setToolsPublicationRequested(false);setTalentChoicesOpen(false);setResourceDialog(false);
 };
 const checkResource = (resource: DreamResource) => {
   // A person's participation is never locally toggled: only server-confirmed consent.
   if(resource.category === 'person')return;
   setResources(dream.id, resources.map(r =>
     r.id===resource.id?{...r,confirmed:!r.confirmed}:r));
 };
 const phase = viewPhase || dream.phase;
 const historical = phase !== dream.phase;
 const readOnly = historical || dream.phase === 'Témoignage';
 const frozen=!!dream.paused && !!dream.pauseUntil && dream.pauseUntil>=day();
 const growthActive=phase==='Croissance' && !historical && !frozen;
 const recoverPastNeeds = phase==='Initiation' && dream.phase==='Croissance' && !!recoveryCategory;
 const resourceEditable=phase==='Initiation' && !frozen && (!historical || recoverPastNeeds);
 const canEditCategory=(category:DreamResource['category'])=>
   resourceEditable && (!recoverPastNeeds || recoveryCategory===category);
 const lostResources = dream.phase==='Croissance'?lostFoundNeeds(dream):[];
 const missingResources = dream.phase==='Croissance'
   ? resources.filter(resource=>!isNeedFound(resource)) : [];
 const missingCategories = Array.from(new Set(missingResources.map(need=>need.category)));
 const recapExpanded = preparationOpen;
 const categoryNames: Record<DreamResource['category'],string> = {
   person:'Talents',practical:'Ressources',financial:'Financement',
 };

 const publishLog=async(log:DreamMilestone)=>{
   if(!log.shareRequested || !dream.serverDreamId)return;
   try{
     if(log.serverEntryId){
       await api('/api/entries/'+encodeURIComponent(log.serverEntryId),
         {method:'PATCH',auth:'required',body:{body:log.title}});
       setGrowthLogPublication(dream.id,log.id,'published',log.serverEntryId);
       return;
     }
     const response=await api<{id:string}>(
       '/api/dreams/'+encodeURIComponent(dream.serverDreamId)+'/entries',
       {method:'POST',auth:'required',idempotencyKey:'growth-log-'+log.id,
         body:{type:'progress',body:log.title,entryDate:log.date,visibility:'public'}});
     setGrowthLogPublication(dream.id,log.id,'published',response.id);
   }catch{
     setGrowthLogPublication(dream.id,log.id,'failed');
   }
 };
 const openHabitEditor=(habit?:DreamHabit)=>{
   setEditingHabitId(habit?.id||null);
   setHabitTitle(habit?.title||'');
   setHabitDescription(habit?.description||'');
   setHabitTarget(String(habit?.target&&habit.target>0?habit.target:1));
   setHabitUnit(habit?.unit||'fois');
   setFrequency(habit?.frequency||'daily');
   setHabitEmoji(habit?.emoji||'🌱');
   setHabitColor(habit?.color||HABIT_PALETTE[0]);
   setGrowthDialog('habit');
 };
 const saveHabit=()=>{
   if(!habitTitle.trim())return;
   const target=Number(habitTarget.replace(',','.'));
   if(!Number.isFinite(target)||target<=0||target>100000){
     Alert.alert('Mesure invalide','Indique un objectif supérieur à zéro.');return;
   }
   if(!habitUnit.trim()){
     Alert.alert('Unité requise','Choisis une unité de mesure.');return;
   }
   const existing=habits.find(h=>h.id===editingHabitId);
   const entry:DreamHabit={
     id:existing?.id||uid(),
     title:habitTitle.trim().slice(0,120),
     description:habitDescription.trim().slice(0,500),
     frequency,startedAt:existing?.startedAt||habitDayKey(new Date()),
     completed:existing?.completed||[],
     measurements:existing?.measurements,
     target,unit:habitUnit.trim().slice(0,35),
     emoji:habitEmoji,color:habitColor,
   };
   setHabits(dream.id,existing
     ? habits.map(h=>h.id===existing.id?entry:h)
     : [...habits,entry]);
   setEditingHabitId(null);
   setGrowthDialog(null);
 };
 const saveLog=()=>{
   if(!growthActive)return;
   const content=milestone.trim();
   if(!content)return;
   const now=new Date();
   const today=habitDayKey(now);
   const logs=dream.milestones||[];
   const existing=editingLogId
     ?logs.find(log=>log.id===editingLogId)
     :logs.filter(log=>log.date===today).slice(-1)[0];
   if(editingLogId&&!existing){
     Alert.alert('Feuille introuvable','Cette feuille n’est plus disponible.');
     return;
   }
   if(existing&&!canEditGrowthLog(existing,now)){
     Alert.alert('Feuille définitive','Cette feuille ne peut plus être modifiée après 24 heures.');
     return;
   }
   if(existing){
     const updated:DreamMilestone={
       ...existing,title:content,shareRequested:true,
       publicationState:dream.serverDreamId?'pending':existing.publicationState,
     };
     patch(dream.id,{milestones:logs.map(log=>
       log.id===existing.id?updated:log)});
     void publishLog(updated);
   }else{
     const log:DreamMilestone={
       id:uid(),title:content,date:today,createdAt:now.toISOString(),
       shareRequested:true,publicationState:'pending',
     };
     addGrowthLog(dream.id,log);
     void publishLog(log);
   }
   setMilestone('');
   setEditingLogId(null);
   setGrowthDialog(null);
 };
 const freezeAt=(date:string)=>{
   if(historical || (dream.phase!=='Initiation' && dream.phase!=='Croissance') || frozen)return;
   if((dream.pauseCount||0)>=3){
     Alert.alert('Limite atteinte','Ce rêve a déjà été congelé trois fois.');return;
   }
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<=day()||Number.isNaN(Date.parse(date))){
     Alert.alert('Date requise','Sélectionne une date future dans le calendrier.');return;
   }
   patch(dream.id,{paused:true,pauseUntil:date,pauseCount:(dream.pauseCount||0)+1});
   setFreezeDialog(false);
 };
 return <ScrollView style={{flex:1,backgroundColor:theme.background}} contentContainerStyle={{paddingHorizontal:19,paddingTop:10,paddingBottom:65,maxWidth:760,width:'100%',alignSelf:'center'}}>
  <DreamPhaseHeader dream={dream} phase={phase} onBack={onBack || (()=>router.replace('/my-space'))} onNavigate={onNavigate} readOnly={historical&&!recoverPastNeeds}
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
   {recoverPastNeeds?<View style={{padding:12,borderRadius:10,borderWidth:1,
     borderColor:'#D71D77',marginBottom:11,backgroundColor:theme.surface,gap:4}}>
     <Text style={{color:'#D71D77',fontSize:12,fontWeight:'700'}}>Gestion des besoins · {categoryNames[recoveryCategory!]}</Text>
     <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>
       Tu peux modifier cette catégorie pour retrouver une ressource. Les autres éléments de Germination restent verrouillés.
     </Text>
   </View>:null}
   <View style={{ marginTop: 3 }}>
    {dream.phase==='Initiation' && dream.paused ? <View style={{
      padding:14,backgroundColor:theme.dark?'#433D31':'#F5EAD3',borderRadius:11,marginBottom:14,gap:8,
    }}>
      <Text style={{color:theme.foreground,fontWeight:'700'}}>
        {frozen?'Germination congelée jusqu’au '+dream.pauseUntil:'La pause est terminée'}
      </Text>
      <Pressable onPress={()=>patch(dream.id,{paused:false,pauseUntil:undefined})} accessibilityRole="button">
        <Text style={{color:'#9B772E',fontWeight:'700',fontSize:12}}>Reprendre cette germination</Text>
      </Pressable>
    </View> : null}
   {(['person','practical','financial'] as const).filter(category=>resources.some(r=>r.category===category)).map(category=><View key={category} style={{marginBottom:17}}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground,marginBottom:9}}>{category==='person'?'Talents':category==='practical'?'Autres ressources':'Financement'}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:8}}>
        {category==='person'
          ? resources.filter(r=>r.category===category).map(r=>
              <DreamTalentSquare key={r.id} resource={r} size={96}
                onRemove={canEditCategory(category)&&!r.serverNeedId?()=>setResources(dream.id,resources.filter(x=>x.id!==r.id)):undefined}
                onEditRequest={canEditCategory(category)?()=>setSelectedResourceId(r.id):undefined}/>)
          : resources.filter(r=>r.category===category).map(r=>
              <View key={r.id} style={{
                width:96,height:96,borderRadius:10,overflow:'hidden',
                position:'relative',borderWidth:1.6,
                borderColor:r.confirmed?'#318656':'#D71D77',
                backgroundColor:r.confirmed?(theme.dark?'#254635':'#E3F3E7')
                  :(theme.dark?'#282F35':'#F9F6F2'),
              }}>
                <Pressable onPress={()=>setSelectedResourceId(r.id)}
                  accessibilityRole="button" accessibilityLabel={r.title+', consulter et modifier les détails'}
                  style={{flex:1,width:'100%',justifyContent:'center',alignItems:'center',
                    gap:5,paddingHorizontal:6,paddingVertical:9}}>
                  {category==='financial' ? (
                    <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1}
                      style={{fontSize:18,fontWeight:'800',color:r.confirmed?'#27845B':theme.foreground}}>
                      {typeof r.amount==='number' && r.amount>0
                        ? r.amount.toLocaleString('fr-FR')+' €' : 'Montant ?'}
                    </Text>
                  ) : (
                    <Ionicons name={r.confirmed?'checkmark-circle-outline':'cube-outline'}
                      size={22} color={r.confirmed?'#318656':'#387D9F'}/>
                  )}
                  <Text numberOfLines={2} style={{
                    color:theme.foreground,fontSize:11,lineHeight:15,
                    fontWeight:'700',textAlign:'center',
                  }}>{r.title}</Text>
                </Pressable>
                {canEditCategory(category)?<Pressable
                  onPress={()=>setResources(dream.id,resources.filter(x=>x.id!==r.id))}
                  accessibilityLabel={'Retirer '+r.title}
                  style={{position:'absolute',right:1,top:1,padding:5}}>
                  <Ionicons name="close-outline" size={14} color={theme.muted}/>
                </Pressable>:null}
              </View>)}
        {canEditCategory(category)?<Pressable accessibilityRole="button"
          accessibilityLabel={category==='person'?'Ajouter un talent':category==='financial'?'Ajouter un financement':'Ajouter une ressource'}
          onPress={()=>{setResourceCategory(category);setResourceDialog(true);}}
          style={{width:96,height:96,borderRadius:10,borderWidth:1.5,borderStyle:'dashed',
            borderColor:category==='person'?'#D71D77':category==='financial'?'#A1BA44':'#387D9F',
            backgroundColor:theme.dark?'#292B2E':'#FDFBF8',
            alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="add" size={26} color={category==='person'?'#D71D77':category==='financial'?'#86A73B':'#387D9F'}/>
        </Pressable>:null}
      </View>
      {category==='person' ? <Pressable onPress={()=>router.push('/discover?filter=Talents')}>
       <Text style={{color:pink,fontSize:12,marginTop:5}}>Trouver des talents sur JenLow ↗</Text>
     </Pressable> : category==='practical' ?
     <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://jenlow-tools.patatas-bravas.chatgpt.site/')}>
       <Text style={{color:'#387D9F',fontSize:12,marginTop:6}}>Trouver des ressources sur JenLow Tools ↗</Text>
     </Pressable> : null}
    </View>)}
    {resources.length===0 && resourceEditable && !recoverPastNeeds ? (
      <View style={{gap:9,paddingBottom:16}}>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:20}}>
          Ajoute seulement les talents, le matériel ou le financement dont tu as besoin.
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un premier besoin"
          onPress={()=>{setResourceCategory('person');setResourceDialog(true);}}
          style={{width:96,height:96,borderWidth:1.5,borderStyle:'dashed',
            borderColor:theme.border,borderRadius:11,alignItems:'center',
            justifyContent:'center',backgroundColor:theme.surface}}>
          <Ionicons name="add" size={25} color={theme.foreground}/>
        </Pressable>
      </View>
    ):null}
    </View>
   {!historical && phase==='Initiation' ? (
     <View style={{gap:11,marginTop:12,marginBottom:21}}>
       {resourceEditable ? <>
         <Pressable accessibilityRole="button" onPress={()=>setGoalDateDialog(true)}
           style={{minHeight:48,backgroundColor:'#225D42',borderRadius:11,
             alignItems:'center',justifyContent:'center',paddingHorizontal:16}}>
           <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>Faire pousser</Text>
         </Pressable>
         <Pressable accessibilityRole="button" onPress={()=>{
           if((dream.pauseCount||0)>=3){Alert.alert('Limite atteinte','Cette germination a déjà été congelée trois fois.');return;}
           setFreezeDialog(true);
         }} style={{minHeight:48,borderWidth:1.5,borderColor:'#397F9E',borderRadius:11,
           alignItems:'center',justifyContent:'center',paddingHorizontal:16}}>
           <Text style={{color:'#397F9E',fontSize:13,fontWeight:'700'}}>Geler</Text>
         </Pressable>
         <Pressable accessibilityRole="button" accessibilityLabel="Arracher cette plante"
           onPress={()=>confirm('Arracher cette plante ?',
             'Cette action supprimera définitivement ce rêve et ses données sur cet appareil.',
             ()=>{remove(dream.id);router.replace('/my-space');})}
           style={{minHeight:48,backgroundColor:'#242322',borderRadius:11,
             alignItems:'center',justifyContent:'center',paddingHorizontal:16}}>
           <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>Arracher</Text>
         </Pressable>
       </>:null}
     </View>
   ):null}
  </> : null}
  {phase==='Croissance' ? <>
    <View style={{flexDirection:'row',alignItems:'flex-start',
      justifyContent:'space-between',gap:12,marginTop:0,marginBottom:6,
      paddingHorizontal:3}}>
      {dream.goalDate?<View style={{flex:1,alignItems:'flex-start',
        gap:6,paddingLeft:2,paddingTop:5,minWidth:0}}>
        <Text style={{fontSize:11,letterSpacing:1.3,color:theme.muted,fontWeight:'700'}}>
          OBJECTIF
        </Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <Ionicons name="calendar-outline" size={15} color="#27845B"/>
          <Text style={{fontSize:15,lineHeight:20,color:theme.foreground,
            fontWeight:'700'}}>
            {new Date(dream.goalDate+'T12:00:00').toLocaleDateString('fr-FR',
              {day:'numeric',month:'short',year:'numeric'})}
          </Text>
        </View>
      </View>:<View style={{flex:1}}/>}
      <View style={{alignItems:'flex-end',gap:0,flexShrink:1}}>
      <Pressable accessibilityRole="button"
        accessibilityLabel="Ouvrir mes notes personnelles"
        onPress={()=>router.push({pathname:'/my-dream/notes/[id]',params:{id:dream.id}})}
        style={{flexDirection:'row',alignItems:'center',gap:5,minHeight:35}}>
        <Ionicons name="lock-closed-outline" size={13} color={theme.foreground}/>
        <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
          Notes personnelles
        </Text>
        <Ionicons name="arrow-forward" size={14} color={theme.foreground}/>
      </Pressable>
      <Pressable accessibilityRole="button"
        accessibilityLabel="Ouvrir inspirations et documents"
        onPress={()=>router.push({pathname:'/my-dream/library/[id]',params:{id:dream.id}})}
        style={{flexDirection:'row',alignItems:'center',gap:5,minHeight:35}}>
        <Ionicons name="folder-open-outline" size={14} color={theme.foreground}/>
        <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
          Inspirations / Documents
        </Text>
        <Ionicons name="arrow-forward" size={14} color={theme.foreground}/>
      </Pressable>

        {(resources.length>0||!!dream.goalDate)?(
          <Pressable accessibilityRole="button"
            accessibilityState={{expanded:recapExpanded}}
            accessibilityLabel={recapExpanded
              ?'Réduire le résumé des besoins de Germination'
              :'Développer le résumé des besoins de Germination'}
            onPress={()=>setPreparationOpen(open=>!open)}
            style={{flexDirection:'row',alignItems:'center',gap:6,
              marginTop:5,paddingHorizontal:10,paddingVertical:8,minHeight:36,
              borderRadius:10,backgroundColor:theme.dark?'#432D38':'#FCECF4'}}>
            {missingResources.length?(
              <Ionicons name="warning-outline" size={16} color="#D71D77"/>
            ):(
              <View style={{width:10,height:10,borderRadius:5,
                backgroundColor:'#A1BA44',borderWidth:1,borderColor:'#668C2A'}}/>
            )}
            <Text numberOfLines={1} style={{fontSize:11,fontWeight:'700',
              color:theme.foreground,flexShrink:1}}>
              {missingResources.length
                ?`${missingResources.length} besoin${missingResources.length>1?'s':''} à compléter`
                :'Depuis la Germination'}
            </Text>
            <Ionicons name={recapExpanded?'chevron-up':'chevron-down'}
              color={theme.foreground} size={15}/>
          </Pressable>
        ):null}
      </View>
    </View>
    {(resources.length>0||!!dream.goalDate)&&recapExpanded?(
      <View style={{borderRadius:12,backgroundColor:theme.dark?'#432D38':'#FCECF4',
        overflow:'hidden',marginTop:6,marginBottom:7}}>
        <View style={{paddingHorizontal:15,paddingBottom:14,gap:11,
          paddingTop:12}}>
          {([
            {category:'person',title:'Talents',color:'#D71D77',track:'#F5C5DA'},
            {category:'practical',title:'Ressources',color:'#397F9E',track:'#D2E6ED'},
            {category:'financial',title:'Financement',color:'#A1BA44',track:'#E4ECC4'},
          ] as const).map(item=>{
            const subset=resources.filter(need=>need.category===item.category);
            const unfilled=subset.filter(need=>!isNeedFound(need));
            if(!unfilled.length)return null;
            const foundCount=subset.length-unfilled.length;
            return <Pressable key={item.category} accessibilityRole="button"
              accessibilityLabel={'Gérer '+item.title.toLowerCase()+' manquants'}
              onPress={()=>onRecoverResource?.(item.category)}
              style={{gap:7,paddingVertical:2}}>
              <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',gap:5}}>
                <Text style={{fontSize:12,fontWeight:'700',color:item.color}}>
                  {item.title} ·
                </Text>
                <Text style={{fontSize:12,lineHeight:18,
                  color:theme.foreground,flexShrink:1}}>
                  {unfilled.map(need=>need.title).join(', ')} {item.category==='financial'?'à payer':'à trouver'}
                </Text>
              </View>
              <View style={{height:4,borderRadius:3,overflow:'hidden',
                backgroundColor:theme.dark?theme.border:item.track}}>
                <View style={{height:'100%',width:(foundCount/subset.length*100)+'%',
                  backgroundColor:item.color,borderRadius:3}}/>
              </View>
            </Pressable>;
          })}
          {missingResources.length===0 ? (
            <Text style={{fontSize:12,color:theme.muted}}>
              Tous les besoins de Germination sont remplis.
            </Text>
          ) : <Pressable accessibilityRole="button"
              accessibilityLabel="Gérer les besoins de Germination"
              onPress={()=>setRecoveryDialog(true)}
              style={{alignSelf:'flex-end',paddingVertical:5,paddingHorizontal:2,
                flexDirection:'row',alignItems:'center',gap:5}}>
              <Text style={{fontSize:11,fontWeight:'700',color:theme.foreground}}>Gérer</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.foreground}/>
            </Pressable>}
          {dream.phase==='Croissance' && !historical &&
            resources.some(resource=>isNeedFound(resource)) ? (
            <Pressable accessibilityRole="button"
              onPress={()=>setReportLostDialog(true)}
              style={{alignSelf:'flex-start',paddingTop:7,flexDirection:'row',alignItems:'center',gap:6}}>
              <Ionicons name="help-circle-outline" size={15} color={theme.muted}/>
              <Text style={{fontSize:11,color:theme.muted}}>
                Une ressource n’est plus disponible ?
              </Text>
            </Pressable>
          ):null}
        </View>
      </View>
    ):null}
    <GrowthLogbook dream={dream} editable={growthActive}
      onWrite={()=>{
        if(!growthActive)return;
        const current=(dream.milestones||[]).filter(
          log=>log.date===habitDayKey(new Date())).slice(-1)[0];
        if(current&&!canEditGrowthLog(current)){
          Alert.alert('Feuille définitive','Cette entrée ne peut plus être modifiée.');
          return;
        }
        setEditingLogId(current?.id||null);
        setMilestone(current?.title||'');
        setGrowthDialog('log');
      }}
      onEditLog={log=>{
        if(!growthActive||!canEditGrowthLog(log))return;
        setEditingLogId(log.id);
        setMilestone(log.title);
        setGrowthDialog('log');
      }}
      onRetry={log=>void publishLog({...log,shareRequested:true})}
      onManageHabits={()=>setGrowthDialog('habits')}
      onEditHabit={habit=>{if(growthActive)openHabitEditor(habit);}}
      onDeleteHabit={habit=>{
        if(!growthActive)return;
        confirm('Supprimer cette habitude ?',
          'Cette habitude et son historique seront supprimés définitivement.',()=>{
            setHabits(dream.id,habits.filter(h=>h.id!==habit.id));
          });
      }}
      onDetachHabit={habit=>{
        if(!growthActive)return;
        confirm('Détacher cette habitude du rêve ?',
          'Elle restera dans Mon agenda comme habitude personnelle, avec son historique.',()=>{
            detachHabit(dream.id,habit.id);
          });
      }}
      onCheckIn={(habit,quantity)=>{
        if(!growthActive)return;
        const today=habitDayKey(new Date());
        const key=habitKey(habit.frequency,today);
        const target=habit.target&&habit.target>0?habit.target:1;
        const next=habits.map(h=>{
          if(h.id!==habit.id)return h;
          const checked=quantity>=target;
          const oldCompleted=h.completed||[];
          return {...h,
            measurements:{...h.measurements,[key]:quantity},
            completed:checked
              ?Array.from(new Set([...oldCompleted,key]))
              :oldCompleted.filter(k=>habitKey(h.frequency,k)!==key),
            achievedOn:h.frequency==='weekly'?{
              ...h.achievedOn,[key]:checked?today:'',
            }:h.achievedOn,
          };
        });
        setHabits(dream.id,next);
      }}
    />
    {!historical?<View style={{gap:11,marginTop:11,marginBottom:22}}>
      {frozen ? (
        <View style={{gap:9,padding:14,borderWidth:1,
          borderColor:'#397F9E',borderRadius:11}}>
          <Text style={{color:'#397F9E',fontSize:12,fontWeight:'700'}}>
            Croissance congelée jusqu’au {dream.pauseUntil}
          </Text>
          <Pressable accessibilityRole="button"
            onPress={()=>confirm('Reprendre la croissance ?',
              'Tu peux reprendre avant la date choisie. Cette congélation compte toujours parmi les trois pauses.',()=>{
                patch(dream.id,{paused:false,pauseUntil:undefined});
              })}
            style={{paddingVertical:8,alignSelf:'flex-start'}}>
            <Text style={{color:'#397F9E',fontWeight:'700',fontSize:12}}>
              Reprendre maintenant
            </Text>
          </Pressable>
        </View>
      ):null}
      <Pressable accessibilityRole="button"
        disabled={frozen}
        onPress={()=>router.push({pathname:'/my-dream/flower/[id]',params:{id:dream.id}})}
        style={{minHeight:48,backgroundColor:frozen?'#A8ABA6':'#D71D77',
          borderRadius:11,alignItems:'center',justifyContent:'center',paddingHorizontal:16}}>
        <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>Faire fleurir</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={frozen}
        onPress={()=>{
          if((dream.pauseCount||0)>=3){
            Alert.alert('Limite atteinte','Ce rêve a déjà été congelé trois fois.');return;
          }
          setFreezeDialog(true);
        }}
        style={{minHeight:48,borderRadius:11,borderWidth:1.5,
          borderColor:'#397F9E',alignItems:'center',justifyContent:'center',
          paddingHorizontal:16,opacity:frozen?.5:1}}>
        <Text style={{color:'#397F9E',fontSize:13,fontWeight:'700'}}>Geler</Text>
      </Pressable>
      <Pressable accessibilityRole="button"
        accessibilityLabel="Arracher cette plante"
        onPress={()=>confirm('Arracher cette plante ?',
          'Cette action supprimera définitivement ce rêve et ses données sur cet appareil.',
          ()=>{remove(dream.id);router.replace('/my-space');})}
        style={{minHeight:48,backgroundColor:'#242322',
          borderRadius:11,alignItems:'center',justifyContent:'center',
          paddingHorizontal:16}}>
        <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>
          Arracher cette plante
        </Text>
      </Pressable>
    </View>:null}
  </>:null}
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
 {(!historical && phase === 'Témoignage') ? <Pressable
    onPress={()=>confirm('Arracher ' + ('cette plante') + ' ?', 'Cette action supprimera définitivement ce rêve et ses données enregistrées sur cet appareil.', ()=>{remove(dream.id);router.replace('/my-space');})}
    accessibilityRole="button" style={{alignItems:'center',marginTop:26,padding:15}}>
      <Text style={{color:'#B24C59',fontSize:12}}>{'Arracher cette plante'}</Text>
   </Pressable> : null}
 <Modal visible={growthDialog!==null} transparent animationType="fade"
   onRequestClose={()=>setGrowthDialog(null)}>
   <View style={{flex:1,backgroundColor:'rgba(0,0,0,.54)',justifyContent:'center',padding:18}}>
     <Pressable style={{position:'absolute',top:0,left:0,bottom:0,right:0}}
       onPress={()=>setGrowthDialog(null)}/>
     <ScrollView keyboardShouldPersistTaps="handled"
       style={{backgroundColor:theme.surface,borderRadius:15,
         maxHeight:'84%',maxWidth:440,width:'100%',alignSelf:'center'}}
       contentContainerStyle={{padding:21,gap:13}}>
       <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
         <Text style={{color:theme.foreground,fontSize:20,fontWeight:'700'}}>
           {growthDialog==='habit'
             ? editingHabitId?'Modifier l’habitude':'Nouvelle habitude'
             : growthDialog==='habits'?'Mes habitudes':editingLogId?'Modifier ma feuille':'Nouvelle feuille'}
         </Text>
         <Pressable accessibilityLabel="Fermer" onPress={()=>setGrowthDialog(null)}>
           <Ionicons name="close-outline" color={theme.foreground} size={23}/>
         </Pressable>
       </View>
       {growthDialog==='habit'?<>
         <Field label="Nom de l’habitude" value={habitTitle}
           onChange={setHabitTitle} placeholder="Ex. Apprendre la guitare"/>
         <Field label="Description (facultative)" value={habitDescription}
           onChange={setHabitDescription} multiline
           placeholder="Pourquoi, quand et comment pratiquer cette habitude…"/>
         <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
           Fréquence
         </Text>
         <View style={{flexDirection:'row',gap:8}}>
           {(['daily','weekly'] as const).map(f=><Pressable key={f}
             onPress={()=>setFrequency(f)}
             accessibilityRole="button" accessibilityState={{selected:frequency===f}}
             style={{flex:1,padding:12,borderRadius:10,alignItems:'center',
               borderWidth:1.5,borderColor:frequency===f?'#27845B':theme.border,
               backgroundColor:frequency===f?(theme.dark?'#304438':'#EDF4EB'):'transparent'}}>
             <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600'}}>
               {f==='daily'?'Chaque jour':'Chaque semaine'}
             </Text>
           </Pressable>)}
         </View>
         <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
           Comment mesurer la réussite ?
         </Text>
         <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
           <TextInput value={habitTarget} onChangeText={setHabitTarget}
             keyboardType="decimal-pad" accessibilityLabel="Objectif mesuré"
             placeholder="1" placeholderTextColor={theme.muted}
             style={{width:95,borderWidth:1,borderColor:theme.border,borderRadius:10,
               padding:12,color:theme.foreground,fontSize:15}}/>
           <TextInput value={habitUnit} onChangeText={setHabitUnit}
             accessibilityLabel="Unité de l’objectif" maxLength={35}
             placeholder="fois, minutes…" placeholderTextColor={theme.muted}
             style={{flex:1,borderWidth:1,borderColor:theme.border,borderRadius:10,
               padding:12,color:theme.foreground,fontSize:14}}/>
         </View>
         <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
           {['fois','minutes','heures','pages','km','séances'].map(unit=>
             <Pressable key={unit} onPress={()=>setHabitUnit(unit)}
               accessibilityRole="button" accessibilityState={{selected:habitUnit===unit}}
               style={{borderWidth:1,borderColor:habitUnit===unit?'#27845B':theme.border,
                 borderRadius:9,paddingHorizontal:11,paddingVertical:8}}>
               <Text style={{fontSize:11,color:habitUnit===unit?'#27845B':theme.muted,
                 fontWeight:habitUnit===unit?'700':'500'}}>{unit}</Text>
             </Pressable>)}
         </View>
         <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>
           Icône de l’habitude
         </Text>
         <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
           {HABIT_EMOJIS.map(emoji=>(
             <Pressable key={emoji} accessibilityRole="button"
               accessibilityLabel={'Choisir '+emoji} accessibilityState={{selected:habitEmoji===emoji}}
               onPress={()=>setHabitEmoji(emoji)}
               style={{width:43,height:43,borderRadius:22,borderWidth:2,
                 borderColor:habitEmoji===emoji?habitColor:theme.border,
                 alignItems:'center',justifyContent:'center'}}>
               <Text style={{fontSize:22,lineHeight:29}}>{emoji}</Text>
             </Pressable>
           ))}
         </View>
         <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>
           Couleur de l’habitude
         </Text>
         <View style={{flexDirection:'row',flexWrap:'wrap',gap:11,marginBottom:5}}>
           {HABIT_PALETTE.map(color=>(
             <Pressable key={color} accessibilityRole="button"
               accessibilityLabel={'Choisir la couleur '+color}
               accessibilityState={{selected:habitColor===color}}
               onPress={()=>setHabitColor(color)}
               style={{width:34,height:34,borderRadius:17,
                 backgroundColor:color,alignItems:'center',justifyContent:'center',
                 borderWidth:habitColor===color?2:0,borderColor:theme.foreground}}>
               {habitColor===color?<Ionicons name="checkmark" color="#FFFFFF" size={17}/>:null}
             </Pressable>
           ))}
         </View>
         <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
           Les réalisations se renseignent dans Mon agenda.
           Appui long sur une carte pour modifier ou supprimer l’habitude.
         </Text>
         <Action label={editingHabitId?'Enregistrer les modifications':'Créer l’habitude'}
           onPress={saveHabit}/>
         {editingHabitId ? <Pressable accessibilityRole="button"
           onPress={()=>{
             const id=editingHabitId;
             confirm('Supprimer cette habitude ?',
               'Le suivi et l’historique de cette habitude seront retirés du rêve.',()=>{
                 setHabits(dream.id,habits.filter(h=>h.id!==id));
                 setGrowthDialog(null);setEditingHabitId(null);
               });
           }}
           style={{alignSelf:'center',padding:11}}>
           <Text style={{color:'#B55164',fontSize:12,fontWeight:'700'}}>
             Supprimer cette habitude
           </Text>
         </Pressable> : null}
       </>:growthDialog==='habits'?<>
         <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
           Les habitudes se cochent dans Mon agenda.
         </Text>
         {(dream.habits||[]).map(h=>(
           <Pressable key={h.id} accessibilityRole="button" onPress={()=>openHabitEditor(h)}
             style={{flexDirection:'row',alignItems:'center',gap:11,
               paddingVertical:12,borderBottomWidth:1,borderColor:theme.border}}>
             <View style={{width:38,height:38,borderRadius:21,
               borderWidth:2,borderColor:h.color||'#27845B',
               alignItems:'center',justifyContent:'center'}}>
               <Text style={{fontSize:19}}>{h.emoji||'🌱'}</Text>
             </View>
             <View style={{flex:1,gap:3}}>
               <Text style={{fontWeight:'700',color:theme.foreground,fontSize:13}}>
                 {h.title}
               </Text>
               <Text style={{fontSize:11,color:theme.muted}}>
                 {(h.target||1)+' '+(h.unit||'fois')} ·
                 {h.frequency==='daily'?' chaque jour':' chaque semaine'}
               </Text>
             </View>
             <Ionicons name="pencil-outline" color={theme.muted} size={18}/>
           </Pressable>
         ))}
         <Pressable accessibilityRole="button" onPress={()=>openHabitEditor()}
           style={{flexDirection:'row',alignItems:'center',justifyContent:'center',
             gap:8,padding:13,borderWidth:1,borderColor:'#27845B',
             borderRadius:10,marginTop:8}}>
           <Ionicons name="add" size={18} color="#27845B"/>
           <Text style={{color:'#27845B',fontSize:12,fontWeight:'700'}}>Ajouter une habitude</Text>
         </Pressable>
       </>:growthDialog==='log'?<>
         <TextInput value={milestone} onChangeText={setMilestone}
           accessibilityLabel="Écrire une feuille du journal"
           placeholder="Qu’est-ce qui a grandi aujourd’hui ?"
           placeholderTextColor={theme.muted} multiline textAlignVertical="top"
           maxLength={5000}
           style={{fontSize:16,lineHeight:25,
             minHeight:154,paddingHorizontal:14,paddingVertical:13,
             borderWidth:1,borderColor:theme.border,borderRadius:10,
             color:theme.foreground,backgroundColor:theme.background}}/>
         <Text style={{color:theme.muted,fontSize:11,lineHeight:18}}>
           Modifiable pendant 24 heures après sa création, puis définitive.
           L’écriture Biro apparaît uniquement dans le Logbook.
           Publique par défaut une fois synchronisée.
         </Text>
         <Action label={editingLogId?'Enregistrer les modifications':
           dream.serverDreamId?'Publier cette feuille':'Enregistrer cette feuille'}
           onPress={saveLog}/>
       </>:null}
     </ScrollView>
   </View>
 </Modal>
 <Modal transparent visible={reportLostDialog} animationType="fade"
   onRequestClose={()=>setReportLostDialog(false)}>
   <View style={{flex:1,justifyContent:'center',padding:18,
     backgroundColor:'rgba(0,0,0,.55)'}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
       onPress={()=>setReportLostDialog(false)}
       style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
     <View style={{maxWidth:430,width:'100%',alignSelf:'center',padding:22,
       backgroundColor:theme.surface,borderRadius:15,gap:12}}>
       <Text style={{fontSize:19,color:theme.foreground,fontWeight:'700'}}>
         Une ressource a changé ?
       </Text>
       <Text style={{fontSize:12,color:theme.muted,lineHeight:20}}>
         Indique uniquement un besoin que tu avais déjà trouvé.
         Pour un talent, la participation doit être retirée via son invitation.
       </Text>
       {resources.filter(isNeedFound).map(need=>(
         <Pressable key={need.id} accessibilityRole="button"
           onPress={()=>{
             if(need.category==='person'){
               setReportLostDialog(false);
               onRecoverResource?.('person');
               return;
             }
             confirm('Ressource perdue',
               '« '+need.title+' » sera de nouveau à rechercher. Continuer ?',()=>{
                 setResources(dream.id,resources.map(r=>r.id===need.id?{...r,confirmed:false}:r));
                 setReportLostDialog(false);
               });
           }}
           style={{minHeight:48,borderWidth:1,borderColor:theme.border,
             borderRadius:10,paddingHorizontal:12,paddingVertical:10,
             flexDirection:'row',alignItems:'center',gap:9}}>
           <Text style={{fontSize:12,color:theme.foreground,flex:1,fontWeight:'600'}}>
             {need.title}
           </Text>
           <Text style={{fontSize:11,color:'#D71D77'}}>
             {need.category==='person'?'Gérer':'Signaler la perte'}
           </Text>
         </Pressable>
       ))}
       <Pressable accessibilityRole="button" onPress={()=>setReportLostDialog(false)}
         style={{alignItems:'center',padding:12}}>
         <Text style={{color:theme.muted,fontSize:12}}>Annuler</Text>
       </Pressable>
     </View>
   </View>
 </Modal>
 <Modal transparent visible={recoveryDialog} animationType="fade"
   onRequestClose={()=>setRecoveryDialog(false)}>
   <View style={{flex:1,justifyContent:'center',padding:18,
     backgroundColor:'rgba(0,0,0,.55)'}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
       onPress={()=>setRecoveryDialog(false)}
       style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
     <View style={{maxWidth:430,width:'100%',alignSelf:'center',padding:22,
       backgroundColor:theme.surface,borderRadius:15,gap:12}}>
       <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
         <Ionicons name="warning-outline" size={25} color="#D71D77"/>
         <Text style={{fontSize:19,color:theme.foreground,fontWeight:'700',flex:1}}>
           Des besoins restent à trouver
         </Text>
       </View>
       <Text style={{fontSize:13,color:theme.muted,lineHeight:20,marginBottom:4}}>
         Veux-tu gérer les ressources nécessaires dans l’étape précédente, Germination ?
       </Text>
       {missingCategories.map(category=><Pressable key={category}
         accessibilityRole="button"
         onPress={()=>{
           setRecoveryDialog(false);
           onRecoverResource?.(category);
         }}
         style={{minHeight:46,borderRadius:10,borderWidth:1,borderColor:'#D71D77',
           alignItems:'center',justifyContent:'center',paddingHorizontal:12}}>
         <Text style={{fontSize:12,fontWeight:'700',color:'#D71D77'}}>
           {'Gérer '+categoryNames[category].toLowerCase()}
         </Text>
       </Pressable>)}
       <Pressable accessibilityRole="button" onPress={()=>setRecoveryDialog(false)}
         style={{alignItems:'center',padding:12}}>
         <Text style={{color:theme.muted,fontSize:12}}>Plus tard</Text>
       </Pressable>
     </View>
   </View>
 </Modal>
 <DreamResourceDetailsModal
   resource={resources.find(r=>r.id===selectedResourceId)||null}
   dreamServerId={dream.serverDreamId}
   onServerVerified={(resourceId,confirmed)=>{
     const existing=resources.find(r=>r.id===resourceId);
     if(existing && existing.confirmed!==confirmed && existing.serverNeedId){
       setResources(dream.id,resources.map(r=>r.id===resourceId?{...r,confirmed}:r));
     }
   }}
   editable={!!resources.find(r=>r.id===selectedResourceId&&canEditCategory(r.category))}
   onClose={()=>setSelectedResourceId(null)}
   onSave={updated=>{
     if(canEditCategory(updated.category))setResources(dream.id,resources.map(r=>r.id===updated.id?updated:r));
   }}
   onToggle={target=>{
     if(canEditCategory(target.category))checkResource(target);
   }}
   onRemove={target=>{
     if(canEditCategory(target.category))setResources(dream.id,resources.filter(r=>r.id!==target.id));
   }}
 />
 <DreamGoalDatePicker visible={goalDateDialog} initialDate={dream.goalDate}
   onCancel={()=>setGoalDateDialog(false)}
   onConfirm={date=>{setGoalDateDialog(false);setGoalAndGrow(dream.id,date);}}/>
 <Modal visible={resourceDialog} transparent animationType="fade" onRequestClose={()=>setResourceDialog(false)}>
   <View style={{flex:1,justifyContent:'center',padding:18,backgroundColor:'rgba(0,0,0,0.5)'}}>
     <Pressable style={{position:'absolute',top:0,bottom:0,left:0,right:0}} onPress={()=>setResourceDialog(false)}/>
     <ScrollView style={{backgroundColor:theme.surface,borderRadius:14,maxWidth:440,width:'100%',alignSelf:'center',maxHeight:'85%'}}
       contentContainerStyle={{padding:20,gap:12}} keyboardShouldPersistTaps="handled">
       <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
         <Text style={{color:theme.foreground,fontWeight:'700',fontSize:19}}>Ajouter un besoin</Text>
         <Pressable onPress={()=>setResourceDialog(false)} accessibilityLabel="Fermer">
           <Ionicons name="close-outline" size={22} color={theme.foreground}/>
         </Pressable>
       </View>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
         {(['person','practical','financial'] as const).map(k=><Pressable key={k}
           onPress={()=>{setResourceCategory(k);setResourceTitle('');setTalentChoicesOpen(false);}}
           accessibilityRole="button" accessibilityState={{selected:resourceCategory===k}}
           style={{padding:10,borderRadius:9,backgroundColor:resourceCategory===k?'#242322':theme.background}}>
           <Text style={{color:resourceCategory===k?'#fff':theme.foreground,fontSize:12}}>
             {k==='person'?'Talent':k==='practical'?'Ressource':'Financement'}
           </Text>
         </Pressable>)}
       </View>
       {resourceCategory==='person' ? <>
         <Text style={{color:theme.muted,fontSize:12}}>Choisir un talent</Text>
         <Pressable onPress={()=>setTalentChoicesOpen(!talentChoicesOpen)} accessibilityRole="button"
           accessibilityState={{expanded:talentChoicesOpen}}
           style={{paddingHorizontal:13,paddingVertical:14,borderWidth:1,borderColor:theme.border,
             borderRadius:10,backgroundColor:theme.background,flexDirection:'row',
             alignItems:'center',justifyContent:'space-between',gap:9}}>
           <Text style={{color:resourceTitle?theme.foreground:theme.muted,fontSize:13}}>
             {resourceTitle||'Sélectionner dans la liste'}
           </Text>
           <Ionicons name="chevron-down" size={18} color={theme.foreground}/>
         </Pressable>
         {talentChoicesOpen ? <View style={{borderWidth:1,borderColor:theme.border,borderRadius:10,overflow:'hidden'}}>
           {DREAM_TALENT_CHOICES.map(choice=><Pressable key={choice.title}
             onPress={()=>{setResourceTitle(choice.title);setTalentChoicesOpen(false);}}
             accessibilityRole="button"
             style={{padding:11,borderBottomWidth:.5,borderColor:theme.border}}>
             <Text style={{color:theme.foreground,fontSize:13}}>{choice.title}</Text>
           </Pressable>)}
         </View> : null}
       </> : <Field
         label={resourceCategory==='financial'?'Objet du financement':'Ressource nécessaire'}
         value={resourceTitle} onChange={setResourceTitle} placeholder="Ex. Salle de répétition"/>}
       {resourceCategory==='person'?<View style={{gap:8}}>
         <Text style={{fontSize:12,color:theme.muted}}>Niveau recherché</Text>
         <TalentLevelSelector value={resourceLevel} onChange={setResourceLevel}/>
       </View>:null}
       <Field label="Description précise du besoin" value={resourceDescription}
         onChange={setResourceDescription} placeholder="Décris le besoin, ses conditions et pourquoi il est important…" multiline/>
       {resourceCategory==='financial'?<Field label="Montant estimé en €"
         value={resourceAmount} onChange={setResourceAmount} placeholder="Ex. 300"/>:null}
       {resourceCategory==='practical'?(
         <View style={{gap:5}}>
           <Pressable accessibilityRole="checkbox" accessibilityState={{checked:toolsPublicationRequested}}
             onPress={()=>setToolsPublicationRequested(!toolsPublicationRequested)}
             style={{flexDirection:'row',gap:9,alignItems:'center',paddingVertical:10}}>
             <Ionicons name={toolsPublicationRequested?'checkbox-outline':'square-outline'}
               size={22} color={toolsPublicationRequested?'#387D9F':theme.muted}/>
             <Text style={{flex:1,color:theme.foreground,fontSize:12,fontWeight:'600'}}>
               Demander la publication sur JenLow Tools
             </Text>
           </Pressable>
           {toolsPublicationRequested ? (
             <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
               Préférence enregistrée ici. La demande ne sera pas publiée avant la connexion avec JenLow Tools.
             </Text>
           ) : null}
         </View>
       ):null}
       <Action label="Ajouter ce besoin" onPress={addResource}/>
     </ScrollView>
   </View>
 </Modal>
 <DreamGoalDatePicker
   visible={freezeDialog}
   onCancel={()=>setFreezeDialog(false)}
   title="Date de reprise"
   explanation={`Choisis quand reprendre ${phase==='Croissance'?'cette croissance':'cette germination'}. ${dream.pauseCount||0}/3 pauses utilisées · date de reprise obligatoire. Trois congélations maximum.`}
   confirmationLabel="Confirmer la congélation"
   minDate={(()=>{
     const d=new Date();d.setDate(d.getDate()+1);
     return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   })()}
   onConfirm={freezeAt}
 />
 </ScrollView>;
}
