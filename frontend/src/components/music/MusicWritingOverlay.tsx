import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MusicAudioPreview } from './MusicAudioPreview';
import { MusicWritingStudio, type MusicWritingResult } from './MusicWritingStudio';
import { useAppTheme } from '@/theme/AppTheme';
import type { MusicProject, MusicProjectFile } from '@/domain/musicWorkspace';

const PINK = '#CB245C';
type WritingMode = 'lyrics' | 'note';
type Props = {
  project: MusicProject;
  mode: WritingMode;
  onModeChange: (mode: WritingMode) => void;
  source?: MusicProjectFile | null;
  initialFile?: MusicProjectFile | null;
  onSave: (result: MusicWritingResult) => void;
  onRequestTranslator: (sourceId: string, language: string) => void;
  requestedLanguages: string[];
  onClose: () => void;
};

function isCaptureAudio(file: MusicProjectFile): boolean {
  return !!file.localFileId && (
    !!file.mimeType?.startsWith('audio/') ||
    /\.(wav|mp3|m4a|webm|ogg|aac)$/i.test(file.originalFilename || '')
  );
}

/**
 * Separate writing surface. The song overview, navigation and Capture tools
 * remain behind the full-screen native/web modal and cannot distract the writer.
 * Audio is opt-in, and sources come exclusively from this song's Capture files.
 */
