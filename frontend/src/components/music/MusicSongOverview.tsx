import React,{useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicSongElements} from './MusicSongElements';
import {formatMusicDuration,sectionDurationSeconds} from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';

const pink='#CB245C';
const templates=['Intro','Couplet','Refrain','Pont','Solo','Interlude','Outro'];

/** The whole song is an overview of its structure and one list of its actual items. */
export function MusicSongOverview({project,patch,openSection}:{
  project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  openSection:(id:string)=>void;openChat?:()=>void;
}) {
  const theme=useAppTheme();
  const [newPart,setNewPart]=useState('');
  const [editingStructure,setEditingStructure]=useState(false);
  const input={borderWidth:1,borderColor:theme.border,backgroundColor:theme.background,
    borderRadius:9,color:theme.foreground,fontSize:12,padding:10} as const;
  const addSection=(label:string)=>{
    const name=label.trim();if(!name)return;
    const count=project.sections.filter(s=>s.title.toLowerCase().startsWith(name.toLowerCase())).length;
    const final=count&&['Couplet','Refrain'].includes(name)?name+' '+(count+1):name;
    patch({sections:[...project.sections,{id:newMusicId(),title:final}]});
    setNewPart('');
  };
  const move=(index:number,delta:number)=>{
    const target=index+delta;if(target<0||target>=project.sections.length)return;
    const next=[...project.sections];
    [next[index],next[target]]=[next[target],next[index]];
    patch({sections:next});
  };
  return <View style={{gap:16}}>
    <View style={{gap:10}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{color:theme.foreground,fontSize:16,fontWeight:'700',flex:1}}>
          Structure du morceau
        </Text>
        <Pressable onPress={()=>setEditingStructure(!editingStructure)}
          accessibilityRole="button" accessibilityLabel="Modifier la structure">
          <Ionicons name={editingStructure?'checkmark':'options-outline'} size={19}
            color={editingStructure?pink:theme.muted}/>
        </Pressable>
      </View>
      {project.sections.map((s,i)=><View key={s.id}
        style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:43,
          borderBottomWidth:1,borderColor:theme.border}}>
        <Pressable onPress={()=>openSection(s.id)} accessibilityRole="button"
          style={{flex:1,flexDirection:'row',alignItems:'center',gap:9}}>
          <Text style={{fontSize:11,color:pink,fontWeight:'700',width:20}}>{i+1}</Text>
          <Text style={{fontSize:13,color:theme.foreground,fontWeight:'600',flex:1}}>{s.title}</Text>
          <Text style={{fontSize:11,color:theme.muted}}>{formatMusicDuration(sectionDurationSeconds(project,s))}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
        </Pressable>
        {editingStructure?<View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <Pressable disabled={i===0} onPress={()=>move(i,-1)}>
            <Ionicons name="arrow-up-outline" size={17} color={i===0?theme.border:theme.muted}/>
          </Pressable>
          <Pressable disabled={i===project.sections.length-1} onPress={()=>move(i,1)}>
            <Ionicons name="arrow-down-outline" size={17}
              color={i===project.sections.length-1?theme.border:theme.muted}/>
          </Pressable>
          <Pressable onPress={()=>patch({sections:project.sections.filter(x=>x.id!==s.id)})}
            accessibilityLabel={'Supprimer '+s.title}>
            <Ionicons name="close" size={18} color={theme.muted}/>
          </Pressable>
        </View>:null}
      </View>)}
      {!project.sections.length?<Text style={{fontSize:12,color:theme.muted,lineHeight:20}}>
        Aucune structure imposée. Ajoute les parties de ton chant lorsque tu en as besoin.
      </Text>:null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
        {templates.map(name=><Pressable key={name} onPress={()=>addSection(name)}
          style={{borderWidth:1,borderColor:theme.border,borderRadius:9,
            paddingHorizontal:11,paddingVertical:9}}>
          <Text style={{fontSize:11,color:theme.foreground}}>+ {name}</Text>
        </Pressable>)}
      </ScrollView>
      {editingStructure?<View style={{flexDirection:'row',gap:7}}>
        <TextInput value={newPart} onChangeText={setNewPart} placeholderTextColor={theme.muted}
          placeholder="Nouvelle partie…" style={{...input,flex:1}}/>
        <Pressable onPress={()=>addSection(newPart)} disabled={!newPart.trim()}
          style={{backgroundColor:pink,borderRadius:9,paddingHorizontal:12,justifyContent:'center'}}>
          <Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>Ajouter</Text>
        </Pressable>
      </View>:null}
    </View>
    <View style={{height:1,backgroundColor:theme.border}}/>
    <MusicSongElements project={project} patch={patch} openSection={openSection}/>
  </View>;
}
