export async function redirectSystemPath({path}:{path:string;initial:boolean}):Promise<string>{
  try{
    if(new URL(path).hostname==='expo-sharing')return '/import-verse';
    return path;
  }catch{return path}
}
