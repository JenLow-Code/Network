import React,{useEffect,useMemo,useState} from 'react';
import {Image as RNImage,Modal,Platform,Pressable,ScrollView,Text,TextInput,View,
  useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {ApiRequestError} from '@/lib/api/client';
import {API_BASE} from '@/lib/authApi';
import {useAuth} from '@/context/AuthProvider';
import {MusicCaptureScoreStrip} from './MusicCaptureScoreStrip';
import {saveMusicWorkspaceFile,getDraftAudio} from '@/domain/musicLocalStorage';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
import type {MusicNotationEvent} from '@/domain/musicNotation';

const PINK='#D71D77';
type Mode='text'|'score';
type Note={midi:number;startBeats:number;lengthBeats:number;velocity:number};
type ScanResult={
  mode:Mode;title:string;engine:string;warnings:string[];
  text?:string;language?:string;
  notes?:Note[];bpm?:number;numerator?:number;denominator?:number;
  clef?:'treble'|'bass';
};
type Props={
  visible:boolean;
  initialFile?:MusicProjectFile|null;
  sourceFile?:File|null;
  onClose:()=>void;
  onSaved:(file:MusicProjectFile)=>void;
};

/** The source is kept local; it is transferred to Workers AI only when the
 * user deliberately clicks "Analyser". The preview is NEVER called verified
 * musical transcription and cannot silently overwrite the original photo. */
export function MusicDocumentScanner({visible,initialFile,sourceFile,onClose,onSaved}:Props){
  const theme=useAppTheme();
  const {session}=useAuth();
  const {width}=useWindowDimensions();
  const compact=width<670;
  const [mode,setMode]=useState<Mode>('score');
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<ScanResult|null>(null);
  const [draftTitle,setDraftTitle]=useState('');
  const [draftText,setDraftText]=useState('');
  const [kind,setKind]=useState<'lyrics'|'note'>('lyrics');
  const [confirmed,setConfirmed]=useState(false);
  const [aiConsent,setAiConsent]=useState(false);
  useEffect(()=>{
    if(!visible)return;
    setResult(null);setError('');setDraftTitle('');setDraftText('');
    setConfirmed(false);setAiConsent(false);setMode('score');
    if(!initialFile){setFile(sourceFile||null);return;}
    if(!initialFile.localFileId){setFile(null);return;}
    let live=true;
    void getDraftAudio(initialFile.localFileId).then(blob=>{
      if(!live||!blob)return;
      setFile(new File([blob],initialFile.originalFilename||initialFile.title,
        {type:blob.type||initialFile.mimeType||'image/jpeg'}));
    });
    return()=>{live=false;};
  },[visible,initialFile?.id,sourceFile]);
  useEffect(()=>{
    if(!file||typeof URL==='undefined'){setPreview('');return;}
    const url=URL.createObjectURL(file);setPreview(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);
  const notes:MusicNotationEvent[]=useMemo(()=>
    (result?.notes||[]).map((note,index)=>({
      id:'scan-'+index,instrument:'piano' as const,midi:note.midi,
      startBeats:note.startBeats,lengthBeats:note.lengthBeats,
      velocity:note.velocity||85,
    })),[result]);
  const audition:MusicProjectFile|null=result?.mode==='score'&&notes.length?
    {id:'scan-preview',title:draftTitle||'Partition à vérifier',kind:'score',
      sectionIds:[],musicEvents:notes,tempoBpm:result.bpm||100,
      timeSignatureNumerator:result.numerator||4,
      timeSignatureDenominator:result.denominator||4,
      scoreClef:result.clef||'treble',createdAt:new Date().toISOString()}:null;
  const choose=(capture=false)=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('La numérisation est disponible dans la version web de JenLow.');
      return;
    }
    const input=document.createElement('input');
    input.type='file';
    input.accept='image/png,image/jpeg,image/webp';
    if(capture)input.setAttribute('capture','environment');
    input.onchange=()=>{
      const chosen=input.files?.[0];
      if(!chosen)return;
      setFile(chosen);setResult(null);setError('');setConfirmed(false);
    };
    input.click();
  };
  const compressed=async(source:File):Promise<string>=>{
    if(!source.type.startsWith('image/')||
      !['image/jpeg','image/png','image/webp'].includes(source.type))
      throw Error('Choisis une photo JPG, PNG ou WebP. Pour un PDF, exporte d’abord sa page en image.');
    if(source.size>15*1024*1024)
      throw Error('La photo dépasse 15 Mo. Réduis-la avant de la scanner.');
    const object=URL.createObjectURL(source);
    try{
      const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
        const img=new window.Image();
        img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Photo illisible.'));
        img.src=object;
      });
      const canvas=document.createElement('canvas');
      const scale=Math.min(1,1650/Math.max(image.naturalWidth,image.naturalHeight));
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');
      if(!context)throw Error('Traitement de la photo indisponible.');
      context.fillStyle='#FFFFFF';context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      let quality=.84;
      let data=canvas.toDataURL('image/jpeg',quality);
      while(data.length>1_550_000&&quality>.48){
        quality-=.08;data=canvas.toDataURL('image/jpeg',quality);
      }
      if(data.length>1_550_000)
        throw Error('Image trop détaillée : recadre la partition ou utilise une photo plus légère.');
      return data;
    }finally{URL.revokeObjectURL(object);}
  };
  const scan=async()=>{
    if(!file||loading||!aiConsent)return;
    setLoading(true);setError('');setResult(null);setConfirmed(false);
    try{
      const image=await compressed(file);
      if(!session?.access_token)
        throw new ApiRequestError(401,'not_authenticated');
      const response=await fetch(API_BASE+'/api/music/scan',{
        method:'POST',headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer '+session.access_token,
        },body:JSON.stringify({mode,image}),
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok){
        const issue=payload?.error;
        throw new ApiRequestError(response.status,
          issue?.code||'scan_failed',issue?.message);
      }
      const data=payload as ScanResult;
      if(data.mode!==mode||(!data.notes?.length&&!data.text?.trim()))
        throw Error('La reconnaissance ne contient aucun élément exploitable.');
      setResult(data);setDraftTitle(data.title);setDraftText(data.text||'');
    }catch(e){
      if(e instanceof ApiRequestError){
        setError(e.status===401?
          'Connecte-toi à JenLow pour utiliser la reconnaissance sécurisée.':
          e.status===503||e.status===404?
            'Le moteur de numérisation n’est pas encore activé sur le serveur. Tu peux importer du MusicXML en attendant.':
            e.message||'Analyse impossible pour cette photo.');
      }else setError(e instanceof Error?e.message:'Analyse impossible.');
    }finally{setLoading(false);}
  };
  const save=async()=>{
    if(!file||!result||!confirmed||loading)return;
    if(mode==='text'&&!draftText.trim())return;
    if(mode==='score'&&!notes.length)return;
    setLoading(true);setError('');
    try{
      const localFileId=initialFile?.localFileId||await saveMusicWorkspaceFile(file);
      const base:MusicProjectFile={
        id:initialFile?.id||newMusicId(),title:draftTitle.trim()||(mode==='score'?'Partition numérisée':'Texte numérisé'),
        kind:mode==='score'?'score':kind,
        sectionIds:[],localFileId,
        originalFilename:file.name,mimeType:file.type,
        createdAt:initialFile?.createdAt||new Date().toISOString(),
        conversionWarning:'Transcription assistée par IA : vérifiée par le créateur ; original conservé.',
      };
      if(mode==='score'){
        base.musicEvents=notes;base.tempoBpm=result.bpm||100;
        base.timeSignatureNumerator=result.numerator||4;
        base.timeSignatureDenominator=result.denominator||4;
        base.scoreClef=result.clef||'treble';
      }else{
        base.text=draftText;
        base.language=result.language||'fr';
      }
      onSaved(base);onClose();
    }catch(e){setError(e instanceof Error?e.message:'Enregistrement impossible.');}
    finally{setLoading(false);}
  };
  const tab=(id:Mode,label:string,icon:keyof typeof Ionicons.glyphMap)=>
    <Pressable onPress={()=>{setMode(id);setResult(null);setError('');setConfirmed(false);}}
      accessibilityRole="button" accessibilityState={{selected:mode===id}}
      style={{flex:1,minHeight:44,paddingHorizontal:10,flexDirection:'row',
        alignItems:'center',justifyContent:'center',gap:7,
        borderBottomWidth:mode===id?2:0,borderColor:PINK}}>
      <Ionicons name={icon} size={17} color={mode===id?PINK:theme.muted}/>
      <Text style={{fontSize:13,fontWeight:mode===id?'700':'500',
        color:mode===id?theme.foreground:theme.muted}}>{label}</Text>
    </Pressable>;
  return <Modal visible={visible} onRequestClose={onClose}
    transparent animationType="slide">
    <View style={{flex:1,backgroundColor:'rgba(0,0,0,.57)',padding:compact?7:24,
      alignItems:'center',justifyContent:'center'}}>
      <View style={{width:'100%',maxWidth:960,maxHeight:'95%',
        backgroundColor:theme.background,borderRadius:compact?11:18,
        overflow:'hidden',gap:0}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:12,
          paddingHorizontal:compact?14:22,paddingVertical:12}}>
          <Ionicons name="scan-outline" color={PINK} size={24}/>
          <Text style={{flex:1,fontSize:18,fontWeight:'700',
            color:theme.foreground}}>Numériser un document</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer le scanner"
            onPress={onClose} style={{width:40,height:40,alignItems:'center',
              justifyContent:'center'}}>
            <Ionicons name="close" size={23} color={theme.foreground}/>
          </Pressable>
        </View>
        <View style={{flexDirection:'row',borderBottomWidth:1,
          borderColor:theme.border}}>
          {tab('text','Texte / paroles','document-text-outline')}
          {tab('score','Partition / notes','musical-notes-outline')}
        </View>
        <ScrollView contentContainerStyle={{gap:15,padding:compact?14:22}}>
          <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
            {mode==='score'?
              'La reconnaissance des notes est expérimentale. Tu dois vérifier la partition et les rythmes avant de l’utiliser.':
              'La reconnaissance des textes imprimés et manuscrits peut contenir des erreurs. Vérifie le résultat avant de l’enregistrer.'}
          </Text>
          <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
            <Pressable onPress={()=>choose(false)}
              accessibilityRole="button" style={{borderRadius:9,
                borderWidth:1,borderColor:theme.border,
                minHeight:42,paddingHorizontal:14,alignItems:'center',
                flexDirection:'row',gap:8}}>
              <Ionicons name="images-outline" size={18} color={PINK}/>
              <Text style={{color:theme.foreground,fontSize:13}}>Choisir une photo</Text>
            </Pressable>
            <Pressable onPress={()=>choose(true)} accessibilityRole="button"
              style={{borderRadius:9,borderWidth:1,borderColor:theme.border,
                minHeight:42,paddingHorizontal:14,alignItems:'center',
                flexDirection:'row',gap:8}}>
              <Ionicons name="camera-outline" size={18} color={PINK}/>
              <Text style={{color:theme.foreground,fontSize:13}}>Prendre une photo</Text>
            </Pressable>
          </View>
          {file?<Text numberOfLines={1} style={{fontSize:12,
            color:theme.muted}}>{file.name}</Text>:null}
          {preview&&Platform.OS==='web'?
            <View style={{maxHeight:225,backgroundColor:theme.surface,
              borderRadius:9,overflow:'hidden',alignItems:'center'}}>
              <RNImage source={{uri:preview}} accessibilityLabel="Document original à numériser"
                resizeMode="contain" style={{width:'100%',height:225}}/>
            </View>:null}
          <Pressable onPress={()=>setAiConsent(value=>!value)}
            accessibilityRole="checkbox"
            accessibilityState={{checked:aiConsent}}
            style={{flexDirection:'row',gap:9,alignItems:'center',paddingVertical:6}}>
            <Ionicons name={aiConsent?'checkbox':'square-outline'}
              color={PINK} size={20}/>
            <Text style={{fontSize:12,lineHeight:19,color:theme.foreground,flex:1}}>
              J’autorise l’analyse temporaire de cette image par Cloudflare Workers AI.
              Aucun document n’est publié ; je vérifierai le résultat.
            </Text>
          </Pressable>
          <Pressable onPress={()=>{void scan();}} disabled={!file||loading||!aiConsent}
            accessibilityRole="button"
            style={{alignSelf:'flex-start',backgroundColor:PINK,
              opacity:!file||loading||!aiConsent?0.55:1,borderRadius:9,
              paddingVertical:12,paddingHorizontal:18}}>
            <Text style={{fontWeight:'700',color:'#FFFFFF',fontSize:13}}>
              {loading?'Analyse en cours…':
                mode==='score'?'Reconnaître les notes':'Extraire le texte'}
            </Text>
          </Pressable>
          {error?<Text style={{color:'#B7274B',fontSize:13,
            lineHeight:20}}>{error}</Text>:null}
          {result?<View style={{gap:13,paddingTop:10,
            borderTopWidth:1,borderColor:theme.border}}>
            <Text style={{color:theme.foreground,fontWeight:'700',
              fontSize:15}}>Vérifier le résultat</Text>
            <TextInput value={draftTitle} onChangeText={setDraftTitle}
              placeholder="Titre" placeholderTextColor={theme.muted}
              accessibilityLabel="Titre du document numérisé"
              style={{color:theme.foreground,borderWidth:1,
                borderColor:theme.border,borderRadius:8,
                paddingHorizontal:12,minHeight:44,fontSize:14}}/>
            {mode==='text'?<View style={{gap:7}}>
              <View style={{flexDirection:'row',gap:15}}>
                {(['lyrics','note'] as const).map(option=>
                  <Pressable key={option} onPress={()=>setKind(option)}
                    accessibilityRole="button" accessibilityState={{selected:kind===option}}
                    style={{paddingVertical:7,paddingHorizontal:11,
                      borderRadius:8,backgroundColor:kind===option?
                        (theme.dark?'#392332':'#FAE7EF'):'transparent'}}>
                    <Text style={{color:kind===option?PINK:theme.foreground,
                      fontSize:12}}>{option==='lyrics'?'Paroles':'Note'}</Text>
                  </Pressable>)}
              </View>
              <TextInput multiline value={draftText} onChangeText={setDraftText}
                accessibilityLabel="Transcription modifiable"
                style={{color:theme.foreground,fontSize:15,lineHeight:25,
                  minHeight:200,textAlignVertical:'top',borderRadius:9,
                  padding:15,borderWidth:1,borderColor:theme.border}}/>
            </View>:audition?<View style={{gap:8}}>
              <Text style={{fontSize:12,color:theme.muted}}>
                {notes.length} notes détectées · {result.bpm||100} BPM ·
                {' '}{result.numerator||4}/{result.denominator||4}
              </Text>
              <MusicCaptureScoreStrip file={audition}/>
              <Text style={{fontSize:12,color:theme.muted}}>
                Écoute l’aperçu, puis corrige les notes dans Composer après l’enregistrement.
              </Text>
            </View>:null}
            {(result.warnings||[]).map((warning,i)=>
              <Text key={i} style={{fontSize:12,lineHeight:19,
                color:theme.muted}}>• {warning}</Text>)}
            <Pressable accessibilityRole="checkbox"
              accessibilityState={{checked:confirmed}}
              onPress={()=>setConfirmed(value=>!value)}
              style={{flexDirection:'row',gap:10,alignItems:'center',
                paddingVertical:9}}>
              <Ionicons name={confirmed?'checkbox':'square-outline'}
                size={23} color={PINK}/>
              <Text style={{fontSize:12,color:theme.foreground,
                flex:1,lineHeight:18}}>
                J’ai vérifié le résultat et je souhaite conserver ce brouillon avec son original.
              </Text>
            </Pressable>
            <Pressable onPress={()=>{void save();}} disabled={!confirmed||loading}
              accessibilityRole="button"
              style={{alignSelf:'flex-end',paddingHorizontal:19,
                paddingVertical:13,borderRadius:10,backgroundColor:PINK,
                opacity:confirmed&&!loading?1:.5}}>
              <Text style={{fontSize:13,fontWeight:'700',color:'#FFFFFF'}}>
                {mode==='score'?'Ajouter la partition':'Enregistrer le texte'}
              </Text>
            </Pressable>
          </View>:null}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
