/**
 * Colégio Cristal Norte — Painel do Coordenador (SPA).
 *
 * Arquivo único com:
 *   • proteção de rota (só coordenador logado);
 *   • sidebar injetada;
 *   • sistema de rotas via hash (#alunos, #turmas, ...);
 *   • views dinâmicas no <main id="coordContent">;
 *   • helpers globais em window.Coord.
 *
 * Recursos:
 *   • Cadastrar / Editar / Consultar / Pesquisar alunos
 *   • Visualizar turmas e professores
 *   • Consultar notas, frequência e ocorrências
 *   • Criar comunicados
 *   • Acompanhar alunos com muitas faltas / baixo desempenho
 */

(() => {
  "use strict";

  /* ========================================================================
     1. PROTEÇÃO DE ROTA — só coordenador logado entra
     ======================================================================== */
  const session = window.CCN?.getSession();
  if (!session || session.role !== "coordenador") {
    window.location.replace("index.html");
    return;
  }

  /* ========================================================================
     2. HELPERS
     ======================================================================== */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const fmt = (n, d = 1) => Number(n).toFixed(d).replace(".", ",");
  const avg = (...nums) => {
    const v = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  const initials = (name) =>
    (name || "?").split(/\s+/).filter(Boolean).slice(0, 2)
      .map((p) => p[0].toUpperCase()).join("");

  const escape = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ========================================================================
     3. HELPERS DE DADOS (window.Coord)
     ======================================================================== */
  const Coord = {
    getData() { return CCN.getCoordinatorData(); },
    setData(d) { CCN.setCoordinatorData(d); },

    getAnnouncements() { return CCN.getAnnouncements(); },
    setAnnouncements(list) { CCN.setAnnouncements(list); },

    studentAverage(id) {
      const rows = this.getData().grades.filter((g) => g.studentId === id);
      if (!rows.length) return 0;
      return rows.reduce((acc, g) => acc + avg(g.b1, g.b2, g.b3, g.b4), 0) / rows.length;
    },

    studentAttendance(id) {
      const rows = this.getData().attendance.filter((a) => a.studentId === id);
      const given   = rows.reduce((a, r) => a + r.given, 0);
      const present = rows.reduce((a, r) => a + r.present, 0);
      return given ? (present / given) * 100 : 0;
    },

    studentAbsences(id) {
      return this.getData().attendance
        .filter((a) => a.studentId === id)
        .reduce((s, a) => s + a.absences, 0);
    },

    riskSubjects(id) {
      return this.getData().grades
        .filter((g) => g.studentId === id)
        .filter((g) => avg(g.b1, g.b2, g.b3, g.b4) < 6)
        .map((g) => g.subject);
    },

    findStudent(id) {
      return this.getData().students.find((s) => s.id === id) || null;
    },

    classes() { return this.getData().classes.map((c) => c.code); },

    saveStudent(student) {
      const d = this.getData();
      const idx = d.students.findIndex((s) => s.id === student.id);
      if (idx >= 0) d.students[idx] = { ...d.students[idx], ...student };
      else {
        student.id = student.id || `s-${Date.now()}`;
        d.students.push(student);
      }

      const users = CCN.getUsers();
      const existingUser = users.find((u) => u.role === "aluno" && (u.email === student.email || u.enrollment === student.enrollment));
      const userPayload = {
        name: student.name,
        email: student.email,
        password: student.password || "aluno123",
        role: "aluno",
        studentId: student.id || existingUser?.studentId || null,
        enrollment: student.enrollment,
        phone: student.phone,
        birth: student.birth,
        class: student.class,
        course: student.course,
        period: student.period,
        guardian: student.guardian,
        guardianPhone: student.guardianPhone,
        situation: student.situation,
        firstAccess: student.firstAccess ?? (existingUser ? Boolean(existingUser.firstAccess) : true),
        createdAt: new Date().toISOString(),
      };

      const userIndex = users.findIndex((u) => u.role === "aluno" && (u.email === student.email || u.enrollment === student.enrollment));
      if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], ...userPayload };
      } else {
        users.push(userPayload);
      }
      CCN.setUsers(users);

      this.setData(d);
      return student;
    },

    removeStudent(id) {
      const d = this.getData();
      d.students = d.students.filter((s) => s.id !== id);
      d.grades = d.grades.filter((g) => g.studentId !== id);
      d.attendance = d.attendance.filter((a) => a.studentId !== id);
      d.occurrences = d.occurrences.filter((o) => o.studentId !== id);
      this.setData(d);
    },

    saveAnnouncement(item) {
      const list = this.getAnnouncements();
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) list[idx] = item; else list.push(item);
      this.setAnnouncements(list);
      return item;
    },
    removeAnnouncement(id) {
      this.setAnnouncements(this.getAnnouncements().filter((a) => a.id !== id));
    },

    toast(message, kind = "ok") {
      const old = $(".coord-toast"); old?.remove();
      const el = document.createElement("div");
      el.className = `coord-toast coord-toast--${kind}`;
      el.textContent = message;
      document.body.appendChild(el);
      setTimeout(() => { el.style.opacity = "0"; }, 2200);
      setTimeout(() => el.remove(), 2600);
    },
  };
  window.Coord = Coord;

  /* ========================================================================
     4. MODAL GLOBAL
     ======================================================================== */
  const modal       = $("#coordModal");
  const modalTitle  = $("#coordModalTitle");
  const modalBody   = $("#coordModalBody");
  const modalFooter = $("#coordModalFooter");

  function openModal({ title, bodyHTML, footerHTML }) {
    modalTitle.textContent  = title;
    modalBody.innerHTML     = bodyHTML;
    modalFooter.innerHTML   = footerHTML || "";
    modal.classList.add("is-open");
    setTimeout(() => modalBody.querySelector("input, select, textarea")?.focus(), 30);
  }
  function closeModal() { modal.classList.remove("is-open"); }

  $("#coordModalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  /* ========================================================================
     5. MENU LATERAL
     ======================================================================== */
  const NAV_ITEMS = [
    { section: "Visão geral" },
    { key: "dashboard",      href: "#dashboard",      label: "Painel",          icon: "grid" },
    { section: "Gestão" },
    { key: "alunos",         href: "#alunos",         label: "Alunos",          icon: "users" },
    { key: "turmas",         href: "#turmas",         label: "Turmas",          icon: "layers" },
    { key: "professores",    href: "#professores",    label: "Professores",     icon: "user-check" },
    { section: "Acompanhamento" },
    { key: "notas",          href: "#notas",          label: "Notas",           icon: "chart" },
    { key: "frequencia",     href: "#frequencia",     label: "Frequência",      icon: "calendar" },
    { key: "ocorrencias",    href: "#ocorrencias",    label: "Ocorrências",     icon: "alert" },
    { key: "acompanhamento", href: "#acompanhamento", label: "Acompanhamento",  icon: "target" },
    { section: "Comunicação" },
    { key: "comunicados",    href: "#comunicados",    label: "Comunicados",     icon: "megaphone" },
  ];

  const ICONS = {
    grid:        '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    users:       '<circle cx="9" cy="8" r="3"/><path d="M2 20c.5-3.5 2.8-5.3 7-5.3s6.5 1.8 7 5.3"/><path d="M17 8a3 3 0 0 1 0 6M21 20c-.3-2.6-1.6-4.3-3.5-5"/>',
    layers:      '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    "user-check":'<circle cx="9" cy="8" r="3"/><path d="M2 20c.5-3.5 2.8-5.3 7-5.3 2.2 0 4 .5 5.2 1.5"/><path d="m16 17 2 2 4-4"/>',
    chart:       '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    calendar:    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    alert:       '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5M12 18h.01"/>',
    target:      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    megaphone:   '<path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2Z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
  };

  function renderSidebar(activeKey) {
    const mount = $("#coordSidebar");
    if (!mount) return;

    const nav = NAV_ITEMS.map((item) => {
      if (item.section) return `<li class="coord-nav__section">${item.section}</li>`;
      const active = item.key === activeKey ? "is-active" : "";
      return `
        <li>
          <a href="${item.href}" class="${active}">
            <span class="coord-nav__icon"><svg viewBox="0 0 24 24">${ICONS[item.icon] || ""}</svg></span>
            <span>${item.label}</span>
          </a>
        </li>`;
    }).join("");

    mount.innerHTML = `
      <aside class="coord-sidebar">
        <div class="coord-sidebar__brand">
          <img src="logo.png" alt="Logo do Colégio Cristal Norte" />
          <div class="coord-sidebar__title">
            <span>Coordenação</span>
            <strong>Cristal Norte</strong>
          </div>
        </div>
        <ul class="coord-nav">${nav}</ul>
        <div class="coord-sidebar__footer">
          <div class="coord-sidebar__user">
            <div class="coord-sidebar__avatar">${initials(session.name)}</div>
            <div class="coord-sidebar__meta">
              <span class="coord-sidebar__name">${escape(session.name)}</span>
              <span class="coord-sidebar__role">Coordenador</span>
            </div>
          </div>
          <button class="coord-logout" id="coordLogout" type="button">
            <svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/></svg>
            <span>Sair</span>
          </button>
        </div>
      </aside>
    `;

    $("#coordLogout").addEventListener("click", () => {
      if (!window.confirm("Deseja realmente sair do sistema?")) return;
      CCN.clearSession();
      window.location.replace("index.html");
    });
  }

  /* ========================================================================
     6. VIEWS
     ======================================================================== */
  const VIEWS = {

    dashboard() {
      const d = Coord.getData();
      const lowAtt   = d.students.filter((s) => Coord.studentAttendance(s.id) < 75).length;
      const lowGrade = d.students.filter((s) => Coord.studentAverage(s.id) < 6).length;
      const annCount = Coord.getAnnouncements().length;

      const recent = [...d.occurrences].slice(-4).reverse();
      const recentHtml = recent.length
        ? recent.map((o) => {
            const s = Coord.findStudent(o.studentId);
            const cls = o.level === "warn" ? "is-warn" : o.level === "danger" ? "is-danger" : "is-ok";
            return `
              <li class="${cls}">
                <strong>${escape(o.title)}</strong> — ${escape(s?.name || "—")}
                <div style="color:var(--ink-500);font-size:.74rem;margin-top:4px">
                  ${escape(o.desc)} <em>(${o.date})</em>
                </div>
              </li>`;
          }).join("")
        : `<li class="empty-state">Nenhuma ocorrência registrada.</li>`;

      return `
        <header class="coord-header">
          <div>
            <h1>Olá, ${escape(session.name.split(" ")[0])}!</h1>
            <p>Acompanhe alunos, turmas e professores em um só lugar.</p>
          </div>
        </header>

        <section class="coord-cards">
          <article class="coord-card coord-card--accent">
            <span class="coord-card__label">Alunos</span>
            <strong class="coord-card__value">${d.students.length}</strong>
            <span class="coord-card__hint">Ativos no sistema</span>
          </article>
          <article class="coord-card">
            <span class="coord-card__label">Turmas</span>
            <strong class="coord-card__value">${d.classes.length}</strong>
            <span class="coord-card__hint">Em funcionamento</span>
          </article>
          <article class="coord-card">
            <span class="coord-card__label">Professores</span>
            <strong class="coord-card__value">${d.teachers.length}</strong>
            <span class="coord-card__hint">Cadastrados</span>
          </article>
          <article class="coord-card">
            <span class="coord-card__label">Comunicados</span>
            <strong class="coord-card__value">${annCount}</strong>
            <span class="coord-card__hint">Publicados</span>
          </article>
        </section>

        <section class="coord-panel">
          <header class="coord-panel__header">
            <h2>Acompanhamento rápido</h2>
            <a class="btn btn--ghost btn--sm" href="#acompanhamento">Ver detalhes</a>
          </header>
          <div class="coord-cards" style="margin-bottom:0">
            <article class="coord-card">
              <span class="coord-card__label">Alunos com muitas faltas</span>
              <strong class="coord-card__value">${lowAtt}</strong>
              <span class="coord-card__hint">Frequência abaixo de 75%</span>
            </article>
            <article class="coord-card">
              <span class="coord-card__label">Alunos com baixo desempenho</span>
              <strong class="coord-card__value">${lowGrade}</strong>
              <span class="coord-card__hint">Média abaixo de 6,0</span>
            </article>
          </div>
        </section>

        <section class="coord-panel">
          <header class="coord-panel__header">
            <h2>Ocorrências recentes</h2>
            <a class="btn btn--ghost btn--sm" href="#ocorrencias">Ver todas</a>
          </header>
          <ul class="list-simple">${recentHtml}</ul>
        </section>
      `;
    },

    alunos() {
      const d = Coord.getData();
      const classOpts = d.classes.map((c) => `<option value="${c.code}">${c.code}</option>`).join("");

      return `
        <header class="coord-header">
          <div>
            <h1>Alunos</h1>
            <p>Cadastre, edite, consulte e pesquise alunos.</p>
          </div>
          <div class="coord-header__meta">
            <button class="btn btn--primary" data-action="new-student" type="button">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              <span>Novo aluno</span>
            </button>
          </div>
        </header>

        <section class="coord-panel">
          <div class="coord-filters">
            <input type="search" id="filterSearch" placeholder="Pesquisar por nome, matrícula ou e-mail…" />
            <select id="filterClass">
              <option value="">Todas as turmas</option>
              ${classOpts}
            </select>
            <select id="filterShift">
              <option value="">Todos os turnos</option>
              <option>Manhã</option><option>Tarde</option><option>Noite</option>
            </select>
            <button class="btn btn--ghost" id="btnClearFilters" type="button">Limpar</button>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nome</th><th>Matrícula</th><th>Turma</th><th>Turno</th>
                  <th>Média</th><th>Frequência</th><th>Ações</th>
                </tr>
              </thead>
              <tbody id="studentsTable"></tbody>
            </table>
          </div>
          <p class="empty-state" id="studentsEmpty" hidden>Nenhum aluno encontrado.</p>
        </section>
      `;
    },

    turmas() {
      return `
        <header class="coord-header">
          <div>
            <h1>Turmas</h1>
            <p>Visualize turmas, salas e professores responsáveis.</p>
          </div>
        </header>

        <section class="coord-panel">
          <div class="coord-filters">
            <input type="search" id="classSearch" placeholder="Pesquisar turma ou coordenador…" />
            <select id="classShiftFilter">
              <option value="">Todos os turnos</option>
              <option>Manhã</option><option>Tarde</option><option>Noite</option>
            </select>
          </div>
          <div id="classesGrid"></div>
        </section>
      `;
    },

    professores() {
      return `
        <header class="coord-header">
          <div>
            <h1>Professores</h1>
            <p>Visualize professores, disciplinas e turmas atendidas.</p>
          </div>
        </header>

        <section class="coord-panel">
          <div class="coord-filters">
            <input type="search" id="teacherSearch" placeholder="Pesquisar por nome ou disciplina…" />
            <select id="teacherSubjectFilter">
              <option value="">Todas as disciplinas</option>
            </select>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr><th>Professor(a)</th><th>Disciplina</th><th>Turmas</th><th>E-mail</th></tr>
              </thead>
              <tbody id="teachersTable"></tbody>
            </table>
          </div>
          <p class="empty-state" id="teachersEmpty" hidden>Nenhum professor encontrado.</p>
        </section>
      `;
    },

    notas() {
      const d = Coord.getData();
      const studentOpts = d.students.map((s) => `<option value="${s.id}">${escape(s.name)} — ${s.class}</option>`).join("");
      const classOpts   = [...new Set(d.students.map((s) => s.class))].map((c) => `<option value="${c}">${c}</option>`).join("");
      const subjectOpts = [...new Set(d.grades.map((g) => g.subject))].map((s) => `<option value="${s}">${s}</option>`).join("");

      return `
        <header class="coord-header">
          <div>
            <h1>Notas</h1>
            <p>Consulte notas por aluno e disciplina. Somente leitura.</p>
          </div>
        </header>

        <section class="coord-panel">
          <div class="coord-filters">
            <select id="gradeStudent"><option value="">Todos os alunos</option>${studentOpts}</select>
            <select id="gradeClass"><option value="">Todas as turmas</option>${classOpts}</select>
            <select id="gradeSubject"><option value="">Todas as disciplinas</option>${subjectOpts}</select>
            <button class="btn btn--ghost" id="gradeClear" type="button">Limpar</button>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Aluno</th><th>Turma</th><th>Disciplina</th>
                  <th>1º</th><th>2º</th><th>3º</th><th>4º</th>
                  <th>Média</th><th>Situação</th>
                </tr>
              </thead>
              <tbody id="gradesTable"></tbody>
            </table>
          </div>
          <p class="empty-state" id="gradesEmpty" hidden>Nenhuma nota encontrada.</p>
        </section>
      `;
    },

    frequencia() {
      const d = Coord.getData();
      const studentOpts = d.students.map((s) => `<option value="${s.id}">${escape(s.name)} — ${s.class}</option>`).join("");
      const classOpts   = [...new Set(d.students.map((s) => s.class))].map((c) => `<option value="${c}">${c}</option>`).join("");
      const subjectOpts = [...new Set(d.attendance.map((a) => a.subject))].map((s) => `<option value="${s}">${s}</option>`).join("");

      return `
        <header class="coord-header">
          <div>
            <h1>Frequência</h1>
            <p>Consulte a frequência dos alunos por disciplina. Somente leitura.</p>
          </div>
        </header>

        <section class="coord-panel">
          <div class="coord-filters">
            <select id="attStudent"><option value="">Todos os alunos</option>${studentOpts}</select>
            <select id="attClass"><option value="">Todas as turmas</option>${classOpts}</select>
            <select id="attSubject"><option value="">Todas as disciplinas</option>${subjectOpts}</select>
            <button class="btn btn--ghost" id="attClear" type="button">Limpar</button>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Aluno</th><th>Turma</th><th>Disciplina</th>
                  <th>Aulas dadas</th><th>Presenças</th><th>Faltas</th><th>% Presença</th>
                </tr>
              </thead>
              <tbody id="attTable"></tbody>
            </table>
          </div>
          <p class="empty-state" id="attEmpty" hidden>Nenhum registro encontrado.</p>
        </section>
      `;
    },

    ocorrencias() {
      const d = Coord.getData();
      const studentOpts = d.students.map((s) => `<option value="${s.id}">${escape(s.name)} — ${s.class}</option>`).join("");

      return `
        <header class="coord-header">
          <div>
            <h1>Ocorrências</h1>
            <p>Acompanhe ocorrências dos alunos. Somente leitura.</p>
          </div>
        </header>

        <section class="coord-panel">
          <div class="coord-filters">
            <select id="occStudent"><option value="">Todos os alunos</option>${studentOpts}</select>
            <select id="occLevel">
              <option value="">Todos os tipos</option>
              <option value="ok">Positivo</option>
              <option value="warn">Atenção</option>
              <option value="danger">Grave</option>
            </select>
            <input type="search" id="occSearch" placeholder="Pesquisar…" />
            <button class="btn btn--ghost" id="occClear" type="button">Limpar</button>
          </div>

          <ul class="list-simple" id="occList"></ul>
          <p class="empty-state" id="occEmpty" hidden>Nenhuma ocorrência encontrada.</p>
        </section>
      `;
    },

    acompanhamento() {
      return `
        <header class="coord-header">
          <div>
            <h1>Acompanhamento</h1>
            <p>Alunos com muitas faltas e/ou baixo desempenho.</p>
          </div>
        </header>

        <section class="coord-panel">
          <header class="coord-panel__header">
            <h2>Alunos com muitas faltas</h2>
            <span class="coord-panel__note">Frequência abaixo de 75%</span>
          </header>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr><th>Aluno</th><th>Turma</th><th>Total de faltas</th><th>Frequência</th><th>Ações</th></tr>
              </thead>
              <tbody id="lowAttTable"></tbody>
            </table>
          </div>
          <p class="empty-state" id="lowAttEmpty" hidden>Nenhum aluno com faltas excessivas.</p>
        </section>

        <section class="coord-panel">
          <header class="coord-panel__header">
            <h2>Alunos com baixo desempenho</h2>
            <span class="coord-panel__note">Média geral abaixo de 6,0</span>
          </header>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr><th>Aluno</th><th>Turma</th><th>Média geral</th><th>Disciplinas em risco</th><th>Ações</th></tr>
              </thead>
              <tbody id="lowGradeTable"></tbody>
            </table>
          </div>
          <p class="empty-state" id="lowGradeEmpty" hidden>Nenhum aluno com baixo desempenho.</p>
        </section>
      `;
    },

    comunicados() {
      return `
        <header class="coord-header">
          <div>
            <h1>Comunicados</h1>
            <p>Crie e gerencie comunicados para alunos, responsáveis e professores.</p>
          </div>
          <div class="coord-header__meta">
            <button class="btn btn--primary" data-action="new-ann" type="button">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              <span>Novo comunicado</span>
            </button>
          </div>
        </header>

        <section class="coord-panel">
          <ul class="list-simple" id="annList"></ul>
          <p class="empty-state" id="annEmpty" hidden>Nenhum comunicado publicado.</p>
        </section>
      `;
    },
  };

  /* ========================================================================
     7. HANDLERS DAS VIEWS
     ======================================================================== */

  /* ------------------------------- ALUNOS ------------------------------- */
  const alunosHandlers = {
    init() {
      const tbody = $("#studentsTable");
      const empty = $("#studentsEmpty");
      const fSearch = $("#filterSearch");
      const fClass  = $("#filterClass");
      const fShift  = $("#filterShift");

      const render = () => {
        const q = fSearch.value.trim().toLowerCase();
        const cls = fClass.value;
        const shift = fShift.value;

        const list = Coord.getData().students.filter((s) => {
          if (cls && s.class !== cls) return false;
          if (shift && s.shift !== shift) return false;
          if (!q) return true;
          return (
            s.name.toLowerCase().includes(q) ||
            s.enrollment.toLowerCase().includes(q) ||
            (s.email || "").toLowerCase().includes(q)
          );
        });

        tbody.innerHTML = "";
        empty.hidden = list.length > 0;

        list.forEach((s) => {
          const a = Coord.studentAverage(s.id);
          const f = Coord.studentAttendance(s.id);
          const aCls = a >= 7 ? "badge--ok" : a >= 5 ? "badge--warn" : "badge--danger";
          const fCls = f >= 75 ? "badge--ok" : f >= 50 ? "badge--warn" : "badge--danger";
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${escape(s.name)}</td>
            <td>${escape(s.enrollment)}</td>
            <td>${escape(s.class)}</td>
            <td>${escape(s.shift || "—")}</td>
            <td><span class="badge ${aCls}">${fmt(a)}</span></td>
            <td><span class="badge ${fCls}">${fmt(f)}%</span></td>
            <td>
              <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${s.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-action="delete" data-id="${s.id}">Excluir</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      };

      $('[data-action="new-student"]').addEventListener("click", () => this.openForm());

      tbody.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const { action, id } = btn.dataset;
        if (action === "edit") this.openForm(Coord.findStudent(id));
        if (action === "delete") {
          const s = Coord.findStudent(id);
          if (!confirm(`Excluir "${s?.name}"? Também remove notas, frequência e ocorrências.`)) return;
          Coord.removeStudent(id);
          Coord.toast("Aluno excluído.", "warn");
          render();
        }
      });

      [fSearch, fClass, fShift].forEach((el) => el.addEventListener("input", render));
      $("#btnClearFilters").addEventListener("click", () => {
        fSearch.value = ""; fClass.value = ""; fShift.value = "";
        render();
      });

      render();
    },

    openForm(student = null) {
      const classes = Coord.classes();
      const isEdit = Boolean(student);
      const classOpts = classes.map((c) =>
        `<option value="${c}" ${student?.class === c ? "selected" : ""}>${c}</option>`).join("");
      const shiftOpts = ["Manhã", "Tarde", "Noite"].map((s) =>
        `<option value="${s}" ${student?.shift === s ? "selected" : ""}>${s}</option>`).join("");
      const situationOpts = ["Ativo", "Inativo", "Em recuperação", "Transferido", "Evadido"].map((s) =>
        `<option value="${s}" ${student?.situation === s ? "selected" : ""}>${s}</option>`).join("");

      openModal({
        title: isEdit ? `Editar aluno — ${escape(student.name)}` : "Novo aluno",
        bodyHTML: `
          <form id="studentForm" class="form-grid" novalidate>
            <input type="hidden" id="sId" value="${student?.id ?? ""}" />

            <div class="field-group" style="grid-column:1/-1">
              <label for="sName">Nome completo</label>
              <input type="text" id="sName" value="${escape(student?.name ?? "")}" required />
              <p class="field-message" id="msgName"></p>
            </div>

            <div class="field-group">
              <label for="sEnroll">Matrícula</label>
              <input type="text" id="sEnroll" value="${escape(student?.enrollment ?? "")}" required />
              <p class="field-message" id="msgEnroll"></p>
            </div>

            <div class="field-group">
              <label for="sBirth">Data de nascimento</label>
              <input type="date" id="sBirth" value="${toISO(student?.birth)}" required />
              <p class="field-message" id="msgBirth"></p>
            </div>

            <div class="field-group">
              <label for="sClass">Turma</label>
              <select id="sClass" required>
                <option value="" disabled ${student ? "" : "selected"}>Selecione…</option>
                ${classOpts}
              </select>
              <p class="field-message" id="msgClass"></p>
            </div>

            <div class="field-group">
              <label for="sShift">Período</label>
              <select id="sShift">${shiftOpts}</select>
            </div>

            <div class="field-group">
              <label for="sCourse">Curso</label>
              <input type="text" id="sCourse" value="${escape(student?.course ?? "")}" required />
              <p class="field-message" id="msgCourse"></p>
            </div>

            <div class="field-group">
              <label for="sEmail">E-mail</label>
              <input type="email" id="sEmail" value="${escape(student?.email ?? "")}" required />
              <p class="field-message" id="msgEmail"></p>
            </div>

            <div class="field-group">
              <label for="sPhone">Telefone</label>
              <input type="tel" id="sPhone" value="${escape(student?.phone ?? "")}" required />
              <p class="field-message" id="msgPhone"></p>
            </div>

            <div class="field-group" style="grid-column:1/-1">
              <label for="sGuardian">Nome do responsável</label>
              <input type="text" id="sGuardian" value="${escape(student?.guardian ?? "")}" required />
              <p class="field-message" id="msgGuardian"></p>
            </div>

            <div class="field-group">
              <label for="sGuardianPhone">Telefone do responsável</label>
              <input type="tel" id="sGuardianPhone" value="${escape(student?.guardianPhone ?? "")}" required />
              <p class="field-message" id="msgGuardianPhone"></p>
            </div>

            <div class="field-group">
              <label for="sSituation">Situação do aluno</label>
              <select id="sSituation" required>
                <option value="" disabled ${student ? "" : "selected"}>Selecione…</option>
                ${situationOpts}
              </select>
              <p class="field-message" id="msgSituation"></p>
            </div>

            <div class="field-group" style="grid-column:1/-1">
              <label for="sAddress">Endereço</label>
              <input type="text" id="sAddress" value="${escape(student?.address ?? "")}" />
            </div>

            <div class="field-group" style="grid-column:1/-1">
              <label for="sPassword">Senha de primeiro acesso</label>
              <input type="password" id="sPassword" value="${escape(student?.password ?? "")}" required />
              <p class="field-message" id="msgPassword"></p>
            </div>
          </form>
        `,
        footerHTML: `
          <button class="btn btn--ghost" type="button" id="sCancel">Cancelar</button>
          <button class="btn btn--primary" type="submit" form="studentForm">Salvar</button>
        `,
      });

      $("#sCancel").addEventListener("click", closeModal);

      $("#studentForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const msgName = $("#msgName"), msgEnroll = $("#msgEnroll");
        const msgBirth = $("#msgBirth"), msgClass = $("#msgClass");
        const msgEmail = $("#msgEmail"), msgPhone = $("#msgPhone");
        const msgGuardian = $("#msgGuardian"), msgGuardianPhone = $("#msgGuardianPhone");
        const msgSituation = $("#msgSituation"), msgCourse = $("#msgCourse");
        const msgPassword = $("#msgPassword");

        [msgName, msgEnroll, msgBirth, msgClass, msgEmail, msgPhone, msgGuardian, msgGuardianPhone, msgSituation, msgCourse, msgPassword].forEach((m) => (m.textContent = ""));

        const name = $("#sName").value.trim();
        const enroll = $("#sEnroll").value.trim();
        const birth = fromISO($("#sBirth").value);
        const cls = $("#sClass").value;
        const course = $("#sCourse").value.trim();
        const email = $("#sEmail").value.trim();
        const phone = $("#sPhone").value.trim();
        const guardian = $("#sGuardian").value.trim();
        const guardianPhone = $("#sGuardianPhone").value.trim();
        const situation = $("#sSituation").value;
        const password = $("#sPassword").value;

        let ok = true;
        if (name.length < 3) { msgName.textContent = "Nome muito curto."; ok = false; }
        if (enroll.length < 3) { msgEnroll.textContent = "Matrícula inválida."; ok = false; }
        if (!birth) { msgBirth.textContent = "Informe a data de nascimento."; ok = false; }
        if (!cls) { msgClass.textContent = "Selecione a turma."; ok = false; }
        if (!course) { msgCourse.textContent = "Informe o curso."; ok = false; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          msgEmail.textContent = "E-mail inválido."; ok = false;
        }
        if (phone.length < 10) { msgPhone.textContent = "Telefone inválido."; ok = false; }
        if (!guardian) { msgGuardian.textContent = "Informe o nome do responsável."; ok = false; }
        if (guardianPhone.length < 10) { msgGuardianPhone.textContent = "Telefone do responsável inválido."; ok = false; }
        if (!situation) { msgSituation.textContent = "Selecione a situação do aluno."; ok = false; }
        if (!password || password.length < 6) { msgPassword.textContent = "A senha deve ter pelo menos 6 caracteres."; ok = false; }

        if (!ok) return;

        const studentPayload = {
          id: $("#sId").value || undefined,
          name,
          enrollment: enroll,
          birth,
          class: cls,
          shift: $("#sShift").value,
          course,
          email,
          phone,
          guardian,
          guardianPhone,
          situation,
          password,
          address: $("#sAddress")?.value.trim() || "",
        };

        Coord.saveStudent(studentPayload);
        Coord.toast("Aluno salvo com sucesso! A senha foi cadastrada.");
        closeModal();
        alunosHandlers.init();
      });
    },
  };

  /* ------------------------------- TURMAS ------------------------------- */
  const turmasHandlers = {
    init() {
      const grid = $("#classesGrid");
      const search = $("#classSearch");
      const shift = $("#classShiftFilter");

      const render = () => {
        const d = Coord.getData();
        const q = search.value.trim().toLowerCase();
        const s = shift.value;

        const list = d.classes.filter((c) => {
          if (s && c.shift !== s) return false;
          if (!q) return true;
          return c.code.toLowerCase().includes(q) || c.coordinator.toLowerCase().includes(q);
        });

        if (!list.length) {
          grid.innerHTML = `<p class="empty-state">Nenhuma turma encontrada.</p>`;
          return;
        }

        grid.innerHTML = list.map((c) => {
          const students = d.students.filter((x) => x.class === c.code);
          const avgAll = students.length
            ? students.reduce((acc, x) => acc + Coord.studentAverage(x.id), 0) / students.length : 0;
          const attAll = students.length
            ? students.reduce((acc, x) => acc + Coord.studentAttendance(x.id), 0) / students.length : 0;

          const subs = c.subjects.map((x) =>
            `<li style="padding:6px 10px;border-radius:8px;background:var(--beige-100);font-size:.74rem">
               <strong>${escape(x.name)}</strong> — ${escape(x.teacher)}
             </li>`).join("");

          return `
            <article class="coord-panel">
              <header class="coord-panel__header">
                <h2>${escape(c.code)}</h2>
                <span class="badge badge--info">${escape(c.shift)}</span>
              </header>
              <div style="color:var(--ink-500);font-size:.78rem;margin-bottom:12px">
                ${escape(c.room)} · Coordenação: <strong>${escape(c.coordinator)}</strong>
              </div>
              <div class="coord-cards" style="margin-bottom:12px">
                <div class="coord-card"><span class="coord-card__label">Alunos</span><strong class="coord-card__value">${students.length}</strong></div>
                <div class="coord-card"><span class="coord-card__label">Média</span><strong class="coord-card__value">${fmt(avgAll)}</strong></div>
                <div class="coord-card"><span class="coord-card__label">Frequência</span><strong class="coord-card__value">${fmt(attAll)}%</strong></div>
              </div>
              <details>
                <summary style="cursor:pointer;font-size:.8rem;font-weight:700;color:var(--ink-700);margin-bottom:8px">
                  Disciplinas e professores (${c.subjects.length})
                </summary>
                <ul style="display:grid;gap:6px;padding:0;margin:8px 0 0;list-style:none">${subs}</ul>
              </details>
            </article>`;
        }).join("");
      };

      search.addEventListener("input", render);
      shift.addEventListener("change", render);
      render();
    },
  };

  /* ---------------------------- PROFESSORES ---------------------------- */
  const professoresHandlers = {
    init() {
      const tbody = $("#teachersTable");
      const empty = $("#teachersEmpty");
      const search = $("#teacherSearch");
      const subject = $("#teacherSubjectFilter");

      const d = Coord.getData();
      const subs = [...new Set(d.teachers.map((t) => t.subject))].sort();
      subject.innerHTML += subs.map((s) => `<option value="${s}">${s}</option>`).join("");

      const render = () => {
        const q = search.value.trim().toLowerCase();
        const sub = subject.value;
        const list = d.teachers.filter((t) => {
          if (sub && t.subject !== sub) return false;
          if (!q) return true;
          return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
        });

        tbody.innerHTML = "";
        empty.hidden = list.length > 0;

        list.forEach((t) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${escape(t.name)}</td>
            <td>${escape(t.subject)}</td>
            <td>${(t.classes || []).map(escape).join(", ") || "—"}</td>
            <td>${escape(t.email || "—")}</td>
          `;
          tbody.appendChild(tr);
        });
      };

      search.addEventListener("input", render);
      subject.addEventListener("change", render);
      render();
    },
  };

  /* ------------------------------- NOTAS ------------------------------- */
  const notasHandlers = {
    init() {
      const tbody = $("#gradesTable");
      const empty = $("#gradesEmpty");
      const selStudent = $("#gradeStudent");
      const selClass   = $("#gradeClass");
      const selSubject = $("#gradeSubject");

      const render = () => {
        const sid = selStudent.value, cls = selClass.value, sub = selSubject.value;
        const d = Coord.getData();

        const rows = d.grades.filter((g) => {
          const st = Coord.findStudent(g.studentId);
          if (!st) return false;
          if (sid && g.studentId !== sid) return false;
          if (cls && st.class !== cls) return false;
          if (sub && g.subject !== sub) return false;
          return true;
        });

        tbody.innerHTML = "";
        empty.hidden = rows.length > 0;

        rows.forEach((g) => {
          const st = Coord.findStudent(g.studentId);
          const m = avg(g.b1, g.b2, g.b3, g.b4);
          const c = m >= 7 ? "badge--ok" : m >= 5 ? "badge--warn" : "badge--danger";
          const label = m >= 7 ? "Aprovado" : m >= 5 ? "Recuperação" : "Reprovado";

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${escape(st.name)}</td>
            <td>${escape(st.class)}</td>
            <td>${escape(g.subject)}</td>
            <td>${fmt(g.b1)}</td><td>${fmt(g.b2)}</td><td>${fmt(g.b3)}</td><td>${fmt(g.b4)}</td>
            <td><strong>${fmt(m)}</strong></td>
            <td><span class="badge ${c}">${label}</span></td>
          `;
          tbody.appendChild(tr);
        });
      };

      [selStudent, selClass, selSubject].forEach((el) => el.addEventListener("change", render));
      $("#gradeClear").addEventListener("click", () => {
        selStudent.value = ""; selClass.value = ""; selSubject.value = "";
        render();
      });
      render();
    },
  };

  /* ---------------------------- FREQUÊNCIA ---------------------------- */
  const frequenciaHandlers = {
    init() {
      const tbody = $("#attTable");
      const empty = $("#attEmpty");
      const selStudent = $("#attStudent");
      const selClass   = $("#attClass");
      const selSubject = $("#attSubject");

      const render = () => {
        const sid = selStudent.value, cls = selClass.value, sub = selSubject.value;
        const d = Coord.getData();

        const rows = d.attendance.filter((a) => {
          const st = Coord.findStudent(a.studentId);
          if (!st) return false;
          if (sid && a.studentId !== sid) return false;
          if (cls && st.class !== cls) return false;
          if (sub && a.subject !== sub) return false;
          return true;
        });

        tbody.innerHTML = "";
        empty.hidden = rows.length > 0;

        rows.forEach((a) => {
          const st = Coord.findStudent(a.studentId);
          const pct = a.given ? (a.present / a.given) * 100 : 0;
          const c = pct >= 75 ? "badge--ok" : pct >= 50 ? "badge--warn" : "badge--danger";

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${escape(st.name)}</td>
            <td>${escape(st.class)}</td>
            <td>${escape(a.subject)}</td>
            <td>${a.given}</td>
            <td>${a.present}</td>
            <td>${a.absences}</td>
            <td><span class="badge ${c}">${fmt(pct)}%</span></td>
          `;
          tbody.appendChild(tr);
        });
      };

      [selStudent, selClass, selSubject].forEach((el) => el.addEventListener("change", render));
      $("#attClear").addEventListener("click", () => {
        selStudent.value = ""; selClass.value = ""; selSubject.value = "";
        render();
      });
      render();
    },
  };

  /* --------------------------- OCORRÊNCIAS --------------------------- */
  const ocorrenciasHandlers = {
    init() {
      const list = $("#occList");
      const empty = $("#occEmpty");
      const selStudent = $("#occStudent");
      const selLevel   = $("#occLevel");
      const search     = $("#occSearch");

      const render = () => {
        const sid = selStudent.value, lvl = selLevel.value, q = search.value.trim().toLowerCase();
        const d = Coord.getData();

        const rows = d.occurrences.filter((o) => {
          if (sid && o.studentId !== sid) return false;
          if (lvl && o.level !== lvl) return false;
          if (!q) return true;
          const st = Coord.findStudent(o.studentId);
          return (
            o.title.toLowerCase().includes(q) ||
            o.desc.toLowerCase().includes(q) ||
            (st?.name || "").toLowerCase().includes(q)
          );
        });

        list.innerHTML = "";
        empty.hidden = rows.length > 0;

        rows.forEach((o) => {
          const st = Coord.findStudent(o.studentId);
          const cls = o.level === "warn" ? "is-warn" : o.level === "danger" ? "is-danger" : "is-ok";
          const li = document.createElement("li");
          li.className = cls;
          li.innerHTML = `
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
              <strong>${escape(o.title)}</strong>
              <span class="badge badge--${o.level}">${escape(o.tag)}</span>
            </div>
            <div style="color:var(--ink-500);font-size:.76rem;margin-top:4px">
              ${escape(st?.name || "—")} — ${escape(st?.class || "—")} <em>(${o.date})</em>
            </div>
            <div style="color:var(--ink-700);font-size:.82rem;margin-top:6px">${escape(o.desc)}</div>
          `;
          list.appendChild(li);
        });
      };

      [selStudent, selLevel, search].forEach((el) => el.addEventListener("input", render));
      $("#occClear").addEventListener("click", () => {
        selStudent.value = ""; selLevel.value = ""; search.value = "";
        render();
      });
      render();
    },
  };

  /* -------------------------- ACOMPANHAMENTO -------------------------- */
  const acompanhamentoHandlers = {
    init() {
      const d = Coord.getData();

      const lowAtt = d.students
        .map((s) => ({
          student: s,
          total: Coord.studentAbsences(s.id),
          att: Coord.studentAttendance(s.id),
        }))
        .filter((x) => x.att < 75)
        .sort((a, b) => a.att - b.att);

      const tAtt = $("#lowAttTable");
      $("#lowAttEmpty").hidden = lowAtt.length > 0;

      lowAtt.forEach(({ student, total, att }) => {
        const c = att < 50 ? "badge--danger" : "badge--warn";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escape(student.name)}</td>
          <td>${escape(student.class)}</td>
          <td>${total}</td>
          <td><span class="badge ${c}">${fmt(att)}%</span></td>
          <td><a class="btn btn--ghost btn--sm" href="#alunos">Ver aluno</a></td>
        `;
        tAtt.appendChild(tr);
      });

      const lowGrade = d.students
        .map((s) => ({
          student: s,
          avg: Coord.studentAverage(s.id),
          risk: Coord.riskSubjects(s.id),
        }))
        .filter((x) => x.avg < 6)
        .sort((a, b) => a.avg - b.avg);

      const tGrade = $("#lowGradeTable");
      $("#lowGradeEmpty").hidden = lowGrade.length > 0;

      lowGrade.forEach(({ student, avg: a, risk }) => {
        const c = a < 5 ? "badge--danger" : "badge--warn";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escape(student.name)}</td>
          <td>${escape(student.class)}</td>
          <td><span class="badge ${c}">${fmt(a)}</span></td>
          <td>${risk.length ? risk.map(escape).join(", ") : "—"}</td>
          <td><a class="btn btn--ghost btn--sm" href="#notas">Ver notas</a></td>
        `;
        tGrade.appendChild(tr);
      });
    },
  };

  /* --------------------------- COMUNICADOS --------------------------- */
  const comunicadosHandlers = {
    init() {
      const list = $("#annList");
      const empty = $("#annEmpty");

      const render = () => {
        const items = Coord.getAnnouncements();
        list.innerHTML = "";
        empty.hidden = items.length > 0;

        items.slice().reverse().forEach((a) => {
          const li = document.createElement("li");
          li.className = a.level === "warn" ? "is-warn" : a.level === "danger" ? "is-danger" : "is-ok";
          li.innerHTML = `
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
              <strong>${escape(a.title)}</strong>
              <span class="badge badge--${a.level}">${escape(a.tag || "Info")}</span>
            </div>
            <div style="color:var(--ink-500);font-size:.74rem;margin-top:4px">
              ${a.date} · Público: ${a.target || "todos"}
            </div>
            <div style="color:var(--ink-700);font-size:.82rem;margin-top:6px">${escape(a.desc)}</div>
            <div style="margin-top:10px;display:flex;gap:8px">
              <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${a.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-action="delete" data-id="${a.id}">Excluir</button>
            </div>
          `;
          list.appendChild(li);
        });
      };

      $('[data-action="new-ann"]').addEventListener("click", () => this.openForm());
      list.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const { action, id } = btn.dataset;
        if (action === "edit") {
          const a = Coord.getAnnouncements().find((x) => x.id === id);
          this.openForm(a);
        }
        if (action === "delete") {
          if (!confirm("Excluir este comunicado?")) return;
          Coord.removeAnnouncement(id);
          Coord.toast("Comunicado excluído.", "warn");
          render();
        }
      });

      render();
    },

    openForm(ann = null) {
      const isEdit = Boolean(ann);
      openModal({
        title: isEdit ? "Editar comunicado" : "Novo comunicado",
        bodyHTML: `
          <form id="annForm" class="form-grid" novalidate>
            <input type="hidden" id="aId" value="${ann?.id ?? ""}" />
            <div class="field-group" style="grid-column:1/-1">
              <label for="aTitle">Título</label>
              <input type="text" id="aTitle" value="${escape(ann?.title ?? "")}" required />
              <p class="field-message" id="msgATitle"></p>
            </div>
            <div class="field-group" style="grid-column:1/-1">
              <label for="aDesc">Descrição</label>
              <textarea id="aDesc" required>${escape(ann?.desc ?? "")}</textarea>
              <p class="field-message" id="msgADesc"></p>
            </div>
            <div class="field-group">
              <label for="aTag">Categoria</label>
              <input type="text" id="aTag" value="${escape(ann?.tag ?? "")}" placeholder="Ex.: Importante" />
            </div>
            <div class="field-group">
              <label for="aLevel">Nível</label>
              <select id="aLevel">
                <option value="info"   ${ann?.level === "info"   ? "selected" : ""}>Informativo</option>
                <option value="warn"   ${ann?.level === "warn"   ? "selected" : ""}>Atenção</option>
                <option value="danger" ${ann?.level === "danger" ? "selected" : ""}>Urgente</option>
              </select>
            </div>
            <div class="field-group">
              <label for="aTarget">Público</label>
              <select id="aTarget">
                <option value="todos"        ${ann?.target === "todos"        ? "selected" : ""}>Todos</option>
                <option value="alunos"       ${ann?.target === "alunos"       ? "selected" : ""}>Alunos</option>
                <option value="responsaveis" ${ann?.target === "responsaveis" ? "selected" : ""}>Responsáveis</option>
                <option value="professores"  ${ann?.target === "professores"  ? "selected" : ""}>Professores</option>
              </select>
            </div>
          </form>
        `,
        footerHTML: `
          <button class="btn btn--ghost" type="button" id="aCancel">Cancelar</button>
          <button class="btn btn--primary" type="submit" form="annForm">Publicar</button>
        `,
      });

      $("#aCancel").addEventListener("click", closeModal);

      $("#annForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const msgT = $("#msgATitle"), msgD = $("#msgADesc");
        msgT.textContent = ""; msgD.textContent = "";

        const title = $("#aTitle").value.trim();
        const desc  = $("#aDesc").value.trim();
        let ok = true;
        if (title.length < 3) { msgT.textContent = "Título muito curto."; ok = false; }
        if (desc.length < 5)  { msgD.textContent = "Descrição muito curta."; ok = false; }
        if (!ok) return;

        const today = new Date();
        const dateBR = `${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}`;

        Coord.saveAnnouncement({
          id: $("#aId").value || `a-${Date.now()}`,
          date: dateBR,
          title, desc,
          tag: $("#aTag").value.trim() || "Info",
          level: $("#aLevel").value,
          target: $("#aTarget").value,
        });
        Coord.toast("Comunicado publicado!");
        closeModal();
        comunicadosHandlers.init();
      });
    },
  };

  /* ========================================================================
     8. HELPERS DE DATA
     ======================================================================== */
  function toISO(br) {
    if (!br) return "";
    const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  }
  function fromISO(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  /* ========================================================================
     9. ROTEADOR
     ======================================================================== */
  const ROUTES = {
    dashboard:      { view: VIEWS.dashboard,      handlers: null },
    alunos:         { view: VIEWS.alunos,         handlers: alunosHandlers },
    turmas:         { view: VIEWS.turmas,         handlers: turmasHandlers },
    professores:    { view: VIEWS.professores,    handlers: professoresHandlers },
    notas:          { view: VIEWS.notas,          handlers: notasHandlers },
    frequencia:     { view: VIEWS.frequencia,     handlers: frequenciaHandlers },
    ocorrencias:    { view: VIEWS.ocorrencias,    handlers: ocorrenciasHandlers },
    acompanhamento: { view: VIEWS.acompanhamento, handlers: acompanhamentoHandlers },
    comunicados:    { view: VIEWS.comunicados,    handlers: comunicadosHandlers },
  };

  const DEFAULT_ROUTE = "dashboard";

  function currentRoute() {
    const hash = window.location.hash.replace(/^#/, "").trim();
    return ROUTES[hash] ? hash : DEFAULT_ROUTE;
  }

  function render() {
    const route = currentRoute();
    const content = $("#coordContent");

    content.innerHTML = ROUTES[route].view();
    renderSidebar(route);

    ROUTES[route].handlers?.init();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ========================================================================
     10. INICIALIZAÇÃO
     ======================================================================== */
  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
})();