import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamGrowthEvent, DreamMilestone, DreamResource } from '@/domain/dreamWorkspace';
import { buildGrowthDays, countVerifiedPrayers, type GrowthDay } from '@/domain/growthTimeline';
import { habitDayKey, habitDreamProgress } from '@/domain/habitProgress';
import { canPreviewGrowth, isSeedGrowthPreview, sampleGrowthPreview } from '@/domain/mockGrowthPreview';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { PrayerIcon } from '@/icons/PrayerIcon';

const GREEN='#27845B';
const PINK='#D71D77';
const BLUE='#397F9E';
const LIME='#A1BA44';

const localLabel=(date:string,today:string):string => {
  if(date===today)return 'AUJOURD’HUI';
  const parsed=new Date(date+'T12:00:00');
  return Number.isNaN(parsed.getTime())?date:
    parsed.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}).toUpperCase();
};
const colorFor=(category:DreamResource['category'])=>
  category==='person'?PINK:category==='financial'?LIME:BLUE;
const categoryTitle=(category:DreamResource['category'])=>
  category==='person'?'Talent':category==='financial'?'Financement':'Ressource';

type PreviewEvent = {id:string;date:string;title:string;kind:'resource'|'document'};
type LogbookDay = GrowthDay & {previewEvents:PreviewEvent[]};

function CompactSocialCount({
  title,color,today,total,yesterday,icon,
}:{
  title:string;color:string;today?:number;total:number;yesterday?:number;
  icon:'prayer'|'heart';
}){
  return <View style={{flex:1,minWidth:125,padding:12,gap:5,
    backgroundColor:color===PINK?'#F9EEF3':'#F1F3F0',
    borderRadius:11}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
      {icon==='prayer'?<PrayerIcon size={15} color={color}/>:
        <Ionicons name="heart-outline" size={16} color={color}/>}
      <Text style={{fontSize:11,color:'#363234',fontWeight:'600'}}>{title}</Text>
    </View>
    <Text style={{fontSize:15,color:'#292829',fontWeight:'700'}}>
      {today!==undefined?('+'+today+' aujourd’hui'):(total+' au total')}
    </Text>
    <Text style={{fontSize:10,color:'#777176'}}>
      {today!==undefined?total+' au total'+(yesterday!==undefined?' · hier +'+yesterday:''):
        'depuis le début du rêve'}
    </Text>
  </View>;
}

function HabitProgress({
  dream,onManage,
}:{
  dream:DreamEntry;onManage:()=>void;
}){
  const theme=useAppTheme();
  const habits=dream.habits||[];
  if(!habits.length)return <Pressable accessibilityRole="button" onPress={onManage}
    style={{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:7}}>
    <Ionicons name="add-circle-outline" size={17} color={theme.muted}/>
    <Text style={{fontSize:12,color:theme.muted}}>Créer une habitude</Text>
  </Pressable>;
  return <View style={{gap:11,marginVertical:5}}>
    <Pressable accessibilityRole="button" onPress={onManage}
      style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:4}}>
      <Ionicons name="calendar-outline" color={GREEN} size={17}/>
      <Text style={{fontSize:12,color:theme.foreground,flex:1,fontWeight:'700'}}>
        Habitudes · jusqu’à l’objectif
      </Text>
      <Text style={{fontSize:11,color:GREEN,fontWeight:'600'}}>Gérer</Text>
      <Ionicons name="chevron-forward" size={15} color={GREEN}/>
    </Pressable>
    {habits.map(h=>{
      const p=habitDreamProgress(h,dream.goalDate,dream.growthStartedAt);
      const color=h.color||GREEN;
      const steps=12;
      const filled=p.planned&&p.planned>0?Math.round(Math.min(1,p.completed/p.planned)*steps):0;
      return <Pressable key={h.id} accessibilityRole="button"
        onPress={onManage} style={{gap:6,paddingLeft:2}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <View style={{width:25,height:25,borderRadius:13,borderWidth:1.5,
            borderColor:color,alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:14,lineHeight:19}}>{h.emoji||'🌱'}</Text>
          </View>
          <View style={{flex:1,gap:2}}>
            <Text numberOfLines={1} style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>
              {h.title}
            </Text>
            <Text style={{fontSize:11,color:theme.muted}}>
              {p.planned!==null ? p.completed+' / '+p.planned+' '+p.unit:
                p.completed+' '+p.unit+' réalisés'}
              {p.remaining!==null&&p.remaining>0?' · encore '+p.remaining:''}
            </Text>
          </View>
          {p.streak>0?<View style={{flexDirection:'row',alignItems:'center',gap:3}}>
            <Ionicons name="flame-outline" size={13} color={color}/>
            <Text style={{fontSize:11,fontWeight:'700',color}}>
              {p.streak}
            </Text>
          </View>:null}
        </View>
        <View style={{flexDirection:'row',gap:4,paddingLeft:34}}>
          {Array.from({length:steps},(_,i)=><View key={i}
            accessibilityLabel={i<filled?'Progression réalisée':'Progression restante'}
            style={{flex:1,height:9,borderRadius:3,
              backgroundColor:color,opacity:i<filled?1:.20}}/>)}
        </View>
      </Pressable>;
    })}
    <Pressable accessibilityRole="link" onPress={()=>router.push('/agenda')}
      style={{alignSelf:'flex-end',paddingVertical:4}}>
      <Text style={{fontSize:11,color:GREEN,fontWeight:'600'}}>
        Voir dans le calendrier
      </Text>
    </Pressable>
  </View>;
}

