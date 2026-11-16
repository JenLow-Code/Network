import React,{useEffect,useMemo,useState} from 'react';
import {Platform,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicFileViewer} from './MusicFileViewer';
import {MusicVersionsSection} from './MusicVersionsSection';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {importSongFile,classifySongFile} from '@/domain/musicImportedFiles';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {api} from '@/lib/api/client';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject,MusicProjectFile,MusicNeed,MusicSuggestion} from '@/domain/musicWorkspace';

type Props={project:MusicProject;patch:(change:Partial<MusicProject>)=>void;
  sectionId?:string;openSection:(id:string)=>void};
type Kind=MusicProjectFile['kind']|'version'|'talent'|'proposal'|'document';
type Item={key:string;id:string;kind:Kind;name:string;description:string;
  source:'file'|'version'|'need'|'suggestion'|'lyric'|'layer'|'score'|'note'|'remote'};
type RemoteProposal={id:string;trackPublicationId:string;trackTitle:string;
  proposer?:{displayName?:string};description:string;status:string;createdAt:string;
  credits?:{displayName:string;contribution:string}[]};
const pink='#CB245C';
const labels:Record<Kind,string>={
  document:'Document',lyrics:'Paroles',audio:'Audio',track:'Piste',
  version:'Version',score:'Partition',note:'Note',idea:'Idée',
  talent:'Talent recherché',proposal:'Collaboration',
};
const icons:Record<Kind,keyof typeof Ionicons.glyphMap>={
  document:'document-outline',lyrics:'document-text-outline',audio:'musical-note-outline',
  track:'pulse-outline',version:'layers-outline',score:'document-attach-outline',
  note:'reader-outline',idea:'bulb-outline',talent:'person-add-outline',
  proposal:'git-pull-request-outline',
};

