import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry, DreamNoteBlock } from '@/domain/dreamWorkspace';

const id = () => 'note-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const accent: Record<NonNullable<DreamNoteBlock['color']>, string> = {
  default: '', pink: '#C02772', blue: '#3A729D', green: '#3C795E', sand: '#A46E3A',
};
const types: {type:DreamNoteBlock['type'];label:string;icon:keyof typeof Ionicons.glyphMap}[] = [
  {type:'text',label:'Texte',icon:'text-outline'},
  {type:'heading',label:'Titre',icon:'text'},
  {type:'bullet',label:'Liste à puces',icon:'list-outline'},
  {type:'numbered',label:'Liste numérotée',icon:'list-circle-outline'},
  {type:'checklist',label:'Cases à cocher',icon:'checkbox-outline'},
  {type:'toggle',label:'Section à déplier',icon:'chevron-down-circle-outline'},
  {type:'quote',label:'Citation',icon:'chatbubble-outline'},
];

/** Shared owner-only notebook for Semence, Germination and Croissance. */
export default function SemenceNotes({dream,editable}:{dream:DreamEntry;editable:boolean}) {
  const theme=useAppTheme();
  const {patch}=useDreams();
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [typesOpen,setTypesOpen]=useState(false);
  const [colorsOpen,setColorsOpen]=useState(false);
  const [readOnlyExpanded,setReadOnlyExpanded]=useState<Record<string,boolean>>({});
  // Read legacy notebooks without erasing their saved content.
  const legacy: DreamNoteBlock[] = [
    ...(dream.privateDiary?.trim()?[{id:'legacy-diary',type:'text' as const,text:dream.privateDiary}]:[]),
    ...(dream.blocks||[]).filter(b=>b.kind==='todo').map(b=>({
      id:'legacy-todo-'+b.id,type:'checklist' as const,text:b.content,checked:!!b.checked,
    })),
  ];
  const items = dream.privateNotesBlocks ?? legacy;
  const selected=items.find(b=>b.id===selectedId)||items[items.length-1];
  const selectedKey=selected?.id;
  const persist=(next:DreamNoteBlock[])=>{
    if(!editable)return;
    patch(dream.id,{
      privateNotesBlocks:next,
      // All legacy content is carried into the structured notebook on first edit.
      privateDiary:'',
      blocks:(dream.blocks||[]).filter(b=>b.kind!=='todo'),
    });
  };
  const modify=(blockId:string,changes:Partial<DreamNoteBlock>)=>
    persist(items.map(b=>b.id===blockId?{...b,...changes}:b));
  const add=(type:DreamNoteBlock['type'],text='')=>{
    if(!editable)return;
    const block:DreamNoteBlock={id:id(),type,text,color:'default'};
    persist([...items,block]);setSelectedId(block.id);
    setTypesOpen(false);setColorsOpen(false);
  };
  const format=(changes:(b:DreamNoteBlock)=>DreamNoteBlock)=>{
    if(!editable)return;
    if(!selectedKey){
      const block=changes({id:id(),type:'text',text:'',color:'default'});
      persist([...items,block]);setSelectedId(block.id);return;
    }
    persist(items.map(b=>b.id===selectedKey?changes(b):b));
  };
  const pill=(icon:keyof typeof Ionicons.glyphMap,label:string,onPress:()=>void,active=false)=>
    <Pressable key={label} onPress={onPress} disabled={!editable}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}}
      style={{minWidth:37,height:38,paddingHorizontal:9,borderRadius:9,
        alignItems:'center',justifyContent:'center',backgroundColor:active?theme.surface:'transparent',
        borderWidth:active?1:0,borderColor:theme.border}}>
      <Ionicons name={icon} size={18} color={active?theme.foreground:theme.muted}/>
    </Pressable>;

  return <View style={{gap:15,paddingBottom:15}}>
    <View style={{gap:5}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
        <Ionicons name="lock-closed-outline" size={13} color={theme.muted}/>
        <Text style={{fontSize:11,color:theme.muted,flex:1}}>
          Notes personnelles · visibles uniquement par toi
        </Text>
        {editable?<Text style={{fontSize:10,color:theme.muted}}>Enregistrement auto</Text>:null}
      </View>
    </View>

    {editable?<View style={{gap:7}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always"
        contentContainerStyle={{gap:4,alignItems:'center',paddingRight:5}}>
        {pill('text-outline','Choisir un type de bloc',()=>{setTypesOpen(!typesOpen);setColorsOpen(false);},typesOpen)}
        <View style={{width:1,height:21,backgroundColor:theme.border,marginHorizontal:3}}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Gras"
          onPress={()=>format(b=>({...b,bold:!b.bold}))}
          style={{minWidth:38,height:38,alignItems:'center',justifyContent:'center',
            borderRadius:9,backgroundColor:selected?.bold?theme.surface:'transparent'}}>
          <Text style={{fontWeight:'900',fontSize:17,color:theme.foreground}}>B</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Italique"
          onPress={()=>format(b=>({...b,italic:!b.italic}))}
          style={{minWidth:38,height:38,alignItems:'center',justifyContent:'center',
            borderRadius:9,backgroundColor:selected?.italic?theme.surface:'transparent'}}>
          <Text style={{fontFamily:'serif',fontStyle:'italic',fontSize:20,color:theme.foreground}}>I</Text>
        </Pressable>
        {pill('list-outline','Liste à puces',()=>format(b=>({...b,type:'bullet'})),selected?.type==='bullet')}
        {pill('checkbox-outline','Cases à cocher',()=>format(b=>({...b,type:'checklist'})),selected?.type==='checklist')}
        {pill('chevron-down-outline','Section dépliable',()=>format(b=>({...b,type:'toggle'})),selected?.type==='toggle')}
        {pill('color-palette-outline','Couleur du texte',()=>{setColorsOpen(!colorsOpen);setTypesOpen(false);},colorsOpen)}
      </ScrollView>
      {colorsOpen?<View style={{flexDirection:'row',gap:11,alignItems:'center',padding:7}}>
        {(Object.keys(accent) as (keyof typeof accent)[]).map(color=>
          <Pressable key={color} accessibilityRole="button" accessibilityLabel={'Couleur '+color}
            onPress={()=>{format(b=>({...b,color}));setColorsOpen(false);}}
            style={{width:28,height:28,borderRadius:14,
              backgroundColor:color==='default'?theme.foreground:accent[color],
              borderWidth:selected?.color===color?3:0,
              borderColor:theme.background}}/>)}
      </View>:null}
      {typesOpen?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7,
        padding:10,backgroundColor:theme.surface,borderRadius:12,
        borderWidth:1,borderColor:theme.border}}>
        {types.map(t=><Pressable key={t.type} onPress={()=>{
          if(selectedKey)format(b=>({...b,type:t.type}));
          else add(t.type);
          setTypesOpen(false);
        }} accessibilityRole="button"
          style={{paddingHorizontal:10,paddingVertical:10,flexDirection:'row',
            gap:6,alignItems:'center',borderRadius:8,
            backgroundColor:theme.background}}>
          <Ionicons name={t.icon} size={15} color={theme.muted}/>
          <Text style={{fontSize:12,color:theme.foreground}}>{t.label}</Text>
        </Pressable>)}
      </View>:null}
    </View>:null}

    <View style={{gap:7}}>
      {items.length===0?(
        editable?<TextInput multiline accessibilityLabel="Commencer une note"
          placeholder="Écris librement…"
          placeholderTextColor={theme.muted}
          onChangeText={value=>{if(value)add('text',value);}}
          style={{minHeight:98,textAlignVertical:'top',fontSize:17,lineHeight:27,
            paddingHorizontal:2,color:theme.foreground}}/>:
        <Text style={{fontSize:13,color:theme.muted,paddingVertical:20}}>Aucune note pour le moment.</Text>
      ):items.map((b,index)=>{
        const ink=b.color&&b.color!=='default'?accent[b.color]:theme.foreground;
        const collapsed=editable?!!b.collapsed:(readOnlyExpanded[b.id]??!!b.collapsed);
        const fontSize=b.type==='heading'?24:b.type==='quote'?19:16;
        const style={color:ink,fontSize,lineHeight:fontSize*1.45,
          fontWeight:(b.bold||b.type==='heading'?'700':'400') as '700'|'400',
          fontStyle:(b.italic||b.type==='quote'?'italic':'normal') as 'italic'|'normal',
          fontFamily:b.type==='heading'||b.type==='quote'?'serif':undefined,
          padding:0,margin:0,flex:1};
        const textField=(value:string,change:(v:string)=>void,placeholder:string,multiline=true)=>
          <TextInput value={value} editable={editable} multiline={multiline}
            autoFocus={editable&&selectedId===b.id&&(b.type!=='toggle'||placeholder==='Titre de la section')}
            onFocus={()=>setSelectedId(b.id)} onChangeText={change}
            textAlignVertical="top" placeholder={placeholder}
            placeholderTextColor={theme.muted}
            accessibilityLabel={placeholder}
            style={{...style,minHeight:b.type==='heading'?40:27}}/>;
        return <View key={b.id} style={{flexDirection:'row',alignItems:'flex-start',gap:9,
          paddingVertical:8,
          paddingLeft:b.type==='quote'?12:0,
          borderLeftWidth:b.type==='quote'?2:0,
          borderLeftColor:b.type==='quote'?ink:'transparent'}}>
          {b.type==='bullet'?<Text style={{fontSize:20,color:ink,marginTop:0}}>•</Text>:null}
          {b.type==='numbered'?<Text style={{fontSize:15,color:ink,marginTop:3}}>
            {items.slice(0,index+1).filter(x=>x.type==='numbered').length}.
          </Text>:null}
          {b.type==='checklist'?<Pressable disabled={!editable} accessibilityRole="checkbox"
            accessibilityState={{checked:!!b.checked,disabled:!editable}}
            accessibilityLabel="Cocher cette note"
            onPress={()=>modify(b.id,{checked:!b.checked})}
            style={{padding:2,marginTop:2}}>
            <Ionicons name={b.checked?'checkbox':'square-outline'} size={21}
              color={b.checked?'#3C795E':theme.muted}/>
          </Pressable>:null}
          {b.type==='toggle'?<Pressable accessibilityRole="button"
            accessibilityLabel={collapsed?'Déplier':'Replier'}
            onPress={()=>editable?modify(b.id,{collapsed:!collapsed}):
              setReadOnlyExpanded(previous=>({...previous,[b.id]:!collapsed}))}
            style={{padding:2,marginTop:2}}>
            <Ionicons name={collapsed?'chevron-forward':'chevron-down'} size={20} color={theme.muted}/>
          </Pressable>:null}
          <View style={{flex:1,gap:5}}>
            {b.type==='toggle'?<>
              {textField(b.title||'',title=>modify(b.id,{title}), 'Titre de la section',false)}
              {!collapsed?textField(b.text,text=>modify(b.id,{text}),'Écris le contenu de cette section…'):null}
            </>:textField(b.text,text=>modify(b.id,{text}),
              b.type==='heading'?'Écris ton titre…':
              b.type==='quote'?'Écris une citation…':
              b.type==='checklist'?'Une tâche à faire…':'Écris ici…')}
          </View>
          {editable&&selectedId===b.id?<Pressable
            accessibilityRole="button" accessibilityLabel="Supprimer ce bloc"
            onPress={()=>{persist(items.filter(x=>x.id!==b.id));setSelectedId(null);}}
            style={{padding:5}}>
            <Ionicons name="close" size={15} color={theme.muted}/>
          </Pressable>:null}
        </View>;
      })}
      {editable?<Pressable onPress={()=>add('text')} accessibilityRole="button"
        accessibilityLabel="Ajouter un paragraphe"
        style={{flexDirection:'row',alignItems:'center',gap:8,
          paddingVertical:12,alignSelf:'flex-start'}}>
        <Ionicons name="add" size={19} color={theme.muted}/>
        <Text style={{fontSize:12,color:theme.muted}}>Ajouter un bloc</Text>
      </Pressable>:null}
      {(dream.notes||[]).length? <View style={{marginTop:9,gap:12}}>
        {(dream.notes||[]).map((n,i)=><Text key={i}
          style={{color:theme.foreground,fontSize:15,lineHeight:24}}>{n}</Text>)}
      </View>:null}
    </View>
  </View>;
}