export function GrowthLogbook({
  dream,editable,onWrite,onRetry,onManageHabits,
}:{
  dream:DreamEntry;
  editable:boolean;
  onWrite:()=>void;
  onRetry:(log:DreamMilestone)=>void;
  onManageHabits:()=>void;
}){
  const theme=useAppTheme();
  const [allOpen,setAllOpen]=useState(false);
  const [preview,setPreview]=useState(()=>isSeedGrowthPreview(dream));
  const showPreview=canPreviewGrowth(dream)&&preview;
  const example=showPreview?sampleGrowthPreview():null;
  const today=habitDayKey(new Date());
  const todayWritten=(dream.milestones||[]).some(log=>log.date===today);
  // Only personal journal entries, actual need changes and document additions
  // create a dated leaf. Routine actions update the persistent summaries above.
  const history=buildGrowthDays(dream);
  const byDate=new Map<string,LogbookDay>(
    history.map(day=>[day.date,{...day,previewEvents:[]}]));
  if(example)for(const event of example.events){
    const row=byDate.get(event.date)||{
      date:event.date,notes:[],changes:[],documents:[],previewEvents:[],
    };
    row.previewEvents.push(event);
    byDate.set(event.date,row);
  }
  const timeline=Array.from(byDate.values()).sort((a,b)=>b.date.localeCompare(a.date));
  const shown=allOpen?timeline:timeline.slice(0,12);
  const verifiedPrayers=countVerifiedPrayers(dream);
  const verifiedEncouragements=typeof dream.encouragementCount==='number'&&
    Number.isInteger(dream.encouragementCount)&&dream.encouragementCount>=0
      ?dream.encouragementCount:null;

  return <View style={{gap:11,marginTop:10,marginBottom:22}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10,justifyContent:'space-between'}}>
      <Text style={{color:theme.foreground,fontSize:21,fontWeight:'700'}}>Logbook</Text>
      {editable?<Pressable onPress={onWrite} accessibilityRole="button"
        accessibilityLabel={todayWritten?'Compléter la feuille du jour':'Écrire une feuille aujourd’hui'}
        style={{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:8,paddingHorizontal:4}}>
        <Ionicons name="leaf-outline" color={GREEN} size={18}/>
        <Text style={{color:GREEN,fontSize:12,fontWeight:'600'}}>
          {todayWritten?'Compléter aujourd’hui':'Écrire aujourd’hui'}
        </Text>
      </Pressable>:null}
    </View>
    {canPreviewGrowth(dream)?<Pressable accessibilityRole="button"
      onPress={()=>setPreview(!preview)}
      style={{alignSelf:'flex-start',paddingVertical:3,flexDirection:'row',gap:6,alignItems:'center'}}>
      <Ionicons name="flask-outline" color={theme.muted} size={14}/>
      <Text style={{fontSize:10,color:theme.muted}}>
        {showPreview?'Aperçu fictif actif · masquer':'Afficher des événements fictifs pour tester'}
      </Text>
    </Pressable>:null}
    {(example||verifiedPrayers!==null||verifiedEncouragements!==null)?(
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {(example||verifiedPrayers!==null)?<CompactSocialCount
          title="Prières" color={PINK} icon="prayer"
          total={example?example.prayers.total:verifiedPrayers!}
          today={example?.prayers.today}
          yesterday={example?.prayers.yesterday}/>:null}
        {(example||verifiedEncouragements!==null)?<CompactSocialCount
          title="Encouragements" color={GREEN} icon="heart"
          total={example?example.encouragements.total:verifiedEncouragements!}
          today={example?.encouragements.today}
          yesterday={example?.encouragements.yesterday}/>:null}
      </View>
    ):null}
    <HabitProgress dream={dream} onManage={onManageHabits}/>
    {shown.length===0?(
      <View style={{paddingVertical:15,gap:7,alignItems:'center'}}>
        <Ionicons name="leaf-outline" color="#8AAE9A" size={25}/>
        <Text style={{fontSize:12,color:theme.muted,textAlign:'center',lineHeight:19}}>
          Un événement important ou une note personnelle apparaîtra ici.
        </Text>
      </View>
    ):null}
    {shown.map((group,index)=>(
      <View key={group.date} style={{flexDirection:'row',gap:10,minHeight:53}}>
        <View style={{width:23,alignItems:'center'}}>
          <Ionicons name="leaf-outline" size={22} color={GREEN} style={{marginTop:1}}/>
          {index<shown.length-1?<View style={{flex:1,width:1,marginTop:4,marginBottom:-2,
            backgroundColor:'#A4BDAF'}}/>:null}
        </View>
        <View style={{flex:1,paddingBottom:18,gap:10}}>
          <Text style={{color:GREEN,fontWeight:'700',fontSize:11,
            letterSpacing:.4,lineHeight:23}}>
            {localLabel(group.date,today)}
          </Text>
          {group.notes.map(log=><View key={log.id} style={{gap:7}}>
            <Text style={{color:theme.foreground,
              fontFamily:HANDWRITING_FAMILY,fontSize:22,lineHeight:31}}>
              {log.title}
            </Text>
            {log.publicationState==='failed'&&editable?(
              <Pressable accessibilityRole="button" onPress={()=>onRetry(log)}
                style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5}}>
                <Ionicons name="refresh-outline" size={13} color={PINK}/>
                <Text style={{color:PINK,fontSize:11}}>Réessayer la publication</Text>
              </Pressable>
            ):null}
          </View>)}
          {group.changes.map((event:DreamGrowthEvent)=>{
            const color=colorFor(event.category);
            const icon=event.category==='person'?'people-outline':
              event.category==='financial'?'wallet-outline':'cube-outline';
            const label=event.kind==='need_added'?'Nouveau besoin':
              event.kind==='need_found'?'Trouvé':'À retrouver';
            return <View key={event.id} style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name={icon} size={17} color={color}/>
              <Text style={{color:theme.foreground,fontSize:12,lineHeight:19,flex:1}}>
                <Text style={{fontWeight:'700',color}}>{categoryTitle(event.category)} · </Text>
                {event.title+' · '+label}
              </Text>
            </View>;
          })}
          {group.documents.map(doc=>(
            <Pressable key={doc.id} accessibilityRole="button"
              onPress={()=>router.push({pathname:'/my-dream/library/[id]',params:{id:dream.id}})}
              style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name="document-text-outline" size={17} color={BLUE}/>
              <Text style={{color:theme.foreground,fontSize:12,lineHeight:19,flex:1}}>
                <Text style={{fontWeight:'700',color:BLUE}}>Document · </Text>
                {doc.title+(doc.version>1?' · v'+doc.version:'')+' ajouté'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.muted}/>
            </Pressable>
          ))}
          {group.previewEvents.map(event=>(
            <View key={event.id} style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name={event.kind==='document'?'document-text-outline':'cube-outline'}
                size={17} color={BLUE}/>
              <Text style={{fontSize:12,lineHeight:19,color:theme.foreground,flex:1}}>
                {event.title}
              </Text>
              <Text style={{fontSize:9,color:theme.muted}}>Démo</Text>
            </View>
          ))}
        </View>
      </View>
    ))}
    {!allOpen&&timeline.length>shown.length?<Pressable accessibilityRole="button"
      onPress={()=>setAllOpen(true)}
      style={{alignSelf:'center',padding:10}}>
      <Text style={{color:GREEN,fontSize:12,fontWeight:'600'}}>
        Voir le reste du parcours ({timeline.length-shown.length})
      </Text>
    </Pressable>:null}
  </View>;
}
