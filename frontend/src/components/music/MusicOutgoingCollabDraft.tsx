import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Platform,Pressable,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '@/context/AuthProvider';
import {useApp} from '@/context/AppContext';
import {useAppTheme} from '@/theme/AppTheme';
import {api,ApiRequestError} from '@/lib/api/client';
import {chooseMusicFile,uploadMusicAudioFile} from '@/domain/musicMedia';
import type {MusicPublication} from '@/domain/publication';

const PINK='#CB245C';
type Draft={role:string;part:string;message:string;audioUrl:string};
const keyFor=(userId:string,trackId:string)=>
  'jenlow.music.outgoing-draft.v1.'+userId+'.'+trackId;

/** An OUTGOING collaboration proposal, never an inbox or received request.
 * Requires a real verified API user to send; fictional/demo preview cannot
 * ever call the proposal endpoint. Local drafts are scoped to the signed-in
 * user and track and are never labeled as successfully sent until confirmed.
 */
export function MusicOutgoingCollabDraft({song,previewOnly}:{
  song:MusicPublication;previewOnly:boolean;
}){
  const theme=useAppTheme();
  const {user}=useAuth();
  const app=useApp();
  const [role,setRole]=useState(song.requestedTalents?.[0]||'');
  const [part,setPart]=useState('');
  const [message,setMessage]=useState(
    'Bonjour '+song.author+', je souhaiterais collaborer sur « '+song.title+
    ' ». Voici ce que je pourrais apporter : ');
  const [audioUrl,setAudioUrl]=useState('');
  const [mediaId,setMediaId]=useState('');
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  const [proposalId,setProposalId]=useState('');
  const draftKey=user?keyFor(user.id,song.id):null;
  const field={backgroundColor:theme.background,
    borderColor:theme.border,borderWidth:1,borderRadius:10,
    paddingHorizontal:11,paddingVertical:9,
    color:theme.foreground,fontSize:12} as const;

  useEffect(()=>{
    let active=true;
    setReady(false);setSent(false);setError('');
    if(!draftKey){setReady(true);return;}
    void AsyncStorage.getItem(draftKey)
      .then(raw=>{
        if(!active||!raw)return;
        try{
          const data=JSON.parse(raw) as Partial<Draft>;
          if(typeof data.role==='string')setRole(data.role);
          if(typeof data.part==='string')setPart(data.part);
          if(typeof data.message==='string')setMessage(data.message);
          if(typeof data.audioUrl==='string')setAudioUrl(data.audioUrl);
        }catch{/* Do not trust invalid locally cached drafts. */}
      }).finally(()=>{if(active)setReady(true);});
    return()=>{active=false;};
  },[draftKey]);

  useEffect(()=>{
    if(!ready||sent||!draftKey)return;
    const task=setTimeout(()=>{
      void AsyncStorage.setItem(draftKey,JSON.stringify({
        role,part,message,audioUrl,
      } satisfies Draft)).catch(()=>{});
    },450);
    return()=>clearTimeout(task);
  },[ready,sent,draftKey,role,part,message,audioUrl]);

  const canSend=!previewOnly&&!!user&&!busy&&!sent&&
    role.trim().length>0&&message.trim().length>=20&&
    (!!mediaId||/^https:\/\//i.test(audioUrl.trim()));
  const upload=()=>{
    if(previewOnly||busy||Platform.OS!=='web')return;
    chooseMusicFile(file=>{
      setBusy(true);setError('');
      void uploadMusicAudioFile(file,'music_proposal')
        .then(uploaded=>{setMediaId(uploaded.mediaId);setAudioUrl('');})
        .catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setBusy(false));
    });
  };
  const send=async()=>{
    if(!canSend)return;
    setBusy(true);setError('');
    try{
      const description=[part.trim()?'Partie concernée : '+part.trim():'',
        message.trim()].filter(Boolean).join('\n\n');
      const response=await api<{proposal:{id:string;status:string}}>(
        '/api/music/'+encodeURIComponent(song.id)+'/proposals',{
          method:'POST',auth:'required',body:{
            description,audioMediaId:mediaId||undefined,
            externalAudioUrl:mediaId?undefined:audioUrl.trim(),submit:true,
            credits:[{displayName:app.name,contribution:role.trim()}],
          },
        });
      if(response.proposal?.status!=='submitted'||!response.proposal.id)
        throw new Error('Le serveur n’a pas confirmé cet envoi.');
      setProposalId(response.proposal.id);
      setSent(true);
      app.proposeMusic(song.id);
      if(draftKey)void AsyncStorage.removeItem(draftKey).catch(()=>{});
    }catch(e){
      setError(e instanceof ApiRequestError&&
        (e.status===401||e.code==='not_authenticated')
        ?'La connexion JenLow API n’est pas encore reconnue. Aucun message n’a été envoyé.'
        :e instanceof Error?e.message:'La demande n’a pas été envoyée.');
    }finally{setBusy(false);}
  };
  return <View style={{borderWidth:1,borderColor:theme.border,
    backgroundColor:theme.surface,borderRadius:13,
    padding:13,gap:11}}>
    <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
      Ma demande de collaboration
    </Text>
    <Text style={{fontSize:11,color:theme.muted,lineHeight:17}}>
      Demande sortante · envoyée à l’auteur du morceau
    </Text>
    {sent?<View style={{gap:7}}>
      <Text style={{fontSize:13,color:theme.foreground,fontWeight:'700'}}>
        Demande envoyée
      </Text>
      <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
        Le serveur a confirmé l’envoi à l’auteur. Référence : {proposalId}
      </Text>
    </View>:<>
      <View style={{gap:5}}>
        <Text style={{fontSize:11,color:theme.muted}}>Mon talent / mon rôle</Text>
        <TextInput value={role} onChangeText={setRole}
          placeholder="Ex. Chant, guitare, mixage…" placeholderTextColor={theme.muted}
          accessibilityLabel="Mon talent pour cette demande" style={field}/>
      </View>
      <View style={{gap:5}}>
        <Text style={{fontSize:11,color:theme.muted}}>Partie du morceau (facultatif)</Text>
        <TextInput value={part} onChangeText={setPart}
          placeholder="Ex. Refrain, morceau entier"
          placeholderTextColor={theme.muted} style={field}/>
      </View>
      <View style={{gap:5}}>
        <Text style={{fontSize:11,color:theme.muted}}>Message pour l’auteur</Text>
        <TextInput value={message} onChangeText={setMessage}
          multiline textAlignVertical="top"
          accessibilityLabel="Brouillon de ma demande"
          placeholderTextColor={theme.muted} style={{...field,minHeight:96}}/>
      </View>
      {previewOnly?<Text style={{fontSize:11,color:theme.muted,lineHeight:17}}>
        Exemple fictif : tu peux modifier ce brouillon, mais aucun envoi réel
        n’est possible depuis ce morceau de démonstration.
      </Text>:<>
        <Text style={{fontSize:11,color:theme.muted}}>
          Joindre ma proposition audio
        </Text>
        {Platform.OS==='web'?<Pressable accessibilityRole="button"
          disabled={busy} onPress={upload}
          style={{borderWidth:1,borderColor:PINK,borderRadius:9,
            minHeight:38,alignItems:'center',justifyContent:'center',padding:8}}>
          <Text style={{color:PINK,fontSize:11,fontWeight:'700'}}>
            {mediaId?'Enregistrement joint · remplacer':'Importer un enregistrement'}
          </Text>
        </Pressable>:null}
        <TextInput value={audioUrl}
          onChangeText={value=>{setAudioUrl(value);setMediaId('');}}
          autoCapitalize="none" placeholder="Ou lien HTTPS vers mon audio"
          placeholderTextColor={theme.muted}
          accessibilityLabel="Lien vers mon enregistrement"
          style={field}/>
        <Text style={{fontSize:10,lineHeight:16,color:theme.muted}}>
          Le serveur demande actuellement une piste audio pour envoyer une
          proposition. Ton message seul reste en brouillon local.
        </Text>
      </>}
      {!!error?<Text style={{fontSize:11,color:PINK,lineHeight:17}}>{error}</Text>:null}
      <Pressable onPress={()=>{void send();}} disabled={!canSend}
        accessibilityRole="button" accessibilityLabel="Envoyer ma demande de collaboration"
        style={{backgroundColor:canSend?PINK:theme.border,
          minHeight:43,justifyContent:'center',alignItems:'center',
          borderRadius:10,paddingHorizontal:10}}>
        {busy?<ActivityIndicator color="#FFFFFF" size="small"/>:
          <Text style={{fontSize:12,fontWeight:'700',
            color:canSend?'#FFFFFF':theme.muted}}>
            {previewOnly?'Envoi désactivé (démo)':'Envoyer ma demande'}
          </Text>}
      </Pressable>
    </>}
  </View>;
}
