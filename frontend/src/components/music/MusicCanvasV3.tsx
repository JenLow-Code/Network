import React,{useState} from 'react';
import {Platform,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {MusicLocalArt} from './MusicLocalArtNext';
import {MusicMaterialViewer} from './MusicMaterialViewerV3';
import {importSongFile,classifySongFile} from '@/domain/musicImportedFiles';
import {newMusicId} from '@/domain/musicWorkspace';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import type {MusicProject,MusicProjectFile,MusicSection} from '@/domain/musicWorkspace';

const pink='#CB245C';
type Props={project:MusicProject;patch:(change:Partial<MusicProject>)=>void;
  onStartVersion:(file:MusicProjectFile)=>void;onUseFile:(file:MusicProjectFile)=>void;
  activeVersion:boolean;};
const artwork=(f:MusicProjectFile)=>/\.(jpg|jpeg|png|webp)$/i.test(f.originalFilename||'');
const audio=(f:MusicProjectFile)=>!!f.mimeType?.startsWith('audio/')||
  /\.(wav|mp3|m4a|webm|ogg|aac)$/i.test(f.originalFilename||'');
const label=(f:MusicProjectFile)=>{
  if(artwork(f))return 'Inspiration';
  return ({lyrics:'Paroles',audio:'Enregistrement',track:'Piste MIDI / audio',
    score:'Partition',idea:'Idée',note:'Note',document:'Document'} as const)[f.kind];
};
const glyph=(f:MusicProjectFile):keyof typeof Ionicons.glyphMap=>
  f.kind==='lyrics'?'document-text-outline':audio(f)?'mic-outline':
  f.kind==='track'?'musical-notes-outline':f.kind==='note'?'create-outline':
  f.kind==='idea'?'bulb-outline':'document-outline';
const preview=(f:MusicProjectFile)=>
  f.lyricSegments?.length&&f.kind==='lyrics'
    ?f.lyricSegments.map(s=>s.text).join('\n\n'):(f.text||'');

export function MusicCanvasV3({project,patch,onStartVersion,onUseFile,activeVersion}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const isMobile=width<690;
  const [selected,setSelected]=useState('');
  const [composer,setComposer]=useState<'none'|'write'|'record'>('none');
  const [writeText,setWriteText]=useState('');
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState(false);
  const files=project.files||[];
  const file=files.find(f=>f.id===selected)||null;
  const field={borderWidth:1,borderColor:theme.border,borderRadius:12,
    backgroundColor:theme.surface,color:theme.foreground,paddingHorizontal:15,
    paddingVertical:12,fontSize:15,lineHeight:24} as const;
  const update=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(f=>f.id===id?{...f,...change}:f)});
  const createNote=()=>{
    const content=writeText.trim();if(!content)return;
    const draft:MusicProjectFile={id:newMusicId(),title:content.split('\n')[0].slice(0,46),
      kind:'note',text:content,sectionIds:[],createdAt:new Date().toISOString()};
    patch({files:[...files,draft]});setWriteText('');setComposer('none');
    setSelected(draft.id);
  };
  const onRecorded=(localFileId:string,filename:string,durationSeconds?:number)=>{
    const draft:MusicProjectFile={id:newMusicId(),title:'Prise '+(files.length+1),
      kind:'audio',sectionIds:[],localFileId,originalFilename:filename,
      mimeType:/\.m4a$/i.test(filename)?'audio/mp4':'audio/webm',
      durationSeconds,createdAt:new Date().toISOString()};
    patch({files:[...files,draft]});setComposer('none');setSelected(draft.id);
  };
  const pick=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('Import disponible depuis le navigateur web.');return;
    }
    const input=document.createElement('input');
    input.type='file';input.multiple=true;
    input.accept='.doc,.docx,.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.aac,.webm,.mid,.midi';
    input.onchange=()=>{
      const picked=Array.from(input.files||[]);
      if(!picked.length)return;
      setError('');setUploading(true);
      void (async()=>{
        const added:MusicProjectFile[]=[];
        for(const f of picked)added.push(await importSongFile(f,project.originalLanguage));
        patch({files:[...files,...added]});
        setSelected(added[0].id);
      })().catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setUploading(false));
    };
    input.click();
  };
  const section=(f:MusicProjectFile,part:MusicSection)=>{
    const ids=f.sectionIds||[];
    update(f.id,{sectionIds:ids.includes(part.id)?
      ids.filter(id=>id!==part.id):[...ids,part.id]});
  };
  const createPart=(f:MusicProjectFile,name:string,stanzaId?:string)=>{
    const exists=project.sections.find(s=>s.title.trim().toLowerCase()===
      name.trim().toLowerCase());
    const part=exists||{id:newMusicId(),title:name.trim()};
    const updatedFiles=files.map(item=>{
      if(item.id!==f.id)return item;
      if(stanzaId)return {...item,lyricSegments:(item.lyricSegments||[]).map(s=>
        s.id===stanzaId?{...s,sectionIds:[...s.sectionIds,part.id]}:s)};
      return {...item,sectionIds:[...(item.sectionIds||[]),part.id]};
    });
    patch({sections:exists?project.sections:[...project.sections,part],files:updatedFiles});
  };
  const changeType=(id:string,kind:MusicProjectFile['kind'])=>{
    const f=files.find(x=>x.id===id);if(!f)return;
    update(id,classifySongFile(f,kind));
  };
  const quick=(name:string,icon:keyof typeof Ionicons.glyphMap,
    onPress:()=>void,primary=false)=><Pressable onPress={onPress}
      accessibilityRole="button" accessibilityLabel={name}
      style={{flexDirection:'row',alignItems:'center',justifyContent:'center',
        gap:8,minHeight:46,paddingHorizontal:isMobile?13:17,
        borderRadius:13,backgroundColor:primary?pink:theme.surface,
        borderWidth:primary?0:1,borderColor:theme.border}}>
      <Ionicons name={icon} size={18} color={primary?'#fff':pink}/>
      <Text style={{color:primary?'#fff':theme.foreground,
        fontSize:13,fontWeight:'600'}}>{name}</Text>
    </Pressable>;
  return <View style={{gap:22}}>
    <View style={{gap:13}}>
      <View style={{gap:5}}>
        <Text style={{color:theme.foreground,fontSize:21,fontWeight:'700'}}>Le carnet</Text>
        <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
          Un endroit pour tout ce qui inspire ton morceau.
        </Text>
      </View>
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
        {quick('Enregistrer','mic-outline',()=>setComposer(
          composer==='record'?'none':'record'),true)}
        {quick(uploading?'Import…':'Importer','add-outline',pick)}
        {quick('Écrire','pencil-outline',()=>setComposer(
          composer==='write'?'none':'write'))}
      </View>
    </View>
    {composer!=='none'?<View style={{backgroundColor:theme.surface,borderRadius:17,
      borderWidth:1,borderColor:theme.border,padding:isMobile?14:21,gap:12,
      maxWidth:680}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>
          {composer==='record'?'Une nouvelle prise':'Une nouvelle idée'}
        </Text>
        <Pressable onPress={()=>setComposer('none')}
          accessibilityLabel="Fermer la saisie"
          style={{width:34,height:34,justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="close" size={20} color={theme.muted}/>
        </Pressable>
      </View>
      {composer==='record'?<MusicAudioCapture onSaved={onRecorded}/>:
        <View style={{gap:11}}>
          <TextInput multiline value={writeText} onChangeText={setWriteText}
            autoFocus textAlignVertical="top" placeholder="Ce qui te vient à l'esprit…"
            placeholderTextColor={theme.muted}
            style={{...field,minHeight:160,borderWidth:0}}/>
          <View style={{flexDirection:'row',justifyContent:'flex-end'}}>
            {quick('Conserver','checkmark',createNote,true)}
          </View>
        </View>}
    </View>:null}
    {error?<Text style={{color:'#A83C55',fontSize:12}}>{error}</Text>:null}
    <View style={{gap:12}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{color:theme.foreground,fontSize:15,fontWeight:'700'}}>
          Dans ce morceau
        </Text>
        {files.length>0?<Text style={{color:theme.muted,fontSize:12}}>
          {files.length}
        </Text>:null}
      </View>
      {!files.length?<View style={{maxWidth:630,paddingVertical:43,gap:11,
        alignItems:'center',justifyContent:'center',borderTopWidth:1,
        borderColor:theme.border}}>
        <Ionicons name="musical-notes-outline" color={pink} size={29}/>
        <Text style={{fontSize:13,color:theme.muted,textAlign:'center'}}>
          Une note, une photo ou quelques secondes d'audio peuvent suffire.
        </Text>
      </View>:null}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'flex-start'}}>
        {files.map(f=>{
          const original=preview(f).trim();
          const illustration=artwork(f);
          return <Pressable key={f.id} onPress={()=>setSelected(f.id)}
            accessibilityRole="button" accessibilityLabel={'Ouvrir '+f.title}
            style={{width:isMobile?'100%':'48.7%',minHeight:illustration?185:134,
              backgroundColor:theme.surface,borderRadius:19,borderWidth:1,
              borderColor:theme.border,overflow:'hidden',
              padding:illustration?0:17,gap:11}}>
            {illustration?<View style={{width:'100%',height:164,overflow:'hidden'}}>
              <MusicLocalArt file={f} size={164}/>
            </View>:null}
            <View style={{gap:10,padding:illustration?16:0}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
                <Ionicons name={illustration?'image-outline':glyph(f)}
                  size={16} color={pink}/>
                <Text style={{fontSize:11,color:theme.muted,flex:1}}>
                  {label(f)}
                </Text>
                <Ionicons name="arrow-forward-outline" size={15} color={theme.muted}/>
              </View>
              <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}
                numberOfLines={1}>{f.title}</Text>
              {audio(f)&&f.localFileId?<MusicAudioPeaks file={f}/>:null}
              {original?<Text numberOfLines={f.kind==='lyrics'?4:3}
                style={{fontSize:f.kind==='lyrics'?14:12,
                  lineHeight:f.kind==='lyrics'?22:19,
                  color:f.kind==='lyrics'?theme.foreground:theme.muted}}>
                {original}
              </Text>:null}
              {f.durationSeconds!==undefined?<Text style={{fontSize:11,color:theme.muted}}>
                {formatMusicDuration(f.durationSeconds)}
              </Text>:null}
            </View>
          </Pressable>;
        })}
      </View>
    </View>
    <MusicMaterialViewer visible={!!file} key={file?.id||'closed'}
      file={file} project={project} onClose={()=>setSelected('')}
      onUpdate={update} onChangeType={changeType}
      onSection={section} onNewSection={createPart}
      onStartVersion={onStartVersion} onUseFile={onUseFile}
      hasVersion={activeVersion}/>
  </View>;
}
