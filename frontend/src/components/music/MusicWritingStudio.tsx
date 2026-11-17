import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { MusicProjectFile } from '@/domain/musicWorkspace';

const PINK = '#CB245C';
const LANGUAGES = ['Français', 'English', 'Português', 'Deutsch', 'Español', 'Italiano'];
type Mode = 'lyrics' | 'note';
export type MusicWritingResult = {
  mode: Mode | 'translation';
  title: string;
  text: string;
  language?: string;
  translationOfFileId?: string;
};
type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  originalLanguage: string;
  source?: MusicProjectFile | null;
  onSave: (result: MusicWritingResult) => void;
  onRequestTranslator: (sourceId: string, language: string) => void;
  requestPending: boolean;
  onDirtyChange: (dirty: boolean) => void;
};

function lyricText(file: MusicProjectFile) {
  return file.lyricSegments?.length
    ? file.lyricSegments.map(s => s.text).join('\n\n')
    : file.text || '';
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

export function MusicWritingStudio({ mode, onModeChange, originalLanguage, source,
  onSave, onRequestTranslator, requestPending, onDirtyChange }: Props) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
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
  const [otherLanguage, setOtherLanguage] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sourceExpanded, setSourceExpanded] = useState(true);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const input = useRef<TextInput>(null);
  const [requestNotice, setRequestNotice] = useState(false);

  const isNote = !translating && mode === 'note';
  const body = translating ? translationBody : isNote ? noteBody : lyricBody;
  const title = translating ? translationTitle : isNote ? noteTitle : lyricTitle;
  const setBody = translating ? setTranslationBody : isNote ? setNoteBody : setLyricBody;
  const setTitle = translating ? setTranslationTitle : isNote ? setNoteTitle : setLyricTitle;
  const language = translating ? targetLanguage : lyricLanguage;
  const setLanguage = translating ? setTargetLanguage : setLyricLanguage;
  const dirty = !!(lyricBody.trim() || lyricTitle.trim() || noteBody.trim() || noteTitle.trim() ||
    translationBody.trim() || translationTitle.trim());

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    // Opening a different source must never keep the previous translation's text.
    setTranslationBody('');
    setTranslationTitle('');
    setTargetLanguage('');
    setRequestNotice(false);
  }, [source?.id]);

  const chooseLanguage = (next: string) => {
    if (next === 'Autre…') {
      setOtherLanguage(true);
      setLanguage('');
    } else {
      setOtherLanguage(false);
      setLanguage(next);
    }
    setLanguageOpen(false);
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

  const save = () => {
    if (!body.trim() || (!isNote && !language.trim())) return;
    onSave({ mode: translating ? 'translation' : isNote ? 'note' : 'lyrics',
      title: title.trim(), text: body.trim(),
      language: isNote ? undefined : language.trim(),
      translationOfFileId: source?.id });
    if (translating) { setTranslationBody(''); setTranslationTitle(''); }
    else if (isNote) { setNoteBody(''); setNoteTitle(''); }
    else { setLyricBody(''); setLyricTitle(''); }
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
    value={body} onChangeText={setBody}
    onSelectionChange={event => setSelection(event.nativeEvent.selection)}
    placeholder={placeholder} placeholderTextColor={theme.muted}
    accessibilityLabel={translating?'Traduction':isNote?'Contenu de la note':'Paroles'}
    style={{fontFamily:isNote?undefined:'Georgia',fontSize:isNote?16:18,
      lineHeight:isNote?27:30,minHeight:minimum,
      paddingVertical:14,paddingHorizontal:0,color:theme.foreground}}/>;
  const languageControl = <View style={{gap:8}}>
    <Pressable onPress={() => setLanguageOpen(!languageOpen)}
      accessibilityRole="button" accessibilityLabel="Choisir la langue"
      accessibilityState={{expanded:languageOpen}}
      style={{alignSelf:'flex-start',flexDirection:'row',gap:7,
        alignItems:'center',paddingVertical:9,paddingHorizontal:12,
        borderRadius:10,borderWidth:1,borderColor:theme.border}}>
      <Ionicons name="language-outline" size={17} color={PINK}/>
      <Text style={{fontSize:13,color:language?theme.foreground:theme.muted}}>
        {language || 'Choisir une langue'}
      </Text>
      <Ionicons name={languageOpen?'chevron-up':'chevron-down'} size={15} color={theme.muted}/>
    </Pressable>
    {languageOpen ? <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
      {[...LANGUAGES,'Autre…'].map(name=><Pressable key={name}
        onPress={()=>chooseLanguage(name)}
        style={{minHeight:37,justifyContent:'center',paddingHorizontal:12,
          borderRadius:9,borderWidth:1,borderColor:theme.border,
          backgroundColor:language===name?(theme.dark?'#392631':'#FBEAF0'):theme.surface}}>
        <Text style={{fontSize:12,color:theme.foreground}}>{name}</Text>
      </Pressable>)}
    </View> : null}
    {otherLanguage ? <TextInput value={language} onChangeText={setLanguage}
      accessibilityLabel="Nom de la langue" placeholder="Nom de la langue"
      placeholderTextColor={theme.muted}
      style={{fontSize:14,color:theme.foreground,padding:10,
        borderWidth:1,borderRadius:10,borderColor:theme.border}}/> : null}
  </View>;

  return <View style={{gap:14}}>
    {!translating ? <View style={{flexDirection:'row',gap:13,
      borderBottomWidth:1,borderBottomColor:theme.border,alignSelf:'flex-start'}}>
      {choose('lyrics','Paroles')}
      {choose('note','Notes')}
    </View> : <View style={{gap:4}}>
      <Text style={{color:theme.foreground,fontSize:19,fontWeight:'700'}}>Traduire les paroles</Text>
      <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
        Une traduction liée à l’original, pas une nouvelle chanson.
      </Text>
    </View>}
    {translating ? <>
      <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <Text style={{color:theme.muted,fontSize:12}}>Vers</Text>
        {languageControl}
      </View>
      <View style={{flexDirection:compact?'column':'row',gap:compact?12:20,alignItems:'stretch'}}>
        <View style={{flex:1,minWidth:0,gap:10}}>
          <Text style={{fontSize:12,color:PINK,fontWeight:'700'}}>TRADUCTION</Text>
          <TextInput value={title} onChangeText={setTitle}
            placeholder="Titre de la traduction (facultatif)"
            placeholderTextColor={theme.muted}
            accessibilityLabel="Titre de la traduction"
            style={{fontSize:16,fontWeight:'600',color:theme.foreground,
              paddingVertical:8,borderBottomWidth:1,borderColor:theme.border}}/>
          {editor('Écris ta traduction ici…',compact?145:230)}
        </View>
        <View style={{flex:1,minWidth:0,backgroundColor:theme.dark?'#292326':'#F7F4F1',
          borderRadius:13,padding:compact?13:17,gap:10}}>
          <Pressable onPress={()=>setSourceExpanded(!sourceExpanded)}
            accessibilityRole="button" accessibilityLabel="Afficher ou masquer les paroles originales"
            style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:31}}>
            <Text style={{fontSize:12,color:theme.muted,fontWeight:'700',flex:1}}>
              ORIGINAL · {source?.language || originalLanguage}
            </Text>
            {compact?<Ionicons name={sourceExpanded?'chevron-up':'chevron-down'}
              color={theme.muted} size={18}/>:null}
          </Pressable>
          {(!compact||sourceExpanded)&&source ? <>
            <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>{source.title}</Text>
            <Text selectable style={{fontFamily:'Georgia',fontSize:compact?15:16,
              lineHeight:compact?24:27,color:theme.foreground}}>
              {lyricText(source)}
            </Text>
          </> : null}
        </View>
      </View>
      <View style={{borderTopWidth:1,borderTopColor:theme.border,paddingTop:13,gap:7}}>
        <Pressable accessibilityRole="button" disabled={!language.trim()||requestPending}
          onPress={()=>{if(source&&language.trim()){onRequestTranslator(source.id,language.trim());setRequestNotice(true);}}}
          style={{flexDirection:'row',gap:8,alignItems:'center',
            alignSelf:'flex-start',paddingVertical:8,opacity:!language.trim()||requestPending?.5:1}}>
          <Ionicons name="people-outline" size={18} color={PINK}/>
          <Text style={{fontSize:13,color:PINK,fontWeight:'600'}}>
            {requestPending?'Demande préparée':'Préparer une demande à un traducteur'}
          </Text>
        </Pressable>
        {(requestPending||requestNotice)?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
          Demande enregistrée dans Collaborer, sur cet appareil. Elle n’a pas encore été envoyée.
        </Text>:null}
      </View>
    </> : <>
      <View style={{gap:0,paddingHorizontal:compact?0:11}}>
        <TextInput value={title} onChangeText={setTitle}
          placeholder={isNote?'Titre de la note (facultatif)':'Titre des paroles (facultatif)'}
          placeholderTextColor={theme.muted}
          accessibilityLabel="Titre du document"
          style={{fontSize:compact?19:22,fontWeight:'600',lineHeight:30,
            color:theme.foreground,paddingVertical:10}}/>
        {!isNote ? languageControl : <View style={{height:5}}/>}
        {isNote?<View style={{flexDirection:'row',alignItems:'center',
          justifyContent:'space-between',flexWrap:'wrap',
          borderBottomWidth:1,borderBottomColor:theme.border,paddingVertical:5}}>
          <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}>
            {toolbar('Titre','text-outline',()=>insert('# ','','Titre'))}
            {toolbar('Gras','text-outline',()=>insert('**','**','texte'))}
            {toolbar('Italique','create-outline',()=>insert('*','*','texte'))}
            {toolbar('Liste','list-outline',()=>insert('• '))}
            {toolbar('À faire','checkbox-outline',()=>insert('☐ '))}
          </View>
          <Pressable accessibilityRole="button" onPress={()=>setPreview(!preview)}
            style={{minHeight:40,alignItems:'center',justifyContent:'center',paddingHorizontal:8}}>
            <Text style={{fontSize:12,color:PINK,fontWeight:'600'}}>
              {preview?'Écrire':'Aperçu'}
            </Text>
          </Pressable>
        </View>:null}
        {isNote&&preview?<View style={{minHeight:compact?135:190,paddingVertical:15}}>
          {body.trim()?<MusicNotePreview text={body} color={theme.foreground}/>:
            <Text style={{fontSize:14,color:theme.muted}}>Un aperçu de ta note apparaîtra ici.</Text>}
        </View>:editor(isNote?'Une idée, un souvenir, quelque chose à garder…':
          'Commence à écrire tes paroles…',compact?145:210)}
      </View>
    </>}
    <View style={{flexDirection:'row',alignItems:'center',
      justifyContent:'space-between',gap:10,flexWrap:'wrap',
      borderTopWidth:1,borderTopColor:theme.border,paddingTop:12}}>
      <Text style={{fontSize:11,color:theme.muted,flexShrink:1}}>
        {translating?'L’original reste inchangé.':'Brouillon privé · non publié'}
      </Text>
      <Pressable onPress={save} accessibilityRole="button"
        disabled={!body.trim()||(!isNote&&!language.trim())}
        style={{minHeight:44,paddingHorizontal:18,justifyContent:'center',
          borderRadius:11,backgroundColor:body.trim()&&(isNote||language.trim())?PINK:theme.border}}>
        <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>
          {translating?'Conserver la traduction':isNote?'Conserver la note':'Conserver les paroles'}
        </Text>
      </Pressable>
    </View>
  </View>;
}
