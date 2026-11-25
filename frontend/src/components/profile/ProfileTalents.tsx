import {Text} from '@/i18n/LocalizedText';
import React,{useEffect,useState} from 'react';
import {Modal,Pressable,ScrollView,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useApp} from '@/context/AppContext';
import {useAppTheme} from '@/theme/AppTheme';
import {ProfileTalentTile} from '@/components/talent/ProfileTalentTile';
import {api} from '@/lib/api/client';
import type {TalentIllustration} from '@/components/talent/TalentArt';

type Talent={talentId:string;name:string;level:number;description?:string|null;canTeach:boolean;wantsToLearn:boolean;wantsTandem:boolean};
const levels=['Grand débutant','Quelques notions','Intermédiaire','Avancé','Professionnel'];
const interests=(t:Talent)=>[t.wantsTandem?'Tandem':'',t.canTeach?'Enseigner':'',t.wantsToLearn?'Apprendre':''].filter(Boolean);
const talentArt = (name: string): TalentIllustration | undefined => {
 const s=name.toLocaleLowerCase('fr');
 if(s.includes('batt'))return 'drums';
 if(s.includes('chant')||s.includes('voix'))return 'singing';
 if(s.includes('piano'))return 'piano';
 if(s.includes('photo'))return 'camera';
 if(s.includes('guit'))return 'acoustic-guitar';
 if(s.includes('violon'))return 'violin';
 if(s.includes('basse'))return 'bass';
 if(s.includes('saxo'))return 'saxophone';
 if(s.includes('tromp'))return 'trumpet';
 if(s.includes('violoncelle'))return 'cello';
 if(s.includes('ukul'))return 'ukulele';
 return undefined;
};


export function ProfileTalents({contentWidth}:{contentWidth:number}){
  const {email}=useApp(),theme=useAppTheme();
  const [talents,setTalents]=useState<Talent[]>([]);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [selected,setSelected]=useState<Talent|null>(null);
  useEffect(()=>{
    let live=true;setTalents([]);setSelected(null);setStatus('loading');
    void api<{items:Talent[]}>('/api/me/talents',{auth:'required'}).then(result=>{
      if(live){setTalents(result.items);setStatus('ready');}
    }).catch(()=>{if(live)setStatus('error');});
    return()=>{live=false;};
  },[email]);
  const columns=contentWidth<350?2:contentWidth<650?3:4;
  const cardWidth=Math.max(76,Math.min(168,Math.floor((contentWidth-10*(columns-1))/columns)));
  return <View style={{gap:8}}>
    <Text style={{fontSize:12,color:theme.muted,lineHeight:18}}>Mes talents à partager, à transmettre ou à faire grandir.</Text>
    {status==='loading'?<Text style={{color:theme.muted}}>Chargement…</Text>:status==='error'?<Text style={{color:theme.muted}}>Talents indisponibles.</Text>:!talents.length?<Text style={{color:theme.muted}}>Aucun talent enregistré.</Text>:null}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:4}}>
      {talents.map(t=><View key={t.talentId} style={{width:cardWidth,borderRadius:11,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,overflow:'hidden'}}>
        <ProfileTalentTile title={t.name} level={levels[t.level-1]||'À définir'} subtitle={interests(t).join(' · ')||undefined} art={talentArt(t.name)} width={cardWidth-2} onPress={()=>setSelected(t)}/>
        <Pressable onPress={()=>setSelected(t)} style={{padding:9,minHeight:44}}>
          {t.description?<Text numberOfLines={2} style={{fontSize:11,color:theme.foreground}}>{t.description}</Text>:null}
          <Text style={{color:theme.muted,fontSize:10}}>Voir le détail</Text>
        </Pressable>
      </View>)}
    </View>
    <Text style={{fontSize:11,color:theme.muted}}>L’ajout et la modification des talents nécessitent la nouvelle intégration serveur.</Text>
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={()=>setSelected(null)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,.6)',justifyContent:'center',padding:18}}>
        <ScrollView style={{backgroundColor:theme.surface,borderRadius:14,maxWidth:470,width:'100%',alignSelf:'center',maxHeight:'85%'}} contentContainerStyle={{padding:20,gap:14}}>
          <Pressable onPress={()=>setSelected(null)} style={{alignSelf:'flex-end',padding:6}}><Ionicons name="close" size={23} color={theme.foreground}/></Pressable>
          {selected?<><Text style={{fontSize:24,fontWeight:'700',color:theme.foreground}}>{selected.name}</Text>
          <Text style={{color:theme.foreground}}>{levels[selected.level-1]||'À définir'}</Text>
          {!!interests(selected).length&&<Text style={{color:theme.muted}}>{interests(selected).join(' · ')}</Text>}
          {!!selected.description&&<Text style={{color:theme.foreground}}>{selected.description}</Text>}</>:null}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}
