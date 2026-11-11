// Run with server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
// Idempotent: the durable queue survives upload failures and account deletion.
import {createClient} from '@supabase/supabase-js';
const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)throw new Error('Set server-side Supabase configuration. Never use VITE variables for secrets.');
const db=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data,error}=await db.rpc('media_cleanup_batch');if(error)throw new Error('Could not read media cleanup queue.');
const paths=data.map(item=>item.path);
if(paths.length){const removed=await db.storage.from('profile-media').remove(paths);if(removed.error)throw new Error('Cleanup failed; queued objects will be retried.');const ack=await db.rpc('media_cleanup_ack',{paths});if(ack.error)throw new Error('Cleanup acknowledgement failed; retry is safe.');}
console.log(`Removed ${paths.length} unused profile objects.`);
