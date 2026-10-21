import {request, getBase, setBase} from './api.js';
import {MODULES, splitAnalysis, talkRatio, readAnalysis, saveAnalysis, forgetAnalyses} from './analysis.js';

const $ = (selector, root = document) => root.querySelector(selector);
const app = $('#app');
const actions = $('#heading-actions');
const page = document.body.dataset.page;
const number = new Intl.NumberFormat('pt-BR');
const currency = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'});
const state = {items:[],clients:[],sellers:[],meetings:[],meeting:null,search:'',temperature:'',client:'',seller:''};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icon = name => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${name}"></use></svg>`;
const link = (text, href, glyph='arrow', style='secondary') => `<a class="btn btn-${style}" href="${escape(href)}">${icon(glyph)}${escape(text)}</a>`;
const button = (text, action, glyph='plus', style='primary', extra='') => `<button type="button" class="btn btn-${style}" data-action="${action}" ${extra}>${icon(glyph)}${escape(text)}</button>`;
const stat = (label, value, glyph, note='', color='blue') => `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(glyph)}</span></div><strong class="stat-number">${escape(value)}</strong><p class="stat-foot">${escape(note)}</p></article>`;
const cardTitle = (title, glyph, color='blue') => `<div class="card-header"><div class="card-title ${color}">${icon(glyph)}<h2>${escape(title)}</h2></div></div>`;
const temperature = value => `<span class="badge badge-${{QUENTE:'green',MORNO:'amber',FRIO:'red'}[value]||'blue'}">${escape(value||'Não informada')}</span>`;
const empty = (title, text, cta='') => `<div class="empty-state">${icon('meeting')}<h2>${escape(title)}</h2><p>${escape(text)}</p>${cta}</div>`;
const errorBox = error => `<div class="inline-error" role="alert">${escape(error.message)}</div>`;
let dialog = null;
let dialogTrigger = null;
let modalBusy = false;
let loading = false;

function connection(ok, text) {
  const node = $('#connection-status');
  node.className = `connection-pill ${ok ? 'online' : 'offline'}`;
  node.textContent = text || (ok ? 'API conectada' : 'Verificar conexão');
}

async function api(endpoint, options) {
  try { const data = await request(endpoint, options); connection(true); return data; }
  catch (error) { if (!error.status || error.status === 503) connection(false); throw error; }
}

function notice(message, type='success') {
  const node = $('#notice');
  node.className = `notice ${type}`;
  node.textContent = message;
  node.hidden = false;
  node.focus({preventScroll:true});
}

function flash(message) {
  try { sessionStorage.setItem('dealvision.flash',message); } catch { /* A navegação não depende do armazenamento. */ }
}

function showFlash() {
  try {
    const message = sessionStorage.getItem('dealvision.flash');
    if (message) { sessionStorage.removeItem('dealvision.flash'); notice(message); }
  } catch { /* Sem mensagem entre páginas. */ }
}

function modal(title, content, description='') {
  dialogTrigger = document.activeElement;
  $('#modal-root').innerHTML = `<dialog class="app-dialog" aria-labelledby="dialog-title"${description?' aria-describedby="dialog-description"':''}><div class="modal-head"><div><h2 id="dialog-title">${escape(title)}</h2>${description?`<p id="dialog-description">${escape(description)}</p>`:''}</div><button class="icon-btn" type="button" data-action="close-modal" aria-label="Fechar janela">${icon('close')}</button></div>${content}</dialog>`;
  dialog = $('dialog');
  dialog.addEventListener('cancel', event => { if (modalBusy) event.preventDefault(); });
  dialog.addEventListener('close', () => { dialogTrigger?.focus?.(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog || modalBusy) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
  });
  dialog.showModal();
}

function closeModal() { if (!modalBusy) { dialog?.close(); dialog = null; } }
function formError(form, error) {
  const node = $('[data-form-error]',form);
  node.textContent = error.message;
  node.hidden = false;
  node.focus();
}
function busyForm(form, busy) {
  $('fieldset',form).disabled = busy;
  form.setAttribute('aria-busy', String(busy));
  const submit = $('[type=submit]',form);
  if (busy) { submit.dataset.label = submit.textContent; submit.textContent = 'Salvando…'; }
  else submit.textContent = submit.dataset.label || 'Salvar';
  if (form.closest('dialog')) modalBusy = busy;
}

