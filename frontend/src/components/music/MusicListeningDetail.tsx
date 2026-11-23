import React, {useMemo} from 'react';
import {PanResponder,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import type {MusicPublication} from '@/domain/publication';
import {CassetteArtwork} from '@/components/publication/PublicationGallery';
import {MusicWaveform} from '@/components/music/MusicWaveform';
import {MusicMoreDetails} from '@/components/music/MusicMoreDetails';
import {MusicTile} from '@/components/music/MusicTile';
import {useAppTheme} from '@/theme/AppTheme';

const PINK='#CB245C';
export type BrowsableSong=MusicPublication&{isDemo?:boolean};

/**
 * For-me detail: one focused Discovery-style listening environment.
 * Desktop: compact cassette + short seek line at left, real actions at right.
 * Mobile: same song detail stacked vertically, with horizontal gesture to
 * switch to adjacent songs without returning to the cassette shelf.
 * Full Discover More sections and other music projects follow below.
 */
export function MusicListeningDetail({
  song,queue,contentWidth,onSelect,onClose,onContact,contactBusy,contactError,
}:{
  song:BrowsableSong;
  queue:BrowsableSong[];
  contentWidth:number;
  onSelect:(id:string)=>void;
  onClose:()=>void;
  onContact:(handle:string)=>void;
  contactBusy:boolean;
  contactError:string;
}){
  const theme=useAppTheme();
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
  const related=queue.filter(item=>item.id!==song.id);
  const canPlay=!!song.audioUrl||!!song.isDemo;
  const handle=(!song.isDemo&&song.authorHandle)||null;
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
      <Pressable onPress={onClose} accessibilityRole="button"
        accessibilityLabel="Refermer le morceau"
        style={{width:42,height:42,alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="close-outline" size={24} color={theme.foreground}/>
      </Pressable>
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
      <View style={{width:mobile?'100%':Math.min(250,Math.max(180,available-mediaWidth-35)),
        flex:mobile?undefined:1,gap:9,alignSelf:mobile?'stretch':'center'}}>
        {song.isDemo?<View style={{gap:6,paddingVertical:10}}>
          <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
            Exemple de morceau fictif · présentation en lecture seule
          </Text>
          <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>
            Les actions de collaboration sont disponibles sur les vrais morceaux.
          </Text>
        </View>:<>
          {button('Collaborer sur ce morceau',()=>
            router.push({pathname:'/music-proposal/[id]',params:{id:song.id}}),true)}
          {handle?button(contactBusy?'Ouverture…':'Contacter l’artiste',
            ()=>onContact(handle),false,contactBusy):null}
          {handle?button('Voir le profil',
            ()=>router.push({pathname:'/member/[name]',params:{name:handle}})):null}
          {!!contactError?<Text style={{fontSize:11,lineHeight:18,color:PINK}}>
            {contactError}
          </Text>:null}
        </>}
      </View>
    </View>
    <View style={{paddingTop:mobile?0:5}}>
      <MusicMoreDetails item={song}/>
    </View>
    <View style={{paddingTop:12,borderTopWidth:1,borderColor:theme.border,gap:15}}>
      <Text style={{fontFamily:'serif',fontSize:mobile?22:25,
        lineHeight:mobile?28:32,color:theme.foreground}}>
        Continuer à découvrir
      </Text>
      {related.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{gap:mobile?10:13,paddingBottom:8,paddingRight:10}}>
        {related.slice(0,12).map(item=><MusicTile key={item.id}
          title={item.title} byline={item.author} mode="cassette"
          layout="cards" width={mobile?132:156}
          artwork={item.coverArt||item.image} audioUrl={item.audioUrl}
          demo={!!item.isDemo}
          detail={item.requestedTalents?.join(' · ')||'À découvrir'}
          onPress={()=>onSelect(item.id)}
          onLearnMore={()=>onSelect(item.id)}/>)}
      </ScrollView>:<Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
        D’autres projets musicaux apparaîtront ici dès qu’ils seront disponibles.
      </Text>}
    </View>
  </View>;
}
