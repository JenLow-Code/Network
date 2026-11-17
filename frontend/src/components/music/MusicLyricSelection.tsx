import React,{useState} from 'react';
import {Platform,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicLyricReference,MusicSection} from '@/domain/musicWorkspace';

const pink='#CB245C';
type Props={
  lyrics:string;
  sections:MusicSection[];
  references:MusicLyricReference[];
  onChange:(next:MusicLyricReference[])=>void;
  onClose:()=>void;
};
export function MusicLyricSelection({lyrics,sections,references,onChange,onClose}:Props){
  const theme=useAppTheme();
  const [selection,setSelection]=useState<{start:number;end:number}|null>(null);
  const [error,setError]=useState('');
  const select=(start:number,end:number)=>{
    if(end<=start){setSelection(null);return;}
    setSelection({start,end});setError('');
  };
  const excerpt=selection?lyrics.slice(selection.start,selection.end):'';
  const add=(section:MusicSection)=>{
    if(!selection||!excerpt.trim()){setError('Sélectionne un passage des paroles.');return;}
    const exact=excerpt;
    const ref:MusicLyricReference={
      id:newMusicId(),sectionId:section.id,start:selection.start,
      end:selection.end,text:exact
    };
    onChange([...references,ref]);
    setSelection(null);setError('');
  };
  return <View style={{gap:13,padding:14,backgroundColor:theme.surface,
    borderWidth:1,borderColor:theme.border,borderRadius:15}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>Associer un extrait</Text>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer la sélection"
        style={{padding:7}}>
        <Ionicons name="close-outline" color={theme.muted} size={20}/>
      </Pressable>
    </View>
    <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
      Sélectionne les mots que tu veux utiliser. Le texte original ne sera pas modifié.
    </Text>
    {Platform.OS==='web'?React.createElement('textarea',{
      readOnly:true,value:lyrics,
      'aria-label':'Sélectionner des mots à associer à une partie',
      onSelect:(event:React.SyntheticEvent<HTMLTextAreaElement>)=>{
        const el=event.currentTarget;select(el.selectionStart,el.selectionEnd);
      },
      style:{
        width:'100%',minHeight:185,maxHeight:350,boxSizing:'border-box' as const,
        border:'1px solid '+theme.border,borderRadius:11,
        backgroundColor:theme.background,color:theme.foreground,
        padding:15,fontFamily:'Georgia, serif',fontSize:17,lineHeight:'28px',
        resize:'vertical' as const
      }
    }):<TextInput multiline editable={false} value={lyrics}
      onSelectionChange={e=>select(e.nativeEvent.selection.start,e.nativeEvent.selection.end)}
      textAlignVertical="top" style={{minHeight:185,backgroundColor:theme.background,
        borderWidth:1,borderColor:theme.border,borderRadius:11,
        padding:15,color:theme.foreground,fontSize:17,lineHeight:28}}/>}
    {excerpt.trim()?<View style={{gap:10}}>
      <Text style={{fontSize:11,fontWeight:'700',color:theme.muted}}>EXTRAIT SÉLECTIONNÉ</Text>
      <Text style={{color:theme.foreground,fontSize:15,lineHeight:22}}>{excerpt}</Text>
      <Text style={{fontSize:11,color:theme.muted}}>Associer à :</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {sections.map(section=><Pressable key={section.id} onPress={()=>add(section)}
          accessibilityRole="button" style={{borderWidth:1,borderColor:pink,
            borderRadius:10,paddingHorizontal:12,paddingVertical:10}}>
          <Text style={{fontSize:12,color:pink,fontWeight:'600'}}>{section.title}</Text>
        </Pressable>)}
      </View>
    </View>:<Text style={{fontSize:11,color:theme.muted}}>
      Aucune sélection.
    </Text>}
    {error?<Text style={{fontSize:12,color:'#AF3F57'}}>{error}</Text>:null}
  </View>;
}
