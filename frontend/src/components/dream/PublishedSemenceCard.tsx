import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { PublishedSemence } from './SemencePublishActions';

type Props={item:Pick<PublishedSemence,'title'|'visibility'|'coverUrl'|'previewImages'>;
  width?:number;onPress?:()=>void;preview?:boolean};
/** A Semence is an editorial publication, not a dark cover-image dream tile. */
export default function PublishedSemenceCard({item,width,onPress,preview=false}:Props){
 const theme=useAppTheme();
 const pictures=(item.previewImages||[]).slice(0,3);
 const images=pictures.length?pictures:item.coverUrl?[item.coverUrl]:[];
 const art=(uri:string,index:number,style:object)=>
   <Image key={index} source={{uri}} resizeMode="cover" style={style}/>;
 const gallery=images.length===1
   ?art(images[0],0,{width:'100%',height:138,borderRadius:3})
   :images.length===2
     ?<View style={{flexDirection:'row',gap:3}}>
        {images.map((uri,i)=>art(uri,i,{flex:1,height:129,borderRadius:2}))}
       </View>
     :images.length>=3
       ?<View style={{gap:3}}>
         <View style={{flexDirection:'row',gap:3}}>
           {images.slice(0,2).map((uri,i)=>art(uri,i,{
             flex:1,height:94,borderRadius:2}))}
         </View>
         {art(images[2],2,{width:'100%',height:88,borderRadius:2})}
       </View>
       :<View style={{height:98,alignItems:'center',justifyContent:'center'}}>
         <Ionicons name="leaf-outline" size={27} color="#B88962"/>
       </View>;
 return <Pressable disabled={!onPress} accessibilityRole={onPress?'button':undefined}
   accessibilityLabel={'Voir la Semence '+item.title} onPress={onPress}
   style={{width,backgroundColor:theme.dark?'#282827':'#F4F0E9',
     borderRadius:11,overflow:'hidden',padding:11,gap:9,
     borderWidth:0.5,borderColor:theme.dark?'#43413F':'#EAE5DE'}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',
     minHeight:16,gap:5}}>
     {item.visibility==='friends'?<Ionicons name="lock-closed-outline"
       size={12} color={theme.muted}/>:null}
     <Text style={{fontSize:9,letterSpacing:1.15,fontWeight:'700',
       color:theme.muted}}>SEMENCE</Text>
   </View>
   <Text numberOfLines={preview?undefined:3}
     style={{fontFamily:'serif',fontSize:preview?22:19,
       lineHeight:preview?29:25,color:theme.foreground,marginBottom:1}}>
     {item.title}
   </Text>
   {gallery}
 </Pressable>;
}
