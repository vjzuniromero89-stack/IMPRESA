const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../lib/salePersistence.ts'),'utf8');
const context={exports:{},Error};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {changedSaleFields,saleSaveError}=context.exports;
const sale={id:'sale-1',business_id:'business-1',amount:80,paid_amount:80,currency:'NIO',status:'Pagada',entered_amount:null,exchange_rate:35,payment_method:null};
test('classifying a paid legacy sale sends only its method',()=>{
 for(const method of ['Transferencia','Efectivo']){
  const delta=changedSaleFields(sale,{...sale,payment_method:method,exchange_rate:37});
  assert.equal(JSON.stringify(delta),JSON.stringify({payment_method:method}));
  assert.equal(sale.payment_method,null);
 }
});
test('unchanged sales do not produce writes',()=>assert.equal(Object.keys(changedSaleFields(sale,{...sale})).length,0));
test('description edit does not recalculate historic amounts',()=>{
 const delta=changedSaleFields({...sale,description:'A'},{...sale,description:'B',exchange_rate:37});
 assert.equal(JSON.stringify(delta),JSON.stringify({description:'B'}));
});
test('changing the amount includes the current conversion rate',()=>{
 const delta=changedSaleFields(sale,{...sale,amount:90,exchange_rate:37});
 assert.equal(delta.amount,90);assert.equal(delta.exchange_rate,37);assert.equal('paid_amount' in delta,false);
});
test('missing method schema has an actionable error; other errors are preserved',()=>{
 assert.match(saleSaveError({code:'PGRST204',message:'payment_method missing'}).message,/supabase\/migrations/);
 const denied={code:'42501',message:'Permission denied'};
 assert.equal(saleSaveError(denied),denied);
});
