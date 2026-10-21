const DEFAULT_BASE = 'http://localhost:8080/api';
const CONFIG_KEY = 'dealvision.apiBase';

export function normalizeBase(value) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Informe uma URL HTTP ou HTTPS sem usuário, senha ou parâmetros.');
  }
  return url.href.replace(/\/+$/, '');
}

export function getBase() {
  try { return normalizeBase(localStorage.getItem(CONFIG_KEY) || DEFAULT_BASE); }
  catch { return DEFAULT_BASE; }
}

export function setBase(value) {
  const base = normalizeBase(value);
  try { localStorage.setItem(CONFIG_KEY, base); }
  catch { throw new Error('O navegador não permitiu salvar o endereço. Habilite o armazenamento local.'); }
  return base;
}

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

export async function request(endpoint, {method = 'GET', body, timeout = 20000, download = false} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = {Accept: 'application/json'};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(getBase() + endpoint, {
      method, headers, signal: controller.signal,
      ...(body === undefined ? {} : {body: JSON.stringify(body)})
    });
    if (!response.ok) {
      let payload;
      try { payload = await response.json(); } catch { /* A API pode estar atrás de um proxy. */ }
      throw new ApiError(payload?.mensagem || `A requisição não foi concluída (HTTP ${response.status}).`, response.status);
    }
    if (response.status === 204) return null;
    if (download) return {blob: await response.blob(), disposition: response.headers.get('Content-Disposition')};
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError('A API demorou para responder. Verifique o resultado antes de repetir um cadastro ou uma análise.');
    throw new ApiError(location.protocol === 'file:'
      ? 'Abra o projeto pelo Live Server do VS Code. O endereço deve começar com http://localhost:5500 ou http://127.0.0.1:5500.'
      : 'Não foi possível acessar a API. Confirme que o Java está rodando, confira o endereço em Dados e conexão e a liberação da origem no CORS do backend.');
  } finally { clearTimeout(timer); }
}
