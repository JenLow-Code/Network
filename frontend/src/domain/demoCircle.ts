export type CircleMember={id:string;name:string;talents:string[];connection:string};
export const myCircle:CircleMember[]=[
 {id:'helena',name:'Helena Hills',talents:['Piano','Flûte'],connection:'Église'},
 {id:'elynn',name:'Elynn Lee',talents:['Chant','Guitare'],connection:'Amie'},
 {id:'nebulanomad',name:'nebulanomad',talents:['Batterie','Production'],connection:'Tandem'},
 {id:'david',name:'David',talents:['Guitare','Composition'],connection:'Église'},
];
export const myTalents=['Batterie','Chant','Piano'];
export const matchingTalents=(needs:string[],skills:string[])=>needs.filter(n=>skills.some(s=>s.toLowerCase()===n.toLowerCase()));