const field = (name,label,{type='text',value='',maxLength,required=true,min,max,step,readonly=false,help='',full=false}={}) => `<div class="field${full?' full':''}"><label for="field-${name}">${escape(label)}${required?' <span class="required">*</span>':''}</label><input id="field-${name}" name="${name}" type="${type}" value="${escape(value)}"${required?' required':''}${readonly?' readonly':''}${maxLength?` maxlength="${maxLength}"`:''}${min!==undefined?` min="${min}"`:''}${max!==undefined?` max="${max}"`:''}${step!==undefined?` step="${step}"`:''}>${help?`<small>${escape(help)}</small>`:''}</div>`;
const idField = (item={}) => field('id','ID',{type:'number',value:item.id||'',min:1,max:2147483647,step:1,readonly:!!item.id,help:item.id?'O identificador é mantido.':'Informe um número inteiro positivo ainda não utilizado.'});
const option = (id,label,selected) => `<option value="${escape(id)}"${String(id)===String(selected)?' selected':''}>${escape(label)}</option>`;
function relatedFields(item={}) {
  return `<div class="field"><label for="field-clienteId">Cliente <span class="required">*</span></label><select id="field-clienteId" name="clienteId" required><option value="">Selecione o cliente</option>${state.clients.map(c=>option(c.id,`${c.empresa} · ${c.nome} (#${c.id})`,item.cliente?.id)).join('')}</select><small>Não encontrou? <a class="text-link" href="clientes.html?novo=1">Cadastrar cliente</a></small></div><div class="field"><label for="field-vendedorId">Vendedor</label><select id="field-vendedorId" name="vendedorId"><option value="">Sem vendedor vinculado</option>${state.sellers.map(v=>option(v.id,`${v.nome} (#${v.id})`,item.vendedor?.id)).join('')}</select></div><div class="field full"><label for="field-transcricao">Transcrição <span class="required">*</span></label><textarea id="field-transcricao" name="transcricao" required maxlength="100000" rows="12" placeholder="Vendedor: Conte um pouco sobre a necessidade da sua empresa.&#10;Cliente: Estamos procurando…">${escape(item.transcricao||'')}</textarea><div class="form-limit"><span>Identifique quem está falando para melhorar as análises.</span><span data-character-count>${number.format((item.transcricao||'').length)} / 100.000</span></div></div>`;
}

function entityForm(kind, item={}) {
  let fields = idField(item);
  if (kind==='clientes') fields += field('nome','Nome do contato',{value:item.nome,maxLength:100})+field('empresa','Empresa',{value:item.empresa,maxLength:150,full:true});
  if (kind==='vendedores') fields += field('nome','Nome',{value:item.nome,maxLength:100})+field('cargo','Cargo',{value:item.cargo,maxLength:50})+field('setor','Setor',{value:item.setor,maxLength:50})+field('totalReunioes','Total de reuniões (histórico)',{type:'number',value:item.totalReunioes??0,min:0,max:2147483647,step:1,help:'Histórico usado no cálculo de senioridade e comissão.'})+field('ticketMedioNegociado','Ticket médio negociado (R$)',{type:'number',value:item.ticketMedioNegociado??0,min:0,max:999999999999.99,step:0.01});
  if (kind==='reunioes') fields += relatedFields(item);
  return `<form data-entity="${kind}" data-id="${item.id||''}"><div class="inline-error" data-form-error role="alert" tabindex="-1" hidden></div><fieldset><div class="form-grid">${fields}</div><div class="form-footer"><p class="form-note">* Campos obrigatórios. As alterações são gravadas pela API no banco de dados.</p><div class="button-row">${kind==='reunioes'&&!item.id?link('Cancelar','reunioes.html','arrow','ghost'):button('Cancelar','close-modal','close','ghost')}<button class="btn btn-primary" type="submit">${icon('check')}${item.id?'Salvar alterações':'Cadastrar'}</button></div></div></fieldset></form>`;
}

function payload(form) {
  const values = Object.fromEntries(new FormData(form));
  const kind = form.dataset.entity;
  const result = {id:Number(values.id)};
  const strings = kind==='clientes'?['nome','empresa']:kind==='vendedores'?['nome','cargo','setor']:['transcricao'];
  for (const key of strings) {
    const value = values[key].trim();
    if (!value) throw new Error('Preencha os campos obrigatórios com conteúdo válido.');
    result[key] = value;
  }
  if (kind==='vendedores') {
    result.totalReunioes = Number(values.totalReunioes);
    result.ticketMedioNegociado = Number(values.ticketMedioNegociado);
  }
  if (kind==='reunioes') {
    result.clienteId = Number(values.clienteId);
    result.vendedorId = values.vendedorId ? Number(values.vendedorId) : null;
    // Preservar as quebras de linha e a transcrição original digitada.
    result.transcricao = values.transcricao;
  }
  return result;
}

async function saveEntity(form) {
  if (form.getAttribute('aria-busy')==='true' || !form.reportValidity()) return;
  let body;
  try { body=payload(form); } catch(error) { formError(form,error); return; }
  const kind = form.dataset.entity;
  const id = form.dataset.id;
  busyForm(form,true);
  try {
    const saved = await api(`/${kind}${id?'/'+id:''}`,{method:id?'PUT':'POST',body});
    if (kind==='reunioes') forgetAnalyses(getBase(),saved.id);
    busyForm(form,false);
    if (page==='nova') { flash('Reunião cadastrada no banco de dados.'); location.href=`reuniao.html?id=${saved.id}`; return; }
    closeModal();
    notice(id?'Alterações salvas no banco de dados.':'Cadastro realizado no banco de dados.');
    await loadPage();
  } catch(error) { busyForm(form,false); formError(form,error); }
}

function table(headers, rows, title, toolbar='', foot='') {
  return `<section class="card table-card"><div class="table-toolbar"><h2>${escape(title)}</h2>${toolbar}</div><div class="table-wrap" tabindex="0" role="region" aria-label="${escape(title)}"><table class="data-table"><thead><tr>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">${empty('Nenhum registro encontrado','Cadastre um registro ou ajuste os filtros.')}</td></tr>`}</tbody></table></div><div class="table-footer"><span>${escape(foot)}</span><span>Informações do banco de dados</span></div></section>`;
}
function rowActions(id, meeting=false) {
  return `<div class="row-actions">${meeting?`<a class="icon-btn" href="reuniao.html?id=${id}" aria-label="Abrir reunião ${id}">${icon('eye')}</a>`:`<button type="button" class="icon-btn" data-action="details" data-id="${id}" aria-label="Ver detalhes do registro ${id}">${icon('eye')}</button>`}<button type="button" class="icon-btn" data-action="edit" data-id="${id}" aria-label="Editar registro ${id}">${icon('edit')}</button><button type="button" class="icon-btn danger" data-action="delete" data-id="${id}" aria-label="Excluir registro ${id}">${icon('trash')}</button></div>`;
}
function meetingRow(item, withActions=true) {
  return `<tr><td><a class="table-primary" href="reuniao.html?id=${item.id}">${escape(item.cliente?.empresa)}</a><span class="table-secondary">Reunião #${item.id} · ${escape(item.cliente?.nome)}</span></td><td>${escape(item.vendedor?.nome||'Sem vendedor')}</td><td>${temperature(item.temperaturaComercial)}</td><td>${number.format(item.duracaoEstimadaMinutos)} min <span class="tiny muted">estimados</span></td><td>${withActions?rowActions(item.id,true):link('Abrir',`reuniao.html?id=${item.id}`)}</td></tr>`;
}
function searchBox(placeholder) { return `<label class="search-field">${icon('search')}<span class="sr-only">${escape(placeholder)}</span><input data-search type="search" placeholder="${escape(placeholder)}" value="${escape(state.search)}"></label>`; }

