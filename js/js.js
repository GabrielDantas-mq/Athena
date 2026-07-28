// ---------- DADOS BASE ----------
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

let currentRole = 'estagiario';
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

// ---------- RENDER: SIDEBAR ----------
function renderSidebar(){
  const list = document.getElementById('cargoList');
  list.innerHTML = '';
  cargos.forEach(c=>{
    const div = document.createElement('div');
    div.className = 'cargo-item' + (c.id===currentRole ? ' active' : '');
    div.innerHTML = `<strong>${c.nome}</strong><small>${c.desc}</small>`;
    list.appendChild(div);
  });
}

// ---------- RENDER: ROLE SWITCH ----------
function renderRoleSwitch(){
  const sel = document.getElementById('roleSwitch');
  sel.innerHTML = cargos.map(c=>`<option value="${c.id}" ${c.id===currentRole?'selected':''}>${c.nome}</option>`).join('');
  sel.onchange = (e)=>{ currentRole = e.target.value; renderSidebar(); renderBoard(); };
}

// ---------- RENDER: CATEGORY SELECT ----------
function renderCategorySelect(){
  const sel = document.getElementById('taskCategory');
  sel.innerHTML = Object.entries(categorias).map(([key,c])=>`<option value="${key}">${c.label}</option>`).join('');
  sel.onchange = updateRoutingNote;
}

function updateRoutingNote(){
  const key = document.getElementById('taskCategory').value;
  const cat = categorias[key];
  const note = document.getElementById('routingNote');
  const responsavelCargo = cargos.find(c=>c.id===cat.responsavel);
  const podeResolver = responsavelCargo.resolve.includes(key) && cat.responsavel===currentRole || cargos.find(c=>c.id===currentRole).resolve.includes(key);
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

// ---------- MODAL ----------
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

// ---------- CHAT ----------
const chatPanel = document.getElementById('chatPanel');
document.getElementById('chatToggle').onclick = ()=>{ chatPanel.classList.add('open'); renderChat(); };
document.getElementById('chatClose').onclick = ()=> chatPanel.classList.remove('open');

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
  if(!texto) return;
  const autor = cargos.find(c=>c.id===currentRole).nome;
  chatMessages.push({ autor, texto });
  input.value='';
  renderChat();
}
document.getElementById('chatSend').onclick = sendChat;
document.getElementById('chatInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendChat(); });

// ---------- INIT ----------
renderSidebar();
renderRoleSwitch();
renderBoard();
