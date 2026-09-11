// Runtime bindings used by this Worker. Sites supplies the corresponding resources.
interface D1Result<T=Record<string,unknown>> { success:boolean; results:T[]; meta:Record<string,unknown>; }
interface D1PreparedStatement { bind(...values:unknown[]):D1PreparedStatement; first<T=Record<string,unknown>>(column?:string):Promise<T|null>; all<T=Record<string,unknown>>():Promise<D1Result<T>>; run<T=Record<string,unknown>>():Promise<D1Result<T>>; raw<T=unknown[]>():Promise<T[]>; }
interface D1Database { prepare(query:string):D1PreparedStatement; batch<T=Record<string,unknown>>(statements:D1PreparedStatement[]):Promise<D1Result<T>[]>; exec(query:string):Promise<{count:number;duration:number}>; dump():Promise<ArrayBuffer>; }
interface Fetcher { fetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>; }
declare module 'cloudflare:workers' { export const env:{DB?:D1Database;BUCKET?:any;ADMIN_EMAILS?:string;SITE_URL?:string;SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;SUPABASE_SECRET_KEY?:string;SUPABASE_SERVICE_ROLE_KEY?:string}; }