async function dashboard() {
  const [stats,clients,sellers,meetings] = await Promise.all([api('/relatorios/estatisticas'),api('/clientes'),api('/vendedores'),api('/reunioes')]);
  state.meetings = meetings;
  actions.innerHTML = link('Ver reuniões','reunioes.html','meeting')+link('Nova reunião','nova-reuniao.html','plus','primary');
  app.innerHTML = `<section class="hero"><div class="hero-copy"><p class="hero-label">${icon('chart')} INTELIGÊNCIA COMERCIAL</p><h2>Boas conversas.<br>Grandes oportunidades.</h2><p>Organize seus relacionamentos e transforme cada reunião em uma decisão mais informada.</p></div><div class="hero-graphic" aria-hidden="true"><img src="assets/logo.svg" alt="" width="110" height="125"></div></section><div class="stats">${stat('Reuniões cadastradas',number.format(stats.totalReunioes),'meeting',`${number.format(stats.duracaoTotalEstimadaMinutos)} minutos estimados`)}${stat('Clientes',number.format(clients.length),'users',`${number.format(stats.empresasAtendidas)} empresas atendidas em reuniões`)}${stat('Vendedores',number.format(sellers.length),'briefcase','Equipe comercial cadastrada')}${stat('Conversas quentes',number.format(stats.reunioesQuentes),'chart','Classificação calculada pelo backend','green')}</div><div class="module-grid">${Object.entries(MODULES).map(([key,m])=>`<a class="module-card ${m.color}" href="${m.file}"><span class="module-icon">${icon(m.icon)}</span><div><h3>${m.title}</h3><p>${{briefing:'Resumo executivo e próximos passos',analytics:'Sentimento, participação e temas',voc:'Feedbacks e oportunidades comerciais'}[key]}</p></div>${icon('arrow')}</a>`).join('')}</div><div class="dashboard-lower"><div>${table(['Cliente / empresa','Vendedor','Temperatura','Duração',''],[...meetings].sort((a,b)=>b.id-a.id).slice(0,5).map(m=>meetingRow(m,false)).join(''),'Reuniões cadastradas',link('Ver todas','reunioes.html','arrow','ghost'),`${Math.min(meetings.length,5)} de ${meetings.length} registros · ordenados por ID`)}</div><aside class="stack"><section class="card">${cardTitle('Pipeline de conversas','chart')}<div class="pipeline-list">${[['QUENTE',stats.reunioesQuentes],['MORNO',stats.reunioesMornas],['FRIO',stats.reunioesFrias]].map(([label,count])=>`<div class="pipeline-item">${temperature(label)}<strong>${number.format(count)}</strong></div>`).join('')}</div><p class="card-description">Temperatura definida pelas regras de negócio do Java.</p></section><section class="card">${cardTitle('Conversa mais extensa','meeting')}<h3>${escape(stats.clienteReuniaoMaisExtensa||'Nenhuma reunião cadastrada')}</h3><p class="card-description">${stats.reuniaoMaisExtensaId?`Reunião #${stats.reuniaoMaisExtensaId} · estimativa a partir da transcrição`:'Cadastre a primeira transcrição para acompanhar suas conversas.'}</p>${stats.reuniaoMaisExtensaId?link('Abrir reunião',`reuniao.html?id=${stats.reuniaoMaisExtensaId}`):link('Cadastrar reunião','nova-reuniao.html','plus')}</section></aside></div>`;
}

