import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import {newMusicId} from '@/domain/musicWorkspace';
import {shiftLyricAnchors,isLyricAnchorValid} from '@/domain/musicLyricAnchors';
import {musicLanguageOptions} from '@/domain/musicLanguages';
import type { MusicProjectFile, MusicLyricReference, MusicLyricComment, MusicSection } from '@/domain/musicWorkspace';

const PINK = '#CB245C';
type Mode = 'lyrics' | 'note';
export type MusicWritingResult = {
  mode: Mode | 'translation';
  title: string;
  text: string;
  language?: string;
  translationOfFileId?: string;
  lyricReferences?: MusicLyricReference[];
  lyricComments?: MusicLyricComment[];
  newSections?: MusicSection[];
};
type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  originalLanguage: string;
  source?: MusicProjectFile | null;
  initialFile?: MusicProjectFile;
  onSave: (result: MusicWritingResult) => void;
  onAutoSave?: (result: MusicWritingResult) => string | void;
  onRequestTranslator?: (sourceId: string, language: string) => void;
  onTranslate?:(sourceId?:string)=>void;
  requestedLanguages?: string[];
  onDirtyChange: (dirty: boolean) => void;
  immersive?: boolean;
  sections?: MusicSection[];
  showTabs?: boolean;
  /** Song sections become meaningful only after a version exists. */
  canLinkSections?: boolean;
};

function lyricText(file: MusicProjectFile) {
  return file.text ?? (file.lyricSegments?.map(s => s.text).join('\n\n') || '');
}

/** The note preview uses the same small subset of Markdown supported by the toolbar. */
export function MusicNotePreview({ text, color }: { text: string; color: string }) {
  const renderInline = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <Text key={i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
      if (part.startsWith('*') && part.endsWith('*'))
        return <Text key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
      return <Text key={i}>{part}</Text>;
    });
  };
  return <View style={{ gap: 5 }}>
    {text.split('\n').map((line, i) => {
      const heading = line.startsWith('# ');
      const value = heading ? line.slice(2) : line;
      return <Text key={i} style={{ color, fontSize: heading ? 19 : 15,
        fontWeight: heading ? '700' : '400', lineHeight: heading ? 28 : 25,
        minHeight: line ? undefined : 13 }}>
        {renderInline(value || ' ')}
      </Text>;
    })}
  </View>;
}

/** A quiet notebook review that highlights saved section links and comments.
 * Each annotation must still match its exact selected words; edited passages
 * never silently attach a comment to some other text. */
