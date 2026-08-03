// ============================================================================
// ATHENA — front-end
// Fala com o backend Flask (pasta backend/) através da API em /api/...
// ============================================================================

// ---------- DADOS DE APOIO (espelham o backend/app.py) ----------
const cargos = [
  { id:'estagiario', nome:'Estagiário', resolve:['geral'], desc:'Suporte administrativo básico e organização de arquivos.' },
  { id:'financeiro', nome:'Analista Financeiro', resolve:['financeiro'], desc:'Pagamentos, notas fiscais e reembolsos.' },
  { id:'rh', nome:'Analista de RH', resolve:['rh'], desc:'Férias, contratações e questões de pessoal.' },
  { id:'ti', nome:'Analista de TI', resolve:['ti'], desc:'Problemas de sistema, acesso e equipamentos.' },
  { id:'gerente', nome:'Gerente de Operações', resolve:['financeiro','rh','ti','geral'], desc:'Pode aprovar e resolver qualquer categoria.' },
  { id:'diretor', nome:'Diretor', resolve:['financeiro','rh','ti','geral','estrategico'], desc:'Decisões estratégicas e aprovações finais.' },
];

const categorias = {
  financeiro: { label:'Financeiro', responsavel:'financeiro', instrucao:'Verifique o valor no sistema de contas a pagar, confirme com o fornecedor e registre a correção antes de aprovar.' },
  rh:         { label:'Recursos Humanos', responsavel:'rh', instrucao:'Consulte o histórico do colaborador no sistema de RH e siga o checklist de aprovação de férias/contratação.' },
  ti:         { label:'Tecnologia', responsavel:'ti', instrucao:'Verifique logs de acesso, reinicie o serviço afetado e confirme com o colaborador se o problema persiste.' },
  estrategico:{ label:'Estratégico', responsavel:'diretor', instrucao:'Reúna os dados relevantes e leve o tema para a próxima reunião de diretoria.' },
  geral:      { label:'Geral / Administrativo', responsavel:'estagiario', instrucao:'Organize a documentação necessária e atualize o status no quadro.' },
};

let currentUser = null;   // { id, nome, email, cargo, cargoNome } — vem do backend após login
let taskSeq = 1;

let tasks = [
  { id: taskSeq++, titulo:'Nota fiscal divergente', desc:'Valor da NF 4021 não bate com o pedido de compra.', categoria:'financeiro', status:'pendente' },
  { id: taskSeq++, titulo:'Acesso ao sistema bloqueado', desc:'Colaborador não consegue logar após reset de senha.', categoria:'ti', status:'execucao' },
  { id: taskSeq++, titulo:'Solicitação de férias', desc:'Aprovação pendente para o período de agosto.', categoria:'rh', status:'concluido' },
];

let chatMessages = [
  { autor:'Analista de RH', texto:'Bom dia! Alguém já viu a solicitação de férias do setor comercial?' },
  { autor:'Gerente de Operações', texto:'Já aprovei ontem à tarde, deve estar concluída no quadro.' },
];

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const authError = document.getElementById('authError');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

function mostrarErroAuth(msg){
  authError.textContent = msg;
  authError.classList.add('show');
}
function limparErroAuth(){
  authError.textContent = '';
  authError.classList.remove('show');
}

// Abas Entrar / Criar conta
document.querySelectorAll('.auth-tab').forEach(tab=>{
  tab.onclick = ()=>{
    document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    limparErroAuth();
    const isLogin = tab.dataset.tab === 'login';
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
  };
});

// Popula o <select> de cargos do formulário de cadastro a partir do backend
async function carregarCargosParaCadastro(){
  const sel = document.getElementById('regCargo');
  try{
    const resp = await fetch('/api/cargos');
    const lista = await resp.json();
    sel.innerHTML = lista.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }catch(e){
    // Se o backend não estiver no ar, usa a lista local como reserva.
    sel.innerHTML = cargos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }
}

function entrarNoApp(usuario){
  currentUser = usuario;
  authScreen.hidden = true;
  appScreen.hidden = false;

  document.getElementById('userName').textContent = usuario.nome;
  document.getElementById('userCargo').textContent = usuario.cargoNome || usuario.cargo;

  renderSidebar();
  renderBoard();
}

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  limparErroAuth();
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  try{
    const resp = await fetch('/api/login', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'same-origin',
      body: JSON.stringify({ email, senha })
    });
    const data = await resp.json();
    if(!resp.ok){ mostrarErroAuth(data.erro || 'Não foi possível entrar.'); return; }
    entrarNoApp(data.usuario);
  }catch(err){
    mostrarErroAuth('Não foi possível falar com o servidor. Ele está rodando? Veja backend/README.md.');
  }
});

registerForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  limparErroAuth();
  const nome = document.getElementById('regNome').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const cargo = document.getElementById('regCargo').value;
  const senha = document.getElementById('regSenha').value;
  try{
    const resp = await fetch('/api/register', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'same-origin',
      body: JSON.stringify({ nome, email, cargo, senha })
    });
    const data = await resp.json();
    if(!resp.ok){ mostrarErroAuth(data.erro || 'Não foi possível criar a conta.'); return; }
    entrarNoApp(data.usuario);
  }catch(err){
    mostrarErroAuth('Não foi possível falar com o servidor. Ele está rodando? Veja backend/README.md.');
  }
});

document.getElementById('logoutBtn').onclick = async ()=>{
  try{ await fetch('/api/logout', { method:'POST', credentials:'same-origin' }); }catch(e){}
  currentUser = null;
  appScreen.hidden = true;
  authScreen.hidden = false;
  loginForm.reset();
  registerForm.reset();
};

// Ao carregar a página, verifica se já existe uma sessão válida (cookie de login)
async function verificarSessao(){
  try{
    const resp = await fetch('/api/me', { credentials:'same-origin' });
    if(resp.ok){
      const data = await resp.json();
      entrarNoApp(data.usuario);
      return;
    }
  }catch(e){ /* backend fora do ar — mostra a tela de login normalmente */ }
  authScreen.hidden = false;
  appScreen.hidden = true;
}

// ============================================================================
// RENDER: SIDEBAR (destaca o cargo do usuário logado)
// ============================================================================
function renderSidebar(){
  const list = document.getElementById('cargoList');
  list.innerHTML = '';
  cargos.forEach(c=>{
    const div = document.createElement('div');
    div.className = 'cargo-item' + (currentUser && c.id === currentUser.cargo ? ' active' : '');
    div.innerHTML = `<strong>${c.nome}</strong><small>${c.desc}</small>`;
    list.appendChild(div);
  });
}

// ---------- RENDER: CATEGORY SELECT (modal de nova tarefa) ----------
function renderCategorySelect(){
  const sel = document.getElementById('taskCategory');
  sel.innerHTML = Object.entries(categorias).map(([key,c])=>`<option value="${key}">${c.label}</option>`).join('');
  sel.onchange = updateRoutingNote;
}

function updateRoutingNote(){
  if(!currentUser) return;
  const key = document.getElementById('taskCategory').value;
  const cat = categorias[key];
  const note = document.getElementById('routingNote');
  const responsavelCargo = cargos.find(c=>c.id===cat.responsavel);
  const meuCargo = cargos.find(c=>c.id===currentUser.cargo);
  const podeResolver = meuCargo.resolve.includes(key);
  note.classList.add('show');
  if(podeResolver){
    note.className = 'routing-note show self';
    note.innerHTML = `<strong>Você pode resolver isso agora.</strong><br>${cat.instrucao}`;
  } else {
    note.className = 'routing-note show forward';
    note.innerHTML = `<strong>Encaminhar para: ${responsavelCargo.nome}.</strong><br>Seu cargo não cobre esta categoria — a tarefa será direcionada automaticamente.`;
  }
}

