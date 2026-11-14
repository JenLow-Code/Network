import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useApp } from '@/context/AppContext';
import { MusicAudioCapture } from './MusicAudioCapture';
import { MusicAudioPreview } from './MusicAudioPreview';
import { chooseMusicFile } from '@/domain/musicMedia';
import { getDraftAttachment, saveDraftAttachment, saveDraftAudio } from '@/domain/musicLocalStorage';
import { newMusicId } from '@/domain/musicWorkspace';
import type { MusicLayer, MusicLyric, MusicProject, MusicSection, MusicSuggestion } from '@/domain/musicWorkspace';

const pink='#CB245C';
type Props={project:MusicProject;section:MusicSection;patch:(change:Partial<MusicProject>)=>void};

function ScoreLink({section}:{section:MusicSection}){
  const theme=useAppTheme();
  const [resolved,setResolved]=useState<string|null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    let live=true;let temp:string|null=null;
    setResolved(null);setError(false);
    if(section.scoreLocalId){
      void getDraftAttachment(section.scoreLocalId).then(blob=>{
        if(!blob)throw Error('not_found');
        temp=URL.createObjectURL(blob);
        if(live)setResolved(temp);
      }).catch(()=>{if(live)setError(true);});
    } else setResolved(section.scoreUrl||null);
    return()=>{live=false;if(temp)URL.revokeObjectURL(temp);};
  },[section.scoreLocalId,section.scoreUrl]);
  if(error)return <Text style={{fontSize:12,color:'#B34D67'}}>
    La partition locale est indisponible sur cet appareil.
  </Text>;
  if(!resolved)return null;
  return <Pressable onPress={()=>{void Linking.openURL(resolved);}} accessibilityRole="link"
    style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:9}}>
    <Ionicons name="document-text-outline" size={21} color={pink}/>
    <Text numberOfLines={1} style={{color:theme.foreground,fontSize:13,flex:1}}>
      {section.scoreFileName||'Ouvrir la partition'}
    </Text>
    <Ionicons name="open-outline" size={17} color={theme.muted}/>
  </Pressable>;
}
export function MusicSectionStudio({project,section,patch}:Props){
  const theme=useAppTheme();const user=useApp();
  const [currentLanguage,setCurrentLanguage]=useState(project.originalLanguage||'Français');
  const [newLanguage,setNewLanguage]=useState('');
  const [instrument,setInstrument]=useState('');
  const [uploadError,setUploadError]=useState('');
  const [uploading,setUploading]=useState(false);
  const [newTrack,setNewTrack]=useState('');
  const [trackRole,setTrackRole]=useState('');
  const [suggestionType,setSuggestionType]=useState<MusicSuggestion['kind']>('section');
  const [suggestionTitle,setSuggestionTitle]=useState('');
  const [suggestionNote,setSuggestionNote]=useState('');
  const [comment,setComment]=useState('');
  const [editingTitle,setEditingTitle]=useState(false);
  useEffect(()=>{setCurrentLanguage(project.originalLanguage||'Français');setEditingTitle(false);},
    [section.id]);
  const lyrics=project.lyrics.filter(x=>x.sectionId===section.id);
  const languages=Array.from(new Set([project.originalLanguage||'Français',...lyrics.map(x=>x.language)]));
  const currentLyric=lyrics.find(x=>x.language===currentLanguage);
  const layers=project.layers.filter(x=>x.sectionId===section.id);
  const proposals=project.suggestions.filter(x=>x.sectionId===section.id);
  const messages=project.messages.filter(x=>x.sectionId===section.id);
  const card={borderWidth:1,borderColor:theme.border,borderRadius:17,
    backgroundColor:theme.surface,padding:17,gap:13} as const;
  const input={backgroundColor:theme.background,borderWidth:1,borderColor:theme.border,
    borderRadius:10,padding:12,fontSize:13,color:theme.foreground} as const;
  const action=(title:string,onPress:()=>void,outline=false,disabled=false)=>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={{alignSelf:'flex-start',borderRadius:10,paddingHorizontal:13,paddingVertical:10,
        minHeight:41,justifyContent:'center',backgroundColor:disabled?theme.border:outline?'transparent':pink,
        borderColor:pink,borderWidth:outline?1:0}}>
      <Text style={{color:outline?pink:'#fff',fontSize:12,fontWeight:'700'}}>{title}</Text>
    </Pressable>;
  const updateSection=(updates:Partial<MusicSection>)=>patch({
    sections:project.sections.map(x=>x.id===section.id?{...x,...updates}:x),
  });
  const setLyrics=(text:string)=>{
    if(currentLyric)patch({lyrics:project.lyrics.map(x=>x.id===currentLyric.id?{...x,text,updatedAt:new Date().toISOString()}:x)});
    else{
      const lyric:MusicLyric={id:newMusicId(),sectionId:section.id,language:currentLanguage,
        text,origin:'written',updatedAt:new Date().toISOString()};
      patch({lyrics:[...project.lyrics,lyric]});
    }
  };
  const addLayer=(title:string,role:string,localAudioId?:string)=>{
    const layer:MusicLayer={id:newMusicId(),sectionId:section.id,title:title.trim()||'Nouvelle prise',
      role:role.trim()||'Instrument',contributor:user.name,createdAt:new Date().toISOString(),localAudioId};
    patch({layers:[...project.layers,layer]});
    setNewTrack('');setTrackRole('');
  };
  const importTrack=()=>{if(Platform.OS!=='web')return;
    chooseMusicFile(file=>{setUploading(true);setUploadError('');
      void saveDraftAudio(file).then(id=>addLayer(file.name.replace(/\.[^.]+$/,''),trackRole,id))
        .catch(e=>setUploadError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setUploading(false));
    });
  };
  const chooseScore=()=>{
    if(Platform.OS!=='web')return;
    if(typeof document==='undefined')return;
    const picker=document.createElement('input');
    picker.type='file';picker.accept='.pdf,.png,.jpg,.jpeg,.webp';
    picker.onchange=()=>{const file=picker.files?.[0];if(!file)return;
      setUploading(true);setUploadError('');
      void saveDraftAttachment(file).then(id=>updateSection({
        scoreLocalId:id,scoreFileName:file.name,scoreUrl:undefined,
      })).catch(e=>setUploadError(e instanceof Error?e.message:'Import de la partition impossible.'))
        .finally(()=>setUploading(false));
    };
    picker.click();
  };
  const addProposal=()=>{
    if(!suggestionTitle.trim()||!suggestionNote.trim())return;
    patch({suggestions:[...project.suggestions,{id:newMusicId(),sectionId:section.id,
      title:suggestionTitle.trim(),note:suggestionNote.trim(),kind:suggestionType,
      status:'pending',createdAt:new Date().toISOString()}]});
    setSuggestionTitle('');setSuggestionNote('');
  };
  return <View style={{gap:15}}>
    <View style={{flexDirection:'row',gap:11,alignItems:'center'}}>
      <View style={{width:48,height:48,borderRadius:13,backgroundColor:theme.dark?'#3E2A36':'#F8E7EF',
        alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="layers-outline" color={pink} size={23}/>
      </View>
      <View style={{flex:1,gap:4}}>
        {editingTitle?<TextInput value={section.title}
          onChangeText={title=>updateSection({title})}
          onBlur={()=>setEditingTitle(false)} autoFocus style={{...input,fontSize:17}}/>:
          <Text style={{color:theme.foreground,fontSize:23,fontWeight:'700'}}>{section.title}</Text>}
        <Text style={{fontSize:11,color:theme.muted}}>
          Partie du morceau · {layers.length} piste{layers.length!==1?'s':''}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Renommer cette partie"
        onPress={()=>setEditingTitle(!editingTitle)}>
        <Ionicons name={editingTitle?'checkmark':'pencil-outline'} color={pink} size={19}/>
      </Pressable>
    </View>

    <View style={card}>
      <Text style={{fontWeight:'700',fontSize:17,color:theme.foreground}}>Paroles de cette partie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap:7}}>
        {languages.map(lang=><Pressable key={lang}
          onPress={()=>setCurrentLanguage(lang)}
          style={{paddingHorizontal:13,paddingVertical:10,borderRadius:10,borderWidth:1,
            borderColor:currentLanguage===lang?pink:theme.border,
            backgroundColor:currentLanguage===lang?(theme.dark?'#3D2934':'#FAE7EF'):theme.surface}}>
          <Text style={{color:currentLanguage===lang?pink:theme.foreground,fontSize:12,
            fontWeight:currentLanguage===lang?'700':'400'}}>
            {lang}{lang===project.originalLanguage?' · originale':''}
          </Text>
        </Pressable>)}
      </ScrollView>
      <TextInput value={currentLyric?.text||''} onChangeText={setLyrics}
        multiline textAlignVertical="top" placeholder="Les paroles de cette partie…"
        placeholderTextColor={theme.muted}
        style={{...input,minHeight:155,fontSize:15,lineHeight:24}}/>
      <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:9}}>
        {action('Insérer une trame',()=>setLyrics((currentLyric?.text||'')+
          ((currentLyric?.text||'')?'\n\n':'')+section.title+'\n'),true)}
        {!!currentLyric?.text? <Text style={{color:theme.muted,fontSize:11}}>
          Paroles enregistrées dans {currentLanguage}
        </Text>:null}
      </View>
      <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
        <TextInput value={newLanguage} onChangeText={setNewLanguage}
          placeholder="Ajouter une langue…" placeholderTextColor={theme.muted}
          style={{...input,flex:1}}/>
        {action('Ajouter',()=>{
          const lang=newLanguage.trim();if(!lang||languages.some(x=>x.toLowerCase()===lang.toLowerCase()))return;
          patch({lyrics:[...project.lyrics,{id:newMusicId(),sectionId:section.id,language:lang,
            text:'',origin:'written',updatedAt:new Date().toISOString()}]});
          setCurrentLanguage(lang);setNewLanguage('');
        },true,!newLanguage.trim()||languages.some(x=>x.toLowerCase()===newLanguage.trim().toLowerCase()))}
      </View>
      <Text style={{color:theme.muted,fontSize:11,lineHeight:18}}>
        Les traductions restent distinctes de la version originale. Traduction automatique non connectée.
      </Text>
    </View>

    <View style={card}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Instruments et pistes</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
        {(section.instruments||[]).map(item=><Pressable key={item}
          onPress={()=>updateSection({instruments:(section.instruments||[]).filter(x=>x!==item)})}
          style={{borderRadius:9,backgroundColor:theme.dark?'#42333D':'#F9EBF0',
            paddingHorizontal:11,paddingVertical:8,flexDirection:'row',gap:7}}>
          <Text style={{color:theme.foreground,fontSize:12}}>{item}</Text>
          <Ionicons name="close" size={15} color={pink}/>
        </Pressable>)}
        {!(section.instruments||[]).length?
          <Text style={{color:theme.muted,fontSize:12}}>Précise les instruments de cette partie.</Text>:null}
      </View>
      <View style={{flexDirection:'row',gap:8}}>
        <TextInput value={instrument} onChangeText={setInstrument} style={{...input,flex:1}}
          placeholder="Ex. Piano, basse, voix…" placeholderTextColor={theme.muted}/>
        {action('Ajouter',()=>{
          const v=instrument.trim();if(!v)return;
          if(!(section.instruments||[]).some(x=>x.toLowerCase()===v.toLowerCase()))
            updateSection({instruments:[...(section.instruments||[]),v]});
          setInstrument('');
        },true,!instrument.trim())}
      </View>
      {layers.map(layer=><View key={layer.id}
        style={{padding:12,borderRadius:12,backgroundColor:theme.background,gap:9,
          borderWidth:1,borderColor:theme.border}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <Ionicons name="musical-note-outline" color={pink} size={21}/>
          <View style={{flex:1}}>
            <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>{layer.title}</Text>
            <Text style={{fontSize:11,color:theme.muted}}>{layer.role} · {layer.contributor}</Text>
          </View>
          <Pressable onPress={()=>patch({layers:project.layers.filter(x=>x.id!==layer.id)})}
            accessibilityLabel="Retirer cette piste">
            <Ionicons name="close-outline" size={19} color={theme.muted}/>
          </Pressable>
        </View>
        <MusicAudioPreview source={layer}/>
      </View>)}
      <View style={{gap:8}}>
        <Text style={{color:theme.muted,fontSize:12}}>Nouvelle piste</Text>
        <TextInput value={newTrack} onChangeText={setNewTrack} style={input}
          placeholder="Nom de la piste" placeholderTextColor={theme.muted}/>
        <TextInput value={trackRole} onChangeText={setTrackRole} style={input}
          placeholder="Instrument / rôle" placeholderTextColor={theme.muted}/>
        <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
          {action('Piste sans audio',()=>addLayer(newTrack,trackRole),true,!newTrack.trim())}
          {Platform.OS==='web'?action(uploading?'Import en cours…':'Importer une prise',importTrack,true,uploading):null}
        </View>
        <MusicAudioCapture onSaved={(id,filename)=>addLayer(
          newTrack.trim()||filename.replace(/\.[^.]+$/,''),trackRole,id)}/>
      </View>
      {uploadError?<Text style={{color:'#B34D67',fontSize:12}}>{uploadError}</Text>:null}
    </View>

    <View style={card}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Partition</Text>
      <ScoreLink section={section}/>
      <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
        {Platform.OS==='web'?action('Joindre une partition PDF / image',chooseScore,true,uploading):null}
        {section.scoreLocalId||section.scoreUrl? action('Retirer',()=>updateSection({
          scoreLocalId:undefined,scoreUrl:undefined,scoreFileName:undefined}),true):null}
      </View>
      <TextInput value={section.scoreLocalId?'':section.scoreUrl||''}
        onChangeText={scoreUrl=>updateSection({scoreUrl,scoreLocalId:undefined,scoreFileName:undefined})}
        placeholder={section.scoreLocalId?'Partition locale déjà jointe':'Ou coller un lien HTTPS vers la partition'}
        placeholderTextColor={theme.muted} style={input}/>
    </View>

    <View style={card}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Notes de la partie</Text>
      <TextInput value={section.notes||''} onChangeText={notes=>updateSection({notes})}
        multiline textAlignVertical="top" style={{...input,minHeight:115}}
        placeholder="Harmonies, intentions, arrangement, instructions pour les musiciens…"
        placeholderTextColor={theme.muted}/>
    </View>

    <View style={card}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Propositions pour cette partie</Text>
      {proposals.map(suggestion=><View key={suggestion.id}
        style={{paddingVertical:10,borderBottomWidth:1,borderColor:theme.border,gap:7}}>
        <Text style={{color:theme.foreground,fontWeight:'700',fontSize:13}}>{suggestion.title}</Text>
        <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>{suggestion.note}</Text>
        <Text style={{color:pink,fontSize:11}}>
          {suggestion.status==='pending'?'En attente':suggestion.status==='integrated'?'Retenue dans le dossier':'Archivée'}
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {action('Retenir',()=>patch({suggestions:project.suggestions.map(x=>x.id===suggestion.id?
            {...x,status:'integrated'}:x)}),true)}
          {action(suggestion.status==='archived'?'Réactiver':'Archiver',
            ()=>patch({suggestions:project.suggestions.map(x=>x.id===suggestion.id?
              {...x,status:suggestion.status==='archived'?'pending':'archived'}:x)}),true)}
        </View>
      </View>)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7}}>
        {([
          ['track','Nouvelle piste'],['section','Arrangement'],['lyrics','Paroles'],['style','Style']
        ] as const).map(([key,label])=><Pressable key={key}
          onPress={()=>setSuggestionType(key)} style={{padding:9,borderRadius:9,borderWidth:1,
            borderColor:suggestionType===key?pink:theme.border}}>
          <Text style={{color:suggestionType===key?pink:theme.foreground,fontSize:11}}>{label}</Text>
        </Pressable>)}
      </ScrollView>
      <TextInput value={suggestionTitle} onChangeText={setSuggestionTitle}
        placeholder="Intitulé de la proposition…" placeholderTextColor={theme.muted} style={input}/>
      <TextInput value={suggestionNote} onChangeText={setSuggestionNote}
        multiline placeholder="Que voudrais-tu essayer ou modifier ?" placeholderTextColor={theme.muted}
        style={{...input,minHeight:75}}/>
      {action('Conserver cette proposition',addProposal,false,!suggestionTitle.trim()||!suggestionNote.trim())}
      <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
        Ces propositions sont des notes de travail locales ; elles ne sont pas encore envoyées aux collaborateurs.
      </Text>
    </View>

    <View style={card}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Discussion · {section.title}</Text>
      {messages.map(message=><View key={message.id}
        style={{backgroundColor:theme.dark?'#332936':'#FAE9F0',padding:11,borderRadius:11,gap:5}}>
        <Text style={{fontSize:11,color:pink,fontWeight:'700'}}>{message.author}</Text>
        <Text style={{fontSize:13,lineHeight:19,color:theme.foreground}}>{message.text}</Text>
      </View>)}
      {!messages.length?<Text style={{fontSize:12,color:theme.muted}}>
        Aucune note de discussion pour cette partie.
      </Text>:null}
      <TextInput value={comment} onChangeText={setComment} multiline style={{...input,minHeight:64}}
        placeholder="Un retour sur cette partie…" placeholderTextColor={theme.muted}/>
      {action('Ajouter mon commentaire',()=>{
        if(!comment.trim())return;
        patch({messages:[...project.messages,{id:newMusicId(),sectionId:section.id,
          text:comment.trim(),author:user.name,createdAt:new Date().toISOString()}]});
        setComment('');
      },false,!comment.trim())}
      <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
        Discussion locale sur cette partie. Le partage en temps réel par section sera connecté au serveur ultérieurement.
      </Text>
    </View>
  </View>;
}