async function entities(kind) {
  state.items = await api('/'+kind);
  const singular = kind==='clientes'?'cliente':'vendedor';
  actions.innerHTML = button(`Novo ${singular}`,'new')+button('Atualizar','refresh','refresh','secondary');
  app.innerHTML = `<div id="entity-summary" class="stats"></div><div id="entity-table"></div>`;
  renderEntities(kind);
  if (new URLSearchParams(location.search).get('novo')==='1') {
    history.replaceState(null,'',location.pathname);
    modal(`Novo ${singular}`,entityForm(kind));
  }
}
function renderEntities(kind) {
  const query = state.search.toLocaleLowerCase('pt-BR');
  const items = state.items.filter(item=>(kind==='clientes'?[item.id,item.nome,item.empresa]:[item.id,item.nome,item.cargo,item.setor]).join(' ').toLocaleLowerCase('pt-BR').includes(query));
  $('#entity-summary').innerHTML = kind==='clientes'
    ? stat('Clientes cadastrados',state.items.length,'users','Contatos disponíveis para novas reuniões')+stat('Empresas cadastradas',new Set(state.items.map(c=>c.empresa)).size,'briefcase','Nomes de empresa distintos no cadastro')
    : stat('Vendedores cadastrados',state.items.length,'users','Equipe comercial')+stat('Histórico de reuniões',number.format(state.items.reduce((sum,v)=>sum+v.totalReunioes,0)),'meeting','Total informado nos cadastros')+stat('Comissão estimada',currency.format(state.items.reduce((sum,v)=>sum+v.comissaoEstimada,0)),'chart','Calculada pelas regras do Java');
  const rows = items.map(item=>kind==='clientes'
    ? `<tr><td>#${item.id}</td><td><strong class="table-primary">${escape(item.nome)}</strong></td><td>${escape(item.empresa)}</td><td><span class="badge badge-blue">${escape(item.perfilComercial)}</span></td><td>${rowActions(item.id)}</td></tr>`
    : `<tr><td>#${item.id}</td><td><strong class="table-primary">${escape(item.nome)}</strong><span class="table-secondary">${escape(item.cargo)} · ${escape(item.setor)}</span></td><td>${number.format(item.totalReunioes)}</td><td>${currency.format(item.ticketMedioNegociado)}</td><td><span class="badge badge-purple">${escape(item.nivelSenioridade)}</span></td><td>${currency.format(item.comissaoEstimada)}</td><td>${rowActions(item.id)}</td></tr>`).join('');
  $('#entity-table').innerHTML = table(kind==='clientes'?['ID','Contato','Empresa','Perfil comercial','Ações']:['ID','Vendedor','Reuniões (histórico)','Ticket médio','Senioridade','Comissão estimada','Ações'],rows,kind==='clientes'?'Base de clientes':'Equipe de vendas',searchBox(kind==='clientes'?'Buscar por nome, ID ou empresa':'Buscar por nome, ID, cargo ou setor'),`${items.length} de ${state.items.length} registros`);
}

async function meetingsPage() {
  [state.meetings,state.clients,state.sellers] = await Promise.all([api('/reunioes'),api('/clientes'),api('/vendedores')]);
  state.items=state.meetings;
  actions.innerHTML = button('Exportar JSON','export','download','secondary')+link('Nova reunião','nova-reuniao.html','plus','primary');
  app.innerHTML = `<section class="card filter-card"><div class="filter-grid">${searchBox('Buscar por ID, empresa ou participante')}<label class="field"><span>Cliente</span><select data-filter="client"><option value="">Todos os clientes</option>${state.clients.map(c=>option(c.id,`${c.empresa} · ${c.nome}`,state.client)).join('')}</select></label><label class="field"><span>Vendedor</span><select data-filter="seller"><option value="">Todos os vendedores</option>${state.sellers.map(v=>option(v.id,v.nome,state.seller)).join('')}</select></label><label class="field"><span>Temperatura</span><select data-filter="temperature"><option value="">Todas</option>${['QUENTE','MORNO','FRIO'].map(t=>option(t,t,state.temperature)).join('')}</select></label></div></section><div id="meeting-table" class="section-gap"></div>`;
  renderMeetings();
}
function renderMeetings() {
  const query=state.search.toLocaleLowerCase('pt-BR');
  const items=state.meetings.filter(m=>(!state.client||String(m.cliente.id)===state.client)&&(!state.seller||String(m.vendedor?.id)===state.seller)&&(!state.temperature||m.temperaturaComercial===state.temperature)&&[m.id,m.cliente.empresa,m.cliente.nome,m.vendedor?.nome].join(' ').toLocaleLowerCase('pt-BR').includes(query));
  $('#meeting-table').innerHTML=table(['Cliente / empresa','Vendedor','Temperatura','Duração','Ações'],items.map(m=>meetingRow(m)).join(''),'Suas reuniões',button('Atualizar','refresh','refresh','ghost'),`${items.length} de ${state.meetings.length} reuniões`);
}

