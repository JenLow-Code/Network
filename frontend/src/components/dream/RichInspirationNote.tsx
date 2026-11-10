import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamNoteBlock } from '@/domain/dreamWorkspace';

type NoteType=DreamNoteBlock['type'];
const id=()=> 'inote-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const textColors:{key:NonNullable<DreamNoteBlock['color']>;hex:string}[]=[
 {key:'default',hex:'#37332F'}, {key:'sand',hex:'#A5713D'},
 {key:'pink',hex:'#C02772'}, {key:'blue',hex:'#3A729D'},
 {key:'green',hex:'#3C795E'},
];
const types:{kind:NoteType;name:string;icon:keyof typeof Ionicons.glyphMap}[]=[
 {kind:'text',name:'Paragraphe',icon:'text-outline'},
 {kind:'heading',name:'Titre',icon:'text'},
 {kind:'bullet',name:'Liste à puces',icon:'list-outline'},
 {kind:'numbered',name:'Numérotation',icon:'list-circle-outline'},
 {kind:'checklist',name:'Cases à cocher',icon:'checkbox-outline'},
 {kind:'toggle',name:'Section déroulante',icon:'chevron-down-circle-outline'},
 {kind:'quote',name:'Citation',icon:'chatbubble-outline'},
];
/** One reusable structured rich-note editor, without access to private notebooks. */
export default function RichInspirationNote({blocks,onChange,editable=true}:{
 blocks:DreamNoteBlock[];onChange:(next:DreamNoteBlock[])=>void;editable?:boolean;
}){
 const theme=useAppTheme();
 const [focusId,setFocusId]=useState<string|null>(null);
 const [menu,setMenu]=useState<'type'|'color'|null>(null);
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [heights,setHeights]=useState<Record<string,number>>({});
 const selected=blocks.find(b=>b.id===focusId)||blocks.at(-1);
 const selectedId=selected?.id;
 const change=(targetId:string,updates:Partial<DreamNoteBlock>)=>{
   if(!editable)return;
   onChange(blocks.map(b=>b.id===targetId?{...b,...updates}:b));
 };
 const add=(kind:NoteType='text',text='')=>{
   if(!editable)return;
   const block:DreamNoteBlock={id:id(),type:kind,text,color:'default',
     checkShape:kind==='checklist'?'square':undefined};
   onChange([...blocks,block]);setFocusId(block.id);setMenu(null);
 };
 const format=(updates:Partial<DreamNoteBlock>)=>{
   if(!editable)return;
   if(!selectedId){const b:DreamNoteBlock={
     id:id(),type:'text',text:'',color:'default',...updates};
     onChange([...blocks,b]);setFocusId(b.id);return;
   }
   change(selectedId,updates);
 };
 const control=(icon:keyof typeof Ionicons.glyphMap,name:string,
   fn:()=>void,active=false)=><Pressable key={name} accessibilityRole="button"
   accessibilityLabel={name} accessibilityState={{selected:active}}
   onPress={fn} disabled={!editable}
   style={{minWidth:35,minHeight:37,paddingHorizontal:8,
     borderRadius:8,alignItems:'center',justifyContent:'center',
     backgroundColor:active?theme.surface:'transparent'}}>
   <Ionicons name={icon} size={17} color={active?theme.foreground:theme.muted}/>
 </Pressable>;
 const input=(b:DreamNoteBlock,value:string,placeholder:string,
   save:(text:string)=>void,multi=true)=>{
   const ink=b.color&&b.color!=='default'
     ?textColors.find(c=>c.key===b.color)?.hex||theme.foreground:theme.foreground;
   const size=b.type==='heading'?22:b.type==='quote'?18:15;
   const key=b.id+placeholder;
   return <TextInput editable={editable} value={value} multiline={multi}
     scrollEnabled={false} accessibilityLabel={placeholder}
     placeholder={placeholder} placeholderTextColor={theme.muted}
     onFocus={()=>setFocusId(b.id)} onChangeText={save}
     onContentSizeChange={event=>{
       const h=Math.ceil(event.nativeEvent.contentSize.height);
       if(h>0&&h!==heights[key])setHeights(old=>({...old,[key]:h}));
     }}
     style={{flex:1,color:ink,fontSize:size,lineHeight:size*1.48,
       fontFamily:b.type==='heading'||b.type==='quote'?'serif':undefined,
       fontStyle:b.italic||b.type==='quote'?'italic':'normal',
       fontWeight:b.bold||b.type==='heading'?'700':'400',
       padding:0,textAlignVertical:'top',minHeight:multi?26:32,
       height:Math.max(multi?26:32,heights[key]||0)}}/>;
 };
 return <View style={{gap:11}}>
   {editable?<View style={{gap:7}}>
     <ScrollView horizontal showsHorizontalScrollIndicator={false}
       keyboardShouldPersistTaps="always"
       contentContainerStyle={{gap:4,alignItems:'center'}}>
       {control('text-outline','Type de bloc',()=>setMenu(menu==='type'?null:'type'),menu==='type')}
       <View style={{height:20,width:1,backgroundColor:theme.border,marginHorizontal:3}}/>
       <Pressable accessibilityLabel="Gras" accessibilityRole="button"
         onPress={()=>format({bold:!selected?.bold})}
         style={{minWidth:35,minHeight:37,alignItems:'center',justifyContent:'center'}}>
         <Text style={{fontWeight:'900',fontSize:17,color:theme.foreground}}>B</Text>
       </Pressable>
       <Pressable accessibilityLabel="Italique" accessibilityRole="button"
         onPress={()=>format({italic:!selected?.italic})}
         style={{minWidth:35,minHeight:37,alignItems:'center',justifyContent:'center'}}>
         <Text style={{fontStyle:'italic',fontFamily:'serif',fontSize:19,color:theme.foreground}}>I</Text>
       </Pressable>
       {control('list-outline','Liste',()=>format({type:'bullet'}),selected?.type==='bullet')}
       {control('checkbox-outline','Checklist',()=>format({type:'checklist',checkShape:'square'}),selected?.type==='checklist')}
       {control('ellipse-outline','Cases rondes',()=>format({type:'checklist',checkShape:'circle'}),
         selected?.type==='checklist'&&selected.checkShape==='circle')}
       {control('chevron-down-outline','Section déroulante',()=>format({type:'toggle'}),selected?.type==='toggle')}
       {control('color-palette-outline','Couleur du texte',
         ()=>setMenu(menu==='color'?null:'color'),menu==='color')}
     </ScrollView>
     {menu==='color'?<View style={{flexDirection:'row',gap:11,padding:5}}>
       {textColors.map(c=><Pressable key={c.key} accessibilityRole="button"
         accessibilityLabel={'Couleur '+c.key}
         onPress={()=>{format({color:c.key});setMenu(null);}}
         style={{width:28,height:28,borderRadius:14,backgroundColor:c.key==='default'?
           theme.foreground:c.hex,borderWidth:selected?.color===c.key?2:0,
           borderColor:theme.background}}/>)}
     </View>:null}
     {menu==='type'?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7,
       borderWidth:1,borderColor:theme.border,padding:10,borderRadius:11}}>
       {types.map(t=><Pressable key={t.kind} accessibilityRole="button"
         onPress={()=>{selectedId?format({type:t.kind}):add(t.kind);setMenu(null);}}
         style={{flexDirection:'row',alignItems:'center',gap:5,
           paddingVertical:8,paddingHorizontal:9,borderRadius:8,
           backgroundColor:theme.surface}}>
         <Ionicons name={t.icon} size={14} color={theme.muted}/>
         <Text style={{fontSize:12,color:theme.foreground}}>{t.name}</Text>
       </Pressable>)}
     </View>:null}
   </View>:null}
   <View style={{gap:5}}>
     {!blocks.length?editable?<TextInput multiline
       accessibilityLabel="Commencer une note"
       placeholder="Écris une note…" placeholderTextColor={theme.muted}
       onChangeText={value=>{if(value)add('text',value);}}
       style={{color:theme.foreground,fontSize:16,lineHeight:25,
         minHeight:85,padding:2,textAlignVertical:'top'}}/>:
       <Text style={{fontSize:13,color:theme.muted}}>Aucune note.</Text>:
     blocks.map((b,index)=>{
       const collapsed=editable?!!b.collapsed:(expanded[b.id]??!!b.collapsed);
       return <View key={b.id} style={{flexDirection:'row',alignItems:'flex-start',
         gap:8,paddingVertical:7}}>
         {b.type==='bullet'?<Text style={{fontSize:18,color:theme.foreground}}>•</Text>:null}
         {b.type==='numbered'?<Text style={{fontSize:13,color:theme.muted}}>
           {blocks.slice(0,index+1).filter(x=>x.type==='numbered').length}.
         </Text>:null}
         {b.type==='checklist'?<Pressable
           accessibilityRole="checkbox" accessibilityState={{checked:!!b.checked}}
           onPress={()=>change(b.id,{checked:!b.checked})}
           disabled={!editable} style={{padding:3}}>
           <Ionicons size={20} name={b.checkShape==='circle'
             ?b.checked?'checkmark-circle':'ellipse-outline':
             b.checked?'checkbox':'square-outline'}
             color={b.checked?'#3C795E':theme.muted}/>
         </Pressable>:null}
         {b.type==='toggle'?<Pressable accessibilityRole="button"
           accessibilityLabel={collapsed?'Ouvrir la section':'Fermer la section'}
           onPress={()=>editable?change(b.id,{collapsed:!collapsed}):
             setExpanded(old=>({...old,[b.id]:!collapsed}))}
           style={{padding:3}}>
           <Ionicons name={collapsed?'chevron-forward':'chevron-down'}
             size={19} color={theme.muted}/>
         </Pressable>:null}
         <View style={{flex:1,gap:5}}>
           {b.type==='toggle'?<>
             {input(b,b.title||'','Titre de la section',title=>change(b.id,{title}),false)}
             {!collapsed?input(b,b.text,'Texte de la section',
               text=>change(b.id,{text})):null}
           </>:input(b,b.text,b.type==='heading'?'Titre':
             b.type==='quote'?'Citation':b.type==='checklist'?'Une tâche…':'Écris ici…',
             text=>change(b.id,{text}))}
         </View>
         {editable&&focusId===b.id?<Pressable accessibilityRole="button"
           accessibilityLabel="Supprimer le bloc" onPress={()=>{
             onChange(blocks.filter(x=>x.id!==b.id));setFocusId(null);}}
           style={{padding:5}}>
           <Ionicons name="close" size={15} color={theme.muted}/>
         </Pressable>:null}
       </View>;
     })}
     {editable?<Pressable accessibilityRole="button" onPress={()=>add('text')}
       style={{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:10}}>
       <Ionicons name="add" size={17} color={theme.muted}/>
       <Text style={{fontSize:12,color:theme.muted}}>Ajouter un bloc</Text>
     </Pressable>:null}
   </View>
 </View>;
}
