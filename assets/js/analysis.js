// Os títulos são os mesmos solicitados pelos prompts do backend Java.
export const MODULES = {
  briefing: {slug:'smart-briefing', file:'smart-briefing.html', title:'SmartBriefing AI', icon:'file', color:'blue', sections:[
    ['VISÃO GERAL DA REUNIÃO','Resumo executivo','file'],
    ['PRINCIPAIS PONTOS DISCUTIDOS','Temas principais','chart'],
    ['DECISÕES TOMADAS','Decisões tomadas','check','green'],
    ['PRÓXIMOS PASSOS','Próximos passos','arrow','amber'],
    ['NÍVEL DE ENGAJAMENTO DO CLIENTE','Engajamento do cliente','users','purple']
  ]},
  analytics: {slug:'conversational-analytics', file:'analytics.html', title:'Conversational Analytics', icon:'chart', color:'cyan', sections:[
    ['ARCO DE SENTIMENTO DO CLIENTE','Arco de sentimento','chart','green'],
    ['TALK TO LISTEN RATIO','Talk-to-Listen Ratio','users','purple'],
    ['PRINCIPAIS TEMAS ABORDADOS','Temas da conversa','message','cyan'],
    ['MOMENTO CRÍTICO DA REUNIÃO','Momento crítico','alert','amber']
  ]},
  voc: {slug:'voc-tracker', file:'voc-tracker.html', title:'VoC Tracker', icon:'message', color:'purple', sections:[
    ['RECLAMAÇÕES E PONTOS DE DOR','Reclamações e problemas','alert','red'],
    ['SUGESTÕES DE MELHORIA','Sugestões de melhoria','plus','blue'],
    ['ELOGIOS E PERCEPÇÕES POSITIVAS','Elogios e percepções positivas','check','green'],
    ['OPORTUNIDADES COMERCIAIS IDENTIFICADAS','Oportunidades comerciais','chart','amber'],
    ['RECOMENDAÇÃO ESTRATÉGICA PARA O VENDEDOR','Ação comercial recomendada','briefcase','purple'],
    ['IMPACTO PARA PRODUTO','Impacto para produto','file','red']
  ]}
};

const canonical = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[*#_:]/g,'').trim().toUpperCase();
export function splitAnalysis(result, config) {
  const sections = new Map();
  let current = null;
  for (const line of result.split(/\r?\n/)) {
    const title = config.sections.find(([key]) => canonical(line) === canonical(key));
    if (title) { current = title[0]; if (!sections.has(current)) sections.set(current, []); }
    else if (current) sections.get(current).push(line);
  }
  return new Map([...sections].map(([key, lines]) => [key, lines.join('\n').trim()]));
}

export function talkRatio(text) {
  const seller = text.match(/Vendedor\s*:[^\r\n%]*?\b(\d{1,3}(?:[.,]\d+)?)\s*%/i);
  const client = text.match(/Cliente\s*:[^\r\n%]*?\b(\d{1,3}(?:[.,]\d+)?)\s*%/i);
  if (!seller || !client) return null;
  const values = [seller[1],client[1]].map(v => Number(v.replace(',','.')));
  return values.every(v => v >= 0 && v <= 100) && Math.abs(values[0]+values[1]-100)<0.01 ? values : null;
}

// O cache é apenas da sessão do navegador e pertence à URL da API e à transcrição exata.
export function analysisKey(base, id, slug) { return `dealvision.analysis:${base}:${id}:${slug}`; }
export function readAnalysis(base, meeting, slug) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(analysisKey(base, meeting.id, slug)));
    return cached?.transcript === meeting.transcricao && typeof cached.result === 'string' ? cached : null;
  } catch { return null; }
}
export function saveAnalysis(base, meeting, slug, result) {
  const cached = {transcript:meeting.transcricao, result, at:new Date().toISOString()};
  try { sessionStorage.setItem(analysisKey(base,meeting.id,slug),JSON.stringify(cached)); } catch { /* Sem cache, a análise continua disponível na tela. */ }
  return cached;
}
export function forgetAnalyses(base, id) {
  for (const config of Object.values(MODULES)) {
    try { sessionStorage.removeItem(analysisKey(base,id,config.slug)); } catch { /* Armazenamento indisponível. */ }
  }
}