async function newMeeting() {
  [state.clients,state.sellers] = await Promise.all([api('/clientes'),api('/vendedores')]);
  if (!state.clients.length) { app.innerHTML=`<section class="card">${empty('Comece por um cliente','A reunião precisa estar vinculada a um cliente cadastrado.',link('Cadastrar cliente','clientes.html?novo=1','plus','primary'))}</section>`; return; }
  app.innerHTML=`<div class="form-layout"><section class="card">${cardTitle('Informações da reunião','meeting')}${entityForm('reunioes')}</section><aside class="stack"><section class="card">${cardTitle('Uma boa transcrição faz a diferença','file')}<p class="prose">Cole o conteúdo da conversa e identifique as falas do cliente e do vendedor. Depois de salvar, você poderá executar os três módulos de inteligência.</p><div class="divider"></div><p class="card-description">O tempo estimado e a temperatura comercial são calculados pelo backend. O vendedor é opcional.</p></section><section class="help-box"><strong>Antes de cadastrar</strong><p>Use um ID único. Os módulos de IA são executados quando você solicita uma análise; salvar uma reunião não dispara uma chamada de IA.</p></section></aside></div>`;
}

function detailsList(pairs) { return `<dl class="detail-list">${pairs.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value??'—')}</dd></div>`).join('')}</dl>`; }
function transcript(meeting) { return `<details class="card transcript"><summary>Transcrição completa ${icon('chevron')}</summary><div class="transcript-content"><p class="pre-wrap">${escape(meeting.transcricao)}</p></div></details>`; }
const selectionKey = () => 'dealvision.selected:'+getBase();
function rememberMeeting(id) { try { sessionStorage.setItem(selectionKey(),String(id)); } catch { /* Seleção permanece na URL. */ } }
function rememberedMeeting() { try { return sessionStorage.getItem(selectionKey()); } catch { return null; } }
function selectedId() { return new URLSearchParams(location.search).get('id'); }
function setSelectedId(id) { const url=new URL(location.href); url.searchParams.set('id',String(id)); history.replaceState(null,'',url); rememberMeeting(id); }
function meetingSelector(meetings, id) { return `<label class="field meeting-picker"><span>Reunião selecionada</span><select data-meeting-select>${meetings.map(m=>option(m.id,`#${m.id} · ${m.cliente.empresa} · ${m.cliente.nome}`,id)).join('')}</select></label>`; }
function moduleTabs(id) { return `<nav class="analysis-tabs" aria-label="Análises da reunião"><a href="reuniao.html?id=${id}"${page==='reuniao'?' aria-current="page"':''}>Visão geral</a>${Object.entries(MODULES).map(([key,m])=>`<a href="${m.file}?id=${id}"${page===key?' aria-current="page"':''}>${m.title}</a>`).join('')}</nav>`; }
function meetingHeading(meeting, subtitle) {
  $('#page-title').textContent = meeting.cliente.empresa;
  $('#page-subtitle').textContent = `${meeting.cliente.nome} · ${meeting.vendedor?.nome||'Sem vendedor'} · ${meeting.duracaoEstimadaMinutos} min estimados · Reunião #${meeting.id}`;
  document.title = `${subtitle} · ${meeting.cliente.empresa} | DealVision`;
}
async function meetingPage() {
  const id=selectedId();
  if (!id || !/^[1-9]\d{0,9}$/.test(id) || Number(id)>2147483647) {
    state.meetings=await api('/reunioes');
    app.innerHTML=`<section class="card">${state.meetings.length?cardTitle('Selecione uma reunião','meeting')+meetingSelector(state.meetings,'')+button('Abrir reunião','open-selected','arrow'):empty('Nenhuma reunião cadastrada','Cadastre uma reunião para ver seus detalhes.',link('Nova reunião','nova-reuniao.html','plus','primary'))}</section>`;
    return;
  }
  const m=await api('/reunioes/'+id); state.meeting=m; state.items=[m]; rememberMeeting(m.id);
  meetingHeading(m,'Detalhes da reunião');
  actions.innerHTML=link('Todas as reuniões','reunioes.html','arrow')+button('Editar reunião','edit','edit','primary',`data-id="${m.id}"`)+button('Excluir','delete','trash','secondary',`data-id="${m.id}"`);
  app.innerHTML=moduleTabs(m.id)+`<div class="analysis-grid"><div class="stack"><section class="card">${cardTitle('Contexto da reunião','meeting')}${detailsList([['ID',m.id],['Empresa',m.cliente.empresa],['Cliente',m.cliente.nome],['Vendedor',m.vendedor?.nome||'Sem vendedor'],['Duração estimada',m.duracaoEstimadaMinutos+' minutos'],['Caracteres da transcrição',number.format(m.transcricao.length)]])}</section>${transcript(m)}</div><aside class="stack"><section class="card">${cardTitle('Temperatura comercial','chart')}${temperature(m.temperaturaComercial)}<p class="card-description">Classificação calculada pelas regras de negócio da aplicação Java.</p></section><section class="card">${cardTitle('Inteligência para sua próxima decisão','file')}<div class="stack">${Object.values(MODULES).map(mod=>link(mod.title,`${mod.file}?id=${m.id}`,mod.icon)).join('')}</div><p class="card-description">Cada análise usa a transcrição desta reunião.</p></section></aside></div>`;
}