function LinkedLyricsPreview({text,references,comments,compact}:{
  text:string;references:MusicLyricReference[];
  comments:MusicLyricComment[];compact:boolean;
}){
  const theme=useAppTheme();
  const valid=(range:{start:number;end:number;text:string})=>
    isLyricAnchorValid(text,range);
  const refRanges=references.filter(valid),commentRanges=comments.filter(valid);
  const ends=new Set<number>([0,text.length]);
  [...refRanges,...commentRanges].forEach(range=>{
    ends.add(range.start);ends.add(range.end);
  });
  const boundaries=Array.from(ends).sort((a,b)=>a-b);
  return <Text selectable style={{fontFamily:'Georgia',
    fontSize:compact?14:15,lineHeight:compact?24:26,
    color:theme.foreground}}>
    {boundaries.slice(1).map((end,index)=>{
      const start=boundaries[index];
      const marked=refRanges.some(r=>r.start<=start&&r.end>=end);
      const commented=commentRanges.some(r=>r.start<=start&&r.end>=end);
      return <Text key={index} style={commented?
        {backgroundColor:theme.dark?'#554A2D':'#F4E9C8',
          color:theme.foreground}:marked?
        {backgroundColor:theme.dark?'#492735':'#F7DAE4',
          color:theme.dark?'#F8B9CF':'#A91D4C'}:{}}>
        {text.slice(start,end)}
      </Text>;
    })}
  </Text>;
}
export function MusicWritingStudio({ mode, onModeChange, originalLanguage, source,
  initialFile, onSave, onAutoSave, onRequestTranslator, onTranslate, requestedLanguages=[], onDirtyChange,
  immersive=false,sections=[],showTabs=true,canLinkSections=false }: Props) {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 650;
  const translating = !!source;
  const [lyricTitle, setLyricTitle] = useState('');
  const [lyricBody, setLyricBody] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [translationTitle, setTranslationTitle] = useState('');
  const [translationBody, setTranslationBody] = useState('');
  const [lyricLanguage, setLyricLanguage] = useState(originalLanguage || 'Français');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageQuery,setLanguageQuery] = useState('');
  const languages=useMemo(musicLanguageOptions,[]);
  const [otherLanguage, setOtherLanguage] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sourceExpanded, setSourceExpanded] = useState(true);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [lyricSelection, setLyricSelection] = useState({start:0,end:0});
  const [references,setReferences] = useState<MusicLyricReference[]>(initialFile?.lyricReferences||[]);
  const [comments,setComments]=useState<MusicLyricComment[]>(initialFile?.lyricComments||[]);
  const [commentEditor,setCommentEditor]=useState(false);
  const [commentDraft,setCommentDraft]=useState('');
  const [createdSections,setCreatedSections] = useState<MusicSection[]>([]);
  const [sectionPicker,setSectionPicker] = useState(false);
  const [customSection,setCustomSection] = useState('');
  const [selectionError,setSelectionError] = useState('');
  const input = useRef<React.ElementRef<typeof TextInput>>(null);
  const [requestNotice, setRequestNotice] = useState(false);

  const isNote = !translating && mode === 'note';
  const body = translating ? translationBody : isNote ? noteBody : lyricBody;
  const title = translating ? translationTitle : isNote ? noteTitle : lyricTitle;
  const setBody = translating ? setTranslationBody : isNote ? setNoteBody : setLyricBody;
  const setTitle = translating ? setTranslationTitle : isNote ? setNoteTitle : setLyricTitle;
  const language = translating ? targetLanguage : lyricLanguage;
  const setLanguage = translating ? setTargetLanguage : setLyricLanguage;
  const dirty = initialFile
    ? title !== initialFile.title || body !== lyricText(initialFile) ||
      (!isNote && language !== (initialFile.language || originalLanguage)) ||
      JSON.stringify(references)!==JSON.stringify(initialFile.lyricReferences||[]) ||
      JSON.stringify(comments)!==JSON.stringify(initialFile.lyricComments||[]) ||
      createdSections.length>0
    : !!(lyricBody.trim() || lyricTitle.trim() || noteBody.trim() || noteTitle.trim() ||
      translationBody.trim() || translationTitle.trim() ||
      references.length || comments.length || createdSections.length);
  const requestPending=requestedLanguages.some(value=>
    value.toLocaleLowerCase()===language.trim().toLocaleLowerCase());

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    // Opening a different source must never keep the previous translation's text.
    setTranslationBody('');
    setTranslationTitle('');
    setTargetLanguage('');
    setRequestNotice(false);
  }, [source?.id]);
  useEffect(() => {
    if (!initialFile) return;
    if (initialFile.kind === 'note') {
      setNoteTitle(initialFile.title);
      setNoteBody(initialFile.text || '');
    } else if (initialFile.translationOfFileId) {
      setTranslationTitle(initialFile.title);
      setTranslationBody(lyricText(initialFile));
      setTargetLanguage(initialFile.language || '');
    } else if (initialFile.kind === 'lyrics') {
      setLyricTitle(initialFile.title);
      setLyricBody(lyricText(initialFile));
      setLyricLanguage(initialFile.language || originalLanguage);
      setReferences(initialFile.lyricReferences||[]);
      setComments(initialFile.lyricComments||[]);
    }
  }, [initialFile?.id]);

  const chooseLanguage = (next: string) => {
    if (next === 'Autre…') {
      setOtherLanguage(true);
      setLanguage('');
    } else {
      setOtherLanguage(false);
      setLanguage(next);
    }
    setLanguageOpen(false);
    setLanguageQuery('');
  };
  const insert = (before: string, after = '', example = '') => {
    const start = Math.min(selection.start, body.length);
    const end = Math.min(selection.end, body.length);
    const chosen = body.slice(start, end) || example;
    const next = body.slice(0, start) + before + chosen + after + body.slice(end);
    setBody(next);
    setPreview(false);
    input.current?.focus();
  };
  const toolbar = (label: string, icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void) => <Pressable key={label} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={label}
      style={{ minWidth:40, minHeight:40, paddingHorizontal:9,
        justifyContent:'center',alignItems:'center',borderRadius:9 }}>
      <Ionicons name={icon} size={19} color={theme.foreground}/>
    </Pressable>;

  // Automatic writes reuse their draft identity and preserve all lyric anchors.
  const draftResult:MusicWritingResult={
    mode:translating?'translation':isNote?'note':'lyrics',
    title:title.trim(),text:body,
    language:isNote?undefined:language.trim(),
    translationOfFileId:source?.id,
    lyricReferences:translating||isNote?undefined:references,
    lyricComments:translating||isNote?undefined:comments,
    newSections:translating||isNote?undefined:createdSections,
  };
  const draftSnapshot=JSON.stringify(draftResult);
  const canAutoSave=!!(body.trim()||title.trim()||initialFile)&&
    (isNote||translating||!!language.trim());
  const lastAutoSaved=useRef('');
  const latestDraft=useRef({result:draftResult,snapshot:draftSnapshot,valid:canAutoSave});
  latestDraft.current={result:draftResult,snapshot:draftSnapshot,valid:canAutoSave};
  const autoSaveRef=useRef(onAutoSave);
  autoSaveRef.current=onAutoSave;
  useEffect(()=>{
    if(!canAutoSave||!autoSaveRef.current||
      draftSnapshot===lastAutoSaved.current)return;
    const timer=setTimeout(()=>{
      autoSaveRef.current?.(draftResult);
      lastAutoSaved.current=draftSnapshot;
      onDirtyChange(false);
    },500);
    return ()=>clearTimeout(timer);
  },[draftSnapshot,canAutoSave]);
  // Flush the last keystroke when the user leaves before the debounce completes.
  useEffect(()=>()=> {
    const current=latestDraft.current;
    if(current.valid&&current.snapshot!==lastAutoSaved.current)
      autoSaveRef.current?.(current.result);
  },[]);
  const save = () => {
    if (!body.trim() || (!isNote && !language.trim())) return;
    lastAutoSaved.current=draftSnapshot;
    onSave(draftResult);
  };

  const selectedExcerpt=lyricBody.slice(lyricSelection.start,lyricSelection.end);
  const validSelection=!!selectedExcerpt.trim()&&lyricSelection.end>lyricSelection.start;
  const attach=(section:MusicSection)=>{
    if(!validSelection){setSelectionError('Sélectionne un passage de paroles.');return;}
    const ref:MusicLyricReference={
      id:newMusicId(),sectionId:section.id,
      start:lyricSelection.start,end:lyricSelection.end,text:selectedExcerpt,
    };
    setReferences(old=>[...old,ref]);setSectionPicker(false);setSelectionError('');
    setPreview(true);
  };
  const createSectionNamed=(value:string)=>{
    const name=value.trim();
    if(!name||!validSelection)return;
    const existing=[...sections,...createdSections].find(section=>
      section.title.trim().toLocaleLowerCase()===name.toLocaleLowerCase());
    if(existing){attach(existing);setCustomSection('');return;}
    const section:MusicSection={id:newMusicId(),title:name};
    setCreatedSections(old=>[...old,section]);
    attach(section);setCustomSection('');
  };
  const createSection=()=>createSectionNamed(customSection);
  const addComment=()=>{
    const comment=commentDraft.trim();
    if(!validSelection||!comment)return;
    setComments(old=>[...old,{
      id:newMusicId(),start:lyricSelection.start,end:lyricSelection.end,
      text:selectedExcerpt,comment,createdAt:new Date().toISOString(),
    }]);
    setCommentEditor(false);setCommentDraft('');setSelectionError('');
    setPreview(true);
  };
  const choose = (value: Mode, caption: string) => {
    const active = mode === value;
    return <Pressable key={value} onPress={() => { onModeChange(value); setPreview(false); }}
      accessibilityRole="tab" accessibilityState={{selected:active}}
      style={{minHeight:39,flexDirection:'row',alignItems:'center',gap:7,
        paddingHorizontal:14,borderBottomWidth:active?2:0,
        borderBottomColor:PINK}}>
      <Text style={{fontSize:13,fontWeight:active?'700':'500',
        color:active?theme.foreground:theme.muted}}>{caption}</Text>
    </Pressable>;
  };
  const editor = (placeholder: string, minimum: number) => <TextInput ref={input}
    multiline textAlignVertical="top" scrollEnabled={false}
    value={body} onChangeText={next=>{
      if(!isNote&&!translating){
        setReferences(old=>shiftLyricAnchors(body,next,old));
        setComments(old=>shiftLyricAnchors(body,next,old));
        setLyricSelection({start:0,end:0});
        setCommentEditor(false);setSectionPicker(false);
      }
      setBody(next);setPreview(false);
    }}
    onSelectionChange={event => {
      const range=event.nativeEvent.selection;
      setSelection(range);
      if(!isNote&&!translating&&range.end>range.start)
        setLyricSelection({start:range.start,end:range.end});
    }}
    placeholder={placeholder} placeholderTextColor={theme.muted}
    accessibilityLabel={translating?'Traduction':isNote?'Contenu de la note':'Paroles'}
    style={{fontFamily:isNote?undefined:'Georgia',
      fontSize:isNote?15:translating&&compact?13:compact?14:15,
      lineHeight:isNote?25:translating&&compact?21:compact?24:26,
      minHeight:minimum,
      paddingVertical:12,paddingHorizontal:compact?2:8,color:theme.foreground,
      letterSpacing:.15}}/>;
  const filteredLanguages=languages.filter(option=>
    option.toLocaleLowerCase('fr').includes(languageQuery.trim().toLocaleLowerCase('fr')));
  const languageControl=<View style={{gap:7,alignItems:'flex-start',width:'100%'}}>
    <Pressable onPress={()=>{setLanguageOpen(open=>!open);setLanguageQuery('');}}
      accessibilityRole="button" accessibilityLabel="Choisir la langue"
      accessibilityState={{expanded:languageOpen}}
      style={{alignSelf:'flex-start',flexDirection:'row',gap:9,
        alignItems:'center',paddingVertical:10,paddingHorizontal:13,
        borderRadius:10,borderWidth:1,borderColor:theme.border,
        backgroundColor:theme.dark?'#30292C':'#FFFCF7',minHeight:43}}>
      <Ionicons name="language-outline" size={17} color={PINK}/>
      <Text style={{fontSize:13,color:language?theme.foreground:theme.muted}}>
        {language || 'Choisir une langue'}
      </Text>
      <Ionicons name={languageOpen?'chevron-up':'chevron-down'} size={15}
        color={theme.muted}/>
    </Pressable>
    {languageOpen?<View style={{width:compact?'100%':325,maxWidth:'100%',
      borderWidth:1,borderColor:theme.border,borderRadius:11,
      backgroundColor:theme.dark?'#30292C':'#FFFCF7',
      overflow:'hidden'}}>
      <TextInput value={languageQuery} onChangeText={setLanguageQuery}
        accessibilityLabel="Rechercher une langue"
        placeholder="Rechercher une langue…" placeholderTextColor={theme.muted}
        style={{height:42,paddingHorizontal:12,color:theme.foreground,
          fontSize:13,borderBottomWidth:1,borderBottomColor:theme.border}}/>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled"
        style={{maxHeight:184}} showsVerticalScrollIndicator>
        {filteredLanguages.map(name=><Pressable key={name}
          accessibilityRole="button" onPress={()=>chooseLanguage(name)}
          style={{minHeight:38,paddingHorizontal:13,justifyContent:'center',
            backgroundColor:language===name?
              (theme.dark?'#492735':'#FCE5EF'):'transparent'}}>
          <Text style={{fontSize:13,color:theme.foreground}}>{name}</Text>
        </Pressable>)}
        <Pressable accessibilityRole="button"
          onPress={()=>chooseLanguage('Autre…')}
          style={{minHeight:42,paddingHorizontal:13,justifyContent:'center'}}>
          <Text style={{fontSize:13,color:PINK,fontWeight:'600'}}>
            Autre langue ou variante…
          </Text>
        </Pressable>
      </ScrollView>
    </View>:null}
    {otherLanguage?<TextInput value={language} onChangeText={setLanguage}
      accessibilityLabel="Langue ou variante" placeholder="Préciser la langue…"
      placeholderTextColor={theme.muted}
      style={{fontSize:14,color:theme.foreground,padding:10,width:compact?'100%':325,
        borderWidth:1,borderRadius:10,borderColor:theme.border}}/>:null}
  </View>;

  return <View style={{gap:14}}>
    {showTabs&&!translating && !initialFile ? <View style={{flexDirection:'row',gap:13,
      borderBottomWidth:1,borderBottomColor:theme.border,alignSelf:'flex-start'}}>
      {choose('lyrics','Paroles')}
      {choose('note','Notes')}
    </View> : null}
    {translating ? <>
      {languageControl}
      <View style={{flexDirection:'row',gap:compact?9:20,alignItems:'stretch'}}>
        <View style={{flex:1,minWidth:0,backgroundColor:theme.dark?'#292326':'#F7F4F1',
          borderRadius:compact?9:13,padding:compact?9:17,gap:9}}>
          <Text style={{fontSize:compact?10:12,color:theme.muted,fontWeight:'700'}}>
            ORIGINAL · {source?.language||originalLanguage}
          </Text>
          {source?<Text selectable style={{fontFamily:'Georgia',
            fontSize:compact?12:16,lineHeight:compact?21:27,
            color:theme.foreground}}>
            {lyricText(source)}
          </Text>:null}
        </View>
        <View style={{flex:1,minWidth:0,gap:9}}>
          <Text style={{fontSize:compact?10:12,color:PINK,fontWeight:'700'}}>
            TRADUCTION
          </Text>
          <TextInput value={title} onChangeText={setTitle}
            placeholder="Titre (facultatif)"
            placeholderTextColor={theme.muted}
            accessibilityLabel="Titre de la traduction"
            style={{fontSize:compact?12:16,fontWeight:'600',color:theme.foreground,
              paddingVertical:7,borderBottomWidth:1,borderColor:theme.border}}/>
          {editor('Traduction…',immersive?compact?290:490:compact?185:230)}
        </View>
      </View>
      {onRequestTranslator?<View style={{borderTopWidth:1,borderTopColor:theme.border,paddingTop:13,gap:7}}>
        <Pressable accessibilityRole="button" disabled={!language.trim()||requestPending}
          onPress={()=>{if(source&&language.trim()){onRequestTranslator?.(source.id,language.trim());setRequestNotice(true);}}}
          style={{flexDirection:'row',gap:8,alignItems:'center',
            alignSelf:'flex-start',paddingVertical:8,opacity:(!language.trim()||requestPending)?0.5:1}}>
          <Ionicons name="people-outline" size={18} color={PINK}/>
          <Text style={{fontSize:13,color:PINK,fontWeight:'600'}}>
            {requestPending?'Demande préparée':'Préparer une demande à un traducteur'}
          </Text>
        </Pressable>
        {(requestPending||requestNotice)?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
          Demande enregistrée dans Collaborer, sur cet appareil. Elle n’a pas encore été envoyée.
        </Text>:null}
      </View>:null}
    </> : <>
      <View style={{gap:compact?9:12,paddingHorizontal:compact?0:10}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <TextInput value={title} onChangeText={setTitle}
            placeholder={isNote?'Titre de la note':'Titre des paroles'}
            placeholderTextColor={theme.muted}
            accessibilityLabel="Titre du document"
            style={{flex:1,minWidth:0,fontSize:compact?17:19,
              fontWeight:'600',lineHeight:26,color:theme.foreground,
              paddingVertical:7}}/>
          {!isNote&&onTranslate?<Pressable
            onPress={()=>{
              if(!body.trim()){
                setSelectionError('Écris quelques paroles avant de les traduire.');
                return;
              }
              const savedId=autoSaveRef.current?.(draftResult);
              lastAutoSaved.current=draftSnapshot;
              onTranslate(savedId||undefined);
            }}
            accessibilityRole="button" accessibilityLabel="Ouvrir la page Traduction"
            style={{minHeight:42,flexDirection:'row',alignItems:'center',
              gap:5,paddingHorizontal:6}}>
            <Ionicons name="language-outline" size={17} color={PINK}/>
            <Text style={{fontSize:12,color:PINK,fontWeight:'600'}}>Traduire</Text>
          </Pressable>:null}
        </View>
        {isNote?<View style={{gap:8}}>
          <View style={{flexDirection:'row',alignItems:'center',
            justifyContent:'space-between',flexWrap:'wrap',
            borderBottomWidth:1,borderBottomColor:theme.border,paddingVertical:4}}>
            <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}>
              {toolbar('Titre','text-outline',()=>insert('# ','','Titre'))}
              {toolbar('Gras','text-outline',()=>insert('**','**','texte'))}
              {toolbar('Italique','create-outline',()=>insert('*','*','texte'))}
              {toolbar('Liste','list-outline',()=>insert('• '))}
              {toolbar('À faire','checkbox-outline',()=>insert('☐ '))}
            </View>
            <Pressable onPress={()=>setPreview(!preview)} accessibilityRole="button"
              style={{minHeight:40,alignItems:'center',justifyContent:'center',
                paddingHorizontal:8}}>
              <Text style={{fontSize:12,color:PINK,fontWeight:'600'}}>
                {preview?'Écrire':'Aperçu'}
              </Text>
            </Pressable>
          </View>
          {preview?<View style={{minHeight:compact?140:180,paddingVertical:13}}>
            {body.trim()?<MusicNotePreview text={body} color={theme.foreground}/>:
              <Text style={{fontSize:13,color:theme.muted}}>Ta note apparaîtra ici.</Text>}
          </View>:editor('Une idée, un souvenir, quelque chose à garder…',
            compact?230:290)}
        </View>:<>
          {validSelection&&!preview?<View style={{
            borderRadius:10,borderWidth:1,borderColor:theme.border,
            backgroundColor:theme.surface,paddingHorizontal:10,
            paddingVertical:8,gap:6}}>
            <Text numberOfLines={1} style={{fontSize:11,color:theme.muted}}>
              « {selectedExcerpt.trim()} »
            </Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
              {canLinkSections?<Pressable
                onPress={()=>{setSectionPicker(v=>!v);setCommentEditor(false);
                  setSelectionError('');}}
                accessibilityRole="button" accessibilityState={{expanded:sectionPicker}}
                style={{minHeight:40,flexDirection:'row',alignItems:'center',
                  gap:6,paddingHorizontal:10,borderRadius:9,
                  backgroundColor:sectionPicker?(theme.dark?'#452935':'#FAE9EF'):
                    theme.background}}>
                <Ionicons name="link-outline" size={16} color={PINK}/>
                <Text style={{fontSize:12,color:PINK,fontWeight:'600'}}>Associer</Text>
              </Pressable>:null}
              <Pressable onPress={()=>{setCommentEditor(v=>!v);setSectionPicker(false);
                setSelectionError('');}}
                accessibilityRole="button" accessibilityState={{expanded:commentEditor}}
                style={{minHeight:40,flexDirection:'row',alignItems:'center',
                  gap:6,paddingHorizontal:10,borderRadius:9,
                  backgroundColor:commentEditor?(theme.dark?'#452935':'#FAE9EF'):
                    theme.background}}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={PINK}/>
                <Text style={{fontSize:12,color:PINK,fontWeight:'600'}}>Commenter</Text>
              </Pressable>
            </View>
          </View>:null}
          {sectionPicker&&validSelection&&!preview?<View style={{gap:9,padding:11,
            borderWidth:1,borderColor:theme.border,borderRadius:10,
            backgroundColor:theme.surface}}>
            <Text style={{fontSize:11,color:theme.muted}}>
              Associer à une partie du morceau
            </Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
              {[...sections,...createdSections].map(part=><Pressable
                key={part.id} onPress={()=>attach(part)}
                accessibilityRole="button" accessibilityLabel={'Associer à '+part.title}
                style={{minHeight:36,paddingHorizontal:10,borderRadius:8,
                  borderWidth:1,borderColor:theme.border,justifyContent:'center'}}>
                <Text style={{fontSize:12,color:theme.foreground}}>{part.title}</Text>
              </Pressable>)}
              {['Intro','Couplet','Refrain','Pont'].filter(label=>
                ![...sections,...createdSections].some(part=>
                  part.title.toLocaleLowerCase()===label.toLocaleLowerCase()))
                .map(label=><Pressable key={label}
                  onPress={()=>createSectionNamed(label)}
                  accessibilityRole="button" accessibilityLabel={'Créer '+label}
                  style={{minHeight:36,paddingHorizontal:10,borderRadius:8,
                    borderWidth:1,borderColor:PINK,justifyContent:'center'}}>
                  <Text style={{fontSize:12,color:PINK}}>+ {label}</Text>
                </Pressable>)}
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <TextInput value={customSection} onChangeText={setCustomSection}
                placeholder="Autre partie…"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Nouvelle partie du morceau"
                style={{flex:1,minWidth:0,minHeight:42,paddingHorizontal:10,
                  borderWidth:1,borderColor:theme.border,borderRadius:9,
                  fontSize:13,color:theme.foreground}}/>
              <Pressable onPress={createSection} disabled={!customSection.trim()}
                accessibilityRole="button"
                accessibilityLabel="Créer et associer cette partie"
                style={{minWidth:44,minHeight:44,alignItems:'center',
                  justifyContent:'center',opacity:customSection.trim()?1:.4}}>
                <Ionicons name="add-circle-outline" size={22} color={PINK}/>
              </Pressable>
            </View>
          </View>:null}
          {commentEditor&&validSelection&&!preview?<View style={{gap:9,
            padding:11,borderRadius:10,borderWidth:1,
            borderColor:theme.border,backgroundColor:theme.surface}}>
            <Text style={{fontSize:11,color:theme.muted}}>Commentaire sur ce passage</Text>
            <TextInput value={commentDraft} onChangeText={setCommentDraft}
              multiline textAlignVertical="top" placeholder="Ta remarque…"
              placeholderTextColor={theme.muted}
              accessibilityLabel="Écrire un commentaire sur le passage"
              style={{minHeight:83,fontSize:13,lineHeight:21,
                color:theme.foreground,padding:9,borderWidth:1,
                borderColor:theme.border,borderRadius:9}}/>
            <View style={{flexDirection:'row',justifyContent:'flex-end',gap:8}}>
              <Pressable onPress={()=>{setCommentEditor(false);setCommentDraft('');}}
                accessibilityRole="button" style={{minHeight:40,
                  justifyContent:'center',paddingHorizontal:10}}>
                <Text style={{fontSize:12,color:theme.muted}}>Annuler</Text>
              </Pressable>
              <Pressable onPress={addComment} disabled={!commentDraft.trim()}
                accessibilityRole="button" style={{minHeight:40,
                  borderRadius:9,justifyContent:'center',paddingHorizontal:13,
                  backgroundColor:commentDraft.trim()?PINK:theme.border}}>
                <Text style={{fontSize:12,color:'#fff',fontWeight:'600'}}>Ajouter</Text>
              </Pressable>
            </View>
          </View>:null}
          {selectionError?<Text style={{fontSize:11,color:'#AD3857'}}>
            {selectionError}
          </Text>:null}
          {(references.length>0||comments.length>0)?<Pressable
            onPress={()=>{setPreview(v=>!v);setCommentEditor(false);
              setSectionPicker(false);}}
            accessibilityRole="button"
            accessibilityLabel={preview?'Revenir à l’édition':'Voir les passages annotés'}
            style={{alignSelf:'flex-end',minHeight:39,flexDirection:'row',
              alignItems:'center',gap:6,paddingHorizontal:8}}>
            <Ionicons name={preview?'create-outline':'eye-outline'} size={16} color={PINK}/>
            <Text style={{fontSize:11,color:PINK,fontWeight:'600'}}>
              {preview?'Modifier':'Voir les annotations'}
            </Text>
          </Pressable>:null}
          {preview&&(references.length>0||comments.length>0)?
            <View style={{paddingVertical:13,minHeight:180,gap:14}}>
              <LinkedLyricsPreview text={body} references={references}
                comments={comments} compact={compact}/>
              {references.map(ref=><View key={ref.id}
                style={{flexDirection:'row',alignItems:'center',gap:8,
                  paddingVertical:5,borderTopWidth:1,borderColor:theme.border}}>
                <Ionicons name="bookmark-outline" color={PINK} size={15}/>
                <View style={{flex:1,gap:3}}>
                  <Text style={{fontSize:11,color:PINK,fontWeight:'600'}}>
                    {[...sections,...createdSections].find(x=>x.id===ref.sectionId)?.title||'Partie'}
                  </Text>
                  <Text style={{fontSize:11,color:theme.muted}} numberOfLines={2}>
                    « {ref.text} »
                  </Text>
                </View>
                <Pressable onPress={()=>setReferences(old=>old.filter(x=>x.id!==ref.id))}
                  accessibilityRole="button" accessibilityLabel="Retirer l’association"
                  style={{width:43,height:43,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="close-outline" size={17} color={theme.muted}/>
                </Pressable>
              </View>)}
              {comments.map(comment=><View key={comment.id}
                style={{flexDirection:'row',alignItems:'flex-start',gap:8,
                  paddingVertical:7,borderTopWidth:1,borderColor:theme.border}}>
                <Ionicons name="chatbubble-outline" color={PINK} size={15}/>
                <View style={{flex:1,gap:4}}>
                  <Text style={{fontSize:11,color:theme.muted}}
                    numberOfLines={2}>« {comment.text} »</Text>
                  <Text style={{fontSize:13,lineHeight:20,
                    color:theme.foreground}}>{comment.comment}</Text>
                  {!isLyricAnchorValid(body,comment)?
                    <Text style={{fontSize:11,color:theme.muted}}>
                      Passage modifié · à re-sélectionner
                    </Text>:null}
                </View>
                <Pressable onPress={()=>setComments(old=>old.filter(x=>x.id!==comment.id))}
                  accessibilityRole="button" accessibilityLabel="Supprimer le commentaire"
                  style={{width:43,height:43,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="close-outline" size={17} color={theme.muted}/>
                </Pressable>
              </View>)}
            </View>:
            editor('Commence à écrire tes paroles…',compact?240:295)}
        </>}
      </View>
    </>}
    <View style={{flexDirection:'row',alignItems:'center',
      justifyContent:'space-between',gap:10,flexWrap:'wrap',
      paddingTop:12}}>
      <Text style={{fontSize:11,color:theme.muted,flexShrink:1}}>
        {translating?'L’original reste inchangé.':'Brouillon privé · non publié'}
      </Text>
      <Pressable onPress={save} accessibilityRole="button"
        disabled={!body.trim()||(!isNote&&!language.trim())}
        style={{minHeight:44,paddingHorizontal:18,justifyContent:'center',
          borderRadius:11,backgroundColor:body.trim()&&(isNote||language.trim())?PINK:theme.border}}>
        <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>
          {initialFile?'Enregistrer':translating?'Conserver la traduction':isNote?'Conserver la note':'Conserver les paroles'}
        </Text>
      </Pressable>
    </View>
  </View>;
}
