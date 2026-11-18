import { createAdminHandler } from '../_shared/dobby-admin-handler.ts';
export { createAdminHandler };

// Importing this file in a Node test never starts a listener or reads secrets.
const runtime=(globalThis as unknown as {Deno?:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):unknown}}).Deno;
if(runtime && (import.meta as ImportMeta & {main?:boolean}).main){
 const required=(name:string)=>{const value=runtime.env.get(name);if(!value)throw new Error(`Missing server configuration: ${name}`);return value;};
 runtime.serve(createAdminHandler({supabaseUrl:required('SUPABASE_URL'),anonKey:required('SUPABASE_ANON_KEY'),serviceRoleKey:required('SUPABASE_SERVICE_ROLE_KEY'),allowedOrigins:required('DOBBY_ADMIN_ALLOWED_ORIGINS').split(',').map(value=>value.trim()),redirectTo:required('DOBBY_ADMISSION_REDIRECT_TO')}));
}
