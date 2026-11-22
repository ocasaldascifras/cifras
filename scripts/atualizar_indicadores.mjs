// Atualiza vendas/indicadores.json com Selic, CDI, IPCA e Ibovespa.
// Fontes: Banco Central (SGS) e Yahoo Finance (com brapi.dev como alternativa).
// Se uma fonte falhar, mantém o último valor válido daquele indicador.
import { readFile, writeFile } from 'node:fs/promises';

const ARQ = new URL('../vendas/indicadores.json', import.meta.url);
const UA = { 'User-Agent': 'Mozilla/5.0 (indicadores-site)' , 'Accept': 'application/json' };

async function getJSON(url, tentativas = 3) {
  let erro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
      return await r.json();
    } catch (e) { erro = e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); }
  }
  throw erro;
}

const num = v => Number(String(v).replace(',', '.'));
const isoDeBR = d => { const [dd, mm, aa] = d.split('/'); return `${aa}-${mm}-${dd}`; };

async function sgs(codigo) {
  const dados = await getJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`);
  const u = dados.at(-1);
  if (!u || !Number.isFinite(num(u.valor))) throw new Error(`Série ${codigo} sem valor`);
  return { valor: num(u.valor), data: isoDeBR(u.data) };
}

export function ibovDeYahoo(j) {
  const res = j?.chart?.result?.[0];
  const ts = res?.timestamp || [];
  const fech = res?.indicators?.quote?.[0]?.close || [];
  const pts = ts.map((t, i) => [t, fech[i]]).filter(([, c]) => Number.isFinite(c));
  if (pts.length < 2) throw new Error('Ibovespa sem dados suficientes');
  const diaBR = t => new Date((t - 3 * 3600) * 1000).toISOString().slice(0, 10); // horário de Brasília
  const tAtual = res.meta?.regularMarketTime || pts.at(-1)[0];
  const atual = Number.isFinite(res.meta?.regularMarketPrice) ? res.meta.regularMarketPrice : pts.at(-1)[1];
  // Fechamento anterior: último fechamento de um dia ANTERIOR ao da cotação atual.
  const anteriores = pts.filter(([t]) => diaBR(t) < diaBR(tAtual));
  const ant = Number.isFinite(res.meta?.previousClose) ? res.meta.previousClose : anteriores.at(-1)?.[1];
  const ini = pts[0][1];
  return {
    pontos: Math.round(atual),
    varDia: Number.isFinite(ant) ? +(((atual / ant) - 1) * 100).toFixed(2) : null,
    var12m: +(((atual / ini) - 1) * 100).toFixed(2),
    data: diaBR(tAtual),
  };
}

async function ibovespa() {
  try {
    return ibovDeYahoo(await getJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=1y&interval=1d'));
  } catch (e) {
    console.warn('Yahoo falhou, tentando brapi:', e.message);
    const tk = process.env.BRAPI_TOKEN ? `&token=${process.env.BRAPI_TOKEN}` : '';
    const j = await getJSON(`https://brapi.dev/api/quote/%5EBVSP?range=1y&interval=1d${tk}`);
    const q = j.results?.[0];
    const h = (q?.historicalDataPrice || []).filter(p => Number.isFinite(p.close)).sort((a, b) => a.date - b.date);
    if (!q || !Number.isFinite(q.regularMarketPrice)) throw new Error('brapi sem cotação');
    return {
      pontos: Math.round(q.regularMarketPrice),
      varDia: +Number(q.regularMarketChangePercent).toFixed(2),
      var12m: h.length ? +(((q.regularMarketPrice / h[0].close) - 1) * 100).toFixed(2) : null,
      data: (q.regularMarketTime || new Date().toISOString()).slice(0, 10),
    };
  }
}

async function main() {
  let atual = {};
  try { atual = JSON.parse(await readFile(ARQ, 'utf8')); } catch {}
  const tarefas = {
    selic: () => sgs(432),      // Meta Selic definida pelo Copom (% a.a.)
    cdi: () => sgs(4389),       // CDI anualizado base 252 (% a.a.)
    ipca12m: () => sgs(13522),  // IPCA acumulado em 12 meses (%)
    ipcaMes: () => sgs(433),    // IPCA do mês (%)
    ibovespa,
  };
  const novo = { ...atual };
  let ok = 0;
  for (const [nome, fn] of Object.entries(tarefas)) {
    try { novo[nome] = await fn(); ok++; }
    catch (e) { console.warn(`Falha em ${nome}: ${e.message} (mantido o último valor)`); }
  }
  if (!ok) { console.error('Nenhuma fonte respondeu; arquivo mantido.'); return; }
  const semCarimbo = o => JSON.stringify({ ...o, atualizadoEm: undefined });
  if (semCarimbo(novo) === semCarimbo(atual)) { console.log('Sem mudanças nos indicadores.'); return; }
  novo.atualizadoEm = new Date().toISOString();
  novo.fontes = 'Banco Central do Brasil (SGS 432, 4389, 13522, 433) e B3/Yahoo Finance';
  await writeFile(ARQ, JSON.stringify(novo, null, 2) + '\n');
  console.log('Indicadores atualizados:', novo);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
