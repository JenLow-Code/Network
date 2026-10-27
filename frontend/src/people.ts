import {publications} from './discoveryData';
const known:Record<string,string[]>={Sarah:['Guitare','Louange'],Arnaud:['Musique','Collaboration'],Gustav:['Jardinage'],Esther:['Photographie'],David:['Piano'],Helena:['Musique'],Mila:['Guitare'],Léa:[],Noah:[]};
export const people=Array.from(new Set(publications.map(p=>p.author))).map(name=>({name,talents:known[name]||[],posts:publications.filter(p=>p.author===name)}));
export const personPath=(name:string)=>({pathname:'/person/[name]' as const,params:{name}});
