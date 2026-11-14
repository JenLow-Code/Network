import React,{useEffect,useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicProjectFiles} from './MusicProjectFiles';
import {MusicVersionsSection} from './MusicVersionsSection';
import {MusicTalentRequests} from './MusicTalentRequests';
import {MusicOwnerProposals} from './MusicOwnerProposals';
import {MusicFolderCover} from './MusicFolderCover';
import {projectInstruments,formatMusicDuration,sectionDurationSeconds,songDurationSeconds}
  from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';
const pink='#CB245C';
const keys=['Do','Do♯ / Ré♭','Ré','Ré♯ / Mi♭','Mi','Fa','Fa♯ / Sol♭',
  'Sol','Sol♯ / La♭','La','La♯ / Si♭','Si'];
const meter=['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'];
const templates=['Intro','Couplet','Refrain','Pont','Solo','Interlude','Outro'];

export function MusicSongOverview({project,patch,openSection,openChat}:{
  project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  openSection:(id:string)=>void;openChat:()=>void;
}){
  const theme=useAppTheme();
  const [editing,setEditing]=useState(false);
  const [bpmText,setBpmText]=useState(project.bpm?String(project.bpm):'');
  const [bpmError,setBpmError]=useState('');
  const [newPart,setNewPart]=useState('');
  const [newStyle,setNewStyle]=useState('');
  const [manualInstrument,setManualInstrument]=useState('');
  const [showInstruments,setShowInstruments]=useState(false);
  const [expandStructure,setExpandStructure]=useState(false);
  useEffect(()=>{setBpmText(project.bpm?String(project.bpm):'');setBpmError('');},[project.id]);
  const surface={borderWidth:1,borderColor:theme.border,borderRadius:16,
    backgroundColor:theme.surface,padding:15,gap:12} as const;
  const input={borderWidth:1,borderColor:theme.border,borderRadius:10,
    backgroundColor:theme.background,paddingHorizontal:11,paddingVertical:10,
    color:theme.foreground,fontSize:13} as const;
  const addSection=(label:string)=>{
    const title=label.trim();if(!title)return;
    const similar=project.sections.filter(s=>s.title.toLowerCase().startsWith(title.toLowerCase()));
    const final=similar.length&&['Couplet','Refrain'].includes(title)?title+' '+(similar.length+1):title;
    const id=newMusicId();
    patch({sections:[...project.sections,{id,title:final}]});
    setNewPart('');
  };
  const move=(index:number,delta:number)=>{
    const target=index+delta;if(target<0||target>=project.sections.length)return;
    const next=[...project.sections];
    [next[index],next[target]]=[next[target],next[index]];
    patch({sections:next});
  };
  const duration=songDurationSeconds(project);
  const instruments=projectInstruments(project);
  const compactStat=(name:string,value:string)=>
    <View style={{backgroundColor:theme.background,borderRadius:11,
      paddingVertical:9,paddingHorizontal:12,minWidth:91,gap:4}}>
      <Text style={{color:theme.muted,fontSize:10}}>{name}</Text>
      <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>{value}</Text>
    </View>;
  const chip=(name:string,selected:boolean,action:()=>void)=>
    <Pressable key={name} onPress={action}
      style={{borderColor:selected?pink:theme.border,borderWidth:1,
        borderRadius:9,paddingHorizontal:10,paddingVertical:8}}>
      <Text style={{fontSize:12,color:selected?pink:theme.foreground}}>{name}</Text>
    </Pressable>;
  return <View style={{gap:14}}>
    {/* First things first: project identity and musical foundation, never a long wizard. */}
    <View style={surface}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
        <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Vue d’ensemble</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={editing?'Terminer':'Modifier les données clés'}
          onPress={()=>setEditing(!editing)}>
          <Ionicons name={editing?'checkmark-outline':'pencil-outline'} color={pink} size={21}/>
        </Pressable>
      </View>
      {project.description?.trim()?<Text style={{color:theme.foreground,fontSize:13,lineHeight:21}}>
        {project.description}
      </Text>:null}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {compactStat('Langue',project.originalLanguage||'—')}
        {compactStat('BPM',project.bpm?String(project.bpm):'—')}
        {compactStat('Tonalité',project.musicalKey?
          project.musicalKey+' '+(project.musicalMode==='mineur'?'min.':'maj.'):'—')}
        {compactStat('Mesure',project.timeSignature||'—')}
        {compactStat('Durée',formatMusicDuration(duration))}
      </View>
      {editing?<View style={{gap:10,borderTopWidth:1,borderColor:theme.border,paddingTop:12}}>
        <TextInput value={project.description} onChangeText={description=>patch({description})}
          placeholder="Description du morceau" placeholderTextColor={theme.muted}
          multiline style={{...input,minHeight:63}}/>
        <TextInput value={project.originalLanguage} onChangeText={originalLanguage=>patch({originalLanguage})}
          placeholder="Langue originale" placeholderTextColor={theme.muted} style={input}/>
        <Text style={{fontSize:11,color:theme.muted}}>Tempo (20–300 BPM)</Text>
        <TextInput value={bpmText} keyboardType="numeric"
          onChangeText={x=>{setBpmText(x.replace(/[^0-9]/g,''));setBpmError('');}}
          onBlur={()=>{const v=Number(bpmText);if(!bpmText.trim())patch({bpm:undefined});
            else if(v>=20&&v<=300&&Number.isInteger(v))patch({bpm:v});
            else setBpmError('Indique un BPM entre 20 et 300.');}}
          placeholder="Ex. 86" placeholderTextColor={theme.muted} style={input}/>
        {bpmError?<Text style={{color:'#B34D67',fontSize:11}}>{bpmError}</Text>:null}
        <Text style={{fontSize:11,color:theme.muted}}>Tonalité</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
          {keys.map(key=>chip(key,project.musicalKey===key,()=>patch({musicalKey:key})))}
        </ScrollView>
        <View style={{flexDirection:'row',gap:7}}>
          {chip('Majeur',project.musicalMode!=='mineur',()=>patch({musicalMode:'majeur'}))}
          {chip('Mineur',project.musicalMode==='mineur',()=>patch({musicalMode:'mineur'}))}
        </View>
        <Text style={{fontSize:11,color:theme.muted}}>Signature rythmique</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {meter.map(m=>chip(m,project.timeSignature===m,()=>patch({timeSignature:m})))}
        </View>
      </View>:null}
      <View style={{gap:8,paddingTop:5,borderTopWidth:1,borderColor:theme.border}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>Styles musicaux</Text>
          <Text style={{fontSize:11,color:theme.muted}}>· {project.musicStyles?.length||0}</Text>
        </View>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {(project.musicStyles||[]).map(style=><Pressable key={style}
            onPress={()=>patch({musicStyles:(project.musicStyles||[]).filter(s=>s!==style)})}
            style={{borderRadius:9,backgroundColor:theme.dark?'#412E3A':'#F8E7EF',
              paddingHorizontal:10,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:5}}>
            <Text style={{fontSize:11,color:theme.foreground}}>{style}</Text>
            <Ionicons name="close" color={pink} size={13}/>
          </Pressable>)}
          {!project.musicStyles?.length?<Text style={{color:theme.muted,fontSize:11}}>
            Aucun style défini
          </Text>:null}
        </View>
        <View style={{flexDirection:'row',gap:7}}>
          <TextInput value={newStyle} onChangeText={setNewStyle}
            placeholder="Neo-soul, jazz fusion…" placeholderTextColor={theme.muted}
            style={{...input,flex:1}}/>
          <Pressable accessibilityLabel="Ajouter ce style" onPress={()=>{
            const v=newStyle.trim();if(!v)return;
            if(!(project.musicStyles||[]).some(s=>s.toLowerCase()===v.toLowerCase()))
              patch({musicStyles:[...(project.musicStyles||[]),v]});
            setNewStyle('');
          }} style={{justifyContent:'center',padding:10}}>
            <Ionicons name="add-circle-outline" size={25} color={pink}/>
          </Pressable>
        </View>
      </View>
      <View style={{gap:9,borderTopWidth:1,borderColor:theme.border,paddingTop:11}}>
        <Pressable onPress={()=>setShowInstruments(!showInstruments)}
          style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <Ionicons name="musical-notes-outline" color={pink} size={18}/>
          <Text style={{flex:1,color:theme.foreground,fontSize:12,fontWeight:'700'}}>
            Instruments du chant
          </Text>
          <Text style={{color:theme.muted,fontSize:11}}>{instruments.length}</Text>
          <Ionicons name={showInstruments?'chevron-up':'chevron-down'} size={17} color={theme.muted}/>
        </Pressable>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
          {instruments.map(instrument=><View key={instrument}
            style={{borderRadius:8,borderWidth:1,borderColor:theme.border,padding:7}}>
            <Text style={{fontSize:11,color:theme.foreground}}>{instrument}</Text>
          </View>)}
          {!instruments.length?<Text style={{color:theme.muted,fontSize:11}}>
            Les instruments s’afficheront à mesure que tu ajoutes des pistes.
          </Text>:null}
        </View>
        {showInstruments?<View style={{gap:7}}>
          <Text style={{color:theme.muted,fontSize:11}}>
            Vue déduite des pistes, complétée si nécessaire manuellement.
          </Text>
          <View style={{flexDirection:'row',gap:6}}>
            <TextInput value={manualInstrument} onChangeText={setManualInstrument}
              placeholder="Autre instrument…" placeholderTextColor={theme.muted}
              style={{...input,flex:1}}/>
            <Pressable onPress={()=>{
              const v=manualInstrument.trim();if(!v)return;
              if(!project.instruments.some(x=>x.toLowerCase()===v.toLowerCase()))
                patch({instruments:[...project.instruments,v]});
              setManualInstrument('');
            }} style={{padding:10}}><Ionicons name="add" color={pink} size={21}/></Pressable>
          </View>
          {project.instruments.map(instrument=><Pressable key={instrument}
            onPress={()=>patch({instruments:project.instruments.filter(x=>x!==instrument)})}>
            <Text style={{color:pink,fontSize:11}}>Retirer l’ajout manuel « {instrument} »</Text>
          </Pressable>)}
        </View>:null}
      </View>
    </View>
    <View style={surface}>
      <View style={{flexDirection:'row',gap:7,alignItems:'center'}}>
        <Ionicons name="reorder-four-outline" color={pink} size={21}/>
        <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground,flex:1}}>
          Structure du morceau
        </Text>
        <Pressable onPress={()=>setExpandStructure(!expandStructure)}>
          <Ionicons name={expandStructure?'chevron-up':'options-outline'}
            color={theme.muted} size={18}/>
        </Pressable>
      </View>
      {project.sections.map((s,index)=><View key={s.id}
        style={{flexDirection:'row',gap:10,alignItems:'center',minHeight:45,
          borderBottomWidth:1,borderColor:theme.border}}>
        <Pressable onPress={()=>openSection(s.id)} style={{flex:1,
          flexDirection:'row',alignItems:'center',gap:10}}>
          <Text style={{color:pink,fontSize:11,fontWeight:'700',width:20}}>{index+1}</Text>
          <Text style={{color:theme.foreground,fontSize:13,fontWeight:'600',flex:1}}>{s.title}</Text>
          <Text style={{color:theme.muted,fontSize:11}}>
            {formatMusicDuration(sectionDurationSeconds(project,s))}
          </Text>
          <Ionicons name="chevron-forward" color={theme.muted} size={16}/>
        </Pressable>
        {expandStructure?<View style={{flexDirection:'row',gap:9}}>
          <Pressable disabled={index===0} onPress={()=>move(index,-1)}>
            <Ionicons name="arrow-up-outline" color={index===0?theme.border:pink} size={17}/>
          </Pressable>
          <Pressable disabled={index===project.sections.length-1} onPress={()=>move(index,1)}>
            <Ionicons name="arrow-down-outline" color={index===project.sections.length-1?theme.border:pink} size={17}/>
          </Pressable>
          <Pressable onPress={()=>patch({sections:project.sections.filter(x=>x.id!==s.id)})}>
            <Ionicons name="close" color={theme.muted} size={17}/>
          </Pressable>
        </View>:null}
      </View>)}
      {!project.sections.length?<Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
        Structure libre : commence par une idée, puis ajoute tes parties lorsque le chant prend forme.
      </Text>:null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
        {templates.map(t=><Pressable key={t} onPress={()=>addSection(t)}
          style={{borderRadius:8,borderColor:theme.border,borderWidth:1,padding:8}}>
          <Text style={{fontSize:11,color:theme.foreground}}>+ {t}</Text>
        </Pressable>)}
      </ScrollView>
      <View style={{flexDirection:'row',gap:7}}>
        <TextInput value={newPart} onChangeText={setNewPart} style={{...input,flex:1}}
          placeholder="Autre partie…" placeholderTextColor={theme.muted}/>
        <Pressable disabled={!newPart.trim()} onPress={()=>addSection(newPart)}
          style={{borderRadius:9,paddingHorizontal:12,paddingVertical:11,backgroundColor:pink}}>
          <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>Ajouter</Text>
        </Pressable>
      </View>
    </View>

    <MusicProjectFiles project={project} patch={patch} openSection={openSection}/>
    <MusicVersionsSection project={project} patch={patch}/>
    <MusicTalentRequests project={project} patch={patch}/>
    <MusicOwnerProposals project={project} patch={patch}/>
    <Pressable accessibilityRole="button" onPress={openChat}
      style={{borderWidth:1,borderColor:theme.border,borderRadius:16,
        backgroundColor:theme.surface,padding:15,flexDirection:'row',
        alignItems:'center',gap:11}}>
      <Ionicons name="chatbubbles-outline" color={pink} size={23}/>
      <View style={{flex:1,gap:3}}>
        <Text style={{color:theme.foreground,fontWeight:'700',fontSize:15}}>
          Chat du morceau
        </Text>
        <Text style={{color:theme.muted,fontSize:11}}>
          Messages de toutes les parties, avec leurs références
        </Text>
      </View>
      <Ionicons name="chevron-forward" color={pink} size={18}/>
    </Pressable>
  </View>;
}
