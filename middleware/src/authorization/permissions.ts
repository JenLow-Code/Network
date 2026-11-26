import {forbidden} from '../core/errors';
import type {Viewer} from '../core/context';
export function requireOwner(viewer:Viewer,ownerId:string):void{if(viewer.id!==ownerId)throw forbidden('owner_only');}
export function requireModerator(viewer:Viewer):void{if(!viewer.roles.includes('moderator')&&!viewer.roles.includes('admin'))throw forbidden('moderator_only');}
