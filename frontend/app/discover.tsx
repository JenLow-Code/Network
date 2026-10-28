import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {NetworkMark} from '@/NetworkMark';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {useApp} from '@/context';
import {Nav,Pill,TopActions} from '@/components';
import {PublicationGallery} from '@/PublicationGallery';
import {publications,personPublications} from '@/discoveryData';
import {people,personPath} from '@/people';
import {Avatar} from '@/components';
import {FireHeader} from '@/FireHeader';
import {useLocale} from '@/locale';
import {useAppTheme} from '@/AppTheme';
const filters=['Tout','Rêves','Musique','Bible','Talents'] as const;
export default function Discover(){const {tr}=useLocale();const theme=useAppTheme();const params=useLocalSearchParams<{filter?:string}>();
 
 const [filter,setFilter]=useState<typeof filters[number]>(params.filter==='Talents'?'Talents':'Tout');
 const [query,setQuery]=useState('');
 const items=useMemo(()=>publications.filter(p=>
 (filter==='Tout'||(filter==='Rêves'&&p.type==='dream')||(filter==='Musique'&&p.type==='music')||(filter==='Bible'&&p.type==='bible'))&&
 [p.title,p.author,p.type,p.type==='dream'?p.phase:''].join(' ').toLowerCase().includes(query.trim().toLowerCase())
 ),[filter,query]);
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView contentContainerStyle={{paddingHorizontal:15,paddingBottom:55,maxWidth:920,width:'100%',alignSelf:'center'}}>
   <View style={{paddingTop:9,paddingBottom:8}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:34,marginBottom:10}}>
     <Text accessibilityLabel="JenLow" style={{fontSize:19,fontWeight:'900',letterSpacing:2.1,fontStyle:'italic',color:theme.foreground,transform:[{scaleX:1.12}],marginLeft:5}}>JENLOW</Text>
     <View style={{flexDirection:'row',alignItems:'center',gap:4}}><NetworkMark size={26} color={theme.foreground}/><TopActions/></View>
    </View>
    <View style={{alignSelf:'flex-start',maxWidth:'100%',paddingBottom:4}}>
     <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={{fontFamily:'serif',fontWeight:'400',fontSize:40,letterSpacing:-1.4,lineHeight:46,color:theme.foreground}}>DÉCOUVRIR</Text>
     <Text style={{fontFamily:'Caveat_700Bold',fontSize:32,fontWeight:'400',lineHeight:32,color:'#CB245C',textAlign:'right',marginTop:-8,transform:[{rotate:'-6deg'}]}}>S’INSPIRER</Text>
    </View>
   </View>
   <View style={{height:39,borderWidth:0,backgroundColor:theme.dark?'#292929':'#F3ECE2',borderRadius:12,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:9,marginBottom:13}}>
    <Ionicons name="search" size={18} color="#777"/><TextInput style={{flex:1,fontSize:13,color:'#222'}} placeholder={tr("searchPlaceholder")} value={query} onChangeText={setQuery}/>
   </View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingBottom:17}}>
    {filters.map(f=><Pill key={f} text={f==='Tout'?tr('all'):f==='Rêves'?tr('dreamsFilter'):f==='Musique'?tr('musicFilter'):f==='Bible'?tr('bibleFilter'):'Talents'} active={filter===f} onPress={()=>setFilter(f)}/>)}
   </ScrollView>
   <PublicationGallery items={(filter==='Talents'?personPublications:filter==='Tout'?[...publications,...personPublications]:items).filter(p=>[p.title,p.author,p.type,...(p.type==='talent'?[p.skill,p.level,...p.seeking]:[])].join(' ').toLowerCase().includes(query.trim().toLowerCase()))}/>
   {filter!=='Talents'&&items.length===0&&<Text style={{textAlign:'center',marginTop:25,color:'#999'}}>Aucune publication trouvée.</Text>}
  </ScrollView><Nav/>
 </SafeAreaView>;
}