export function MusicSongElements({project,patch,sectionId,openSection}:Props){
  const theme=useAppTheme();
  const [addMenu,setAddMenu]=useState(false);
  const [record,setRecord]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [remote,setRemote]=useState<RemoteProposal[]>([]);
  const [remoteError,setRemoteError]=useState('');
  const [busyProposal,setBusyProposal]=useState('');
  const [audioProposal,setAudioProposal]=useState<{id:string;url:string}|null>(null);
  const [editingLegacy,setEditingLegacy]=useState<string|null>(null);
  const files=project.files||[];
  const refs=[project.publishedId,...project.versions.map(v=>v.publishedId)]
    .filter((x):x is string=>!!x);
  const publicKey=[...new Set(refs)].sort().join('|');
  const sections=project.sections||[];
  const sectionName=(id:string)=>sections.find(s=>s.id===id)?.title||'Partie supprimée';
  const projectRefs=new Set(refs);
  useEffect(()=>{
    if(!publicKey){setRemote([]);return;}
    let alive=true;
    void api<{items:RemoteProposal[]}>('/api/me/music-proposals?role=received',{
      auth:'required',
    }).then(result=>{if(alive){setRemote((result.items||[]).filter(x=>
      projectRefs.has(x.trackPublicationId)));setRemoteError('');}})
      .catch(e=>{if(alive)setRemoteError(e instanceof Error?e.message:
        'Les collaborations reçues ne peuvent pas être chargées.');});
    return()=>{alive=false;};
  },[publicKey]);

  const items=useMemo<Item[]>(()=>{
    const result:Item[]=[
      ...project.versions.map(v=>({key:'v:'+v.id,id:v.id,kind:'version' as const,
        source:'version' as const,name:v.title,
        description:(v.publishedId?'Publiée':'Brouillon')+' · '+formatMusicDuration(v.durationSeconds)})),
      ...files.filter(f=>!sectionId||(f.sectionIds||[]).includes(sectionId)||
        (f.lyricSegments||[]).some(s=>s.sectionIds.includes(sectionId))||
        (f.regions||[]).some(r=>r.sectionId===sectionId))
        .map(f=>({key:'f:'+f.id,id:f.id,kind:f.kind,source:'file' as const,name:f.title,
          description:f.instrument||f.language||f.originalFilename||''})),
      ...project.layers.filter(l=>!sectionId||l.sectionId===sectionId)
        .map(l=>({key:'l:'+l.id,id:l.id,kind:'track' as const,source:'layer' as const,
          name:l.title,description:l.role||'Piste'})),
      ...project.lyrics.filter(l=>!sectionId||l.sectionId===sectionId)
        .map(l=>({key:'y:'+l.id,id:l.id,kind:'lyrics' as const,source:'lyric' as const,
          name:l.sectionId?'Paroles · '+sectionName(l.sectionId):'Paroles',
          description:l.language})),
      ...project.needs.filter(n=>!sectionId||n.sectionId===sectionId)
        .map(n=>({key:'n:'+n.id,id:n.id,kind:'talent' as const,source:'need' as const,
          name:n.label,description:n.level||'Talent recherché'})),
      ...project.suggestions.filter(p=>!sectionId||p.sectionId===sectionId)
        .map(p=>({key:'s:'+p.id,id:p.id,kind:'proposal' as const,source:'suggestion' as const,
          name:p.title,description:p.status})),
      ...(!sectionId?[]:project.sections.filter(s=>s.id===sectionId&&(s.scoreUrl||s.scoreLocalId))
        .map(s=>({key:'score:'+s.id,id:s.id,kind:'score' as const,source:'score' as const,
          name:s.scoreFileName||'Partition',description:s.title}))),
      ...(!sectionId?[]:project.sections.filter(s=>s.id===sectionId&&s.notes?.trim())
        .map(s=>({key:'note:'+s.id,id:s.id,kind:'note' as const,source:'note' as const,
          name:'Notes · '+s.title,description:'Note de la partie'})),
      ...(!sectionId?remote.filter(x=>!project.archivedRemoteProposals?.includes(x.id))
        .map(x=>({key:'r:'+x.id,id:x.id,kind:'proposal' as const,source:'remote' as const,
          name:'Proposition de '+(x.proposer?.displayName||'musicien'),
          description:x.status+' · '+x.trackTitle})):[]),
    ];
    return result.filter(x=>!sectionId||x.source!=='version');
  },[project,sectionId,remote]);

  const importFile=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('L’import de fichiers est disponible depuis le navigateur web.');return;
    }
    const picker=document.createElement('input');
    picker.type='file';
    picker.accept='.doc,.docx,.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.webm,.aac,.mid,.midi';
    picker.multiple=true;
    picker.onchange=()=>{
      const selected=Array.from(picker.files||[]);
      if(!selected.length)return;
      setUploading(true);setError('');
      void (async()=>{
        const imported:MusicProjectFile[]=[];
        for(const file of selected)imported.push(await importSongFile(file,project.originalLanguage));
        patch({files:[...files,...imported.map(f=>({
          ...f,sectionIds:sectionId?[sectionId]:[],
        }))]});
        setExpanded('f:'+imported[0].id);
        setAddMenu(false);
      })().catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setUploading(false));
    };
    picker.click();
  };
  const updateFile=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(f=>f.id===id?{...f,...change}:f)});
  const classify=(f:MusicProjectFile,kind:MusicProjectFile['kind']|'version')=>{
    setError('');
    if(kind==='version'){
      const playable=!!f.mimeType?.startsWith('audio/')||
        /\.(wav|mp3|m4a|webm|ogg|aac)$/i.test(f.originalFilename||'');
      if(!playable){setError('Une version doit être un véritable fichier audio.');return;}
      const num=project.versions.reduce((n,v)=>{
        const match=v.title.match(/^Version\s+(\d+)$/i);
        return match?Math.max(n,Number(match[1])):n;
      },project.versions.length)+1;
      const id=newMusicId();
      patch({files:files.filter(x=>x.id!==f.id),
        versions:[...project.versions,{
          id,title:'Version '+num,localAudioId:f.localFileId,
          audioUrl:f.externalUrl,durationSeconds:f.durationSeconds,
          createdAt:new Date().toISOString(),selectedForPublication:false,
        }]});
      setExpanded('v:'+id);
      return;
    }
    updateFile(f.id,classifySongFile(f,kind));
  };
  const doProposal=async(p:RemoteProposal,action:'accept'|'reject'|'publish')=>{
    setBusyProposal(p.id);setRemoteError('');
    try{
      await api('/api/music-proposals/'+encodeURIComponent(p.id)+'/'+action,{
        auth:'required',method:'POST',body:{},
      });
      setRemote(old=>old.map(x=>x.id===p.id?{...x,status:action==='accept'?'accepted':
        action==='reject'?'rejected':'published'}:x));
    }catch(e){setRemoteError(e instanceof Error?e.message:'Action impossible.');}
    finally{setBusyProposal('');}
  };
  const playProposal=async(p:RemoteProposal)=>{
    setBusyProposal(p.id);
    try{
      const result=await api<{url:string|null}>('/api/music-proposals/'+encodeURIComponent(p.id)+
        '/playback',{auth:'required'});
      if(!result.url)throw Error('Audio indisponible.');
      setAudioProposal({id:p.id,url:result.url});
    }catch(e){setRemoteError(e instanceof Error?e.message:'Lecture indisponible.');}
    finally{setBusyProposal('');}
  };
  const action=(title:string,onClick:()=>void)=><Pressable accessibilityRole="button"
    onPress={onClick} style={{paddingHorizontal:11,paddingVertical:9,borderRadius:9,
      borderWidth:1,borderColor:theme.border,alignSelf:'flex-start'}}>
    <Text style={{fontSize:11,color:theme.foreground,fontWeight:'600'}}>{title}</Text>
  </Pressable>;
  const detail=(item:Item):React.ReactNode=>{
    if(item.source==='file'){
      const f=files.find(x=>x.id===item.id);
      return f?<MusicFileViewer key={f.id} file={f} project={project} sectionId={sectionId}
        onUpdate={change=>updateFile(f.id,change)}
        onClassify={kind=>classify(f,kind)}
        onRemove={()=>{patch({files:files.filter(x=>x.id!==f.id)});setExpanded(null);}}/>:null;
    }
    if(item.source==='version'){
      return <MusicVersionsSection project={project} patch={patch} focusVersionId={item.id} inline/>;
    }
    if(item.source==='need'){
      const need=project.needs.find(x=>x.id===item.id);
      return need?<View style={{gap:9}}>
        <Text style={{fontSize:12,color:theme.foreground}}>
          {need.level||'Niveau libre'}
          {need.sourceLanguage&&need.targetLanguage?' · '+need.sourceLanguage+' → '+need.targetLanguage:''}
        </Text>
        {action('Retirer le besoin',()=>patch({
          needs:project.needs.filter(x=>x.id!==need.id),
        }))}
        <Text style={{fontSize:10,color:theme.muted}}>
          Besoin enregistré localement ; la demande publique sera reliée ultérieurement.
        </Text>
      </View>:null;
    }
    if(item.source==='remote'){
      const proposal=remote.find(x=>x.id===item.id);if(!proposal)return null;
      return <View style={{gap:10}}>
        <Text style={{fontSize:13,lineHeight:21,color:theme.foreground}}>
          {proposal.description}
        </Text>
        {(proposal.credits||[]).map((credit,i)=><Text key={i}
          style={{color:theme.muted,fontSize:11}}>
          {credit.displayName} · {credit.contribution}
        </Text>)}
        {audioProposal?.id===proposal.id?<MusicAudioPreview source={{audioUrl:audioProposal.url}}/>:null}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {action(busyProposal===proposal.id?'Ouverture…':'Écouter la proposition',
            ()=>{void playProposal(proposal);})}
          {proposal.status==='submitted'?<>
            {action('Accepter',()=>{void doProposal(proposal,'accept');})}
            {action('Refuser',()=>{void doProposal(proposal,'reject');})}
          </>:null}
          {proposal.status==='accepted'?
            action('Publier cette collaboration',()=>{void doProposal(proposal,'publish');}):null}
          {action('Archiver',()=>patch({
            archivedRemoteProposals:[...(project.archivedRemoteProposals||[]),proposal.id],
          }))}
        </View>
      </View>;
    }
    if(item.source==='layer'){
      const layer=project.layers.find(x=>x.id===item.id);
      return layer?<MusicAudioPreview source={layer}/>:null;
    }
    if(item.source==='lyric'){
      const lyric=project.lyrics.find(x=>x.id===item.id);
      return lyric?<View style={{gap:9}}>
        {editingLegacy===item.id?<TextInput value={lyric.text} multiline
          onChangeText={text=>patch({lyrics:project.lyrics.map(x=>x.id===lyric.id?{
            ...x,text,updatedAt:new Date().toISOString(),
          }:x)})} style={{minHeight:100,padding:12,borderWidth:1,
            borderColor:theme.border,borderRadius:10,color:theme.foreground}}/>:
          <Text style={{fontSize:15,lineHeight:25,color:theme.foreground}}>{lyric.text}</Text>}
        {action(editingLegacy===item.id?'Terminer':'Modifier les paroles',
          ()=>setEditingLegacy(editingLegacy===item.id?null:item.id))}
      </View>:null;
    }
    if(item.source==='suggestion'){
      const s=project.suggestions.find(x=>x.id===item.id);
      return s?<View style={{gap:8}}>
        <Text style={{fontSize:12,lineHeight:20,color:theme.foreground}}>{s.note}</Text>
        {action(s.status==='archived'?'Réactiver':'Archiver',()=>patch({
          suggestions:project.suggestions.map(x=>x.id===s.id?{
            ...x,status:s.status==='archived'?'pending':'archived',
          }:x),
        }))}
      </View>:null;
    }
    return action('Ouvrir dans la partie',()=>openSection(item.id));
  };

  return <View style={{gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{flex:1,gap:3}}>
        <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}>
          {sectionId?'Éléments · '+sectionName(sectionId):'Éléments du morceau'}
        </Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          {items.length} élément{items.length>1?'s':''}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={()=>setAddMenu(!addMenu)}
        accessibilityLabel="Ajouter un fichier ou un enregistrement"
        style={{backgroundColor:pink,borderRadius:11,minWidth:42,minHeight:40,
          justifyContent:'center',alignItems:'center'}}>
        <Ionicons name={addMenu?'close':'add'} size={22} color="#fff"/>
      </Pressable>
    </View>
    {addMenu?<View style={{gap:0,borderWidth:1,borderColor:theme.border,
      borderRadius:12,paddingHorizontal:12,backgroundColor:theme.surface}}>
      <Pressable onPress={importFile} disabled={uploading} accessibilityRole="button"
        style={{flexDirection:'row',gap:11,alignItems:'center',paddingVertical:14}}>
        <Ionicons name="cloud-upload-outline" size={21} color={pink}/>
        <Text style={{flex:1,color:theme.foreground,fontSize:13,fontWeight:'600'}}>
          {uploading?'Import en cours…':'Choisir un fichier'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
      </Pressable>
      <View style={{height:1,backgroundColor:theme.border}}/>
      <Pressable onPress={()=>setRecord(true)} accessibilityRole="button"
        style={{flexDirection:'row',gap:11,alignItems:'center',paddingVertical:14}}>
        <Ionicons name="mic-outline" size={21} color={pink}/>
        <Text style={{flex:1,color:theme.foreground,fontSize:13,fontWeight:'600'}}>
          Enregistrer un son
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
      </Pressable>
      {record?<View style={{paddingBottom:13,gap:9}}>
        <MusicAudioCapture onSaved={(localFileId,name,durationSeconds)=>{
          const file:MusicProjectFile={id:newMusicId(),title:name.replace(/\.[^.]+$/,''),
            kind:'audio',sectionIds:sectionId?[sectionId]:[],
            localFileId,originalFilename:name,mimeType:name.endsWith('m4a')?'audio/mp4':'audio/webm',
            durationSeconds,createdAt:new Date().toISOString()};
          patch({files:[...files,file]});
          setExpanded('f:'+file.id);setRecord(false);setAddMenu(false);
        }}/>
        {action('Annuler',()=>setRecord(false))}
      </View>:null}
    </View>:null}
    <View style={{gap:0}}>
      {items.map((item,index)=><View key={item.key}>
        {index>0?<View style={{height:1,backgroundColor:theme.border}}/>:null}
        <Pressable accessibilityRole="button"
          onPress={()=>setExpanded(expanded===item.key?null:item.key)}
          style={{minHeight:62,flexDirection:'row',alignItems:'center',
            paddingVertical:10,gap:11}}>
          <View style={{width:39,height:39,borderRadius:11,justifyContent:'center',
            alignItems:'center',backgroundColor:theme.dark?'#302A30':'#F7F4F1'}}>
            <Ionicons name={icons[item.kind]} color={theme.muted} size={19}/>
          </View>
          <View style={{flex:1,gap:4}}>
            <Text style={{fontWeight:'600',fontSize:13,color:theme.foreground}}
              numberOfLines={1}>{item.name}</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'}}>
              <View style={{borderRadius:13,borderWidth:1,borderColor:theme.border,
                paddingHorizontal:7,paddingVertical:2}}>
                <Text style={{fontSize:10,color:theme.muted}}>{labels[item.kind]}</Text>
              </View>
              {item.description?<Text style={{fontSize:10,color:theme.muted}}
                numberOfLines={1}>{item.description}</Text>:null}
            </View>
          </View>
          <Ionicons name={expanded===item.key?'chevron-up':'chevron-down'}
            color={theme.muted} size={17}/>
        </Pressable>
        {expanded===item.key?<View style={{paddingBottom:16,paddingHorizontal:3,gap:9}}>
          {detail(item)}
        </View>:null}
      </View>)}
    </View>
    {!items.length?<View style={{alignItems:'center',paddingVertical:19,gap:8}}>
      <Ionicons name="folder-open-outline" size={28} color={pink}/>
      <Text style={{fontSize:12,color:theme.muted,textAlign:'center'}}>
        Aucun élément pour le moment. Ajoute simplement un fichier ou une prise audio.
      </Text>
    </View>:null}
    {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
    {remoteError?<Text style={{color:'#B34D67',fontSize:12}}>{remoteError}</Text>:null}
  </View>;
}
