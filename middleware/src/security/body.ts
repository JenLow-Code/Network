import {badRequest,ApiError} from '../http/errors';
export async function readBoundedJson(request:Request,maxBytes:number):Promise<unknown>{
 if(Number(request.headers.get('content-length')||0)>maxBytes)throw new ApiError(413,'body_too_large');
 if(!request.body)return {};
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new ApiError(413,'body_too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.byteLength;}
 try{return total?JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)):{};}catch{throw badRequest('invalid_json');}
}