export function MusicWritingOverlay({
  project, mode, onModeChange, source, initialFile,
  onSave, onRequestTranslator, requestedLanguages, onClose,
}: Props) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 650;
  const [dirty, setDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [listen, setListen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [audioId, setAudioId] = useState('');
  const audioFiles = (project.files || []).filter(isCaptureAudio);
  const selectedAudio = audioFiles.find(file => file.id === audioId);
  const canTranscribe = mode === 'lyrics' && !source;
  const exit = () => {
    if (dirty) setConfirmExit(true);
    else onClose();
  };

  const sourceChoice = (file: MusicProjectFile) => (
    <Pressable key={file.id} accessibilityRole="button"
      accessibilityLabel={'Utiliser '+file.title+' pour la transcription'}
      onPress={() => { setAudioId(file.id); setChoosing(false); }}
      style={{
        minHeight:47, paddingHorizontal:12, paddingVertical:8,
        flexDirection:'row', alignItems:'center', gap:10,
        borderRadius:10, backgroundColor:file.id===audioId
          ?(theme.dark?'#37242C':'#FAE9EF'):theme.surface,
      }}>
      <Ionicons name={file.id===audioId?'radio-button-on-outline':'radio-button-off-outline'}
        color={file.id===audioId?PINK:theme.muted} size={20}/>
      <Text numberOfLines={2} style={{flex:1,fontSize:13,color:theme.foreground}}>
        {file.title}
      </Text>
    </Pressable>
  );

  return <Modal visible animationType="slide" presentationStyle="fullScreen"
    onRequestClose={exit}>
    <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}
        style={{flex:1}}>
        <View style={{
          minHeight:58, flexDirection:'row', alignItems:'center', gap:10,
          paddingHorizontal:compact?14:27,
          borderBottomWidth:1, borderBottomColor:theme.border,
        }}>
          <Pressable onPress={exit} accessibilityRole="button" accessibilityLabel="Fermer l’éditeur"
            style={{width:42,height:42,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="close" size={24} color={theme.foreground}/>
          </Pressable>
          <Text numberOfLines={1} style={{flex:1,color:theme.foreground,
            fontSize:compact?15:16,fontWeight:'600',textAlign:'center'}}>
            {source?'Traduction':mode==='note'?'Notes':'Paroles'}
          </Text>
          <View style={{width:42}}/>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            width:'100%',maxWidth:source?1100:860,alignSelf:'center',
            paddingHorizontal:compact?19:45,
            paddingTop:compact?16:34,paddingBottom:compact?50:80,
            flexGrow:1,gap:compact?16:23,
          }}>
          {canTranscribe?<View style={{gap:9}}>
            <Pressable onPress={() => {
              setListen(previous => !previous); setChoosing(false);
            }} accessibilityRole="checkbox" accessibilityState={{checked:listen}}
              accessibilityLabel="Écouter un audio de Capture pendant l’écriture"
              style={{minHeight:40,flexDirection:'row',alignItems:'center',gap:10,
                alignSelf:'flex-start'}}>
              <Ionicons name={listen?'checkbox':'square-outline'} color={listen?PINK:theme.muted} size={22}/>
              <Text style={{fontSize:13,fontWeight:'500',color:theme.foreground}}>
                Écouter un audio en écrivant
              </Text>
            </Pressable>
            {listen?<View style={{padding:compact?12:16,borderWidth:1,
              borderColor:theme.border,borderRadius:13,
              backgroundColor:theme.surface,gap:12}}>
              {audioFiles.length?<View style={{gap:9}}>
                <Pressable onPress={()=>setChoosing(!choosing)}
                  accessibilityRole="button" accessibilityState={{expanded:choosing}}
                  accessibilityLabel="Choisir un enregistrement de Capture"
                  style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:36}}>
                  <Ionicons name="musical-note-outline" size={18} color={PINK}/>
                  <Text numberOfLines={1} style={{flex:1,fontSize:13,
                    color:theme.foreground,fontWeight:'600'}}>
                    {selectedAudio?.title||'Choisir un audio de Capture'}
                  </Text>
                  <Ionicons name={choosing?'chevron-up':'chevron-down'}
                    color={theme.muted} size={17}/>
                </Pressable>
                {choosing?<View style={{gap:3}}>
                  {audioFiles.map(sourceChoice)}
                </View>:null}
                {selectedAudio?.localFileId?
                  <MusicAudioPreview key={selectedAudio.id}
                    source={{localAudioId:selectedAudio.localFileId}} transcription/>:null}
              </View>:
                <Text style={{fontSize:12,lineHeight:20,color:theme.muted}}>
                  Aucun audio enregistré dans Capture pour ce morceau.
                  Importe ou enregistre un audio depuis Capture, puis reviens écrire.
                </Text>}
            </View>:null}
          </View>:null}
          <MusicWritingStudio
            mode={mode} onModeChange={onModeChange}
            originalLanguage={project.originalLanguage}
            source={source} initialFile={initialFile||undefined}
            onSave={onSave} onRequestTranslator={onRequestTranslator}
            requestedLanguages={requestedLanguages}
            onDirtyChange={setDirty} immersive/>
        </ScrollView>
        {confirmExit?<View style={{
          position:'absolute',top:0,right:0,left:0,bottom:0,
          alignItems:'center',justifyContent:'center',
          padding:20,backgroundColor:'rgba(18,12,17,.55)',
        }}>
          <View style={{width:'100%',maxWidth:390,gap:17,padding:24,
            borderRadius:18,backgroundColor:theme.background}}>
            <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
              Abandonner les modifications ?
            </Text>
            <Text style={{fontSize:13,lineHeight:21,color:theme.muted}}>
              Ton texte n’a pas encore été enregistré dans Capture.
            </Text>
            <View style={{flexDirection:'row',justifyContent:'flex-end',
              flexWrap:'wrap',gap:12}}>
              <Pressable onPress={()=>setConfirmExit(false)} accessibilityRole="button"
                style={{minHeight:43,justifyContent:'center',paddingHorizontal:10}}>
                <Text style={{color:theme.foreground,fontWeight:'600'}}>Continuer à écrire</Text>
              </Pressable>
              <Pressable onPress={onClose} accessibilityRole="button"
                style={{minHeight:43,justifyContent:'center',
                  paddingHorizontal:14,borderRadius:10,backgroundColor:PINK}}>
                <Text style={{color:'#fff',fontWeight:'700'}}>Abandonner</Text>
              </Pressable>
            </View>
          </View>
        </View>:null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