async function analysisPage() {
  const config=MODULES[page];
  state.meetings=await api('/reunioes');
  actions.innerHTML=link('Reuniões','reunioes.html','meeting');
  if (!state.meetings.length) { app.innerHTML=`<section class="card">${empty('Sua próxima descoberta começa com uma reunião','Cadastre uma transcrição para executar este módulo de IA.',link('Nova reunião','nova-reuniao.html','plus','primary'))}</section>`; return; }
  const requested=selectedId();
  let selected=state.meetings.find(m=>String(m.id)===(requested||rememberedMeeting()))||state.meetings[0];
  if (requested&&!state.meetings.some(m=>String(m.id)===requested)) notice('A reunião da URL não foi encontrada. Selecione outra reunião.','warning');
  state.meeting=selected; setSelectedId(selected.id);
  meetingHeading(selected,config.title);
  app.innerHTML=meetingSelector(state.meetings,selected.id)+moduleTabs(selected.id)+`<section class="analysis-cta card"><div><h2>${escape(config.title)}</h2><p class="card-description">${page==='analytics'?'A IA estima os sinais de sentimento e participação com base no texto da conversa.':'Execute a análise da transcrição selecionada.'} O resultado fica disponível nesta sessão do navegador.</p></div><button type="button" class="btn btn-${config.color==='purple'?'purple':config.color==='cyan'?'cyan':'primary'}" data-action="analyze">${icon(config.icon)}<span data-analysis-label>Gerar análise</span></button></section><div id="analysis-status" role="status" aria-live="polite" tabindex="-1"></div><div id="analysis-result"></div><div class="section-gap">${transcript(selected)}</div>`;
  const cached=readAnalysis(getBase(),selected,config.slug);
  if (cached) renderAnalysis(cached);
  else $('#analysis-result').innerHTML=`<section class="card">${empty('Pronto para analisar','Clique em Gerar análise para enviar esta transcrição ao módulo de IA. As chamadas usam a chave configurada no backend.')}</section>`;
}

function renderAnalysis(cached) {
  const config=MODULES[page], sections=splitAnalysis(cached.result,config);
  const ratio=page==='analytics'?talkRatio(sections.get('TALK TO LISTEN RATIO')||''):null;
  const cards=config.sections.filter(([key])=>sections.has(key)).map(([key,title,glyph,color])=>`<section class="card">${cardTitle(title,glyph,color)}${key==='TALK TO LISTEN RATIO'&&ratio?`<div class="ratio-visual"><div class="donut" style="background:conic-gradient(var(--blue) 0 ${ratio[0]}%,var(--purple) ${ratio[0]}% 100%)" role="img" aria-label="Participação estimada pela IA: vendedor ${ratio[0]}%, cliente ${ratio[1]}%"></div><div class="ratio-labels"><span class="blue-text">Vendedor <strong>${number.format(ratio[0])}%</strong></span><span class="purple-text">Cliente <strong>${number.format(ratio[1])}%</strong></span></div></div>`:''}<p class="prose pre-wrap">${escape(sections.get(key)||'Não identificado na transcrição.')}</p></section>`).join('');
  $('#analysis-result').innerHTML=`<div class="analysis-result-meta"><span class="badge badge-${config.color==='purple'?'purple':'blue'}">Análise concluída</span><span>Gerada em ${escape(new Date(cached.at).toLocaleString('pt-BR'))} · disponível nesta sessão</span>${button('Baixar análise','download-analysis','download','ghost')}</div>${cards?`<div class="analysis-cards ${page==='analytics'?'analytics-cards':''}">${cards}</div>`:''}<details class="card section-gap"${cards?'':' open'}><summary>Resultado completo da IA</summary><p class="prose pre-wrap section-gap">${escape(cached.result)}</p></details>`;
  state.analysis=cached;
  $('[data-analysis-label]').textContent='Gerar novamente';
}

async function analyze(trigger) {
  if (trigger.disabled) return;
  const config=MODULES[page], current=state.meeting;
  const selector=$('[data-meeting-select]');
  trigger.disabled=true; selector.disabled=true;
  const status=$('#analysis-status');
  status.className='notice'; status.innerHTML='<span class="spinner" aria-hidden="true"></span> Analisando a transcrição. Isso pode levar alguns instantes…';
  try {
    // Buscar novamente evita analisar um texto que mudou em outra aba.
    const fresh=await api('/reunioes/'+current.id);
    if (fresh.transcricao!==current.transcricao) {
      state.meeting=fresh; state.analysis=null; forgetAnalyses(getBase(),fresh.id);
      $('.transcript-content .pre-wrap').textContent=fresh.transcricao;
      meetingHeading(fresh,config.title);
      $('#analysis-result').innerHTML='';
      $('[data-analysis-label]').textContent='Gerar análise';
    }
    const result=await api(`/reunioes/${fresh.id}/analises/${config.slug}`,{method:'POST',timeout:100000});
    if (typeof result.resultado!=='string'||!result.resultado.trim()) throw new Error('A API retornou uma análise vazia.');
    renderAnalysis(saveAnalysis(getBase(),fresh,config.slug,result.resultado));
    status.textContent='Análise concluída com sucesso.';
  } catch(error) {
    status.className='notice error'; status.textContent=error.message;
    status.focus();
  } finally { trigger.disabled=false; selector.disabled=false; }
}

