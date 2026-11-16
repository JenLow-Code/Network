import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { saveDraftAudio } from '@/domain/musicLocalStorage';
import { fileAudioDuration } from '@/domain/musicProjectSelectors';

type Props = { onSaved: (localAudioId: string, filename: string, durationSeconds?: number) => void };
const pink = '#CB245C';

/** Capture with an actual user-granted microphone. Requires HTTPS or localhost on web. */
export function MusicAudioCapture({ onSaved }: Props) {
  const theme = useAppTheme();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const stopTracks = () => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
  };
  const releasePreview = () => {
    if (previewUrl && typeof URL !== 'undefined') URL.revokeObjectURL(previewUrl);
  };
  useEffect(() => () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop());
  }, []);

  const start = async () => {
    setError('');
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Enregistrement direct indisponible ici. Tu peux importer un fichier audio.');
      return;
    }
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      stream.current = microphone;
      const formats = ['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'];
      const mime = formats.find(value => MediaRecorder.isTypeSupported(value));
      const mediaRecorder = mime ? new MediaRecorder(microphone, { mimeType:mime }) : new MediaRecorder(microphone);
      chunks.current = [];
      mediaRecorder.ondataavailable = e => {if(e.data.size) chunks.current.push(e.data);};
      mediaRecorder.onerror = () => {
        setError('Une erreur est survenue pendant l’enregistrement.');
        setRecording(false);stopTracks();
      };
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(chunks.current,{type:mimeType});
        const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        if (blob.size > 0) {
          const audio = new File([blob], 'prise-' + Date.now() + '.' + extension,{type:mimeType});
          setFile(audio);
          setPreviewUrl(URL.createObjectURL(blob));
        } else setError('Aucun son enregistré.');
        setRecording(false);
        stopTracks();
      };
      recorder.current = mediaRecorder;
      releasePreview();setPreviewUrl('');setFile(null);
      mediaRecorder.start(250);
      setRecording(true);
    } catch(e) {
      setError(e instanceof Error ? 'Microphone inaccessible : ' + e.message : 'Impossible d’activer le microphone.');
      stopTracks();
    }
  };
  const stop = () => {
    if(recorder.current?.state==='recording')recorder.current.stop();
  };
  const save = async () => {
    if (!file || saving) return;
    setSaving(true);setError('');
    try {
      const [id,durationSeconds] = await Promise.all([saveDraftAudio(file),fileAudioDuration(file)]);
      onSaved(id,file.name,durationSeconds);
      releasePreview();setPreviewUrl('');setFile(null);
    } catch(e) {setError(e instanceof Error ? e.message:'Sauvegarde audio impossible.');}
    finally {setSaving(false);}
  };
  const discard = () => {
    if(recording)stop();
    releasePreview();setPreviewUrl('');setFile(null);
  };
  return <View style={{gap:11}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
      <Pressable accessibilityRole="button" disabled={saving}
        onPress={() => recording ? stop() : void start()}
        style={{minHeight:44,paddingHorizontal:17,borderRadius:12,backgroundColor:recording?'#252323':pink,
          flexDirection:'row',alignItems:'center',gap:9}}>
        <Ionicons name={recording?'stop-circle-outline':'mic-outline'} size={18} color="#fff"/>
        <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>
          {recording?'Arrêter la prise':'Enregistrer avec mon micro'}
        </Text>
      </Pressable>
      {recording?<Text style={{color:pink,fontSize:12,fontWeight:'700'}}>● En cours</Text>:null}
    </View>
    {file?<View style={{gap:10,padding:12,borderRadius:12,borderWidth:1,borderColor:theme.border}}>
      <Text style={{color:theme.foreground,fontSize:12}}>Prise enregistrée · {Math.ceil(file.size / 1024)} Ko</Text>
      {previewUrl && Platform.OS==='web' ? React.createElement('audio',{controls:true,src:previewUrl,
        style:{width:'100%',height:38}}):null}
      <View style={{flexDirection:'row',gap:11,alignItems:'center'}}>
        <Pressable onPress={() => {void save();}} disabled={saving}
          style={{borderRadius:9,backgroundColor:pink,paddingHorizontal:15,paddingVertical:11}}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>
            {saving?'Sauvegarde…':'Conserver cette prise'}
          </Text>
        </Pressable>
        <Pressable onPress={discard}><Text style={{color:theme.muted,fontSize:12}}>Recommencer</Text></Pressable>
      </View>
    </View>:null}
    {error?<Text style={{color:'#B54B65',fontSize:12,lineHeight:19}}>{error}</Text>:null}
    <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>
      Utilise un casque si tu joues sur une piste existante. Cet enregistreur capture une seule entrée :
      il ne synchronise pas automatiquement les pistes.
    </Text>
  </View>;
}
