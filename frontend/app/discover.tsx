import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from '@/context';
import {Nav,Pill,TopActions} from '@/components';
import {PublicationGallery} from '@/PublicationGallery';
import {publications,personPublications} from '@/discoveryData';
import {people,personPath} from '@/people';
import {Avatar} from '@/components';
import {FireHeader} from '@/FireHeader';
import {useLocale} from '@/locale';
const filters=['Tout','Rêves','Musique','Bible','Personnes'] as const;
export default function Discover(){const {tr}=useLocale();
 
 const [filter,setFilter]=useState<typeof filters[number]>('Tout');
 const [query,setQuery]=useState('');
 const items=useMemo(()=>publications.filter(p=>
 (filter==='Tout'||(filter==='Rêves'&&p.type==='dream')||(filter==='Musique'&&p.type==='music')||(filter==='Bible'&&p.type==='bible'))&&
 [p.title,p.author,p.type,p.type==='dream'?p.phase:''].join(' ').toLowerCase().includes(query.trim().toLowerCase())
 ),[filter,query]);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView contentContainerStyle={{paddingHorizontal:15,paddingBottom:55,maxWidth:920,width:'100%',alignSelf:'center'}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:30,fontWeight:'700',color:'#151515',marginTop:9,marginBottom:8}}>{tr('discoverTitle')}</Text><TopActions/></View>
   <View style={{height:42,borderWidth:1,borderColor:'#ececec',borderRadius:10,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:9,marginBottom:13}}>
    <Ionicons name="search" size={18} color="#777"/><TextInput style={{flex:1,fontSize:13,color:'#222'}} placeholder={tr("searchPlaceholder")} value={query} onChangeText={setQuery}/>
   </View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingBottom:17}}>
    {filters.map(f=><Pill key={f} text={f==='Tout'?tr('all'):f==='Rêves'?tr('dreamsFilter'):f==='Musique'?tr('musicFilter'):f==='Bible'?tr('bibleFilter'):'Personnes'} active={filter===f} onPress={()=>setFilter(f)}/>)}
   </ScrollView>
   <PublicationGallery items={filter==='Personnes'?personPublications:filter==='Tout'?[...publications,...personPublications]:items}/>
   {filter!=='Personnes'&&items.length===0&&<Text style={{textAlign:'center',marginTop:25,color:'#999'}}>Aucune publication trouvée.</Text>}
  </ScrollView><Nav/>
 </SafeAreaView>;
}