// ---------- RENDER: BOARD ----------
function renderBoard(){
  const cols = { pendente: document.getElementById('colPendente'), execucao: document.getElementById('colExecucao'), concluido: document.getElementById('colConcluido') };
  Object.values(cols).forEach(c=>c.innerHTML='');
  const counts = { pendente:0, execucao:0, concluido:0 };

  tasks.forEach(t=>{
    counts[t.status]++;
    const cat = categorias[t.categoria];
    const responsavelCargo = cargos.find(c=>c.id===cat.responsavel);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <span class="tag">${cat.label}</span>
      <h3>${t.titulo}</h3>
      <p>${t.desc}</p>
      <p style="font-size:11px;color:#6b7590;margin-bottom:8px;">Responsável: ${responsavelCargo.nome}</p>
      <div class="card-actions">
        ${t.status!=='pendente' ? `<button data-move="pendente" data-id="${t.id}">← Pendente</button>` : ''}
        ${t.status!=='execucao' ? `<button data-move="execucao" data-id="${t.id}">${t.status==='pendente'?'Iniciar →':'← Retomar'}</button>` : ''}
        ${t.status!=='concluido' ? `<button data-move="concluido" data-id="${t.id}">Concluir →</button>` : ''}
      </div>
    `;
    cols[t.status].appendChild(card);
  });

  Object.entries(counts).forEach(([k,v])=>{
    const el = document.getElementById('count'+k.charAt(0).toUpperCase()+k.slice(1));
    if(el) el.textContent = v;
  });

  Object.entries(cols).forEach(([status,el])=>{
    if(el.children.length===0){
      el.innerHTML = `<p class="empty-hint">Nenhuma tarefa aqui.</p>`;
    }
  });

  document.querySelectorAll('[data-move]').forEach(btn=>{
    btn.onclick = ()=>{
      const id = Number(btn.dataset.id);
      const status = btn.dataset.move;
      tasks = tasks.map(t=> t.id===id ? {...t, status} : t);
      renderBoard();
    };
  });
}

// ---------- MODAL NOVA TAREFA ----------
const overlay = document.getElementById('overlay');
document.getElementById('newTaskBtn').onclick = ()=>{
  document.getElementById('taskTitle').value='';
  document.getElementById('taskDesc').value='';
  renderCategorySelect();
  updateRoutingNote();
  overlay.classList.add('open');
};
document.getElementById('cancelTask').onclick = ()=> overlay.classList.remove('open');
overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.classList.remove('open'); });

document.getElementById('confirmTask').onclick = ()=>{
  const titulo = document.getElementById('taskTitle').value.trim();
  const desc = document.getElementById('taskDesc').value.trim();
  const categoria = document.getElementById('taskCategory').value;
  if(!titulo){ document.getElementById('taskTitle').focus(); return; }
  tasks.push({ id: taskSeq++, titulo, desc: desc || 'Sem descrição adicional.', categoria, status:'pendente' });
  overlay.classList.remove('open');
  renderBoard();
};

// ---------- CHAT (usa o nome real da pessoa logada) ----------
const chatPanel = document.getElementById('chatPanel');
document.getElementById('chatToggle').onclick = ()=>{
  chatPanel.classList.add('open');
  document.body.classList.add('chat-open');
  renderChat();
};
document.getElementById('chatClose').onclick = ()=>{
  chatPanel.classList.remove('open');
  document.body.classList.remove('chat-open');
};

function renderChat(){
  const box = document.getElementById('chatMessages');
  box.innerHTML = chatMessages.map(m=>`
    <div class="msg"><small>${m.autor}</small><div class="bubble">${m.texto}</div></div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}
function sendChat(){
  const input = document.getElementById('chatInput');
  const texto = input.value.trim();
  if(!texto || !currentUser) return;
  const autor = `${currentUser.nome} · ${currentUser.cargoNome || currentUser.cargo}`;
  chatMessages.push({ autor, texto });
  input.value='';
  renderChat();
}
document.getElementById('chatSend').onclick = sendChat;
document.getElementById('chatInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendChat(); });

// ============================================================================
// TEMA CLARO / ESCURO
// ============================================================================
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeColorMeta = document.getElementById('themeColorMeta');
const THEME_COLORS = { dark: '#0B0B14', light: '#F5F2FA' };

function applyTheme(theme){
  root.setAttribute('data-theme', theme);
  themeColorMeta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
  try{ localStorage.setItem('athena-theme', theme); }catch(e){}
}
themeToggle.onclick = ()=>{
  const atual = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  applyTheme(atual === 'light' ? 'dark' : 'light');
};
if (window.matchMedia){
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e)=>{
    let saved = null;
    try{ saved = localStorage.getItem('athena-theme'); }catch(err){}
    if(!saved) applyTheme(e.matches ? 'light' : 'dark');
  });
}
applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

// ============================================================================
// MENU MOBILE (GAVETA DE CARGOS)
// ============================================================================
const navToggle = document.getElementById('navToggle');
const scrim = document.getElementById('scrim');

function openNav(){
  document.body.classList.add('nav-open');
  navToggle.setAttribute('aria-expanded', 'true');
}
function closeNav(){
  document.body.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
}
navToggle.onclick = ()=>{
  document.body.classList.contains('nav-open') ? closeNav() : openNav();
};
scrim.addEventListener('click', ()=>{
  closeNav();
  chatPanel.classList.remove('open');
  document.body.classList.remove('chat-open');
});
window.addEventListener('resize', ()=>{
  if(window.innerWidth > 860) closeNav();
});

// ============================================================================
// INIT
// ============================================================================
carregarCargosParaCadastro();
verificarSessao();
