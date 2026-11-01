import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createTranslator} from 'next-intl';
const root = new URL('../', import.meta.url);
function load(path, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(path, root), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require(name){if(name in mocks)return mocks[name];throw new Error('Unexpected dependency: '+name)},URL,Request,Response,Intl,process:{env:{}}});
  return exports;
}
for(const locale of ['en','ru','es','de','fr']) test(`card API renders real ${locale} messages`, async()=>{
  const messages=JSON.parse(readFileSync(new URL('messages/'+locale+'.json',root),'utf8'));
  const intl={getLocale:async()=>locale,getTranslations:async namespace=>createTranslator({locale,messages,namespace})};
  const next={NextResponse:{json:body=>Response.json(body)}};
  const {GET}=load('src/app/api/cards/movie-info/route.ts',{
    'next-intl/server':intl,'next/server':next,'@/lib/db/migrate':{runMigrations:async()=>{}},
    '@/lib/tmdb/client':{getImageUrl:()=>null,tmdbFetch:async()=>({id:603,title:'The Matrix',runtime:136,vote_average:8.7,release_date:'1999-03-31',credits:{crew:[{job:'Director',name:'Director Name'}],cast:[]}})},
  });
  const body=await(await GET(new Request('https://app.example/api/cards/movie-info?url=https://themoviedb.org/movie/603'))).json();
  assert.equal(body.actions[0].label,({en:'View in Cinema',ru:'Открыть в Кино',es:'Ver en Cine',de:'Im Kino ansehen',fr:'Voir dans Cinéma'})[locale]);
  assert.equal(body.title,'The Matrix');assert.ok(body.source_url.endsWith('/movie/603'));
  assert.ok(body.facts.some(f=>f.value===`${new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(8.7)}/10`));
  assert.equal(body.actions[1].label,'TMDB');

});
