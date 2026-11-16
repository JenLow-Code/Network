import React,{useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';
const pink='#CB245C';
const templates=['Intro','Couplet','Refrain','Pont','Solo','Interlude','Outro'];

export function MusicSongTabs({project,activeSectionId,onSelect,patch}:{
  project:MusicProject;activeSectionId:string;onSelect:(id:string)=>void;
  patch:(change:Partial<MusicProject>)=>void;
}){
  const theme=useAppTheme();
  const [editing,setEditing]=useState(false);
  const [custom,setCustom]=useState('');
  const add=(name:string)=>{
    if(!name.trim())return;
    const title=name.trim();
    const matches=project.sections.filter(s=>s.title.toLowerCase().startsWith(title.toLowerCase()));
    const full=matches.length&&['Couplet','Refrain'].includes(title)
      ?title+' '+(matches.length+1):title;
    const id=newMusicId();
    patch({sections:[...project.sections,{id,title:full}]});
    setCustom('');setEditing(false);onSelect(id);
  };
  const move=(i:number,offset:number)=>{
    const to=i+offset;if(to<0||to>=project.sections.length)return;
    const next=[...project.sections];[next[to],next[i]]=[next[i],next[to]];
    patch({sections:next});
  };
  return <View style={{gap:0}}>
    <View style={{flexDirection:'row',alignItems:'stretch',borderBottomWidth:1,
      borderBottomColor:theme.border}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{flex:1}} contentContainerStyle={{alignItems:'stretch',gap:4}}>
        {[{id:'',title:'Chant entier'},...project.sections].map((tab,index)=>{
          const selected=activeSectionId===tab.id;
          return <Pressable key={tab.id||'whole'} accessibilityRole="tab"
            accessibilityState={{selected}} onPress={()=>onSelect(tab.id)}
            style={{minHeight:48,paddingHorizontal:14,paddingTop:6,paddingBottom:2,
              justifyContent:'center',alignItems:'center',gap:5,borderBottomWidth:selected?3:2,
              borderBottomColor:selected?pink:'transparent'}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
              {index===0?<Ionicons name="musical-notes-outline" color={selected?pink:theme.muted} size={16}/>:null}
              <Text style={{fontSize:13,fontWeight:selected?'700':'500',
                color:selected?pink:theme.muted}}>{tab.title}</Text>
            </View>
          </Pressable>;
        })}
      </ScrollView>
      <Pressable onPress={()=>setEditing(!editing)} accessibilityRole="button"
        accessibilityLabel="Modifier la structure musicale"
        accessibilityState={{expanded:editing}}
        style={{minWidth:46,minHeight:46,alignItems:'center',justifyContent:'center',
          borderBottomWidth:editing?3:0,borderBottomColor:pink,marginLeft:7}}>
        <Ionicons name={editing?'checkmark':'options-outline'} color={editing?pink:theme.muted} size={20}/>
      </Pressable>
    </View>
    {editing?<View style={{backgroundColor:theme.surface,padding:13,borderRadius:13,
      borderWidth:1,borderColor:theme.border,marginTop:10,gap:11}}>
      <Text style={{fontWeight:'700',fontSize:12,color:theme.foreground}}>Structure du morceau</Text>
      {project.sections.map((part,i)=><View key={part.id}
        style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:35}}>
        <Text style={{flex:1,fontSize:12,color:theme.foreground}}>{i+1}. {part.title}</Text>
        <Pressable disabled={i===0} onPress={()=>move(i,-1)} accessibilityLabel={'Monter '+part.title}>
          <Ionicons name="arrow-up-outline" size={17} color={i===0?theme.border:theme.muted}/>
        </Pressable>
        <Pressable disabled={i===project.sections.length-1} onPress={()=>move(i,1)}
          accessibilityLabel={'Descendre '+part.title}>
          <Ionicons name="arrow-down-outline" size={17}
            color={i===project.sections.length-1?theme.border:theme.muted}/>
        </Pressable>
        <Pressable onPress={()=>{
          patch({sections:project.sections.filter(s=>s.id!==part.id)});
          if(activeSectionId===part.id)onSelect('');
        }} accessibilityLabel={'Retirer '+part.title}>
          <Ionicons name="close-outline" color={theme.muted} size={18}/>
        </Pressable>
      </View>)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap:7}}>
        {templates.map(name=><Pressable key={name} onPress={()=>add(name)}
          style={{paddingHorizontal:10,paddingVertical:9,borderWidth:1,
            borderColor:theme.border,borderRadius:9}}>
          <Text style={{color:theme.foreground,fontSize:11}}>+ {name}</Text>
        </Pressable>)}
      </ScrollView>
      <View style={{flexDirection:'row',gap:8}}>
        <TextInput placeholder="Autre partie…" placeholderTextColor={theme.muted}
          value={custom} onChangeText={setCustom}
          style={{flex:1,backgroundColor:theme.background,borderWidth:1,
            borderColor:theme.border,borderRadius:9,paddingHorizontal:11,
            paddingVertical:8,color:theme.foreground,fontSize:12}}/>
        <Pressable onPress={()=>add(custom)} disabled={!custom.trim()}
          style={{paddingHorizontal:13,borderRadius:9,backgroundColor:pink,justifyContent:'center',
            opacity:custom.trim()?1:.5}}>
          <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>Ajouter</Text>
        </Pressable>
      </View>
    </View>:null}
  </View>;
}