async function dataPage() {
  // A configuração continua acessível mesmo quando a API está desligada.
  app.innerHTML=`<div class="grid-2"><section class="card">${cardTitle('Conexão com a API','database')}<form id="connection-form"><div class="inline-error" data-form-error role="alert" tabindex="-1" hidden></div><fieldset><div class="field"><label for="api-base">Endereço da API</label><input id="api-base" name="base" type="url" value="${escape(getBase())}" required><small>Inclua /api no final. O endereço é salvo somente neste navegador.</small></div><div class="form-footer"><button class="btn btn-primary" type="submit">${icon('check')}Salvar e testar conexão</button></div></fieldset></form><div id="connection-result" class="section-gap" role="status" aria-live="polite"></div></section><section class="card">${cardTitle('Antes de começar','check','green')}<ol class="setup-list"><li>Execute <strong>AdvisorMindApplication</strong> no IntelliJ usando o Java 21.</li><li>Configure seu usuário e senha Oracle no <strong>ConexaoFactory</strong> do backend.</li><li>Crie as tabelas do projeto com o script Oracle adequado disponível em <strong>database/</strong>.</li><li>Abra este frontend com o <strong>Live Server</strong> do VS Code na porta 5500.</li><li>Para as IAs, configure <strong>OPENAI_API_KEY</strong> nas variáveis de ambiente da execução Java e reinicie a API.</li></ol></section><section class="card">${cardTitle('Importar reuniões','upload')}<p class="prose">Importe um arquivo JSON com até 500 reuniões e IDs novos. Informe o objeto cliente com nome e empresa. Vendedores vinculados devem existir no banco.</p><form id="import-form" class="section-gap"><div class="inline-error" data-form-error role="alert" tabindex="-1" hidden></div><fieldset><div class="field"><label for="import-file">Arquivo JSON</label><input id="import-file" name="arquivo" type="file" accept=".json,application/json" required><small>A importação é enviada como JSON. Se uma reunião falhar, o backend desfaz todo o lote.</small></div><div class="form-footer"><a class="text-link" href="assets/exemplos/reunioes.json" download>Baixar exemplo de formato</a><button class="btn btn-primary" type="submit">${icon('upload')}Importar arquivo</button></div></fieldset></form><div id="import-result" role="status" aria-live="polite"></div></section><section class="card">${cardTitle('Exportar reuniões','download')}<p class="prose">Baixe as reuniões gravadas no banco com seus clientes, vendedores e transcrições. O arquivo pode ser reimportado em uma base com IDs disponíveis.</p><div class="section-gap">${button('Baixar JSON do banco','export','download','primary')}</div><div class="divider"></div><p class="card-description">As credenciais Oracle e a chave de IA são usadas pela aplicação Java. Elas não são solicitadas nem armazenadas neste frontend.</p></section></div>`;
  await checkConnection();
}

async function checkConnection() {
  const node=$('#connection-result');
  if (!node) return;
  node.className='help-box section-gap'; node.textContent='Testando acesso ao banco pela API…';
  try { const list=await api('/clientes'); node.textContent=`Conexão estabelecida. A API consultou o banco e retornou ${list.length} cliente(s).`; }
  catch(error) { node.className='inline-error section-gap'; node.textContent=error.message; }
}

