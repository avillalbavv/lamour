import {getStore,json,fail} from '@/lib/server';
export async function GET(){try{return json(await getStore())}catch(e){return fail(e)}}
