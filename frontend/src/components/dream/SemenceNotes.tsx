import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry, DreamNoteBlock } from '@/domain/dreamWorkspace';
import { defaultNotebookColor, NOTEBOOK_COLORS, NOTEBOOK_COLOR_ORDER, dreamNotebooks, editDreamNotebook } from '@/domain/dreamNotebooks';

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
  const [activeBookId,setActiveBookId]=useState('notebook-main');
  const [bookMenuOpen,setBookMenuOpen]=useState(false);
  const [bookColorsOpen,setBookColorsOpen]=useState(false);
  const [nameMode,setNameMode]=useState<'new'|'rename'|null>(null);
  const [nameDraft,setNameDraft]=useState('');
  const [nameError,setNameError]=useState('');
  const [typesOpen,setTypesOpen]=useState(false);
  const [colorsOpen,setColorsOpen]=useState(false);
  const [readOnlyExpanded,setReadOnlyExpanded]=useState<Record<string,boolean>>({});
  const [contentHeights,setContentHeights]=useState<Record<string,number>>({});
  const notebooks = dreamNotebooks(dream);
  const notebook = notebooks.find(book=>book.id===activeBookId) ?? notebooks[0];
  const items = notebook.blocks;
  const selected=items.find(b=>b.id===selectedId)||items[items.length-1];
  const selectedKey=selected?.id;

  const selectNotebook=(next:string)=>{
    setActiveBookId(next);
    setSelectedId(null);setTypesOpen(false);setColorsOpen(false);
    setBookMenuOpen(false);setBookColorsOpen(false);setNameMode(null);setNameError('');
    setReadOnlyExpanded({});
  };
  const saveNotebooks=(next:typeof notebooks)=>{
    if(!editable)return;
    // Persist any colors previously derived for legacy notebooks before reordering.
    const previousColors=new Map(notebooks.map((book,index)=>[
      book.id,book.color??defaultNotebookColor(index),
    ]));
    const withColors=next.map((book,index)=>({
      ...book,color:book.color??previousColors.get(book.id)??defaultNotebookColor(index),
    }));
    patch(dream.id,{privateNotebooks:withColors});
  };
  const persist=(next:DreamNoteBlock[])=>{
    if(!editable)return;
    saveNotebooks(editDreamNotebook(notebooks,notebook.id,{blocks:next}));
  };
  const startName=(mode:'new'|'rename')=>{
    if(!editable)return;
    setNameMode(mode);
    setNameDraft(mode==='rename'?notebook.title:'');
    setNameError('');setBookMenuOpen(false);setBookColorsOpen(false);
  };
  const confirmName=()=>{
    if(!editable||!nameMode)return;
    const title=nameDraft.trim().slice(0,48);
    if(!title){setNameError('Donne un nom à ce carnet.');return;}
    if(nameMode==='new'){
      const created={id:'notebook-'+id(),title,color:defaultNotebookColor(notebooks.length),blocks:[] as DreamNoteBlock[]};
      saveNotebooks([...notebooks,created]);
      selectNotebook(created.id);
    }else{
      saveNotebooks(editDreamNotebook(notebooks,notebook.id,{title}));
      setNameMode(null);setNameError('');
    }
  };
  const moveNotebook=(delta:number)=>{
    const from=notebooks.findIndex(book=>book.id===notebook.id),to=from+delta;
    if(!editable||from<0||to<0||to>=notebooks.length)return;
    const reordered=[...notebooks];
    [reordered[from],reordered[to]]=[reordered[to],reordered[from]];
    saveNotebooks(reordered);setBookMenuOpen(false);setBookColorsOpen(false);
  };
  const deleteNotebook=()=>{
    if(!editable||notebooks.length<=1)return;
    const proceed=()=>{
      const remaining=notebooks.filter(book=>book.id!==notebook.id);
      saveNotebooks(remaining);
      selectNotebook(remaining[Math.max(0,Math.min(
        notebooks.findIndex(b=>b.id===notebook.id)-1,remaining.length-1))].id);
    };
    const prompt=notebook.blocks.length
      ?'Ce carnet contient '+notebook.blocks.length+' bloc(s). Sa suppression effacera son contenu.'
      :'Supprimer ce carnet vide ?';
    if(Platform.OS==='web'&&typeof window!=='undefined'){
      if(window.confirm(prompt))proceed();
    }else Alert.alert('Supprimer '+notebook.title+' ?',prompt,[
      {text:'Annuler',style:'cancel'},{text:'Supprimer',style:'destructive',onPress:proceed},
    ]);
    setBookMenuOpen(false);setBookColorsOpen(false);
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
    {/* Notebook selector lives INSIDE Notes, not in the dream's main navigation. */}
    <View style={{gap:9}}>
      <View style={{flexDirection:'row',alignItems:'flex-end',gap:5}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always" style={{flex:1}}
          contentContainerStyle={{gap:7,alignItems:'flex-end',paddingRight:9}}>
          {notebooks.map((book,index)=>{
            const current=book.id===notebook.id;
            const tabColor=NOTEBOOK_COLORS[book.color??defaultNotebookColor(index)].hex;
            return <Pressable key={book.id}
              accessibilityRole="tab"
              accessibilityLabel={'Ouvrir le carnet '+book.title}
              accessibilityState={{selected:current}}
              onPress={()=>selectNotebook(book.id)}
              style={{minWidth:107,maxWidth:166,minHeight:48,
                paddingHorizontal:4,justifyContent:'flex-end',alignItems:'stretch'}}>
              <Text numberOfLines={1} style={{
                color:tabColor,opacity:current?1:0.68,
                fontSize:12,fontWeight:current?'800':'600',
                textAlign:'center'}}>
                {book.title}
              </Text>
              <View style={{width:'100%',height:current?4:3,
                marginTop:11,borderRadius:3,
                backgroundColor:tabColor,opacity:current?1:0.30}}/>
            </Pressable>;
          })}
        </ScrollView>
        {editable?<Pressable accessibilityRole="button"
          accessibilityLabel="Créer un carnet"
          onPress={()=>startName('new')}
          style={{width:34,height:43,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="add" size={21} color={theme.muted}/>
        </Pressable>:null}
        {editable?<Pressable accessibilityRole="button"
          accessibilityLabel={'Options du carnet '+notebook.title}
          accessibilityState={{expanded:bookMenuOpen}}
          onPress={()=>{setBookMenuOpen(!bookMenuOpen);setBookColorsOpen(false);setNameMode(null);}}
          style={{width:31,height:43,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="ellipsis-horizontal" size={19} color={theme.muted}/>
        </Pressable>:null}
      </View>
      {nameMode?<View style={{gap:8,padding:11,borderRadius:10,
        borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>
          {nameMode==='new'?'Nouveau carnet':'Renommer le carnet'}
        </Text>
        <TextInput autoFocus value={nameDraft} onChangeText={setNameDraft}
          onSubmitEditing={confirmName} maxLength={48}
          returnKeyType="done" accessibilityLabel="Nom du carnet"
          placeholder="Ex. Paroles, Idées, Journal…"
          placeholderTextColor={theme.muted}
          style={{color:theme.foreground,fontSize:14,
            backgroundColor:theme.background,borderRadius:8,
            borderWidth:1,borderColor:theme.border,minHeight:42,paddingHorizontal:10}}/>
        {nameError?<Text style={{fontSize:11,color:'#B44656'}}>{nameError}</Text>:null}
        <View style={{flexDirection:'row',gap:10,justifyContent:'flex-end'}}>
          <Pressable accessibilityRole="button"
            onPress={()=>{setNameMode(null);setNameError('');}}
            style={{padding:10}}>
            <Text style={{color:theme.muted,fontSize:12}}>Annuler</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={confirmName}
            style={{borderRadius:8,paddingVertical:10,paddingHorizontal:15,
              backgroundColor:theme.foreground}}>
            <Text style={{color:theme.background,fontWeight:'700',fontSize:12}}>
              {nameMode==='new'?'Créer':'Enregistrer'}
            </Text>
          </Pressable>
        </View>
      </View>:null}
      {bookMenuOpen?<View style={{flexDirection:'row',flexWrap:'wrap',gap:5,
        padding:7,borderRadius:10,borderWidth:1,
        borderColor:theme.border,backgroundColor:theme.surface}}>
        <Pressable accessibilityRole="button" onPress={()=>startName('rename')}
          style={{flexDirection:'row',gap:5,alignItems:'center',padding:9}}>
          <Ionicons name="pencil-outline" color={theme.muted} size={15}/>
          <Text style={{color:theme.foreground,fontSize:12}}>Renommer</Text>
        </Pressable>
        <Pressable accessibilityRole="button"
          accessibilityLabel="Choisir la couleur du carnet"
          accessibilityState={{expanded:bookColorsOpen}}
          onPress={()=>setBookColorsOpen(!bookColorsOpen)}
          style={{flexDirection:'row',gap:5,alignItems:'center',padding:9}}>
          <Ionicons name="color-palette-outline" color={theme.muted} size={15}/>
          <Text style={{color:theme.foreground,fontSize:12}}>Couleur</Text>
        </Pressable>
        <Pressable accessibilityRole="button"
          disabled={notebooks[0].id===notebook.id}
          onPress={()=>moveNotebook(-1)}
          style={{flexDirection:'row',gap:4,alignItems:'center',
            padding:9,opacity:notebooks[0].id===notebook.id ? 0.45 : 1}}>
          <Ionicons name="arrow-back-outline" color={theme.muted} size={15}/>
          <Text style={{color:theme.foreground,fontSize:12}}>Avant</Text>
        </Pressable>
        <Pressable accessibilityRole="button"
          disabled={notebooks[notebooks.length-1].id===notebook.id}
          onPress={()=>moveNotebook(1)}
          style={{flexDirection:'row',gap:4,alignItems:'center',
            padding:9,opacity:notebooks[notebooks.length-1].id===notebook.id ? 0.45 : 1}}>
          <Ionicons name="arrow-forward-outline" color={theme.muted} size={15}/>
          <Text style={{color:theme.foreground,fontSize:12}}>Après</Text>
        </Pressable>
        {notebooks.length>1?<Pressable accessibilityRole="button"
          onPress={deleteNotebook}
          style={{flexDirection:'row',gap:4,alignItems:'center',padding:9}}>
          <Ionicons name="trash-outline" color="#AF5560" size={15}/>
          <Text style={{color:'#AF5560',fontSize:12}}>Supprimer</Text>
        </Pressable>:null}
      </View>:null}
      {bookMenuOpen&&bookColorsOpen?<View style={{
        borderWidth:1,borderColor:theme.border,borderRadius:10,
        backgroundColor:theme.surface,padding:12,gap:11}}>
        <Text style={{fontSize:11,fontWeight:'700',color:theme.foreground}}>
          Couleur du carnet
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center'}}>
          {NOTEBOOK_COLOR_ORDER.map(color=>{
            const isSelected=(notebook.color??defaultNotebookColor(
              notebooks.findIndex(b=>b.id===notebook.id)))===color;
            return <Pressable key={color} accessibilityRole="button"
              accessibilityLabel={'Couleur '+NOTEBOOK_COLORS[color].label}
              accessibilityState={{selected:isSelected}}
              onPress={()=>{
                saveNotebooks(editDreamNotebook(notebooks,notebook.id,{color}));
                setBookColorsOpen(false);setBookMenuOpen(false);
              }}
              style={{width:34,height:34,borderRadius:17,
                borderWidth:isSelected?2:0,
                borderColor:theme.foreground,padding:isSelected?3:0,
                alignItems:'center',justifyContent:'center'}}>
              <View style={{width:28,height:28,borderRadius:14,
                backgroundColor:NOTEBOOK_COLORS[color].hex,
                alignItems:'center',justifyContent:'center'}}>
                {isSelected?<Ionicons name="checkmark" size={16} color="#FFFFFF"/>:null}
              </View>
            </Pressable>;
          })}
        </View>
      </View>:null}
    </View>
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
            scrollEnabled={false}
            onContentSizeChange={event=>{
              const next=Math.ceil(event.nativeEvent.contentSize.height);
              if(Number.isFinite(next)&&next>0&&next!==contentHeights[b.id+placeholder])
                setContentHeights(prev=>({...prev,[b.id+placeholder]:next}));
            }}
            autoFocus={editable&&selectedId===b.id&&(b.type!=='toggle'||placeholder==='Titre de la section')}
            onFocus={()=>setSelectedId(b.id)} onChangeText={change}
            textAlignVertical="top" placeholder={placeholder}
            placeholderTextColor={theme.muted}
            accessibilityLabel={placeholder}
            style={{...style,minHeight:b.type==='heading'?40:27,
              height:Math.max(b.type==='heading'?40:27,contentHeights[b.id+placeholder]||0)}}/>;
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
      {notebook.id===notebooks[0].id&&(dream.notes||[]).length? <View style={{marginTop:9,gap:12}}>
        {(dream.notes||[]).map((n,i)=><Text key={i}
          style={{color:theme.foreground,fontSize:15,lineHeight:24}}>{n}</Text>)}
      </View>:null}
    </View>
  </View>;
}