function downloadBlob(blob, name) {
  const url=URL.createObjectURL(blob), anchor=document.createElement('a');
  anchor.href=url; anchor.download=name; anchor.hidden=true; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function exportMeetings(trigger) {
  if (trigger.disabled) return;
  trigger.disabled=true;
  try { const file=await api('/reunioes/exportar',{download:true,timeout:60000}); downloadBlob(file.blob,'reunioes.json'); notice('Arquivo de reuniões exportado.'); }
  catch(error) { notice(error.message,'error'); }
  finally { trigger.disabled=false; }
}
async function importMeetings(form) {
  if (form.getAttribute('aria-busy')==='true'||!form.reportValidity()) return;
  const file=$('[type=file]',form).files[0];
  busyForm(form,true);
  try {
    if (file.size>60*1024*1024) throw new Error('O arquivo ultrapassa o limite de 60 MB. Divida a importação em lotes menores.');
    let items;
    try { items=JSON.parse(await file.text()); } catch { throw new Error('O arquivo não contém um JSON válido. Verifique o formato antes de importar.'); }
    if (!Array.isArray(items)||!items.length||items.length>500) throw new Error('O JSON deve ser uma lista com 1 a 500 reuniões.');
    const result=await api('/reunioes/importar',{method:'POST',body:items,timeout:60000});
    const node=$('#import-result'); node.className='notice success'; node.textContent=`${result.reunioesImportadas} reunião(ões) importada(s) no banco de dados.`;
    $('[data-form-error]',form).hidden=true; form.reset();
  } catch(error) { formError(form,error); }
  finally { busyForm(form,false); }
}

async function openEntity(action, id) {
  const kind=['reunioes','reuniao'].includes(page)?'reunioes':page;
  const singular={clientes:'cliente',vendedores:'vendedor',reunioes:'reunião'}[kind];
  const item=action==='new'?{}:await api(`/${kind}/${id}`);
  if (kind==='reunioes'&&action==='edit') [state.clients,state.sellers]=await Promise.all([api('/clientes'),api('/vendedores')]);
  if (action==='new'||action==='edit') { modal(`${action==='new'?'Novo cadastro de':'Editar'} ${singular}`,entityForm(kind,item)); return; }
  if (action==='delete') {
    modal(`Excluir ${singular}`,`<p class="modal-copy">Deseja excluir o registro <strong>#${item.id}</strong>${kind==='reunioes'?` da empresa ${escape(item.cliente.empresa)}`:` de ${escape(item.nome)}`}? A exclusão será feita no banco de dados.</p><div class="inline-error" data-delete-error role="alert" tabindex="-1" hidden></div><div class="modal-actions">${button('Cancelar','close-modal','close','secondary')}${button('Excluir registro','confirm-delete','trash','danger',`data-kind="${kind}" data-id="${item.id}"`)}</div>`,kind==='reunioes'?'Confirme a exclusão desta reunião.':'Registros vinculados a reuniões não podem ser excluídos.');
    return;
  }
  const pairs=kind==='clientes'?[['ID',item.id],['Nome',item.nome],['Empresa',item.empresa],['Perfil comercial',item.perfilComercial]]:[['ID',item.id],['Nome',item.nome],['Cargo',item.cargo],['Setor',item.setor],['Histórico de reuniões',item.totalReunioes],['Ticket médio',currency.format(item.ticketMedioNegociado)],['Senioridade',item.nivelSenioridade],['Comissão estimada',currency.format(item.comissaoEstimada)]];
  modal(`Detalhes do ${singular}`,detailsList(pairs)+`<div class="modal-actions">${link('Ver reuniões',`reunioes.html?${kind==='clientes'?'clienteId':'vendedorId'}=${item.id}`,'meeting')}${button('Fechar','close-modal','check','primary')}</div>`);
}

async function confirmDelete(trigger) {
  if (modalBusy) return;
  modalBusy=true; trigger.disabled=true;
  const {kind,id}=trigger.dataset;
  try {
    await api(`/${kind}/${id}`,{method:'DELETE'});
    if (kind==='reunioes') forgetAnalyses(getBase(),id);
    modalBusy=false; closeModal();
    if (page==='reuniao') { flash('Reunião excluída do banco de dados.'); location.href='reunioes.html'; return; }
    notice('Registro excluído do banco de dados.'); await loadPage();
  } catch(error) { const node=$('[data-delete-error]',dialog); node.hidden=false; node.textContent=error.message; node.focus(); }
  finally { modalBusy=false; trigger.disabled=false; }
}

async function loadPage() {
  if (loading) return;
  loading=true; app.setAttribute('aria-busy','true');
  try {
    if (page==='dashboard') await dashboard();
    else if (['clientes','vendedores'].includes(page)) await entities(page);
    else if (page==='reunioes') await meetingsPage();
    else if (page==='nova') await newMeeting();
    else if (page==='reuniao') await meetingPage();
    else if (MODULES[page]) await analysisPage();
    else if (page==='dados') await dataPage();
  } catch(error) {
    app.innerHTML=`<section class="card error-state">${icon('alert')}<h2>Não foi possível carregar esta página</h2>${errorBox(error)}<div class="button-row">${button('Tentar novamente','refresh','refresh')}${link('Dados e conexão','dados.html','database')}</div></section>`;
  } finally { loading=false; app.setAttribute('aria-busy','false'); }
}

document.addEventListener('submit',async event=>{
  const form=event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.dataset.entity) await saveEntity(form);
  else if (form.id==='import-form') await importMeetings(form);
  else if (form.id==='connection-form') {
    try { setBase(new FormData(form).get('base')); $('[data-form-error]',form).hidden=true; await checkConnection(); }
    catch(error) { formError(form,error); }
  }
});

document.addEventListener('click',async event=>{
  const trigger=event.target.closest('[data-action]');
  if (!trigger||trigger.disabled) return;
  const {action,id}=trigger.dataset;
  try {
    if (action==='close-modal') closeModal();
    else if (action==='refresh') await loadPage();
    else if (['new','edit','details','delete'].includes(action)) {
      trigger.disabled=true;
      try { await openEntity(action,id); } finally { trigger.disabled=false; }
    }
    else if (action==='confirm-delete') await confirmDelete(trigger);
    else if (action==='export') await exportMeetings(trigger);
    else if (action==='analyze') await analyze(trigger);
    else if (action==='open-selected') { const value=$('[data-meeting-select]').value; if (value) location.href='reuniao.html?id='+value; }
    else if (action==='download-analysis'&&state.analysis) downloadBlob(new Blob([state.analysis.result],{type:'text/plain;charset=utf-8'}),`${MODULES[page].slug}-reuniao-${state.meeting.id}.txt`);
  } catch(error) { notice(error.message,'error'); }
});

document.addEventListener('input',event=>{
  if (event.target.matches('[data-search]')) {
    state.search=event.target.value;
    if (page==='reunioes') renderMeetings();
    else {
      // Atualizar a tabela sem perder foco ou posição do cursor na busca.
      const start=event.target.selectionStart;
      renderEntities(page);
      const input=$('[data-search]'); input.focus(); input.setSelectionRange(start,start);
    }
  }
  if (event.target.name==='transcricao') $('[data-character-count]',event.target.form).textContent=number.format(event.target.value.length)+' / 100.000';
});
document.addEventListener('change',async event=>{
  if (event.target.matches('[data-filter]')) { state[event.target.dataset.filter]=event.target.value; renderMeetings(); }
  if (event.target.matches('[data-meeting-select]')&&MODULES[page]) { setSelectedId(event.target.value); state.analysis=null; await loadPage(); }
});

const params=new URLSearchParams(location.search);
state.client=params.get('clienteId')||'';
state.seller=params.get('vendedorId')||'';
showFlash();
await loadPage();
