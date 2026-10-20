import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
const base='http://127.0.0.1:8080',run=Date.now().toString(36),results=[],fixtures={run,users:[],products:[],orders:[]}
async function req(path,token,method='GET',body) {
 const r=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body===undefined||body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(15000)})
 return r.json()
}
async function ok(...args){const r=await req(...args);if(r.code!==0)throw Error(`${args[0]}: ${r.code}`);return r.data}
function check(name,actual,expected,evidence={}){const row={name,actual,expected,pass:actual===expected,...evidence};results.push(row);console.log(JSON.stringify(row))}
async function user(suffix){const username=`qa${run}${suffix}`,password=randomBytes(9).toString('hex');await ok('/user/register',null,'POST',{username,password,nickname:`QA追查${suffix}`});const token=await ok('/user/login',null,'POST',{username,password});const me=await ok('/user/me',token);fixtures.users.push({id:me.id,username});return {id:me.id,token}}
const seller=await user('s'),buyer=await user('b'),third=await user('x'),cat=(await ok('/category/list',seller.token))[0].id
async function pub(suffix){const id=await ok('/product/publish',seller.token,'POST',{title:`QA-${run}-${suffix}`,price:8.88,conditionLevel:1,categoryId:cat,images:''});fixtures.products.push(id);return id}
async function buy(id){const ticket=await ok('/order/token',buyer.token),o=await ok('/order/create',buyer.token,'POST',{productId:id,token:ticket});fixtures.orders.push(o);return o}
const p1=await pub('stale-onsale');await ok(`/product/${p1}`,buyer.token);const o1=await buy(p1)
check('下单后缓存仍为在售',(await ok(`/product/${p1}`,third.token)).status,2,{productId:p1,orderId:o1})
const p2=await pub('stale-sold'),o2=await buy(p2);await ok(`/product/${p2}`,buyer.token);await ok(`/order/cancel/${o2}`,buyer.token,'PUT')
check('取消后缓存仍为售出',(await ok(`/product/${p2}`,third.token)).status,1,{productId:p2,orderId:o2})
const p3=await pub('favorite-race')
const raced=await Promise.all(Array.from({length:8},()=>req(`/favorite/${p3}`,buyer.token,'POST')))
const favoriteCount=(await ok('/favorite/list',buyer.token)).filter(p=>p.id===p3).length
check('并发收藏仅产生一条记录',favoriteCount,1,{productId:p3,codes:raced.map(r=>r.code)})
// Create enough QA orders to show that pageSize=-1 defeats both pagination and the 50 cap contract.
const neg=await ok('/order/bought?pageSize=-1',buyer.token)
check('负数分页不能返回全量',neg.size>0,true,{size:neg.size,records:neg.records.length,total:neg.total})
const form=new FormData(),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII=','base64'),file=Buffer.alloc(1800000);png.copy(file)
for(let i=0;i<3;i++)form.append('files',new Blob([file],{type:'image/png'}),`qa-${i}.png`)
const uploaded=await req('/product/images',seller.token,'POST',form)
check('允许3张各1.8MB图片批量上传',uploaded.code,0,{actualCode:uploaded.code,message:uploaded.msg})
await writeFile(new URL('./followup-results.json',import.meta.url),JSON.stringify({fixtures,results},null,2))
console.log(`READY_FOR_BROWSER ${JSON.stringify(fixtures)}`)
const rl=createInterface({input:process.stdin,output:process.stdout});await new Promise(resolve=>rl.once('line',resolve));rl.close()
// No deletion: retain an auditable trail and take remaining QA listings off sale.
await ok(`/order/cancel/${o1}`,buyer.token,'PUT')
for(const id of fixtures.products)await ok(`/product/offline/${id}`,seller.token,'PUT')
console.log('QA fixtures finalized: orders cancelled; all 3 products offline')
