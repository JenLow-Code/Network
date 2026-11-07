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
import { DreamGoalDatePicker } from './DreamGoalDatePicker';
import { DreamResourceDetailsModal } from './DreamResourceDetailsModal';
import { DREAM_TALENT_CHOICES } from './dreamTalentCatalog';

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
 const { patch, appendBlock, setResources, setHabits, setGoalAndGrow, advance, remove } = useDreams();
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
 const [growthDialog,setGrowthDialog]=useState<'habit'|'log'|'note'|null>(null);
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
 const checkResource = (resource: DreamResource) =>
   setResources(dream.id, resources.map(r => r.id===resource.id?{...r,confirmed:!r.confirmed}:r));
 const phase = viewPhase || dream.phase;
 const historical = phase !== dream.phase;
 const readOnly = historical || dream.phase === 'Témoignage';
 const frozen=!!dream.paused && !!dream.pauseUntil && dream.pauseUntil>=day();
 const resourceEditable=phase==='Initiation' && !historical && !frozen;
 const freezeAt=(date:string)=>{
   if(historical || dream.phase!=='Initiation' || frozen)return;
   if((dream.pauseCount||0)>=3){
     Alert.alert('Limite atteinte','Cette germination a déjà été congelée trois fois.');return;
   }
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<=day()||Number.isNaN(Date.parse(date))){
     Alert.alert('Date requise','Sélectionne une date future dans le calendrier.');return;
   }
   patch(dream.id,{paused:true,pauseUntil:date,pauseCount:(dream.pauseCount||0)+1});
   setFreezeDialog(false);
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
   {(['person','practical','financial'] as const).map(category=><View key={category} style={{marginBottom:17}}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground,marginBottom:9}}>{category==='person'?'Talents':category==='practical'?'Autres ressources':'Financement'}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:8}}>
        {category==='person'
          ? resources.filter(r=>r.category===category).map(r=>
              <DreamTalentSquare key={r.id} resource={r} size={96}
                onToggle={resourceEditable?()=>checkResource(r):undefined}
                onRemove={resourceEditable?()=>setResources(dream.id,resources.filter(x=>x.id!==r.id)):undefined}
                onEditRequest={resourceEditable?()=>setSelectedResourceId(r.id):undefined}/>)
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
                {resourceEditable?<Pressable
                  onPress={()=>setResources(dream.id,resources.filter(x=>x.id!==r.id))}
                  accessibilityLabel={'Retirer '+r.title}
                  style={{position:'absolute',right:1,top:1,padding:5}}>
                  <Ionicons name="close-outline" size={14} color={theme.muted}/>
                </Pressable>:null}
              </View>)}
        {resourceEditable?<Pressable accessibilityRole="button"
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
           <Text style={{color:'#397F9E',fontSize:13,fontWeight:'700'}}>Congeler</Text>
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
    <DreamPhaseSection title="Mes habitudes" subtitle="Des petits gestes qui font avancer ton rêve.">
      <View style={{gap:10}}>
        {habits.length===0?<View style={{backgroundColor:theme.surface,borderRadius:13,
          padding:20,borderWidth:1,borderColor:theme.border,alignItems:'center',gap:8}}>
          <Ionicons name="leaf-outline" size={24} color="#27845B"/>
          <Text style={{fontFamily:'serif',color:theme.foreground,fontSize:20,textAlign:'center'}}>
            Faire grandir ce qui compte
          </Text>
          <Text style={{color:theme.muted,fontSize:12,textAlign:'center',lineHeight:19}}>
            Une habitude concrète suffit pour commencer.
          </Text>
        </View>:null}
        {habits.map(h=>{
          const now=new Date();
          now.setHours(12,0,0,0);
          const start=new Date(now);
          start.setDate(now.getDate()-((now.getDay()+6)%7));
          const dates=Array.from({length:7},(_,i)=>{
            const d=new Date(start);d.setDate(start.getDate()+i);
            const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
            return {key,number:d.getDate(),label:['L','M','M','J','V','S','D'][i]};
          });
          const displayed=h.frequency==='weekly'?[dates[0]]:dates;
          return <View key={h.id} style={{backgroundColor:theme.surface,
            borderWidth:1,borderColor:theme.border,borderRadius:13,padding:16,gap:13}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <View style={{width:34,height:34,borderRadius:10,backgroundColor:theme.dark?'#334C3D':'#E6F0E8',
                justifyContent:'center',alignItems:'center'}}>
                <Ionicons name="leaf-outline" size={19} color="#27845B"/>
              </View>
              <View style={{flex:1,gap:3}}>
                <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>{h.title}</Text>
                <Text style={{color:theme.muted,fontSize:11}}>
                  {h.frequency==='daily'?'Chaque jour':'Chaque semaine'} · {h.completed.length} accomplissement(s)
                </Text>
              </View>
            </View>
            <View style={{flexDirection:'row',gap:7,alignItems:'center',justifyContent:'space-between'}}>
              {displayed.map((d,i)=>{
                const checked=h.completed.includes(d.key);
                const disabled=historical||d.key>day();
                return <Pressable key={d.key} disabled={disabled} accessibilityRole="checkbox"
                  accessibilityState={{checked,disabled}}
                  accessibilityLabel={h.title+', '+(h.frequency==='weekly'?'Cette semaine':d.key)}
                  onPress={()=>setHabits(dream.id,habits.map(x=>x.id===h.id?{
                    ...x,completed:checked?x.completed.filter(v=>v!==d.key):[...x.completed,d.key]
                  }:x))}
                  style={{flex:1,minHeight:57,borderRadius:9,
                    borderWidth:1,borderColor:checked?'#27845B':theme.border,
                    backgroundColor:checked?(theme.dark?'#2A513B':'#E4F0E5'):theme.background,
                    alignItems:'center',justifyContent:'center',gap:5,opacity:disabled&&!checked?.45:1}}>
                  <Text style={{fontSize:10,color:checked?'#27845B':theme.muted,fontWeight:'600'}}>
                    {h.frequency==='weekly'?'Semaine':d.label}
                  </Text>
                  {checked?<Ionicons name="checkmark" size={17} color="#27845B"/>:
                    <Text style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>
                      {h.frequency==='weekly'?'✓':d.number}
                    </Text>}
                </Pressable>;
              })}
            </View>
          </View>;
        })}
        {!historical?<Pressable accessibilityRole="button" onPress={()=>setGrowthDialog('habit')}
          style={{minHeight:60,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,
            borderWidth:1,borderStyle:'dashed',borderColor:'#27845B',borderRadius:12}}>
          <Ionicons name="add" size={22} color="#27845B"/>
          <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>Ajouter une habitude</Text>
        </Pressable>:null}
      </View>
    </DreamPhaseSection>
    <DreamPhaseSection title="Journal de croissance"
      subtitle="Conserve les avancées importantes et les moments qui marquent le chemin.">
      <View style={{gap:10}}>
        {(dream.milestones||[]).map(log=><View key={log.id}
          style={{padding:16,borderRadius:13,backgroundColor:theme.surface,
            borderWidth:1,borderColor:theme.border,gap:10}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <Text style={{fontSize:10,color:'#27845B',fontWeight:'700',letterSpacing:1.0}}>
              {log.date}
            </Text>
            {log.shareRequested?<View style={{flexDirection:'row',gap:4,alignItems:'center'}}>
              <Ionicons name="paper-plane-outline" size={13} color="#D71D77"/>
              <Text style={{fontSize:10,color:'#D71D77',fontWeight:'700'}}>À partager</Text>
            </View>:null}
          </View>
          <Text style={{color:theme.foreground,fontSize:15,lineHeight:23}}>{log.title}</Text>
          {!historical?<Pressable accessibilityRole="button"
            onPress={()=>patch(dream.id,{milestones:(dream.milestones||[]).map(m=>({
              ...m,shareRequested:m.id===log.id?!m.shareRequested:false
            }))})}
            style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,paddingVertical:6}}>
            <Ionicons name={log.shareRequested?'bookmark':'bookmark-outline'}
              size={16} color={log.shareRequested?'#D71D77':theme.muted}/>
            <Text style={{fontSize:11,color:log.shareRequested?'#D71D77':theme.muted}}>
              {log.shareRequested?'Retirer du partage':'Sélectionner pour publication'}
            </Text>
          </Pressable>:null}
        </View>)}
        {(dream.milestones||[]).some(m=>m.shareRequested)?<Text
          style={{fontSize:11,lineHeight:18,color:theme.muted}}>
          Un seul log est sélectionné pour le partage. Sa publication publique nécessite encore la synchronisation avec Network.
        </Text>:null}
        {!historical?<Pressable accessibilityRole="button" onPress={()=>setGrowthDialog('log')}
          style={{minHeight:60,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,
            borderWidth:1,borderStyle:'dashed',borderColor:theme.border,borderRadius:12}}>
          <Ionicons name="add" size={22} color="#27845B"/>
          <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>Ajouter un log</Text>
        </Pressable>:null}
      </View>
    </DreamPhaseSection>
    <DreamPhaseSection title="Notes personnelles"
      subtitle="Des pensées et réflexions privées, rien que pour toi.">
      <View style={{gap:9}}>
        {(dream.thoughts||[]).map(note=><View key={note.id} style={{
          backgroundColor:theme.dark?'#322F31':'#F4EEE6',borderRadius:12,padding:16,gap:8}}>
          <Text style={{fontSize:10,fontWeight:'700',letterSpacing:1,color:theme.muted}}>NOTE · {note.date}</Text>
          <Text style={{fontFamily:HANDWRITING_FAMILY,fontSize:23,lineHeight:31,
            color:theme.foreground}}>{note.text}</Text>
        </View>)}
        {!historical?<Pressable accessibilityRole="button" onPress={()=>setGrowthDialog('note')}
          style={{minHeight:61,borderWidth:1,borderColor:theme.border,borderStyle:'dashed',
            borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>
          <Ionicons name="create-outline" size={21} color="#B88962"/>
          <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>Écrire une note</Text>
        </Pressable>:null}
      </View>
    </DreamPhaseSection>
    {!historical?<View style={{marginVertical:16}}>
      <Action label="Admirer les fleurs de cette plante"
        onPress={()=>router.push({pathname:'/my-dream/flower/[id]',params:{id:dream.id}})}/>
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
 {(!historical && phase !== 'Rêve' && phase !== 'Initiation') ? <Pressable
    onPress={()=>confirm('Arracher ' + ('cette plante') + ' ?', 'Cette action supprimera définitivement ce rêve et ses données enregistrées sur cet appareil.', ()=>{remove(dream.id);router.replace('/my-space');})}
    accessibilityRole="button" style={{alignItems:'center',marginTop:26,padding:15}}>
      <Text style={{color:'#B24C59',fontSize:12}}>{'Arracher cette plante'}</Text>
   </Pressable> : null}
 <Modal visible={growthDialog!==null} transparent animationType="fade"
   onRequestClose={()=>setGrowthDialog(null)}>
   <View style={{flex:1,backgroundColor:'rgba(0,0,0,.54)',justifyContent:'center',padding:18}}>
     <Pressable style={{position:'absolute',top:0,left:0,bottom:0,right:0}}
       onPress={()=>setGrowthDialog(null)}/>
     <View style={{backgroundColor:theme.surface,borderRadius:15,padding:21,
       maxWidth:440,width:'100%',alignSelf:'center',gap:13}}>
       <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
         <Text style={{color:theme.foreground,fontSize:20,fontWeight:'700'}}>
           {growthDialog==='habit'?'Nouvelle habitude':
             growthDialog==='log'?'Nouveau log':'Note personnelle'}
         </Text>
         <Pressable accessibilityLabel="Fermer" onPress={()=>setGrowthDialog(null)}>
           <Ionicons name="close-outline" color={theme.foreground} size={23}/>
         </Pressable>
       </View>
       {growthDialog==='habit'?<>
         <Field label="Ce que je veux pratiquer" value={habitTitle}
           onChange={setHabitTitle} placeholder="Ex. Répéter 20 minutes"/>
         <View style={{flexDirection:'row',gap:8}}>
           {(['daily','weekly'] as const).map(f=><Pressable key={f}
             onPress={()=>setFrequency(f)}
             style={{flex:1,padding:12,borderRadius:10,alignItems:'center',
               borderWidth:1,borderColor:frequency===f?'#27845B':theme.border}}>
             <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600'}}>
               {f==='daily'?'Quotidienne':'Hebdomadaire'}
             </Text>
           </Pressable>)}
         </View>
         <Action label="Créer l’habitude" onPress={()=>{
           if(!habitTitle.trim())return;
           setHabits(dream.id,[...habits,{id:uid(),title:habitTitle.trim(),frequency,completed:[]}]);
           setHabitTitle('');setGrowthDialog(null);
         }}/>
       </>:growthDialog==='log'?<>
         <Field label="Une étape importante" value={milestone} onChange={setMilestone}
           placeholder="Qu’as-tu accompli aujourd’hui ?" multiline/>
         <Text style={{color:theme.muted,fontSize:11,lineHeight:18}}>
           Le log reste dans ton journal. Tu peux ensuite le sélectionner pour un partage futur.
         </Text>
         <Action label="Conserver ce log" onPress={()=>{
           if(!milestone.trim())return;
           patch(dream.id,{milestones:[...(dream.milestones||[]),
             {id:uid(),title:milestone.trim(),date:day()}]});
           setMilestone('');setGrowthDialog(null);
         }}/>
       </>:growthDialog==='note'?<>
         <Field label="À garder pour moi" value={thought} onChange={setThought}
           placeholder="Mes réflexions, découvertes, prières…" multiline/>
         <Action label="Enregistrer ma note" onPress={()=>{
           if(!thought.trim())return;
           patch(dream.id,{thoughts:[...(dream.thoughts||[]),{id:uid(),text:thought.trim(),date:day()}]});
           setThought('');setGrowthDialog(null);
         }}/>
       </>:null}
     </View>
   </View>
 </Modal>
 <DreamResourceDetailsModal
   resource={resources.find(r=>r.id===selectedResourceId)||null}
   editable={resourceEditable}
   onClose={()=>setSelectedResourceId(null)}
   onSave={updated=>{
     if(resourceEditable)setResources(dream.id,resources.map(r=>r.id===updated.id?updated:r));
   }}
   onToggle={target=>{
     if(resourceEditable)checkResource(target);
   }}
   onRemove={target=>{
     if(resourceEditable)setResources(dream.id,resources.filter(r=>r.id!==target.id));
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
       {resourceCategory==='person'?<View style={{gap:9}}>
         <Text style={{fontSize:12,color:theme.muted}}>Niveau recherché</Text>
         <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
           {['Grand débutant','Quelques notions','Intermédiaire','Avancé','Professionnel'].map(level=>(
             <Pressable key={level} accessibilityRole="button"
               accessibilityState={{selected:resourceLevel===level}} onPress={()=>setResourceLevel(level)}
               style={{borderRadius:9,paddingHorizontal:12,paddingVertical:10,
                 borderWidth:1,borderColor:resourceLevel===level?'#D71D77':theme.border,
                 backgroundColor:resourceLevel===level?(theme.dark?'#47303A':'#FCE8F1'):theme.background}}>
               <Text style={{color:theme.foreground,fontSize:11,fontWeight:resourceLevel===level?'700':'500'}}>{level}</Text>
             </Pressable>
           ))}
         </View>
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
   explanation={`Choisis quand reprendre cette germination. ${dream.pauseCount||0}/3 pauses utilisées · date de reprise obligatoire. Tu peux reprendre plus tôt, mais trois congélations maximum.`}
   confirmationLabel="Confirmer la congélation"
   minDate={(()=>{
     const d=new Date();d.setDate(d.getDate()+1);
     return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   })()}
   onConfirm={freezeAt}
 />
 </ScrollView>;
}
