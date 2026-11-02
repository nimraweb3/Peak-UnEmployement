import {Hono} from 'hono';
import {HTTPException} from 'hono/http-exception';
import {secureHeaders} from 'hono/secure-headers';
import {bodyLimit} from 'hono/body-limit';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {messageSchema,profileSchema,reactionSchema,reportSchema,uuid} from '../shared/schemas';
import {dbClient,unwrap,messageSelect,type Env} from './lib';
const app=new Hono<Env>();
app.use('/api/*',secureHeaders(),bodyLimit({maxSize:8192,onError:c=>c.json({error:'Request too large'},413)}));
app.get('/api/health',c=>c.json({ok:true,configured:!!(c.env.SUPABASE_URL&&c.env.SUPABASE_PUBLISHABLE_KEY)}));
app.use('/api/*',async(c,next)=>{
 if(!c.env.SUPABASE_URL||!c.env.SUPABASE_PUBLISHABLE_KEY)throw new HTTPException(503,{message:'Connect Supabase to enable authentication and live chat.'});
 const token=c.req.header('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw new HTTPException(401,{message:'Sign in to continue.'});
 const db=dbClient(c.env.SUPABASE_URL,c.env.SUPABASE_PUBLISHABLE_KEY,token);
 const {data,error}=await db.auth.getUser(token);
 if(error||!data.user)throw new HTTPException(401,{message:'Your session expired. Please sign in again.'});
 c.set('db',db);c.set('authId',data.user.id);await next();
});
app.get('/api/me',async c=>c.json(unwrap(await c.get('db').rpc('bootstrap_profile'))));
for(const path of ['/api/me','/api/settings'])app.patch(path,async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:'profile',payload:profileSchema.parse(await c.req.json())}))));
app.get('/api/settings',async c=>c.json(unwrap(await c.get('db').rpc('bootstrap_profile'))));
app.delete('/api/me',async c=>{
 if(!c.env.SUPABASE_SERVICE_ROLE_KEY)throw new HTTPException(503,{message:'Account deletion is not configured. Contact the operator.'});
 const admin=createClient(c.env.SUPABASE_URL,c.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const {error}=await admin.auth.admin.deleteUser(c.get('authId'));if(error)throw new HTTPException(500,{message:'Deletion failed. Please try again.'});return c.json({ok:true});
});
app.get('/api/rooms',async c=>c.json(unwrap(await c.get('db').from('rooms').select('*').order('created_at' in {}?'created_at':'slug'))));
app.get('/api/profiles/:id',async c=>c.json(unwrap(await c.get('db').from('profiles').select('*').eq('id',uuid.parse(c.req.param('id'))).single())));
for(const kind of ['rooms','conversations'] as const){
 const field=kind==='rooms'?'room_id':'conversation_id';
 app.get(`/api/${kind}/:id/messages`,async c=>{
  const id=uuid.parse(c.req.param('id'));const db=c.get('db');
  if(kind==='conversations'&&!unwrap(await db.rpc('can_converse',{cid:id})))throw new HTTPException(403,{message:'Conversation unavailable'});
  let query=db.from('messages').select(messageSelect).eq(field,id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(40);
  const cursor=c.req.query('before');if(cursor){const parsed=z.object({at:z.string().datetime({offset:true}),id:uuid}).parse(JSON.parse(atob(cursor)));query=query.or(`created_at.lt.${parsed.at},and(created_at.eq.${parsed.at},id.lt.${parsed.id})`);}
  const items=unwrap(await query);const last=items.at(-1);return c.json({items,next:items.length===40&&last?btoa(JSON.stringify({at:last.created_at,id:last.id})):null});
 });
 app.post(`/api/${kind}/:id/messages`,async c=>{const payload=messageSchema.parse(await c.req.json());return c.json(unwrap(await c.get('db').rpc('mutate',{action:'send',payload:{...payload,[field]:uuid.parse(c.req.param('id'))}})),201);});
}
app.delete('/api/messages/:id',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:'delete_message',payload:{id:uuid.parse(c.req.param('id'))}}))));
for(const method of ['post','delete'] as const)app[method]('/api/messages/:id/reactions',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:method==='post'?'react':'unreact',payload:{id:uuid.parse(c.req.param('id')),...reactionSchema.parse(await c.req.json())}}))));
app.get('/api/dm-requests',async c=>c.json(unwrap(await c.get('db').from('dm_requests').select('*,sender:profiles!dm_requests_sender_id_fkey(*),recipient:profiles!dm_requests_recipient_id_fkey(*)').order('created_at',{ascending:false}).limit(100))));
app.post('/api/dm-requests',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:'request',payload:z.object({recipient_id:uuid}).strict().parse(await c.req.json())})),201));
app.patch('/api/dm-requests/:id',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:'respond',payload:{id:uuid.parse(c.req.param('id')),...z.object({status:z.enum(['accepted','declined'])}).strict().parse(await c.req.json())}}))));
app.get('/api/conversations',async c=>{
 const db=c.get('db');const me=unwrap(await db.rpc('my_profile_id'));
 const conversations=unwrap(await db.from('conversations').select('*,a:profiles!conversations_user_a_fkey(*),b:profiles!conversations_user_b_fkey(*)').order('created_at',{ascending:false}).limit(100));
 const reads=unwrap(await db.from('conversation_reads').select('*'));
 return c.json(await Promise.all(conversations.map(async conversation=>{const since=reads.find(r=>r.conversation_id===conversation.id)?.last_read_at||conversation.created_at;const count=await db.from('messages').select('id',{count:'exact',head:true}).eq('conversation_id',conversation.id).neq('sender_id',me).gt('created_at',since);if(count.error)unwrap(count);return {...conversation,unread:count.count||0};})));
});
app.patch('/api/conversations/:id',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:z.object({action:z.enum(['read','close'])}).parse(await c.req.json()).action,payload:{id:uuid.parse(c.req.param('id'))}}))));
app.get('/api/blocks',async c=>c.json(unwrap(await c.get('db').from('blocks').select('*,profile:profiles!blocks_blocked_id_fkey(*)'))));
app.post('/api/blocks',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:'block',payload:z.object({user_id:uuid}).strict().parse(await c.req.json())}))));
app.delete('/api/blocks/:id',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:'unblock',payload:{user_id:uuid.parse(c.req.param('id'))}}))));
app.post('/api/reports',async c=>c.json(unwrap(await c.get('db').rpc('mutate',{action:'report',payload:reportSchema.parse(await c.req.json())})),201));
app.get('/api/admin',async c=>c.json({admin:unwrap(await c.get('db').rpc('is_admin'))}));
app.use('/api/admin/*',async(c,next)=>{if(!unwrap(await c.get('db').rpc('is_admin')))throw new HTTPException(403,{message:'Admin required'});await next();});
app.get('/api/admin/reports',async c=>c.json(unwrap(await c.get('db').from('reports').select('*').eq('resolved',false).order('created_at',{ascending:false}).limit(100))));
app.get('/api/admin/metrics',async c=>c.json(unwrap(await c.get('db').rpc('admin_metrics'))));
app.post('/api/admin/moderate',async c=>c.json(unwrap(await c.get('db').rpc('moderate',{payload:z.discriminatedUnion('action',[z.object({action:z.literal('hide'),message_id:uuid}),z.object({action:z.literal('restrict'),user_id:uuid}),z.object({action:z.literal('resolve'),report_id:uuid})]).parse(await c.req.json())}))));
app.notFound(c=>c.json({error:'Not found'},404));
app.onError((err,c)=>{if(err instanceof z.ZodError)return c.json({error:err.issues.map(i=>i.message).join(' ')},400);if(err instanceof HTTPException)return c.json({error:err.message},err.status);if(err instanceof SyntaxError)return c.json({error:'Invalid request'},400);console.error('api_error',{path:c.req.path,type:err.name});return c.json({error:'Something went wrong. Please try again.'},500);});
export default app;
