import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBase, getBase, setBase, request, ApiError} from '../assets/js/api.js';
import {MODULES, splitAnalysis, talkRatio, readAnalysis, saveAnalysis, forgetAnalyses} from '../assets/js/analysis.js';

const memory = () => {
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
};
globalThis.localStorage=memory();
globalThis.sessionStorage=memory();
globalThis.location={protocol:'http:'};

test('normaliza endereço e rejeita credenciais, parâmetros e protocolos inadequados',()=>{
  assert.equal(normalizeBase(' http://localhost:8080/api/ '),'http://localhost:8080/api');
  for (const url of ['javascript:alert(1)','file:///api','https://usuario:senha@example.org/api','https://example.org/api?key=abc','https://example.org/api#x']) assert.throws(()=>normalizeBase(url));
});

test('usa configuração local e recupera endereço inválido sem impedir abertura',()=>{
  setBase('http://localhost:18083/api/');
  assert.equal(getBase(),'http://localhost:18083/api');
  localStorage.setItem('dealvision.apiBase','endereço inválido');
  assert.equal(getBase(),'http://localhost:8080/api');
});

test('POST envia JSON com acentos e quebras de linha, sem credenciais Oracle',async()=>{
  const body={id:5,clienteId:2,vendedorId:null,transcricao:'Cliente: Integração\nVendedor: Proposta'};
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'http://localhost:8080/api/reunioes');
    assert.equal(options.method,'POST');
    assert.equal(options.headers['Content-Type'],'application/json');
    assert.equal(options.headers.Authorization,undefined);
    assert.deepEqual(JSON.parse(options.body),body);
    return Response.json(body,{status:201});
  };
  assert.deepEqual(await request('/reunioes',{method:'POST',body}),body);
});

test('DELETE aceita resposta 204 sem tentar ler JSON',async()=>{
  globalThis.fetch=async()=>new Response(null,{status:204});
  assert.equal(await request('/clientes/5',{method:'DELETE'}),null);
});

test('conflito de vínculo conserva status e mensagem do Java',async()=>{
  globalThis.fetch=async()=>Response.json({status:409,mensagem:'Cliente possui reuniões vinculadas.'},{status:409});
  await assert.rejects(request('/clientes/1',{method:'DELETE'}),error=>error instanceof ApiError&&error.status===409&&error.message==='Cliente possui reuniões vinculadas.');
});

test('erro de servidor sem JSON permanece compreensível',async()=>{
  globalThis.fetch=async()=>new Response('<html>erro</html>',{status:502});
  await assert.rejects(request('/reunioes'),error=>error.status===502&&error.message.includes('502'));
});

test('falha de conexão orienta a verificar API e CORS',async()=>{
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
  await assert.rejects(request('/clientes'),error=>error.status===0&&error.message.includes('CORS'));
});

test('abrir por file orienta Live Server',async()=>{
  location.protocol='file:';
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
  await assert.rejects(request('/clientes'),/Live Server/);
  location.protocol='http:';
});

test('timeout cancela chamada e não orienta repetir gravação às cegas',async()=>{
  globalThis.fetch=async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('abort','AbortError'))));
  await assert.rejects(request('/clientes',{timeout:5}),/Verifique o resultado antes de repetir/);
});

test('exportação retorna blob para baixar e importação envia array JSON',async()=>{
  const items=[{id:1,cliente:{nome:'Ana',empresa:'Empresa'},transcricao:'Olá'}];
  globalThis.fetch=async(_url,options)=>{
    if(options.method==='POST') {assert.deepEqual(JSON.parse(options.body),items);return Response.json({reunioesImportadas:1});}
    return new Response(JSON.stringify(items),{headers:{'Content-Disposition':'attachment; filename=reunioes.json'}});
  };
  const exported=await request('/reunioes/exportar',{download:true});
  assert.deepEqual(JSON.parse(await exported.blob.text()),items);
  assert.equal(exported.disposition,'attachment; filename=reunioes.json');
  assert.equal((await request('/reunioes/importar',{method:'POST',body:items})).reunioesImportadas,1);
});

test('divide as seções reais da IA sem inventar dados ausentes',()=>{
  const sections=splitAnalysis('SMARTBRIEFING\nVISÃO GERAL DA REUNIÃO\nResumo com acentuação.\n\nDECISÕES TOMADAS:\n- Agendar demonstração.',MODULES.briefing);
  assert.equal(sections.get('VISÃO GERAL DA REUNIÃO'),'Resumo com acentuação.');
  assert.equal(sections.get('DECISÕES TOMADAS'),'- Agendar demonstração.');
  assert.equal(sections.has('PRÓXIMOS PASSOS'),false);
  assert.equal(splitAnalysis('Resposta em formato livre',MODULES.briefing).size,0);
});

test('gráfico usa apenas percentuais explícitos que somam 100',()=>{
  assert.deepEqual(talkRatio('Vendedor: █████ (58%)\nCliente: ███ (42%)'),[58,42]);
  assert.deepEqual(talkRatio('Vendedor: 57,5%\nCliente: 42,5%'),[57.5,42.5]);
  assert.equal(talkRatio('Vendedor: 85%\nCliente: 45%'),null);
  assert.equal(talkRatio('Vendedor falou mais que o cliente.'),null);
});

test('cache é isolado por API, reunião, módulo e transcrição exata',()=>{
  const meeting={id:1,transcricao:'Texto original'};
  saveAnalysis('http://localhost:8080/api',meeting,'smart-briefing','Resultado');
  assert.equal(readAnalysis('http://localhost:8080/api',meeting,'smart-briefing').result,'Resultado');
  assert.equal(readAnalysis('http://localhost:18083/api',meeting,'smart-briefing'),null);
  assert.equal(readAnalysis('http://localhost:8080/api',{...meeting,transcricao:'Texto alterado'},'smart-briefing'),null);
  assert.equal(readAnalysis('http://localhost:8080/api',meeting,'voc-tracker'),null);
  forgetAnalyses('http://localhost:8080/api',1);
  assert.equal(readAnalysis('http://localhost:8080/api',meeting,'smart-briefing'),null);
});
