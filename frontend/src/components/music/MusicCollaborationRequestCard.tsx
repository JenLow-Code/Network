import React,{useState} from 'react';
import {Image,Modal,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPreview} from './MusicAudioPreview';

const PINK='#CB245C';
export type CollaborationDecision='test'|'archive'|'accept'|'reject';
export type CollaborationRequest={
  id:string;trackTitle:string;description:string;status:string;
  createdAt:string;reviewState?:string;archiveUntil?:string|null;
  canArchive?:boolean;reviewStartedAt?:string|null;
  proposer?:{handle?:string;displayName?:string;avatarUrl?:string|null};
};
export function MusicCollaborationRequestCard({
  request,audioUrl='',audioOpen=false,loading=false,busy=false,
  onListen,onAction,onProfile,
}:{
  request:CollaborationRequest;audioUrl?:string;
  audioOpen?:boolean;loading?:boolean;busy?:boolean;
  onListen:()=>void;onAction:(action:CollaborationDecision)=>void;
  onProfile:()=>void;
}){
  const theme=useAppTheme();
  const [confirm,setConfirm]=useState<CollaborationDecision|null>(null);
  const person=request.proposer?.displayName||'Un musicien';
  const awaiting=request.status==='submitted';
  const archived=awaiting&&request.reviewState==='archived';
  const inReview=awaiting&&(request.reviewState==='testing'||archived);
  const status=awaiting
    ?archived?'Archivée · réponse toujours en attente'
      :inReview?'En cours d’examen · réponse en attente':'À examiner'
    :request.status==='accepted'?'Acceptée'
      :request.status==='rejected'?'Refusée'
      :request.status==='published'?'Publiée'
      :'Clôturée';
  const buttons:{key:CollaborationDecision;title:string;icon:keyof typeof Ionicons.glyphMap}[]=[
    {key:'reject',title:'Refuser',icon:'close-outline'},
    {key:'test',title:'Tester',icon:'headset-outline'},
    {key:'accept',title:'Accepter',icon:'checkmark-outline'},
    {key:'archive',title:'Archiver',icon:'archive-outline'},
  ];
  const invoke=(action:CollaborationDecision)=>{
    if(action==='test'){onAction(action);return;}
    setConfirm(action);
  };
  return <View style={{gap:15,padding:16,borderRadius:16,
    borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:11}}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Voir le profil de '+person}
        onPress={onProfile}
        style={{width:42,height:42,borderRadius:21,
          backgroundColor:theme.dark?'#392F35':'#F7EAF0',
          alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {request.proposer?.avatarUrl?<Image
          source={{uri:request.proposer.avatarUrl}}
          style={{width:42,height:42,borderRadius:21}}/>:
          <Text style={{fontSize:17,fontFamily:'serif',fontStyle:'italic',
            color:PINK}}>{person.trim().charAt(0)}</Text>}
      </Pressable>
      <View style={{flex:1,gap:3,minWidth:0}}>
        <Pressable accessibilityRole="button"
          accessibilityLabel={'Ouvrir le profil de '+person} onPress={onProfile}>
          <Text numberOfLines={1} style={{fontSize:16,fontFamily:'serif',
            fontStyle:'italic',fontWeight:'600',color:theme.foreground}}>
            {person}
          </Text>
        </Pressable>
        <Text style={{fontSize:11,color:theme.muted}}>
          Demande de collaboration
        </Text>
      </View>
      <Text style={{fontSize:10,fontWeight:'600',
        color:awaiting?PINK:theme.muted,textAlign:'right',maxWidth:135}}>
        {status}
      </Text>
    </View>
    {archived&&request.archiveUntil?<View style={{
      flexDirection:'row',gap:7,alignItems:'center'}}>
      <Ionicons name="calendar-outline" size={14} color={theme.muted}/>
      <Text style={{fontSize:11,color:theme.muted}}>
        Retour automatique le {new Date(request.archiveUntil).toLocaleDateString('fr-FR')}
      </Text>
    </View>:null}
    <View style={{paddingHorizontal:15,paddingVertical:14,gap:6,
      borderRadius:12,borderLeftWidth:2,borderLeftColor:PINK,
      backgroundColor:theme.dark?'rgba(255,255,255,.05)':'#F9F6F2'}}>
      <Text style={{fontSize:10,letterSpacing:.5,color:theme.muted,
        fontWeight:'700'}}>MESSAGE DE {person.toLocaleUpperCase('fr')}</Text>
      <Text style={{fontSize:13,lineHeight:22,color:theme.foreground}}>
        {request.description}
      </Text>
    </View>
    <View style={{gap:8}}>
        <Pressable accessibilityRole="button"
          accessibilityLabel={'Ouvrir et écouter la piste proposée pour '+request.trackTitle}
          onPress={onListen}
          style={{flexDirection:'row',alignItems:'center',gap:12,
            paddingHorizontal:12,paddingVertical:12,borderRadius:12,
            borderWidth:1,borderColor:theme.border,
            backgroundColor:theme.dark?'rgba(255,255,255,.03)':'#FBF8F5'}}>
          <Ionicons name="musical-notes-outline" size={20} color={PINK}/>
          <View style={{flex:1,gap:3,minWidth:0}}>
            <Text numberOfLines={1} style={{fontWeight:'700',fontSize:12,
              color:theme.foreground}}>Proposition de piste · {request.trackTitle}</Text>
            <Text style={{fontSize:10,color:theme.muted}}>
              {audioOpen?'Masquer le lecteur':'Ouvrir pour écouter'}
            </Text>
          </View>
          <Ionicons name={audioOpen?'chevron-up':'chevron-forward'}
            size={16} color={theme.muted}/>
        </Pressable>
        {loading?<Text style={{fontSize:11,color:theme.muted}}>
          Chargement de la piste…
        </Text>:null}
        {audioOpen&&audioUrl?<MusicAudioPreview source={{audioUrl}} captureStyle/>:null}
        {audioOpen&&!audioUrl&&!loading?<Text style={{
          fontSize:11,color:theme.muted}}>
          Aucun audio lisible joint à cette demande.
        </Text>:null}
      </View>
    {awaiting?<View style={{gap:10}}>
      <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
        {buttons.filter(action=>action.key!=='archive'||request.canArchive).map(action=>{
          const primary=action.key==='accept';
          return <Pressable key={action.key} onPress={()=>invoke(action.key)}
            disabled={busy} accessibilityRole="button"
            accessibilityLabel={action.title+' cette proposition'}
            style={{flex:1,minWidth:94,minHeight:41,borderRadius:9,
              paddingHorizontal:9,flexDirection:'row',alignItems:'center',
              justifyContent:'center',gap:5,
              borderWidth:primary?0:1,borderColor:theme.border,
              opacity:busy?.5:1,
              backgroundColor:primary?PINK:'transparent'}}>
            <Ionicons name={action.icon} size={15}
              color={primary?'#FFFFFF':theme.foreground}/>
            <Text style={{fontSize:11,fontWeight:'600',
              color:primary?'#FFFFFF':theme.foreground}}>{action.title}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={{fontSize:10,lineHeight:17,color:theme.muted}}>
        Tester et archiver ne constituent pas une réponse. L’auteur verra simplement
        que sa proposition est en cours d’examen.
        {request.canArchive?' L’archivage ne peut être utilisé qu’une fois.':''}
      </Text>
    </View>:null}
    <Modal visible={!!confirm} transparent animationType="fade"
      onRequestClose={()=>setConfirm(null)}>
      <View style={{flex:1,alignItems:'center',justifyContent:'center',
        backgroundColor:'rgba(0,0,0,.55)',padding:18}}>
        <Pressable onPress={()=>setConfirm(null)}
          style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
        <View style={{width:'100%',maxWidth:370,padding:20,gap:15,
          borderRadius:15,backgroundColor:theme.surface}}>
          <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
            {confirm==='archive'?'Archiver la demande 30 jours ?':
              confirm==='accept'?'Accepter la proposition ?':'Refuser la proposition ?'}
          </Text>
          <Text style={{fontSize:12,lineHeight:20,color:theme.muted}}>
            {confirm==='archive'?
              'Elle reviendra automatiquement dans les demandes à traiter au bout de 30 jours. Ce report ne pourra pas être renouvelé.':
              'Cette décision sera communiquée au contributeur.'}
          </Text>
          <View style={{flexDirection:'row',justifyContent:'flex-end',gap:10}}>
            <Pressable onPress={()=>setConfirm(null)} style={{padding:10}}>
              <Text style={{color:theme.foreground,fontSize:12}}>Annuler</Text>
            </Pressable>
            <Pressable onPress={()=>{if(confirm)onAction(confirm);setConfirm(null);}}
              style={{padding:10,borderRadius:8,backgroundColor:PINK}}>
              <Text style={{color:'#FFFFFF',fontWeight:'700',fontSize:12}}>
                Confirmer
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}
