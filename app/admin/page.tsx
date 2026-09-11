export const metadata={robots:{index:false,follow:false}};
import {requireChatGPTUser} from '@/app/chatgpt-auth';import {AdminApp} from '@/components/admin';export const dynamic='force-dynamic';export default async function Page(){await requireChatGPTUser('/admin');return <AdminApp/>}
