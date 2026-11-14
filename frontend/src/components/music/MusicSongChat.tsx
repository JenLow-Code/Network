import React,{useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useAppTheme} from '@/theme/AppTheme';
import {useApp} from '@/context/AppContext';
import {api} from '@/lib/api/client';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';
const pink='#CB245C';

export function MusicSongChat({project,patch,referenceId,openSection}:{
  project:MusicProject;patch:(change:Partial<MusicProject>)=>void;
  referenceId?:string;openSection?:(id:string)=>void;
}){
  const theme=useAppTheme();
  const user=useApp();
  const [text,setText]=useState('');
  const [sourceId,setSourceId]=useState(referenceId||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const source=project.sections.find(s=>s.id===sourceId);
  const openShared=async(sectionId?:string)=>{
    if(!project.publishedId)return;
    setBusy(true);setError('');
    try{
      const response=await api<{conversationId:string}>('/api/music/'+
        encodeURIComponent(project.publishedId)+'/conversation',{auth:'required'});
      const linked=project.sections.find(s=>s.id===sectionId);
      router.push({pathname:'/chat/[id]',params:{
        id:response.conversationId,
        ...(linked?{sectionId:linked.id,sectionTitle:linked.title,projectId:project.id}:{}),
      }});
    }catch(e){setError(e instanceof Error?e.message:'Conversation indisponible.');}
    finally{setBusy(false);}
  };
  const sendDraft=()=>{
    if(!text.trim())return;
    patch({messages:[...project.messages,{
      id:newMusicId(),text:text.trim(),author:user.name,sectionId:source?.id,
      createdAt:new Date().toISOString(),
    }]});
    setText('');setSourceId('');
  };
  return <View style={{borderWidth:1,borderColor:theme.border,borderRadius:16,
    backgroundColor:theme.surface,padding:15,gap:13}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <Ionicons name="chatbubbles-outline" color={pink} size={23}/>
      <View style={{flex:1,gap:4}}>
        <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Discussion du morceau</Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          Une conversation pour toutes les parties du chant
        </Text>
      </View>
    </View>
    {project.messages.map(m=><View key={m.id}
      style={{backgroundColor:theme.dark?'#382D36':'#FAEDF2',
        borderRadius:12,padding:11,gap:5}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{color:pink,fontSize:11,fontWeight:'700'}}>{m.author}</Text>
        {!!m.sectionId?<Pressable onPress={()=>{
          const found=project.sections.find(s=>s.id===m.sectionId);
          if(found)openSection?.(found.id);
        }} style={{borderRadius:7,borderWidth:1,borderColor:'#E6B8CF',
          paddingHorizontal:7,paddingVertical:4}}>
          <Text style={{color:pink,fontSize:10}}>
            ↳ {project.sections.find(s=>s.id===m.sectionId)?.title||'Partie supprimée'}
          </Text>
        </Pressable>:null}
      </View>
      <Text style={{color:theme.foreground,fontSize:13,lineHeight:20}}>{m.text}</Text>
    </View>)}
    {!project.messages.length?<Text style={{color:theme.muted,fontSize:12}}>
      Aucun message pour l'instant.
    </Text>:null}
    {project.publishedId?<Pressable disabled={busy} onPress={()=>{void openShared(source?.id);}}
      style={{backgroundColor:pink,padding:12,borderRadius:10,alignItems:'center'}}>
      <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>
        {busy?'Ouverture…':'Ouvrir le chat partagé'}
      </Text>
    </Pressable>:null}
    <TextInput value={text} onChangeText={setText} multiline textAlignVertical="top"
      placeholder={project.publishedId?'Une note privée sur le morceau…':'Écrire une note dans le dossier…'}
      placeholderTextColor={theme.muted}
      style={{borderWidth:1,borderColor:theme.border,borderRadius:10,
        minHeight:66,padding:12,color:theme.foreground,fontSize:13}}/>
    {source?<Pressable onPress={()=>setSourceId('')} style={{flexDirection:'row',gap:7,alignItems:'center'}}>
      <Ionicons name="return-down-forward-outline" color={pink} size={16}/>
      <Text style={{color:pink,fontSize:11,flex:1}}>Référence : {source.title}</Text>
      <Ionicons name="close" color={theme.muted} size={17}/>
    </Pressable>:null}
    <Pressable disabled={!text.trim()} onPress={sendDraft}
      style={{backgroundColor:pink,opacity:text.trim()?1:0.5,alignSelf:'flex-start',
        paddingHorizontal:14,paddingVertical:10,borderRadius:10}}>
      <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>Conserver ma note</Text>
    </Pressable>
    <Text style={{fontSize:10,color:theme.muted,lineHeight:16}}>
      {project.publishedId?'Les notes ci-dessus restent locales ; le bouton ouvre la vraie conversation des collaborateurs.':
        'Ce dossier n’est pas encore synchronisé : les notes ne sont pas envoyées aux autres membres.'}
    </Text>
    {error?<Text style={{fontSize:12,color:'#B34D67'}}>{error}</Text>:null}
  </View>;
}
