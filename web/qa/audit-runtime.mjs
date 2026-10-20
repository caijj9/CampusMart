// Explicit local acceptance runner. Creates only uniquely named QA fixtures.
// Credentials and bearer tokens remain in memory and are never written to reports.
import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
const base = 'http://127.0.0.1:8080'
const run = Date.now().toString(36)
const results = [], fixtures = { run, users: [], products: [], orders: [] }
async function req(path, token, method='GET', body) {
  const r = await fetch(base+path, { method, headers: { ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(body === undefined ? {} : {'Content-Type':'application/json'}) }, body:body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(10000) })
  return r.json()
}
function check(name, actual, expected, evidence={}) {
  const pass=Object.is(actual,expected)
  const row={name,pass,actual,expected,...evidence}; results.push(row)
  console.log(`${pass?'PASS':'FAIL'} ${name}: ${JSON.stringify({actual,expected,...evidence})}`)
}
async function ok(path, token, method='GET', body) { const r=await req(path,token,method,body); if(r.code!==0) throw Error(`${path}: ${r.code} ${r.msg}`); return r.data }
async function user(suffix) {
  const username=`qa${run}${suffix}`, password=randomBytes(9).toString('hex')
  await ok('/user/register',null,'POST',{username,password,nickname:`QA验收${suffix}`,campus:'QA测试校区'})
  const token=await ok('/user/login',null,'POST',{username,password})
  const me=await ok('/user/me',token)
  fixtures.users.push({id:me.id,username})
  return {token,id:me.id}
}
async function publish(seller, categoryId, suffix, extra={}) {
  const body={title:`QA-${run}-${suffix}`,description:'本条为自动验收数据',price:12.34,conditionLevel:2,categoryId,images:'',...extra}
  const id=await ok('/product/publish',seller.token,'POST',body)
  fixtures.products.push({id,title:body.title}); return {id,body}
}
async function create(buyer,id) {
  const ticket=await ok('/order/token',buyer.token)
  const r=await req('/order/create',buyer.token,'POST',{productId:id,token:ticket})
  if(r.code===0) fixtures.orders.push(r.data)
  return {r,ticket}
}
try {
  check('匿名商品搜索被拒绝',(await req('/product/search')).code,401)
  check('无效JWT被拒绝',(await req('/user/me','bad.token.value')).code,401)
  const seller=await user('s'),buyer=await user('b'),other=await user('x')
  const cats=await ok('/category/list',seller.token),cat=cats[0].id
  check('普通用户无管理员查询权限',(await req('/admin/product/search',buyer.token)).code,403)
  check('普通用户无用户列表权限',(await req('/user/list',buyer.token)).code,403)
  check('越权修改资料被拒绝',(await req('/user/update',other.token,'PUT',{id:seller.id,nickname:'QA越权'})).code,403)
  check('商品价格0被拒绝',(await req('/product/publish',seller.token,'POST',{title:'QA-invalid',price:0,conditionLevel:1,categoryId:cat})).code,400)
  const p=await publish(seller,cat,'cache')
  check('买家不能编辑他人商品',(await req('/product/update',buyer.token,'PUT',{...p.body,id:p.id})).code,403)
  check('买家不能下架他人商品',(await req(`/product/offline/${p.id}`,buyer.token,'PUT')).code,403)
  const d1=await ok(`/product/${p.id}`,buyer.token),d2=await ok(`/product/${p.id}`,buyer.token)
  check('浏览量每次请求加1',d2.viewCount,d1.viewCount+1)
  check('历史去重',(await ok('/product/history',buyer.token)).filter(x=>x.id===p.id).length,1)
  check('首次收藏',(await req(`/favorite/${p.id}`,buyer.token,'POST')).code,0)
  check('重复收藏友好错误',(await req(`/favorite/${p.id}`,buyer.token,'POST')).code,2008)
  check('他人取消收藏不影响买家',(await req(`/favorite/${p.id}`,other.token,'DELETE')).code,0)
  check('买家收藏仍在',(await ok('/favorite/list',buyer.token)).some(x=>x.id===p.id),true)
  check('取消收藏',(await req(`/favorite/${p.id}`,buyer.token,'DELETE')).code,0)
  check('再次收藏',(await req(`/favorite/${p.id}`,buyer.token,'POST')).code,0)
  const own=await create(seller,p.id); check('不能购买自己的商品',own.r.code,2004)
  const made=await create(buyer,p.id); check('正常下单',made.r.code,0)
  const oid=made.r.data
  check('重复票据不能下单',(await req('/order/create',buyer.token,'POST',{productId:p.id,token:made.ticket})).code,2005)
  const list=await ok('/product/search?keyword='+encodeURIComponent(p.body.title),buyer.token)
  check('下单后搜索不再展示商品',list.records.some(x=>x.id===p.id),false)
  const detail=await ok(`/product/${p.id}`,buyer.token)
  check('下单后详情立即已售出',detail.status,2,{productId:p.id,orderId:oid})
  check('第三方不能看订单详情',(await req(`/order/${oid}`,other.token)).code,403)
  check('第三方不能支付',(await req(`/order/pay/${oid}`,other.token,'PUT')).code,403)
  check('未付款不能发货',(await req(`/order/ship/${oid}`,seller.token,'PUT')).code,2007)
  check('未完成不能评价',(await req(`/review/${oid}`,buyer.token,'POST',{rating:5})).code,2011)
  check('订单列表没有手机号',JSON.stringify(await ok('/order/bought',buyer.token)).includes('phone'),false)
  check('买家取消待付款',(await req(`/order/cancel/${oid}`,buyer.token,'PUT')).code,0)
  check('取消后详情恢复在售',(await ok(`/product/${p.id}`,buyer.token)).status,1)
  await ok(`/product/offline/${p.id}`,seller.token,'PUT')
  check('已下架详情状态',(await ok(`/product/${p.id}`,buyer.token)).status,0)
  check('下架商品不能购买',(await create(buyer,p.id)).r.code,2003)
  check('卖家重新上架',(await req(`/product/relist/${p.id}`,seller.token,'PUT')).code,0)
  const deal=await create(buyer,p.id),o2=deal.r.data
  check('买家支付',(await req(`/order/pay/${o2}`,buyer.token,'PUT')).code,0)
  check('卖家发货',(await req(`/order/ship/${o2}`,seller.token,'PUT')).code,0)
  check('发货后不能取消',(await req(`/order/cancel/${o2}`,buyer.token,'PUT')).code,2007)
  check('买家确认收货',(await req(`/order/confirm/${o2}`,buyer.token,'PUT')).code,0)
  const before=await ok(`/product/${p.id}`,buyer.token)
  check('首次卖家评分为空',before.seller.avgRating,null)
  check('买家评价成功',(await req(`/review/${o2}`,buyer.token,'POST',{rating:5,content:'QA验收评价'})).code,0)
  check('重复评价被拒绝',(await req(`/review/${o2}`,buyer.token,'POST',{rating:5})).code,2012)
  const rv=await ok(`/review/seller/${seller.id}`,buyer.token)
  check('评价列表平均分',rv.avgRating,5)
  check('详情卖家评分及时更新',(await ok(`/product/${p.id}`,buyer.token)).seller.avgRating,5,{sellerId:seller.id})
  for(const path of ['/order/bought','/order/sold','/product/mine',`/review/seller/${seller.id}`]) {
    const zero=await req(path+'?pageSize=0',buyer.token),neg=await req(path+'?pageSize=-1',buyer.token)
    check(path+'拒绝pageSize=0',zero.code,400,{returnedSize:zero.data?.size??zero.data?.page?.size})
    check(path+'拒绝pageSize=-1',neg.code,400,{returnedSize:neg.data?.size??neg.data?.page?.size})
    check(path+'拒绝pageNum=0',(await req(path+'?pageNum=0',buyer.token)).code,400)
  }
  check('搜索页大小上限',(await ok('/product/search?pageSize=99',buyer.token)).size,50)
  const invalid=await req('/product/publish',seller.token,'POST',{...p.body,title:`QA-${run}-bad-category`,categoryId:999999999})
  check('发布不存在分类被拒绝',invalid.code,2016,{productId:invalid.code===0?invalid.data:undefined})
  if(invalid.code===0)fixtures.products.push({id:invalid.data,title:`QA-${run}-bad-category`})
  const large=await req('/product/publish',seller.token,'POST',{...p.body,title:`QA-${run}-large-price`,price:100000000})
  check('超出数据库金额范围应参数报错',large.code,400)
  // Leave fixtures in non-marketable states; completed order stays for traceability.
  for(const item of fixtures.products) if(item.id!==p.id) await req(`/product/offline/${item.id}`,seller.token,'PUT')
} catch(e) {console.error(e.message);results.push({name:'runner',pass:false,error:e.message})}
await writeFile(new URL('./runtime-results.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),fixtures,results},null,2))
console.log(`RESULT ${results.filter(x=>x.pass).length}/${results.length} passed; fixtures ${JSON.stringify(fixtures)}`)
