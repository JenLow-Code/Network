import React,{useEffect,useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {projectInstruments,formatMusicDuration,songDurationSeconds} from '@/domain/musicProjectSelectors';
import type {MusicProject} from '@/domain/musicWorkspace';

const accent='#CB245C';
const keys=['Do','Do♯ / Ré♭','Ré','Ré♯ / Mi♭','Mi','Fa','Fa♯ / Sol♭',
  'Sol','Sol♯ / La♭','La','La♯ / Si♭','Si'];
const signatures=['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'];

/** Always visible at the top of a creative folder, even when switching song sections. */
export function MusicSongMetadata({project,patch}:{
  project:MusicProject;patch:(change:Partial<MusicProject>)=>void;
}) {
  const theme=useAppTheme();
  const [editing,setEditing]=useState(false);
  const [bpmText,setBpmText]=useState(project.bpm?String(project.bpm):'');
  const [bpmError,setBpmError]=useState('');
  const [style,setStyle]=useState('');
  const [instrument,setInstrument]=useState('');
  const [expandInstruments,setExpandInstruments]=useState(false);
  useEffect(()=>{setBpmText(project.bpm?String(project.bpm):'');setBpmError('');},[project.id]);

  const input={borderWidth:1,borderColor:theme.border,backgroundColor:theme.background,
    paddingHorizontal:11,paddingVertical:9,borderRadius:9,color:theme.foreground,fontSize:13} as const;
  const chip=(label:string,selected:boolean,onPress:()=>void)=><Pressable key={label}
    accessibilityRole="button" onPress={onPress} style={{borderWidth:1,
      borderColor:selected?accent:theme.border,borderRadius:9,paddingHorizontal:10,paddingVertical:8}}>
    <Text style={{color:selected?accent:theme.foreground,fontSize:11}}>{label}</Text>
  </Pressable>;
  const stat=(label:string,value:string)=><View style={{flexGrow:1,flexBasis:'20%',minWidth:68,
    paddingHorizontal:10,paddingVertical:9,borderRadius:10,
    backgroundColor:theme.dark?'#322B30':'#F7F3EF',gap:5}}>
    <Text style={{fontSize:10,color:theme.muted}}>{label}</Text>
    <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}} numberOfLines={1}>{value}</Text>
  </View>;
  const instruments=projectInstruments(project);
  return <View style={{gap:11}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
      {stat('Langue',project.originalLanguage||'—')}
      {stat('Tempo',project.bpm?project.bpm+' BPM':'—')}
      {stat('Tonalité',project.musicalKey?
        project.musicalKey+' '+(project.musicalMode==='mineur'?'min.':'maj.'):'—')}
      {stat('Mesure',project.timeSignature||'—')}
      {stat('Durée',formatMusicDuration(songDurationSeconds(project)))}
    </View>
    <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
      <Text style={{color:theme.muted,fontSize:11}}>Styles</Text>
      {(project.musicStyles||[]).map(item=><Pressable key={item}
        accessibilityLabel={'Retirer le style '+item}
        onPress={()=>patch({musicStyles:(project.musicStyles||[]).filter(x=>x!==item)})}
        style={{backgroundColor:theme.dark?'#3A2C35':'#F8E9EE',borderRadius:20,
          paddingHorizontal:10,paddingVertical:6,flexDirection:'row',gap:5,alignItems:'center'}}>
        <Text style={{color:theme.foreground,fontSize:11}}>{item}</Text>
        {editing?<Ionicons name="close" size={13} color={accent}/>:null}
      </Pressable>)}
      {!(project.musicStyles||[]).length?
        <Text style={{color:theme.muted,fontSize:11}}>Non défini</Text>:null}
      <Pressable onPress={()=>setEditing(!editing)} accessibilityRole="button"
        accessibilityLabel="Modifier les informations musicales"
        style={{marginLeft:'auto',padding:7}}>
        <Ionicons name={editing?'checkmark':'pencil-outline'} size={18} color={accent}/>
      </Pressable>
    </View>
    <Pressable onPress={()=>setExpandInstruments(!expandInstruments)}
      accessibilityRole="button" accessibilityState={{expanded:expandInstruments}}
      style={{flexDirection:'row',alignItems:'center',gap:7}}>
      <Ionicons name="musical-notes-outline" color={theme.muted} size={16}/>
      <Text style={{fontSize:11,color:theme.muted,flex:1}}>
        {instruments.length?'Instruments : '+instruments.join(', '):'Instruments : à définir avec les pistes'}
      </Text>
      <Ionicons name={expandInstruments?'chevron-up':'chevron-down'} color={theme.muted} size={15}/>
    </Pressable>
    {expandInstruments?<View style={{gap:8}}>
      <Text style={{fontSize:11,color:theme.muted}}>Instruments des pistes, complétés si nécessaire :</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
        {instruments.map(item=><View key={item} style={{borderColor:theme.border,borderWidth:1,
          borderRadius:8,padding:7}}>
          <Text style={{fontSize:11,color:theme.foreground}}>{item}</Text>
        </View>)}
      </View>
      <View style={{flexDirection:'row',gap:7}}>
        <TextInput value={instrument} onChangeText={setInstrument} placeholderTextColor={theme.muted}
          placeholder="Ajouter un instrument…" style={{...input,flex:1}}/>
        <Pressable accessibilityLabel="Ajouter l’instrument" onPress={()=>{
          const name=instrument.trim();if(!name)return;
          if(!project.instruments.some(x=>x.toLowerCase()===name.toLowerCase()))
            patch({instruments:[...project.instruments,name]});
          setInstrument('');
        }} style={{padding:10,justifyContent:'center'}}>
          <Ionicons name="add-circle-outline" color={accent} size={23}/>
        </Pressable>
      </View>
      {project.instruments.map(item=><Pressable key={item}
        onPress={()=>patch({instruments:project.instruments.filter(x=>x!==item)})}>
        <Text style={{color:accent,fontSize:11}}>Retirer l'ajout manuel : {item}</Text>
      </Pressable>)}
    </View>:null}
    <MusicMissingTalentAction project={project} patch={patch}/>
    {editing?<View style={{gap:11,padding:12,borderRadius:12,borderWidth:1,borderColor:theme.border}}>
      <Text style={{color:theme.muted,fontSize:11}}>Langue originale</Text>
      <TextInput value={project.originalLanguage}
        onChangeText={originalLanguage=>patch({originalLanguage})} style={input}/>
      <Text style={{color:theme.muted,fontSize:11}}>Tempo (20–300 BPM)</Text>
      <TextInput value={bpmText} keyboardType="numeric" style={input}
        onChangeText={value=>{setBpmText(value.replace(/[^0-9]/g,''));setBpmError('');}}
        onEndEditing={()=>{
          const value=Number(bpmText);
          if(!bpmText.trim())patch({bpm:undefined});
          else if(Number.isInteger(value)&&value>=20&&value<=300)patch({bpm:value});
          else setBpmError('Tempo entre 20 et 300 BPM requis.');
        }}/>
      {!!bpmError&&<Text style={{fontSize:11,color:'#B34D67'}}>{bpmError}</Text>}
      <Text style={{fontSize:11,color:theme.muted}}>Tonalité</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
        {keys.map(key=>chip(key,project.musicalKey===key,()=>patch({musicalKey:key})))}
      </ScrollView>
      <View style={{flexDirection:'row',gap:7}}>
        {chip('Majeur',project.musicalMode!=='mineur',()=>patch({musicalMode:'majeur'}))}
        {chip('Mineur',project.musicalMode==='mineur',()=>patch({musicalMode:'mineur'}))}
      </View>
      <Text style={{fontSize:11,color:theme.muted}}>Mesure</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
        {signatures.map(item=>chip(item,project.timeSignature===item,()=>patch({timeSignature:item})))}
      </View>
      <Text style={{fontSize:11,color:theme.muted}}>Styles musicaux</Text>
      <View style={{flexDirection:'row',gap:7}}>
        <TextInput value={style} onChangeText={setStyle} style={{...input,flex:1}}
          placeholder="Gospel, Neo-soul…" placeholderTextColor={theme.muted}/>
        <Pressable onPress={()=>{
          const s=style.trim();
          if(s&&!(project.musicStyles||[]).some(x=>x.toLowerCase()===s.toLowerCase()))
            patch({musicStyles:[...(project.musicStyles||[]),s]});
          setStyle('');
        }} accessibilityLabel="Ajouter un style musical" style={{padding:10}}>
          <Ionicons name="add-circle-outline" color={accent} size={23}/>
        </Pressable>
      </View>
    </View>:null}
  </View>;
}
