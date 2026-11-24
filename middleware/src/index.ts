import type {Env} from './config/env';
import type {ExecutionContext,ScheduledController} from './platform/cf';
import {handle} from './app';
export default {
 fetch(request:Request,env:Env,ctx:ExecutionContext){return handle(request,env,ctx);},
 async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){
   ctx.waitUntil(env.DB.prepare('DELETE FROM auth_rate_limits WHERE expires_at<?').bind(Math.floor(Date.now()/1000)).run());
 }
};
