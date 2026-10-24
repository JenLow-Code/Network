import React,{useState} from 'react';
import {Modal,Pressable,ScrollView,Text,TextInput,View,StyleSheet,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {Avatar,Nav} from '@/components';
import {useApp} from '@/context';
import {colors as c} from '@/theme';
import {ContactSheet} from '@/ContactSheet';

const tracks=[
 require('../assets/audio/pierre-01-douceur.wav'),
 require('../assets/audio/pierre-02-esperance.wav'),
 require('../assets/audio/pierre-03-lumiere.wav'),
];
const levels=[
 {name:'Absolute beginner',color:'#14693f'},
 {name:'Curious beginner',color:'#3dbb69'},
 {name:'Intermediate',color:'#f3c53f'},
 {name:'Used to',color:'#e65a57'},
 {name:'Professional',color:'#cc145a'}
];
const talents=[
 {title:'Batterie',level:2,icon:'musical-notes' as const,subtitle:'Tandem | Professeur',detail:'I enjoy playing drums and would love to teach and play in a tandem.'},
 {title:'Chant',level:1,icon:'mic' as const,subtitle:'Tandem | Apprentissage',detail:'Curious to learn singing together.'},
 {title:'Piano',level:3,icon:'musical-note' as const,subtitle:'Tandem | Professeur',detail:'Experience playing keys for worship.'}
];
const dreams=[
 {title:'Rêve floral',status:'Initiation',detail:'An idea taking shape: people connecting through a shared project.'},
 {title:'Créer une équipe de musique',status:'En route',detail:'Bringing people together to share worship through music.'}
];
type EditFieldProps={value:string,onSave:(value:string)=>void,kind?:'name'|'bio'|'place',align?:'center'|'left'};
function InlineField({value,onSave,kind='place',align='center'}:EditFieldProps){
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState(value);
 const name=kind==='name',bio=kind==='bio';
 const fontSize=name?25:bio?13:14;
 function save(){onSave(draft);setEditing(false)}
 return <View style={{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:align==='center'?'center':'flex-start'}}>
  {editing?
   <View style={{flex:1,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#b9b9b9',paddingRight:3}}>
    <TextInput multiline={bio} autoFocus selectTextOnFocus value={draft} onChangeText={setDraft} onSubmitEditing={bio?undefined:save} style={{flex:1,paddingVertical:3,fontSize,textAlign:align,color:name?c.pink:'#333',fontWeight:name?'700':'400',fontStyle:bio?'italic':'normal'}}/>
    <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="Save" style={{padding:2}}><Ionicons name="checkmark" color="#999" size={15}/></Pressable>
   </View>
  :<>
    <Text style={{fontSize,textAlign:align,color:name?c.pink:'#363636',fontWeight:name?'700':'400',fontStyle:bio?'italic':'normal',lineHeight:bio?16:name?30:19,flexShrink:1}}>{value}</Text>
    <Pressable onPress={()=>{setDraft(value);setEditing(true)}} style={{paddingLeft:7,paddingVertical:4}} accessibilityRole="button" accessibilityLabel="Edit"><Ionicons name="pencil" color={c.pink} size={12}/></Pressable>
   </>
  }
 </View>;
}
function Stone({index}:{index:number}){
 const player=useAudioPlayer(tracks[index]);const status=useAudioPlayerStatus(player);
 return <Pressable accessibilityLabel={status.playing?'Pause':'Play'} onPress={()=>{if(status.playing)player.pause();else {if(status.didJustFinish)void player.seekTo(0);player.play()}}} style={styles.stone}>
  <Ionicons name={status.playing?'pause-circle':'play-circle'} color={status.playing?c.pink:'#bcbcbc'} size={26}/>
 </Pressable>;
}
type Kind='talent'|'dream';
function DetailBody({kind,index}:{kind:Kind,index:number}){
 if(kind==='dream'){const d=dreams[index];return <><View style={[styles.detailsHero,{backgroundColor:'#eaf2e9'}]}><Ionicons name="flower-outline" size={80} color="#6eaa71"/></View><Text style={styles.detailHeading}>{d.title}</Text><Text style={styles.detailSubtitle}>{d.status}</Text><Text style={styles.detailText}>{d.detail}</Text></>}
 const t=talents[index];return <><View style={styles.detailsHero}><Ionicons name={t.icon} size={78} color={c.pink}/></View><Text style={styles.detailHeading}>{t.title}</Text><Text style={styles.detailSubtitle}>{t.subtitle}</Text><Text style={styles.detailText}>{t.detail}</Text><Text style={styles.detailSubtitle}>{levels[t.level].name}</Text><View style={{flexDirection:'row',gap:8,marginTop:10}}>{levels.map((l,i)=><View key={l.name} style={{height:9,width:9,borderRadius:5,backgroundColor:i===t.level?l.color:'#eee'}}/>)}</View></>;
}
function MiniCard({kind,index,onPress}:{kind:Kind,index:number,onPress:()=>void}){
 const t=kind==='talent'?talents[index]:null;
 const d=kind==='dream'?dreams[index]:null;
 return <Pressable onPress={onPress} style={styles.card} accessibilityLabel={'Open '+(t?.title||d?.title)+' details'}>
  {t?<><Text style={{fontFamily:'Caveat_700Bold',fontSize:17}}>{t.title}</Text><View style={{width:57,height:57,backgroundColor:c.pink,borderRadius:29,alignItems:'center',justifyContent:'center'}}><Ionicons name={t.icon} size={29} color="#151515"/></View>
  <View style={{flexDirection:'row',gap:5,marginTop:5}}>{levels.map((l,i)=><View key={i} style={{width:6,height:6,borderRadius:3,backgroundColor:i===t.level?l.color:'#eaeaea'}}/>)}</View><Text numberOfLines={1} style={styles.cardHint}>{t.subtitle}</Text></>
  :<><View style={{width:'91%',flex:1,backgroundColor:'#eaf2e9',alignItems:'center',justifyContent:'center',borderRadius:6}}><Ionicons name="flower-outline" size={48} color="#6aa56f"/></View><Text numberOfLines={1} style={styles.cardHint}>{d?.title}</Text></>}
 </Pressable>;
}
function CardCarousel({kind}:{kind:Kind}){
 const list=kind==='talent'?talents:dreams;
 const [current,setCurrent]=useState(0);
 const [open,setOpen]=useState(false);
 const [detailIndex,setDetailIndex]=useState(0);
 const {width}=useWindowDimensions();const desktop=width>=740;
 const itemWidth=desktop?165:Math.max(125,Math.min((width-56-12)/2,175));
 return <View style={{width:desktop?'49%':'50%',alignItems:'center'}}>
  <Text style={styles.sectionTitle}>{kind==='talent'?'Mes talents':'Mes rêves'}</Text>
  {desktop?<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxWidth:'100%'}}>{list.map((_,i)=><View key={i} style={{marginRight:9}}><MiniCard kind={kind} index={i} onPress={()=>{setDetailIndex(i);setOpen(true)}}/></View>)}</ScrollView>
  :<View style={{width:itemWidth,alignItems:'center'}}>
    <MiniCard kind={kind} index={current} onPress={()=>{setDetailIndex(current);setOpen(true)}}/>
    <View style={styles.cardStepper}><Pressable onPress={()=>setCurrent((current-1+list.length)%list.length)} accessibilityLabel="Previous card"><Ionicons name="chevron-back" size={18} color="#999"/></Pressable><Text style={{fontSize:10,color:'#888'}}>{current+1}/{list.length}</Text><Pressable onPress={()=>setCurrent((current+1)%list.length)} accessibilityLabel="Next card"><Ionicons name="chevron-forward" size={18} color="#999"/></Pressable></View>
   </View>}
  <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={styles.modalCover}><View style={styles.modalCard}>
   <Pressable onPress={()=>setOpen(false)} style={{alignSelf:'flex-end',padding:8}} accessibilityLabel="Close details"><Ionicons name="close" size={25}/></Pressable>
   <ScrollView contentContainerStyle={{alignItems:'center',paddingHorizontal:22,paddingBottom:25}}><DetailBody kind={kind} index={detailIndex}/></ScrollView>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-around',padding:13,borderTopWidth:1,borderColor:'#eee'}}>
    <Pressable accessibilityLabel="Previous detail" onPress={()=>setDetailIndex((detailIndex-1+list.length)%list.length)}><Ionicons name="chevron-back" size={28}/></Pressable><Text style={{color:'#777'}}>{detailIndex+1} / {list.length}</Text><Pressable accessibilityLabel="Next detail" onPress={()=>setDetailIndex((detailIndex+1)%list.length)}><Ionicons name="chevron-forward" size={28}/></Pressable>
   </View>
  </View></View></Modal>
 </View>;
}
export default function Profile(){
 const app=useApp();
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <View style={{flex:1}}>
   <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{alignItems:'center',paddingTop:24,paddingBottom:145}}>
    <Avatar size={166}/>
    <View style={{marginTop:7,minWidth:145,maxWidth:'85%'}}><InlineField kind="name" value={app.name} onSave={v=>app.edit({name:v})}/></View>
    <View style={{marginTop:8,marginBottom:20,width:'83%'}}><InlineField kind="bio" align="left" value={app.bio} onSave={v=>app.edit({bio:v})}/></View>
    <Text style={styles.label}>Lieu</Text><View style={{maxWidth:190,minWidth:105}}><InlineField value={app.city} onSave={v=>app.edit({city:v})}/></View>
    <Text style={[styles.label,{marginTop:14}]}>Eglise</Text><View style={{maxWidth:190,minWidth:140}}><InlineField value={app.church} onSave={v=>app.edit({church:v})}/></View>
    <View style={{width:'100%',paddingHorizontal:14,marginTop:30,flexDirection:'row',justifyContent:'center',alignItems:'flex-start',gap:12}}><CardCarousel kind="talent"/><CardCarousel kind="dream"/></View>
    <Text style={[styles.sectionTitle,{marginTop:17,marginBottom:8}]}>Mes pierres</Text><View style={{flexDirection:'row',gap:4}}>{[0,1,2].map(i=><Stone key={i} index={i}/>)}</View>
    <Pressable onPress={()=>{app.logout();router.replace('/login')}} style={{marginTop:35}}><Text style={{color:'#888',fontSize:12}}>Se déconnecter</Text></Pressable>
   </ScrollView>
   <ContactSheet/>
  </View>
  <Nav/>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 label:{fontWeight:'600',fontSize:14,color:'#141414'},
 sectionTitle:{fontSize:15,fontWeight:'700',color:'#141414',marginBottom:7},
 card:{height:137,width:151,borderWidth:1,borderColor:'#ddd',borderRadius:9,alignItems:'center',justifyContent:'space-around',padding:7,backgroundColor:'#fff'},
 cardHint:{fontSize:11,color:'#666',textAlign:'center'},
 cardStepper:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width:'100%',marginTop:5},
 stone:{height:52,width:50,borderRadius:7,borderWidth:1,borderColor:'#ddd',alignItems:'center',justifyContent:'center'},
 modalCover:{flex:1,backgroundColor:'rgba(0,0,0,.37)',justifyContent:'flex-end'},
 modalCard:{backgroundColor:'#fff',borderTopLeftRadius:22,borderTopRightRadius:22,minHeight:420,maxHeight:'88%'},
 detailsHero:{width:150,height:145,borderRadius:14,backgroundColor:'#fceaf2',alignItems:'center',justifyContent:'center',marginTop:5},
 detailHeading:{fontSize:23,fontWeight:'700',marginTop:16,textAlign:'center'},detailSubtitle:{fontSize:13,color:'#666',marginTop:8,textAlign:'center'},detailText:{fontSize:14,color:'#333',lineHeight:22,marginTop:18,textAlign:'center'}
});
