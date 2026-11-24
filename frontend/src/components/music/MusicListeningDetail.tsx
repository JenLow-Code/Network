import React, {useMemo,useState} from 'react';
import {PanResponder,Pressable,Text,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from '@/context/AppContext';
import {MusicOutgoingCollabDraft} from '@/components/music/MusicOutgoingCollabDraft';
import type {MusicPublication} from '@/domain/publication';
import {CassetteArtwork} from '@/components/publication/PublicationGallery';
import {MusicWaveform} from '@/components/music/MusicWaveform';
import {MusicMoreDetails} from '@/components/music/MusicMoreDetails';
import {useAppTheme} from '@/theme/AppTheme';

const PINK='#CB245C';
export type BrowsableSong=MusicPublication&{isDemo?:boolean};

/**
 * For-me detail: one focused Discovery-style listening environment.
 * Desktop: compact cassette + short seek line at left, real actions at right.
 * Mobile: same song detail stacked vertically, with horizontal gesture to
 * switch to adjacent songs without returning to the cassette shelf.
 * The bottom of this page holds the complete song details, not recommendations.
 * The actions alongside the cassette are for sending outgoing requests only.
 */
export function MusicListeningDetail({
  song,queue,contentWidth,onSelect,onClose,onContact,contactBusy,contactError,
}:{
  song:BrowsableSong;
  queue:BrowsableSong[];
  contentWidth:number;
  onSelect:(id:string)=>void;
  /** Optional for embedded layouts; the dedicated page already has a Back arrow. */
  onClose?:()=>void;
  onContact:(handle:string)=>void;
  contactBusy:boolean;
  contactError:string;
}){
  const theme=useAppTheme();
  const app=useApp();
  const [composerOpen,setComposerOpen]=useState(false);
  const {width:screenWidth}=useWindowDimensions();
  const mobile=screenWidth<700;
  const available=Math.max(0,Math.min(contentWidth,960));
  const mediaWidth=mobile
    ?Math.min(338,Math.max(200,available-8))
    :Math.min(378,Math.max(265,available*0.46));
  const mediaHeight=Math.round(mediaWidth*0.64);
  const index=queue.findIndex(item=>item.id===song.id);
  const previous=index>0?queue[index-1]:null;
  const next=index>=0&&index<queue.length-1?queue[index+1]:null;
  // The beta Discovery feed also contains static editorial examples. They
  // may play bundled samples but must not pretend to be real collaborators.
  const previewOnly=!!song.isDemo||song.source!=='api';
  const canPlay=!!song.audioUrl||previewOnly;
  const handle=(!previewOnly&&song.authorHandle)||null;
  const pan=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>
      mobile&&Math.abs(g.dx)>17&&Math.abs(g.dx)>Math.abs(g.dy)*1.4,
    onPanResponderRelease:(_,g)=>{
      if(g.dx < -56&&next)onSelect(next.id);
      if(g.dx > 56&&previous)onSelect(previous.id);
    },
    onPanResponderTerminationRequest:()=>true,
  }),[mobile,next,previous,onSelect]);
  const button=(label:string,onPress:()=>void,solid=false,disabled=false)=>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      disabled={disabled} onPress={onPress}
      style={{minHeight:43,borderRadius:11,borderWidth:1,
        borderColor:solid?PINK:theme.border,
        backgroundColor:solid?PINK:'transparent',
        justifyContent:'center',alignItems:'center',
        paddingHorizontal:13,paddingVertical:10,opacity:disabled?0.55:1}}>
      <Text style={{textAlign:'center',fontWeight:'700',fontSize:12,
        color:solid?'#FFFFFF':theme.foreground}}>{label}</Text>
    </Pressable>;
  return <View style={{width:'100%',maxWidth:960,alignSelf:'flex-start',
    paddingTop:mobile?10:15,paddingBottom:8,gap:mobile?19:25}}>
    <View style={{flexDirection:'row',alignItems:'flex-start',gap:10}}>
      <View style={{flex:1,gap:5,minWidth:0}}>
        <Text style={{color:theme.muted,fontSize:10,letterSpacing:1.2}}>
          {('Musique · '+song.author).toLocaleUpperCase('fr')}
        </Text>
        <Text numberOfLines={2} style={{fontFamily:'serif',
          fontSize:mobile?25:29,lineHeight:mobile?31:36,
          color:theme.foreground}}>{song.title}</Text>
      </View>
      {onClose?<Pressable onPress={onClose} accessibilityRole="button"
        accessibilityLabel="Refermer le morceau"
        style={{width:42,height:42,alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="close-outline" size={24} color={theme.foreground}/>
      </Pressable>:null}
    </View>
    <View style={{height:1,backgroundColor:theme.border}}/>
    <View style={{flexDirection:mobile?'column':'row',alignItems:mobile?'center':'flex-start',
      gap:mobile?16:26}}>
      <View style={{width:mediaWidth,maxWidth:'100%',alignSelf:mobile?'center':'flex-start',
        gap:7}}>
        {canPlay?<MusicWaveform key={song.id} index={song.audioIndex}
          uri={song.audioUrl}
          renderLayout={(_button,wave,_time,_seek,togglePlayback,playing)=><>
            <View {...(mobile?pan.panHandlers:{})}
              style={{width:mediaWidth,height:mediaHeight,alignItems:'center',
                justifyContent:'center'}}>
              <Pressable onPress={togglePlayback} accessibilityRole="button"
                accessibilityLabel={playing?'Mettre en pause':'Écouter '+song.title}
                style={{width:mediaWidth,height:mediaHeight,
                  alignItems:'center',justifyContent:'center'}}>
                <CassetteArtwork width={mediaWidth} height={mediaHeight}
                  title={song.title} artwork={song.coverArt||song.image}
                  transparent technicalLabel/>
                <View pointerEvents="none" style={{position:'absolute',
                  width:35,height:35,borderRadius:18,
                  backgroundColor:'rgba(20,18,20,0.44)',
                  justifyContent:'center',alignItems:'center'}}>
                  <Ionicons name={playing?'pause':'play'} color="#FFFFFF" size={20}/>
                </View>
              </Pressable>
            </View>
            {/* Only one short seek line beneath the sample, never a second player. */}
            <View style={{width:mediaWidth,paddingHorizontal:mobile?3:12}}>{wave}</View>
          </>}/>:<>
          <View {...(mobile?pan.panHandlers:{})}
            style={{width:mediaWidth,height:mediaHeight}}>
            <CassetteArtwork width={mediaWidth} height={mediaHeight}
              title={song.title} artwork={song.coverArt||song.image}
              transparent technicalLabel/>
          </View>
          <Text style={{fontSize:11,color:theme.muted,textAlign:'center'}}>
            Aucun extrait audio disponible
          </Text>
        </>}
        {mobile&&queue.length>1?<View style={{flexDirection:'row',
          alignItems:'center',justifyContent:'space-between',minHeight:35}}>
          <Pressable onPress={()=>previous&&onSelect(previous.id)}
            disabled={!previous} accessibilityRole="button"
            accessibilityLabel="Morceau précédent"
            style={{padding:7,opacity:previous?1:0.3}}>
            <Ionicons name="chevron-back" size={20} color={theme.foreground}/>
          </Pressable>
          <Text style={{color:theme.muted,fontSize:11}}>
            {index+1}/{queue.length} · Glisser pour découvrir
          </Text>
          <Pressable onPress={()=>next&&onSelect(next.id)}
            disabled={!next} accessibilityRole="button"
            accessibilityLabel="Morceau suivant"
            style={{padding:7,opacity:next?1:0.3}}>
            <Ionicons name="chevron-forward" size={20} color={theme.foreground}/>
          </Pressable>
        </View>:null}
      </View>
      <View style={{
        width:mobile?'100%':Math.min(365,Math.max(225,available-mediaWidth-35)),
        flex:mobile?undefined:1,gap:10,
        alignSelf:mobile?'stretch':'flex-start',
      }}>
        {button('Collaborer sur ce morceau',
          ()=>setComposerOpen(v=>!v),true)}
        {button(app.encouragementIds.includes(song.id)
            ?'Encouragement ajouté':'Encourager l’artiste',
          ()=>app.encourage(song.id),false,previewOnly)}
        {handle?button(contactBusy?'Ouverture…':'Contacter l’artiste',
          ()=>onContact(handle),false,contactBusy):null}
        {handle?button('Voir le profil',
          ()=>router.push({pathname:'/member/[name]',
            params:{name:handle}})):null}
        {!!contactError?<Text style={{fontSize:11,lineHeight:18,color:PINK}}>
          {contactError}
        </Text>:null}
        {composerOpen?<MusicOutgoingCollabDraft song={song}
          previewOnly={previewOnly}/>:<Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir mon brouillon de collaboration"
          onPress={()=>setComposerOpen(true)}
          style={{padding:13,borderRadius:12,
            borderColor:theme.border,borderWidth:1,
            backgroundColor:theme.surface,gap:7}}>
          <Text style={{fontSize:12,fontWeight:'700',
            color:theme.foreground}}>Mon brouillon de collaboration</Text>
          <Text numberOfLines={3} style={{fontSize:11,
            lineHeight:18,color:theme.muted}}>
            Bonjour {song.author}, je souhaiterais collaborer sur
            « {song.title} ». Voici ce que je pourrais apporter…
          </Text>
          <Text style={{fontSize:11,fontWeight:'700',color:PINK}}>
            {previewOnly?'Aperçu de la demande (démo)':
              'Compléter et envoyer ma demande'}
          </Text>
        </Pressable>}
      </View>
    </View>
    <View style={{paddingTop:mobile?0:5}}>
      <MusicMoreDetails item={song}/>
    </View>
  </View>;
}
