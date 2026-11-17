import React,{useState} from 'react';
import {Platform,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {musicStampMs} from '@/domain/musicEditing';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
import type {TimedLyricCue} from '@/domain/musicNext';

const PINK='#CB245C';
type Props={
  files:MusicProjectFile[];
  cues:TimedLyricCue[];
  cursor:number;
  onChange:(cues:TimedLyricCue[])=>void;
  onSeek:(seconds:number)=>void;
};
const format=(time:number)=>musicStampMs(time);
const parse=(input:string)=>{
  const s=input.trim().replace(',','.');
  if(!/^\d+(?::[0-5]?\d)?(?:\.\d{1,3})?$/.test(s))return NaN;
  const parts=s.split(':');
  return parts.length===2?60*Number(parts[0])+Number(parts[1]):Number(s);
};
export function MusicLyricTimeline({files,cues,cursor,onChange,onSeek}:Props){
  const theme=useAppTheme();
  const lyrics=files.filter(f=>f.kind==='lyrics'&&!!f.text?.trim());
  const [open,setOpen]=useState(false);
  const [chosen,setChosen]=useState('');
  const [text,setText]=useState('');
  const [start,setStart]=useState('00:00.000');
  const [end,setEnd]=useState('00:00.000');
  const [editing,setEditing]=useState('');
  const [error,setError]=useState('');
  const current=cues.find(c=>cursor>=c.startSeconds&&cursor<c.endSeconds);
  const choose=(f:MusicProjectFile)=>{
    setChosen(f.id);setText('');setEditing('');
    setStart(format(cursor));setEnd(format(cursor+2));setError('');
  };
  const save=()=>{
    const a=parse(start),b=parse(end);
    if(!text.trim()){setError('Sélectionne ou écris un passage de paroles.');return;}
    if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a){
      setError('La fin doit être après le début.');return;
    }
    const item:TimedLyricCue={id:editing||newMusicId(),sourceFileId:chosen||undefined,
      text:text.trim(),startSeconds:Math.round(a*1000)/1000,
      endSeconds:Math.round(b*1000)/1000};
    onChange([...cues.filter(c=>c.id!==item.id),item].sort((x,y)=>x.startSeconds-y.startSeconds));
    setEditing('');setText('');setError('');
  };
  const field={backgroundColor:theme.background,color:theme.foreground,
    borderWidth:1,borderColor:theme.border,borderRadius:10,padding:10,fontSize:13} as const;
  return <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:11,gap:11}}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open}}
      onPress={()=>setOpen(!open)}
      style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:42}}>
      <Ionicons name="text-outline" color={PINK} size={18}/>
      <Text style={{fontSize:13,color:theme.foreground,fontWeight:'700',flex:1}}>
        Paroles synchronisées{cues.length?' · '+cues.length:''}
      </Text>
      <Ionicons name={open?'chevron-up':'chevron-down'} size={17} color={theme.muted}/>
    </Pressable>
    {current?<View style={{borderLeftWidth:3,borderColor:PINK,padding:10,
      backgroundColor:theme.surface,borderRadius:7}}>
      <Text style={{fontSize:14,lineHeight:23,color:theme.foreground,fontWeight:'600'}}>
        {current.text}
      </Text>
    </View>:null}
    {open?<View style={{gap:12}}>
      <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
        Associe manuellement un passage de paroles à un moment de la chanson.
      </Text>
      {lyrics.length?<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
        {lyrics.map(file=><Pressable key={file.id} accessibilityRole="button"
          onPress={()=>choose(file)} style={{borderRadius:9,borderWidth:1,
            borderColor:chosen===file.id?PINK:theme.border,padding:9}}>
          <Text style={{fontSize:12,color:chosen===file.id?PINK:theme.foreground}}>
            {file.title}
          </Text>
        </Pressable>)}
      </View>:<Text style={{fontSize:12,color:theme.muted}}>
        Aucun document de paroles dans Capturer. Tu peux écrire un extrait ci-dessous.
      </Text>}
      {chosen&&lyrics.find(f=>f.id===chosen)?Platform.OS==='web'?
        React.createElement('textarea',{
          value:lyrics.find(f=>f.id===chosen)?.text||'',readOnly:true,
          'aria-label':'Sélectionner un passage de paroles',
          onSelect:(e:React.SyntheticEvent<HTMLTextAreaElement>)=>{
            const el=e.currentTarget;
            if(el.selectionEnd>el.selectionStart)
              setText(el.value.slice(el.selectionStart,el.selectionEnd));
          },
          style:{width:'100%',height:116,borderRadius:9,boxSizing:'border-box' as const,
            padding:11,border:'1px solid '+theme.border,backgroundColor:theme.background,
            color:theme.foreground,fontSize:13,lineHeight:'20px',resize:'vertical' as const}
        }):<TextInput multiline editable={false}
          value={lyrics.find(f=>f.id===chosen)?.text||''}
          onSelectionChange={e=>{
            const original=lyrics.find(f=>f.id===chosen)?.text||'';
            const {start,end}=e.nativeEvent.selection;
            if(end>start)setText(original.slice(start,end));
          }} style={{...field,minHeight:110}}/>:null}
      <TextInput multiline value={text} onChangeText={setText}
        placeholder="Extrait de paroles…" placeholderTextColor={theme.muted}
        accessibilityLabel="Paroles à synchroniser"
        style={{...field,minHeight:65,textAlignVertical:'top'}}/>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
        <View style={{flex:1,minWidth:100,gap:5}}>
          <Text style={{fontSize:11,color:theme.muted}}>Début</Text>
          <TextInput value={start} onChangeText={setStart}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Début de l’extrait" style={field}/>
          <Pressable onPress={()=>setStart(format(cursor))}>
            <Text style={{color:PINK,fontSize:11}}>Prendre le curseur</Text>
          </Pressable>
        </View>
        <View style={{flex:1,minWidth:100,gap:5}}>
          <Text style={{fontSize:11,color:theme.muted}}>Fin</Text>
          <TextInput value={end} onChangeText={setEnd}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Fin de l’extrait" style={field}/>
          <Pressable onPress={()=>setEnd(format(cursor))}>
            <Text style={{color:PINK,fontSize:11}}>Prendre le curseur</Text>
          </Pressable>
        </View>
      </View>
      {error?<Text style={{fontSize:12,color:'#B34D61'}}>{error}</Text>:null}
      <Pressable onPress={save} style={{alignSelf:'flex-start',backgroundColor:PINK,
        paddingHorizontal:14,paddingVertical:10,borderRadius:9}}>
        <Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>Associer aux temps</Text>
      </Pressable>
      {cues.map(c=><View key={c.id} style={{flexDirection:'row',gap:8,
        borderTopWidth:1,borderColor:theme.border,paddingVertical:9,alignItems:'center'}}>
        <Pressable onPress={()=>{
          onSeek(c.startSeconds);setText(c.text);setStart(format(c.startSeconds));
          setEnd(format(c.endSeconds));setChosen(c.sourceFileId||'');setEditing(c.id);
        }} style={{flex:1,gap:4}}>
          <Text style={{fontSize:10,color:PINK,fontWeight:'700'}}>
            {format(c.startSeconds)} – {format(c.endSeconds)}
          </Text>
          <Text style={{fontSize:12,lineHeight:18,color:theme.foreground}}>{c.text}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Supprimer l’extrait synchronisé"
          onPress={()=>onChange(cues.filter(x=>x.id!==c.id))}
          style={{padding:9}}>
          <Ionicons name="trash-outline" size={16} color={theme.muted}/>
        </Pressable>
      </View>)}
    </View>:null}
  </View>;
}
