    (() => {
      "use strict";

      // Melhorias automáticas: custo inicial e produção podem ser ajustados aqui.
      const melhorias = [
        { id: "ajudante", nome: "Ajudante de balcão", descricao: "Serve canecas enquanto você descansa.", icone: "🍺", custo: 15, producao: 0.2 },
        { id: "cozinheiro", nome: "Cozinheiro", descricao: "O ensopado atrai fregueses famintos.", icone: "🍲", custo: 100, producao: 1 },
        { id: "bardo", nome: "Bardo", descricao: "Uma boa balada rende boas gorjetas.", icone: "🎻", custo: 600, producao: 5 },
        { id: "ferreiro", nome: "Ferreiro cliente", descricao: "Paga bem depois de cada caneca.", icone: "⚒️", custo: 3500, producao: 25 },
        { id: "cavaleiro", nome: "Cavaleiro bêbado", descricao: "Deixa moedas por toda parte.", icone: "🛡️", custo: 18000, producao: 120 },
        { id: "mago", nome: "Mago da cerveja", descricao: "Transforma espuma em ouro puro.", icone: "🔮", custo: 100000, producao: 650 },
        { id: "dragao", nome: "Dragão amigo da taverna", descricao: "Seu hálito quente mantém a casa cheia.", icone: "🐉", custo: 750000, producao: 4800 }
      ];
      const melhoriasCaneca = [
        { id: "estanho", nome: "Caneca de estanho", descricao: "Uma caneca mais firme: clique rende 2x.", icone: "🥈", custo: 50, multiplicador: 2 },
        { id: "prata", nome: "Caneca de prata", descricao: "Reflete a luz e atrai gorjetas: clique 3x.", icone: "✨", custo: 800, multiplicador: 3 },
        { id: "encantada", nome: "Caneca encantada", descricao: "Runas antigas: clique rende 5x.", icone: "💎", custo: 12000, multiplicador: 5 }
      ];
      const conquistas = [
        { id: "primeira-moeda", nome: "Primeira moeda", regra: s => s.totalGanho >= 1 },
        { id: "cem-moedas", nome: "100 moedas", regra: s => s.totalGanho >= 100 },
        { id: "primeiro-funcionario", nome: "Equipe contratada", regra: s => Object.values(s.funcionarios).some(n => n > 0) },
        { id: "mil-por-segundo", nome: "1.000 ouro/s", regra: s => calcularOPS(s) >= 1000 },
        { id: "mil-cliques", nome: "Mão de ouro", regra: s => s.cliques >= 1000 },
        { id: "dragao-amigo", nome: "Amigo escamoso", regra: s => s.funcionarios.dragao > 0 }
      ];
      const chaveSave = "canecaDoDragaoSaveV1";
      const estadoInicial = () => ({ ouro: 0, totalGanho: 0, cliques: 0, funcionarios: {}, canecas: {}, conquistas: [], bonusAte: 0, salvoEm: Date.now() });
      let estado = estadoInicial();
      let abaAtual = "staff";
      let modoAdmin = false;
      let chaveRenderLoja = "";
      let ultimoQuadro = performance.now();
      let ultimoSave = performance.now();
      let toastTimer;
      let proximoViajante;
      let notaTimer;
      const el = id => document.getElementById(id);
      const limitar = (numero, minimo, maximo) => Math.min(maximo, Math.max(minimo, numero));

      function formatar(numero) {
        if (!Number.isFinite(numero)) return "∞";
        if (numero < 1000 && !Number.isInteger(numero)) return numero.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
        const unidades = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
        for (const [limite, sufixo] of unidades) {
          if (numero >= limite) return (numero / limite).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + sufixo;
        }
        return Math.floor(numero).toLocaleString("pt-BR");
      }

      function calcularOPS(s = estado) {
        return melhorias.reduce((total, item) => total + (s.funcionarios[item.id] || 0) * item.producao, 0);
      }

      function multiplicadorClique() {
        return melhoriasCaneca.reduce((total, item) => total * ((estado.canecas[item.id] || 0) ? item.multiplicador : 1), 1);
      }

      function multiplicadorBonus() { return Date.now() < estado.bonusAte ? 2 : 1; }
      function custoFuncionario(item) { return Math.floor(item.custo * Math.pow(1.15, estado.funcionarios[item.id] || 0)); }
      function podeComprar(custo) { return modoAdmin || estado.ouro >= custo; }

      function notificar(mensagem) {
        const toast = el("toast");
        toast.textContent = mensagem;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
      }

      function registrar(mensagem) {
        el("log-content").textContent = mensagem;
        clearTimeout(notaTimer);
        notaTimer = setTimeout(() => {
          el("log-content").textContent = "A lareira crepita. Tem sempre lugar para mais uma caneca.";
        }, 7000);
      }

      function ganharOuro(valor) {
        if (!Number.isFinite(valor) || valor <= 0) return;
        estado.ouro += valor;
        estado.totalGanho += valor;
      }

      function criarNumeroFlutuante(valor, x, y) {
        const numero = document.createElement("span");
        numero.className = "float-number";
        numero.textContent = "+" + formatar(valor);
        const caixa = el("scene").getBoundingClientRect();
        numero.style.left = limitar(x - caixa.left, 12, caixa.width - 60) + "px";
        numero.style.top = limitar(y - caixa.top, 35, caixa.height - 60) + "px";
        el("floating-layer").appendChild(numero);
        numero.addEventListener("animationend", () => numero.remove(), { once: true });
      }

      function aoClicarCaneca(evento) {
        const valor = multiplicadorClique() * multiplicadorBonus();
        ganharOuro(valor);
        estado.cliques++;
        const caixa = el("scene").getBoundingClientRect();
        criarNumeroFlutuante(valor, evento.clientX || caixa.left + caixa.width / 2, evento.clientY || caixa.top + caixa.height / 2);
        const botao = el("mug-button");
        botao.classList.remove("bounce");
        void botao.offsetWidth;
        botao.classList.add("bounce");
        setTimeout(() => botao.classList.remove("bounce"), 130);
        atualizar();
      }

      function comprarFuncionario(id) {
        const item = melhorias.find(m => m.id === id);
        const custo = custoFuncionario(item);
        if (!podeComprar(custo)) return;
        if (!modoAdmin) estado.ouro -= custo;
        estado.funcionarios[id] = (estado.funcionarios[id] || 0) + 1;
        registrar(item.nome + " entrou para a equipe. A taverna está rendendo mais!" );
        atualizar();
      }

      function comprarCaneca(id) {
        const item = melhoriasCaneca.find(m => m.id === id);
        if (estado.canecas[id] || !podeComprar(item.custo)) return;
        if (!modoAdmin) estado.ouro -= item.custo;
        estado.canecas[id] = 1;
        registrar(item.nome + " comprada! Seus cliques agora rendem mais ouro.");
        notificar("Melhoria adquirida: " + item.nome + "!");
        atualizar();
      }

      function renderizarLoja() {
        const assinatura = abaAtual === "staff"
          ? [abaAtual, modoAdmin, ...melhorias.map(item => (estado.funcionarios[item.id] || 0) + ":" + podeComprar(custoFuncionario(item)))].join("|")
          : [abaAtual, modoAdmin, ...melhoriasCaneca.map(item => Boolean(estado.canecas[item.id]) + ":" + podeComprar(item.custo))].join("|");
        if (assinatura === chaveRenderLoja) return;
        chaveRenderLoja = assinatura;
        const lista = el("shop-list");
        lista.replaceChildren();
        if (abaAtual === "staff") {
          melhorias.forEach(item => {
            const quantidade = estado.funcionarios[item.id] || 0;
            const custo = custoFuncionario(item);
            const artigo = document.createElement("article");
            artigo.className = "upgrade" + (podeComprar(custo) ? " affordable" : "");
            artigo.innerHTML = '<span class="upgrade-icon" aria-hidden="true">' + item.icone + '</span><div><div class="upgrade-name">' + item.nome + '</div><div class="upgrade-desc">+' + formatar(item.producao) + ' ouro/s • ' + item.descricao + '</div><div class="upgrade-owned">Na equipe: ' + quantidade + '</div></div><button class="buy-button" type="button" ' + (!podeComprar(custo) ? "disabled" : "") + '>CONTRATAR<span class="buy-cost">' + (modoAdmin ? "grátis (ADM)" : formatar(custo) + " ouro") + '</span></button>';
            artigo.querySelector("button").addEventListener("click", () => comprarFuncionario(item.id));
            lista.appendChild(artigo);
          });
        } else {
          melhoriasCaneca.forEach(item => {
            const comprada = Boolean(estado.canecas[item.id]);
            const artigo = document.createElement("article");
            artigo.className = "upgrade" + (!comprada && podeComprar(item.custo) ? " affordable" : "");
            artigo.innerHTML = '<span class="upgrade-icon" aria-hidden="true">' + item.icone + '</span><div><div class="upgrade-name">' + item.nome + '</div><div class="upgrade-desc">' + item.descricao + '</div><div class="upgrade-owned">' + (comprada ? "Adquirida" : "Melhoria permanente") + '</div></div><button class="buy-button" type="button" ' + (comprada || !podeComprar(item.custo) ? "disabled" : "") + '>' + (comprada ? "COMPRADA" : "COMPRAR") + (comprada ? "" : '<span class="buy-cost">' + (modoAdmin ? "grátis (ADM)" : formatar(item.custo) + " ouro") + '</span>') + '</button>';
            if (!comprada) artigo.querySelector("button").addEventListener("click", () => comprarCaneca(item.id));
            lista.appendChild(artigo);
          });
        }
      }

      function verificarConquistas() {
        conquistas.forEach(item => {
          if (!estado.conquistas.includes(item.id) && item.regra(estado)) {
            estado.conquistas.push(item.id);
            notificar("Conquista desbloqueada: " + item.nome + "!");
            registrar("Conquista: " + item.nome + ". A fama da casa está crescendo!");
          }
        });
        el("achievement-list").replaceChildren();
        conquistas.forEach(item => {
          const selo = document.createElement("span");
          const desbloqueada = estado.conquistas.includes(item.id);
          selo.className = "achievement" + (desbloqueada ? "" : " locked");
          selo.textContent = (desbloqueada ? "★ " : "◇ ") + item.nome;
          el("achievement-list").appendChild(selo);
        });
      }

      function atualizarVisual() {
        const ganho = estado.totalGanho;
        const estagio = ganho >= 100000 ? 3 : ganho >= 5000 ? 2 : ganho >= 100 ? 1 : 0;
        const cena = el("scene");
        cena.classList.remove("stage-0", "stage-1", "stage-2", "stage-3");
        cena.classList.add("stage-" + estagio);
        el("scene-note").textContent = ["NOITE TRANQUILA", "CASA COMEÇANDO A ENCHER", "TAVERNA EM ALTA", "A LENDA DO DRAGÃO"][estagio];
        el("sign").textContent = estagio >= 3 ? "A TAVERNA DO DRAGÃO DOURADO" : "A Caneca do Dragão";
        el("click-hint").textContent = "CLIQUE NA CANECA • +" + formatar(multiplicadorClique() * multiplicadorBonus()) + " OURO";
      }

      function atualizar() {
        el("gold").textContent = modoAdmin ? "∞" : formatar(estado.ouro);
        el("ops").innerHTML = formatar(calcularOPS(estado) * multiplicadorBonus()) + ' <small>ouro/s</small>';
        renderizarLoja();
        verificarConquistas();
        atualizarVisual();
        const restante = Math.max(0, Math.ceil((estado.bonusAte - Date.now()) / 1000));
        el("boost-indicator").classList.toggle("active", restante > 0);
        el("boost-time").textContent = restante;
      }

      function salvar(silencioso = false) {
        try {
          estado.salvoEm = Date.now();
          localStorage.setItem(chaveSave, JSON.stringify(estado));
          ultimoSave = performance.now();
          if (!silencioso) notificar("Progresso salvo nesta máquina.");
        } catch (erro) {
          if (!silencioso) notificar("Não foi possível salvar. Verifique o armazenamento do navegador.");
        }
      }

      function carregar(mostrarMensagem = true) {
        try {
          const salvo = JSON.parse(localStorage.getItem(chaveSave) || "null");
          if (!salvo || typeof salvo !== "object") {
            if (mostrarMensagem) notificar("Nenhum jogo salvo foi encontrado.");
            return false;
          }
          const novo = estadoInicial();
          novo.ouro = Math.max(0, Number(salvo.ouro) || 0);
          novo.totalGanho = Math.max(novo.ouro, Number(salvo.totalGanho) || 0);
          novo.cliques = Math.max(0, Math.floor(Number(salvo.cliques) || 0));
          novo.bonusAte = Math.max(0, Number(salvo.bonusAte) || 0);
          novo.salvoEm = Number(salvo.salvoEm) || Date.now();
          melhorias.forEach(item => novo.funcionarios[item.id] = limitar(Math.floor(Number(salvo.funcionarios && salvo.funcionarios[item.id]) || 0), 0, 1e9));
          melhoriasCaneca.forEach(item => novo.canecas[item.id] = salvo.canecas && salvo.canecas[item.id] ? 1 : 0);
          novo.conquistas = Array.isArray(salvo.conquistas) ? salvo.conquistas.filter(id => conquistas.some(c => c.id === id)) : [];
          const ausenteMs = limitar(Date.now() - novo.salvoEm, 0, 8 * 60 * 60 * 1000);
          const offline = calcularOPS(novo) * ausenteMs / 1000;
          if (offline > 0) { novo.ouro += offline; novo.totalGanho += offline; }
          estado = novo;
          ultimoQuadro = performance.now();
          atualizar();
          if (mostrarMensagem) notificar(offline > 0 ? "Jogo carregado. Seus funcionários renderam " + formatar(offline) + " ouro enquanto você estava fora!" : "Jogo carregado.");
          return true;
        } catch (erro) {
          if (mostrarMensagem) notificar("O arquivo de progresso está inválido.");
          return false;
        }
      }

      function agendarViajante() {
        clearTimeout(proximoViajante);
        proximoViajante = setTimeout(() => {
          if (!el("traveler").classList.contains("visible")) el("traveler").classList.add("visible");
          agendarViajante();
        }, 18000 + Math.random() * 18000);
      }

      function clicarViajante() {
        if (!el("traveler").classList.contains("visible")) return;
        el("traveler").classList.remove("visible");
        const base = Math.max(30, calcularOPS() * 25, estado.ouro * .15);
        const bonus = Math.floor(base);
        ganharOuro(bonus);
        estado.bonusAte = Math.max(Date.now(), estado.bonusAte) + 20000;
        notificar("O viajante deixou " + formatar(bonus) + " ouro e abençoou a casa com renda 2x por 20s!");
        registrar("O viajante dourado passou por aqui. Aproveite o encanto enquanto dura!");
        atualizar();
      }

      function quadro(agora) {
        const delta = limitar((agora - ultimoQuadro) / 1000, 0, 8 * 60 * 60);
        ultimoQuadro = agora;
        const producao = calcularOPS() * multiplicadorBonus() * delta;
        ganharOuro(producao);
        if (agora - ultimoSave >= 5000) salvar(true);
        atualizar();
        requestAnimationFrame(quadro);
      }

      document.querySelectorAll("[data-tab]").forEach(botao => {
        botao.addEventListener("click", () => {
          abaAtual = botao.dataset.tab;
          document.querySelectorAll("[data-tab]").forEach(tab => tab.setAttribute("aria-selected", String(tab === botao)));
          renderizarLoja();
        });
      });
      el("mug-button").addEventListener("click", aoClicarCaneca);
      el("traveler").addEventListener("click", clicarViajante);
      el("save-button").addEventListener("click", () => salvar(false));
      el("load-button").addEventListener("click", () => carregar(true));
      el("admin-button").addEventListener("click", () => {
        modoAdmin = !modoAdmin;
        const botao = el("admin-button");
        botao.textContent = modoAdmin ? "ADM: ligado" : "ADM: desligado";
        botao.setAttribute("aria-pressed", String(modoAdmin));
        botao.classList.toggle("admin-active", modoAdmin);
        chaveRenderLoja = "";
        atualizar();
        notificar(modoAdmin ? "Modo ADM ativado: compras gratuitas e ouro ilimitado." : "Modo ADM desativado.");
      });
      el("reset-button").addEventListener("click", () => {
        if (!window.confirm("Começar uma nova taverna? Isso apaga o progresso salvo.")) return;
        estado = estadoInicial();
        salvar(true);
        atualizar();
        registrar("Uma nova taverna abre as portas. Que venham os fregueses!");
        notificar("A aventura recomeçou!");
      });
      window.addEventListener("beforeunload", () => salvar(true));

      carregar(false);
      atualizar();
      agendarViajante();
      requestAnimationFrame(quadro);
    })();