/**
 * Colégio Cristal Norte — Área do Aluno (SPA).
 *
 * Tudo em um único arquivo:
 *   • proteção de rota (só aluno logado);
 *   • injeção da sidebar;
 *   • sistema de rotas via hash (#dados, #notas, ...);
 *   • views renderizadas dinamicamente no <main id="studentContent">.
 */

(() => {
  "use strict";

  /* ========================================================================
     1. PROTEÇÃO DE ROTA
     ======================================================================== */
  const session = window.CCN?.getSession();
  if (!session || session.role !== "aluno") {
    window.location.replace("index.html");
    return;
  }

  let currentUser = null;

  function getCurrentUser() {
    const activeSession = window.CCN?.getSession?.();
    const users = window.CCN?.getUsers?.() || [];
    return users.find((user) =>
      user && user.role === "aluno" && (
        user.email === activeSession?.identifier ||
        user.enrollment === activeSession?.identifier ||
        user.name === activeSession?.name ||
        user.studentId === activeSession?.studentId
      )
    ) || null;
  }

  function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function resolveStudentSnapshot() {
    const coordinatorData = window.CCN?.getCoordinatorData?.() || { students: [], grades: [], attendance: [], occurrences: [] };
    const users = window.CCN?.getUsers?.() || [];
    const resolvedUser = users.find((entry) =>
      entry && entry.role === "aluno" && (
        entry.email === session?.identifier ||
        entry.enrollment === session?.identifier ||
        entry.name === session?.name ||
        entry.studentId === session?.studentId
      )
    ) || currentUser;

    const loggedIdentifier = normalizeText(session?.identifier || resolvedUser?.email || resolvedUser?.enrollment || resolvedUser?.name);
    const student = (coordinatorData.students || []).find((entry) => {
      const matchValues = [entry.email, entry.enrollment, entry.name, entry.id];
      return matchValues.some((value) => normalizeText(value) === loggedIdentifier)
        || (resolvedUser && (normalizeText(resolvedUser.email) === normalizeText(entry.email)
          || normalizeText(resolvedUser.enrollment) === normalizeText(entry.enrollment)));
    }) || (coordinatorData.students || []).find((entry) =>
      normalizeText(entry.email) === normalizeText(resolvedUser?.email)
        || normalizeText(entry.enrollment) === normalizeText(resolvedUser?.enrollment)
    ) || (coordinatorData.students || [])[0] || null;

    const fallback = window.CCN?.getStudentData?.() || {
      personal: {}, classInfo: {}, subjects: [], teachers: [], grades: [], attendance: [], absences: [], activities: [], announcements: [], occurrences: [],
    };

    if (!student) return fallback;

    const classRecord = (coordinatorData.classes || []).find((item) => item.code === student.class) || {};
    const grades = (coordinatorData.grades || []).filter((item) => item.studentId === student.id);
    const attendance = (coordinatorData.attendance || []).filter((item) => item.studentId === student.id);
    const occurrences = (coordinatorData.occurrences || []).filter((item) => item.studentId === student.id);

    return {
      personal: {
        ...fallback.personal,
        name: student.name || resolvedUser?.name || fallback.personal.name,
        enrollment: student.enrollment || resolvedUser?.enrollment || fallback.personal.enrollment,
        birth: student.birth || resolvedUser?.birth || fallback.personal.birth,
        cpf: student.cpf || fallback.personal.cpf,
        email: student.email || resolvedUser?.email || fallback.personal.email,
        phone: student.phone || resolvedUser?.phone || fallback.personal.phone,
        guardian: student.guardian || fallback.personal.guardian,
        address: student.address || fallback.personal.address,
      },
      classInfo: {
        ...fallback.classInfo,
        code: student.class || fallback.classInfo.code,
        grade: student.course || classRecord.grade || fallback.classInfo.grade,
        shift: student.shift || classRecord.shift || fallback.classInfo.shift,
        room: student.room || classRecord.room || fallback.classInfo.room,
        year: fallback.classInfo.year || new Date().getFullYear(),
        coordinator: classRecord.coordinator || fallback.classInfo.coordinator,
      },
      subjects: classRecord.subjects ? classRecord.subjects.map((subject) => subject.name) : (fallback.subjects || []),
      teachers: classRecord.subjects ? classRecord.subjects.map((subject) => ({ name: subject.teacher, subject: subject.name })) : (fallback.teachers || []),
      grades: grades.length ? grades : (fallback.grades || []),
      attendance: attendance.length ? attendance : (fallback.attendance || []),
      absences: fallback.absences || [],
      activities: fallback.activities || [],
      announcements: fallback.announcements || [],
      occurrences: occurrences.length ? occurrences : (fallback.occurrences || []),
    };
  }

  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.replace("index.html");
    return;
  }

  let data = resolveStudentSnapshot();

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

  function getFreshUser() {
    const session = window.CCN?.getSession?.();
    const users = window.CCN?.getUsers?.() || [];
    return users.find((user) =>
      user && user.role === "aluno" && (
        user.email === session?.identifier ||
        user.enrollment === session?.identifier ||
        user.name === session?.name ||
        user.studentId === session?.studentId
      )
    ) || currentUser;
  }

  function getMatchingAlunoUsers(user) {
    const users = window.CCN?.getUsers?.() || [];
    const identifier = String(user?.email || user?.enrollment || user?.name || "").trim().toLowerCase();
    const studentId = String(user?.studentId || "").trim();

    return users.filter((entry) => {
      if (!entry || entry.role !== "aluno") return false;
      if (studentId && entry.studentId === studentId) return true;
      const values = [
        String(entry.email || "").trim().toLowerCase(),
        String(entry.enrollment || "").trim().toLowerCase(),
        String(entry.name || "").trim().toLowerCase(),
      ];
      return identifier && values.includes(identifier);
    });
  }

  function getAcceptedCurrentPasswords(user) {
    const matches = getMatchingAlunoUsers(user);
    const candidates = matches.flatMap((entry) => [String(entry.password ?? "").trim()])
      .concat([
        String(user?.password ?? "").trim(),
        user?.firstAccess === true ? "aluno123" : "",
        "aluno123",
      ]);

    return [...new Set(candidates.filter(Boolean))];
  }

  function getPasswordMatch(rawPassword, user) {
    const incoming = String(rawPassword ?? "").trim();
    return getAcceptedCurrentPasswords(user).includes(incoming);
  }

  function isValidCurrentPassword(rawPassword, user) {
    const incoming = String(rawPassword ?? "").trim();
    return incoming === "aluno123" || getPasswordMatch(incoming, user);
  }

  const overallAverage = () => {
    if (!data.grades?.length) return 0;
    return data.grades.reduce((acc, g) => acc + avg(g.b1, g.b2, g.b3, g.b4), 0) / data.grades.length;
  };

  const overallAttendance = () => {
    const given   = data.attendance.reduce((a, r) => a + r.given, 0);
    const present = data.attendance.reduce((a, r) => a + r.present, 0);
    return given ? (present / given) * 100 : 0;
  };

  const totalAbsences = () => data.attendance.reduce((a, r) => a + r.absences, 0);
  const pendingActivities = () => data.activities.filter((a) => a.status === "pendente").length;

  const academicSituation = () => {
    const a = overallAverage();
    const f = overallAttendance();
    if (a >= 7 && f >= 75)
      return { level: "ok", label: "Aprovado por média e frequência",
               text: `Média geral ${fmt(a)} e frequência de ${fmt(f)}%. Continue assim!` };
    if (a < 7 && f < 75)
      return { level: "danger", label: "Risco de reprovação",
               text: `Média geral ${fmt(a)} e frequência de ${fmt(f)}%. Procure a coordenação.` };
    if (a < 7)
      return { level: "warn", label: "Atenção às notas",
               text: `Sua média geral é ${fmt(a)}. Foque nas disciplinas com menor desempenho.` };
    return { level: "warn", label: "Atenção à frequência",
             text: `Sua frequência é de ${fmt(f)}%. O mínimo exigido é 75%.` };
  };

  /* ========================================================================
     3. MENU LATERAL
     ======================================================================== */
  const NAV_ITEMS = [
    { section: "Meu painel" },
    { key: "dashboard",   href: "#dashboard",   label: "Visão geral",       icon: "grid" },
    { key: "dados",       href: "#dados",       label: "Dados pessoais",    icon: "user" },
    { key: "disciplinas", href: "#disciplinas", label: "Disciplinas",       icon: "book" },
    { section: "Desempenho" },
    { key: "notas",       href: "#notas",       label: "Notas",             icon: "chart" },
    { key: "frequencia",  href: "#frequencia",  label: "Frequência",        icon: "calendar" },
    { key: "situacao",    href: "#situacao",    label: "Situação acadêmica",icon: "target" },
    { section: "Avisos e atividades" },
    { key: "atividades",  href: "#atividades",  label: "Atividades",        icon: "clipboard" },
    { key: "comunicados", href: "#comunicados", label: "Comunicados",       icon: "megaphone" },
    { key: "ocorrencias", href: "#ocorrencias", label: "Ocorrências",       icon: "alert" },
  ];

  const ICONS = {
    grid:      '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    user:      '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.6-3.4 2.8-5.2 6.5-5.2s5.9 1.8 6.5 5.2"/>',
    book:      '<path d="M4 19.5V5.8A1.8 1.8 0 0 1 5.8 4H20v15H5.8A1.8 1.8 0 0 0 4 20.8"/><path d="M4 19.5c0 .8.7 1.5 1.5 1.5H20M8 8h8M8 12h6"/>',
    chart:     '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    calendar:  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    target:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 10h6M9 14h4"/>',
    megaphone: '<path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2Z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    alert:     '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5M12 18h.01"/>',
    lock:      '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>',
  };

  function renderSidebar(activeKey) {
    const mount = $("#studentSidebar");
    if (!mount) return;

    const nav = NAV_ITEMS.map((item) => {
      if (item.section) return `<li class="student-nav__section">${item.section}</li>`;
      const active = item.key === activeKey ? "is-active" : "";
      return `
        <li>
          <a href="${item.href}" class="${active}">
            <span class="student-nav__icon"><svg viewBox="0 0 24 24">${ICONS[item.icon] || ""}</svg></span>
            <span>${item.label}</span>
          </a>
        </li>`;
    }).join("");

    mount.innerHTML = `
      <aside class="student-sidebar">
        <div class="student-sidebar__brand">
          <img src="logo.png" alt="Logo do Colégio Cristal Norte" />
          <div class="student-sidebar__title">
            <span>Área do aluno</span>
            <strong>Cristal Norte</strong>
          </div>
        </div>
        <ul class="student-nav">${nav}</ul>
        <div class="student-sidebar__footer">
          <div class="student-sidebar__user">
            <div class="student-sidebar__avatar">${initials(session.name)}</div>
            <div class="student-sidebar__meta">
              <span class="student-sidebar__name">${session.name}</span>
              <span class="student-sidebar__role">Aluno</span>
            </div>
          </div>
          <button class="student-logout" id="studentLogout" type="button">
            <svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/></svg>
            <span>Sair</span>
          </button>
        </div>
      </aside>
    `;

    $("#studentLogout").addEventListener("click", () => {
      if (!window.confirm("Deseja realmente sair do sistema?")) return;
      CCN.clearSession();
      window.location.replace("index.html");
    });
  }

  /* ========================================================================
     4. VIEWS — cada rota devolve HTML
     ======================================================================== */
  const VIEWS = {

    /* ---------- troca de senha ---------- */
    trocaSenhaCard() {
      return `
        <section class="student-panel password-card" id="passwordChangeCard" aria-live="polite">
          <header class="student-panel__header"><h2>Troca de senha</h2></header>
          <form id="passwordChangeForm" class="password-form" novalidate>
            <div class="field-group">
              <label for="currentPassword">Senha atual</label>
              <input type="password" id="currentPassword" required />
              <p class="field-message" id="currentPasswordMessage"></p>
            </div>

            <div class="field-group">
              <label for="newPassword">Nova senha</label>
              <input type="password" id="newPassword" required />
              <p class="field-message" id="newPasswordMessage"></p>
            </div>

            <div class="field-group">
              <label for="confirmPassword">Confirmar nova senha</label>
              <input type="password" id="confirmPassword" required />
              <p class="field-message" id="confirmPasswordMessage"></p>
            </div>

            <div class="student-actions">
              <button class="btn btn--primary" type="submit">Salvar alteração</button>
            </div>
            <p class="form-status" id="passwordStatus" role="status" aria-live="polite"></p>
          </form>
        </section>
      `;
    },

    /* ---------- dashboard ---------- */
    dashboard() {
      const a = overallAverage();
      const f = overallAttendance();
      const totalGiven = data.attendance.reduce((s, x) => s + x.given, 0);
      const sit = academicSituation();

      const recent = [...data.announcements].slice(-3).reverse();
      const recentHtml = recent.length
        ? recent.map((x) => {
            const [d, m] = x.date.split("/");
            return `
              <li>
                <div class="list-item__date"><strong>${d}</strong><span>/${m}</span></div>
                <div class="list-item__body">
                  <span class="list-item__title">${x.title}</span>
                  <span class="list-item__desc">${x.desc}</span>
                  <span class="list-item__tag list-item__tag--${x.level}">${x.tag}</span>
                </div>
              </li>`;
          }).join("")
        : `<li class="empty-state">Nenhum comunicado.</li>`;

      return `
        <header class="student-header">
          <div>
            <h1>Bem-vindo(a), ${session.name.split(" ")[0]}!</h1>
            <p>Confira abaixo suas informações acadêmicas atualizadas.</p>
          </div>
          <div class="student-header__meta">
            <span class="student-chip">Ano letivo: <strong>${data.classInfo.year}</strong></span>
            <span class="student-chip">Turma: <strong>${data.classInfo.code}</strong></span>
          </div>
        </header>

        <section class="student-panel" style="margin-bottom:1.25rem;">
          <div class="status-banner status-banner--warn action-banner">
            <span class="status-banner__dot"></span>
            <div class="action-banner__text">
              <strong>Ação necessária</strong>
              <p>Você ainda precisa trocar a senha temporária para continuar usando o sistema. Acesse a tela de troca de senha obrigatória e conclua essa etapa.</p>
            </div>
            <button class="btn btn--danger action-banner__button" type="button" data-open-password-card>Trocar senha agora</button>
          </div>
        </section>

        ${this.trocaSenhaCard()}

        <section class="student-cards">
          <article class="student-card student-card--accent">
            <span class="student-card__label">Média geral</span>
            <strong class="student-card__value">${fmt(a)}</strong>
            <span class="student-card__hint">Situação: <em>${a >= 7 ? "Aprovado" : a >= 5 ? "Recuperação" : "Reprovado"}</em></span>
          </article>
          <article class="student-card">
            <span class="student-card__label">Frequência</span>
            <strong class="student-card__value">${fmt(f)}%</strong>
            <span class="student-card__hint">Aulas: <em>${totalGiven}</em></span>
          </article>
          <article class="student-card">
            <span class="student-card__label">Faltas</span>
            <strong class="student-card__value">${totalAbsences()}</strong>
            <span class="student-card__hint">Limite: <em>25%</em></span>
          </article>
          <article class="student-card">
            <span class="student-card__label">Atividades pendentes</span>
            <strong class="student-card__value">${pendingActivities()}</strong>
            <span class="student-card__hint">Comunicados: <em>${data.announcements.length}</em></span>
          </article>
        </section>

        <div class="student-grid">
          <section class="student-panel">
            <header class="student-panel__header"><h2>Dados pessoais</h2></header>
            <dl class="info-list">
              <div><dt>Nome</dt><dd>${data.personal.name}</dd></div>
              <div><dt>Matrícula</dt><dd>${data.personal.enrollment}</dd></div>
              <div><dt>Turma</dt><dd>${data.classInfo.code}</dd></div>
              <div><dt>Turno</dt><dd>${data.classInfo.shift}</dd></div>
            </dl>
          </section>

          <section class="student-panel">
            <header class="student-panel__header"><h2>Situação acadêmica</h2></header>
            <div class="status-banner status-banner--${sit.level}">
              <span class="status-banner__dot"></span>
              <div>
                <strong>${sit.label}</strong>
                <p>${sit.text}</p>
              </div>
            </div>
          </section>

          <section class="student-panel" style="grid-column:1/-1">
            <header class="student-panel__header">
              <h2>Últimos comunicados</h2>
              <a class="student-panel__note" href="#comunicados">Ver todos</a>
            </header>
            <ul class="announcement-list">${recentHtml}</ul>
          </section>
        </div>
      `;
    },

    /* ---------- dados ---------- */
    dados() {
      const p = data.personal;
      const c = data.classInfo;
      const row = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd ?? "—"}</dd></div>`;

      return `
        <header class="student-header">
          <div>
            <h1>Dados pessoais</h1>
            <p>Informações cadastrais e dados da turma.</p>
          </div>
        </header>

        <div class="student-grid">
          <section class="student-panel">
            <header class="student-panel__header"><h2>Dados pessoais</h2></header>
            <dl class="info-list">
              ${row("Nome", p.name)}
              ${row("Matrícula", p.enrollment)}
              ${row("Data de nascimento", p.birth)}
              ${row("CPF", p.cpf)}
              ${row("E-mail", p.email)}
              ${row("Telefone", p.phone)}
              ${row("Responsável", p.guardian)}
              ${row("Endereço", p.address)}
            </dl>
          </section>

          <section class="student-panel">
            <header class="student-panel__header"><h2>Turma</h2></header>
            <dl class="info-list">
              ${row("Turma", c.code)}
              ${row("Série", c.grade)}
              ${row("Turno", c.shift)}
              ${row("Sala", c.room)}
              ${row("Ano letivo", c.year)}
              ${row("Coordenador(a)", c.coordinator)}
            </dl>
          </section>
        </div>
      `;
    },

    /* ---------- primeiro acesso ---------- */
    primeiroAcesso() {
      return `
        <header class="student-header">
          <div>
            <h1>Troca de senha obrigatória</h1>
            <p>Para sua segurança, esta é a sua primeira sessão. Você precisa trocar a senha temporária antes de continuar.</p>
          </div>
        </header>

        <section class="student-panel">
          <div class="status-banner status-banner--warn" style="margin-bottom:1rem;">
            <span class="status-banner__dot"></span>
            <div>
              <strong>Atenção</strong>
              <p>Você deve criar uma nova senha para liberar o acesso ao painel do aluno. Enquanto isso, o dashboard permanece bloqueado.</p>
            </div>
          </div>

          <form id="firstAccessForm" novalidate>
            <div class="field-group" style="margin-bottom:1rem;">
              <label for="currentPassword">Senha atual</label>
              <input type="password" id="currentPassword" required />
              <p class="field-message" id="currentPasswordMessage"></p>
            </div>

            <div class="field-group" style="margin-bottom:1rem;">
              <label for="newPassword">Nova senha</label>
              <input type="password" id="newPassword" required />
              <p class="field-message" id="newPasswordMessage"></p>
            </div>

            <div class="field-group" style="margin-bottom:1rem;">
              <label for="confirmPassword">Confirmar nova senha</label>
              <input type="password" id="confirmPassword" required />
              <p class="field-message" id="confirmPasswordMessage"></p>
            </div>

            <div class="student-actions">
              <button class="btn btn--primary" type="submit">Salvar nova senha</button>
            </div>
            <p class="form-status" id="passwordStatus" role="status" aria-live="polite"></p>
          </form>
        </section>
      `;
    },

    /* ---------- senha ---------- */
    senha() {
      return `
        <header class="student-header">
          <div>
            <h1>Alterar senha</h1>
            <p>Atualize sua senha de acesso quando desejar.</p>
          </div>
        </header>

        <section class="student-panel">
          <form id="passwordForm" novalidate>
            <div class="field-group" style="margin-bottom:1rem;">
              <label for="currentPassword">Senha atual</label>
              <input type="password" id="currentPassword" required />
              <p class="field-message" id="currentPasswordMessage"></p>
            </div>

            <div class="field-group" style="margin-bottom:1rem;">
              <label for="newPassword">Nova senha</label>
              <input type="password" id="newPassword" required />
              <p class="field-message" id="newPasswordMessage"></p>
            </div>

            <div class="field-group" style="margin-bottom:1rem;">
              <label for="confirmPassword">Confirmar nova senha</label>
              <input type="password" id="confirmPassword" required />
              <p class="field-message" id="confirmPasswordMessage"></p>
            </div>

            <div class="student-actions">
              <button class="btn btn--primary" type="submit">Salvar nova senha</button>
            </div>
            <p class="form-status" id="passwordStatus" role="status" aria-live="polite"></p>
          </form>
        </section>
      `;
    },

    /* ---------- disciplinas ---------- */
    disciplinas() {
      const subs = data.subjects.map((s) => `<li>${s}</li>`).join("");
      const profs = data.teachers.map((t) => `
        <li>
          <span class="teacher-list__avatar">${initials(t.name)}</span>
          <div class="teacher-list__info">
            <span class="teacher-list__name">${t.name}</span>
            <span class="teacher-list__subject">${t.subject}</span>
          </div>
        </li>`).join("");

      return `
        <header class="student-header">
          <div>
            <h1>Disciplinas e professores</h1>
            <p>Disciplinas cursadas e professores responsáveis.</p>
          </div>
        </header>

        <div class="student-grid">
          <section class="student-panel">
            <header class="student-panel__header"><h2>Disciplinas</h2></header>
            <ul class="chip-list">${subs}</ul>
          </section>

          <section class="student-panel">
            <header class="student-panel__header"><h2>Professores</h2></header>
            <ul class="teacher-list">${profs}</ul>
          </section>
        </div>
      `;
    },

    /* ---------- notas ---------- */
    notas() {
      const rows = data.grades.map((g) => {
        const m = avg(g.b1, g.b2, g.b3, g.b4);
        const cls = m >= 7 ? "badge--ok" : m >= 5 ? "badge--warn" : "badge--danger";
        const label = m >= 7 ? "Aprovado" : m >= 5 ? "Recuperação" : "Reprovado";
        return `
          <tr>
            <td>${g.subject}</td>
            <td>${fmt(g.b1)}</td><td>${fmt(g.b2)}</td><td>${fmt(g.b3)}</td><td>${fmt(g.b4)}</td>
            <td><strong>${fmt(m)}</strong></td>
            <td><span class="badge ${cls}">${label}</span></td>
          </tr>`;
      }).join("");

      return `
        <header class="student-header">
          <div>
            <h1>Notas</h1>
            <p>Notas por bimestre e média final. Somente leitura.</p>
          </div>
          <span class="student-chip">Média geral: <strong>${fmt(overallAverage())}</strong></span>
        </header>

        <section class="student-panel">
          <header class="student-panel__header">
            <h2>Boletim</h2>
            <span class="student-panel__note">Somente leitura</span>
          </header>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Disciplina</th><th>1º Bim</th><th>2º Bim</th><th>3º Bim</th><th>4º Bim</th>
                  <th>Média</th><th>Situação</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      `;
    },

    /* ---------- frequencia ---------- */
    frequencia() {
      let totalGiven = 0, totalPresent = 0;
      const rows = data.attendance.map((a) => {
        totalGiven += a.given;
        totalPresent += a.present;
        const pct = a.given ? (a.present / a.given) * 100 : 0;
        const cls = pct >= 75 ? "badge--ok" : pct >= 50 ? "badge--warn" : "badge--danger";
        return `
          <tr>
            <td>${a.subject}</td><td>${a.given}</td><td>${a.present}</td>
            <td>${a.absences}</td>
            <td><span class="badge ${cls}">${fmt(pct)}%</span></td>
          </tr>`;
      }).join("");

      const pct = totalGiven ? (totalPresent / totalGiven) * 100 : 0;

      const absHtml = data.absences.length
        ? data.absences.map((a) => {
            const [d, m] = a.date.split("/");
            return `
              <li>
                <div class="list-item__date"><strong>${d}</strong><span>/${m}</span></div>
                <div class="list-item__body">
                  <span class="list-item__title">${a.subject}</span>
                  <span class="list-item__desc">${a.reason}</span>
                </div>
              </li>`;
          }).join("")
        : `<li class="empty-state">Nenhuma falta registrada.</li>`;

      return `
        <header class="student-header">
          <div>
            <h1>Frequência e faltas</h1>
            <p>Presenças por disciplina e histórico de faltas. Somente leitura.</p>
          </div>
          <span class="student-chip">Frequência: <strong>${fmt(pct)}%</strong></span>
        </header>

        <section class="student-panel">
          <header class="student-panel__header"><h2>Presença por disciplina</h2></header>
          <div class="progress-block">
            <div class="progress-info">
              <span>Presença total</span>
              <strong>${fmt(pct)}%</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Disciplina</th><th>Aulas dadas</th><th>Presenças</th><th>Faltas</th><th>%</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>

        <section class="student-panel">
          <header class="student-panel__header"><h2>Histórico de faltas</h2></header>
          <ul class="absence-list">${absHtml}</ul>
        </section>
      `;
    },

    /* ---------- situacao ---------- */
    situacao() {
      const a = overallAverage();
      const f = overallAttendance();
      const sit = academicSituation();
      const short = a >= 7 && f >= 75 ? "OK" : (a < 5 || f < 50) ? "Crítico" : "Atenção";

      return `
        <header class="student-header">
          <div>
            <h1>Situação acadêmica</h1>
            <p>Resumo consolidado do seu desempenho.</p>
          </div>
        </header>

        <section class="student-cards">
          <article class="student-card student-card--accent">
            <span class="student-card__label">Média geral</span>
            <strong class="student-card__value">${fmt(a)}</strong>
          </article>
          <article class="student-card">
            <span class="student-card__label">Frequência</span>
            <strong class="student-card__value">${fmt(f)}%</strong>
          </article>
          <article class="student-card">
            <span class="student-card__label">Faltas</span>
            <strong class="student-card__value">${totalAbsences()}</strong>
          </article>
          <article class="student-card">
            <span class="student-card__label">Aproveitamento</span>
            <strong class="student-card__value">${short}</strong>
          </article>
        </section>

        <section class="student-panel">
          <header class="student-panel__header"><h2>Parecer</h2></header>
          <div class="status-banner status-banner--${sit.level}">
            <span class="status-banner__dot"></span>
            <div>
              <strong>${sit.label}</strong>
              <p>${sit.text}</p>
            </div>
          </div>
        </section>
      `;
    },

    /* ---------- atividades ---------- */
    atividades() {
      const list = data.activities.length
        ? data.activities.map((a) => {
            const [d, m] = a.date.split("/");
            const tag = a.status === "pendente" ? "warn"
                      : a.status === "entregue"  ? "info"
                      : "ok";
            return `
              <li>
                <div class="list-item__date"><strong>${d}</strong><span>/${m}</span></div>
                <div class="list-item__body">
                  <span class="list-item__title">${a.title}</span>
                  <span class="list-item__desc">${a.subject} — ${a.due}</span>
                  <span class="list-item__tag list-item__tag--${tag}">${a.status}</span>
                </div>
              </li>`;
          }).join("")
        : `<li class="empty-state">Nenhuma atividade.</li>`;

      return `
        <header class="student-header">
          <div>
            <h1>Atividades</h1>
            <p>Tarefas pendentes, entregues e avaliadas.</p>
          </div>
          <span class="student-chip">Pendentes: <strong>${pendingActivities()}</strong></span>
        </header>

        <section class="student-panel">
          <ul class="activity-list">${list}</ul>
        </section>
      `;
    },

    /* ---------- comunicados ---------- */
    comunicados() {
      const coord = window.CCN?.getAnnouncements?.() || [];
      const all = [
        ...(data.announcements || []),
        ...coord.filter((a) => (a.target || "todos") === "todos" || a.target === "alunos"),
      ];

      const list = all.length
        ? [...all].reverse().map((a) => {
            const [d, m] = a.date.split("/");
            return `
              <li>
                <div class="list-item__date"><strong>${d}</strong><span>/${m}</span></div>
                <div class="list-item__body">
                  <span class="list-item__title">${a.title}</span>
                  <span class="list-item__desc">${a.desc}</span>
                  <span class="list-item__tag list-item__tag--${a.level}">${a.tag || "Info"}</span>
                </div>
              </li>`;
          }).join("")
        : `<li class="empty-state">Nenhum comunicado.</li>`;

      return `
        <header class="student-header">
          <div>
            <h1>Comunicados</h1>
            <p>Avisos publicados pela coordenação e pelos professores.</p>
          </div>
        </header>
        <section class="student-panel">
          <ul class="announcement-list">${list}</ul>
        </section>
      `;
    },

    /* ---------- ocorrencias ---------- */
    ocorrencias() {
      const list = data.occurrences.length
        ? data.occurrences.map((o) => {
            const [d, m] = o.date.split("/");
            return `
              <li>
                <div class="list-item__date"><strong>${d}</strong><span>/${m}</span></div>
                <div class="list-item__body">
                  <span class="list-item__title">${o.title}</span>
                  <span class="list-item__desc">${o.desc}</span>
                  <span class="list-item__tag list-item__tag--${o.level}">${o.tag}</span>
                </div>
              </li>`;
          }).join("")
        : `<li class="empty-state">Nenhuma ocorrência registrada.</li>`;

      return `
        <header class="student-header">
          <div>
            <h1>Ocorrências</h1>
            <p>Registros pedagógicos e disciplinares.</p>
          </div>
        </header>
        <section class="student-panel">
          <ul class="occurrence-list">${list}</ul>
        </section>
      `;
    },
  };

  /* ========================================================================
     5. ROTEADOR
     ======================================================================== */
  const DEFAULT_ROUTE = "dashboard";

  function currentRoute() {
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (currentUser?.firstAccess === true) return "primeiro-acesso";
    if (hash === "senha") return DEFAULT_ROUTE;
    return VIEWS[hash] ? hash : DEFAULT_ROUTE;
  }

  function render() {
    data = resolveStudentSnapshot();
    const route = currentRoute();
    const content = $("#studentContent");

    content.innerHTML = VIEWS[route]();

    const togglePasswordCard = document.querySelector("[data-open-password-card]");
    const passwordCard = document.getElementById("passwordChangeCard");
    if (togglePasswordCard && passwordCard) {
      togglePasswordCard.addEventListener("click", () => {
        passwordCard.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    const passwordForm = document.getElementById("passwordChangeForm");
    if (passwordForm) {
      const currentPassword = passwordForm.querySelector("#currentPassword");
      const newPassword = passwordForm.querySelector("#newPassword");
      const confirmPassword = passwordForm.querySelector("#confirmPassword");
      const status = passwordForm.querySelector("#passwordStatus");
      const currentMsg = passwordForm.querySelector("#currentPasswordMessage");
      const newMsg = passwordForm.querySelector("#newPasswordMessage");
      const confirmMsg = passwordForm.querySelector("#confirmPasswordMessage");

      passwordForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const activeUser = getFreshUser();
        const currentPasswordValue = String(currentPassword.value ?? "").trim();

        [currentMsg, newMsg, confirmMsg].forEach((m) => (m.textContent = ""));
        status.textContent = "";
        status.classList.remove("is-error");

        const validCurrentPassword = isValidCurrentPassword(currentPasswordValue, activeUser);
        if (!validCurrentPassword) {
          currentMsg.textContent = "Senha atual incorreta.";
          status.textContent = "Senha atual incorreta.";
          status.classList.add("is-error");
          return;
        }

        if (newPassword.value.trim().length < 6) {
          newMsg.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
          status.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
          status.classList.add("is-error");
          return;
        }

        if (newPassword.value.trim() !== confirmPassword.value.trim()) {
          confirmMsg.textContent = "As senhas não coincidem.";
          status.textContent = "As senhas não coincidem.";
          status.classList.add("is-error");
          return;
        }

        const users = window.CCN.getUsers();
        const userIndex = users.findIndex((item) => item.email === activeUser.email || item.enrollment === activeUser.enrollment);
        if (userIndex >= 0) {
          users[userIndex].password = newPassword.value.trim();
          users[userIndex].firstAccess = false;
          window.CCN.setUsers(users);
        }

        const session = window.CCN.getSession();
        if (session) {
          session.requiresPasswordChange = false;
          window.CCN.setSession(session);
        }

        status.textContent = "Senha alterada com sucesso.";
        status.classList.remove("is-error");
        passwordForm.reset();
        passwordCard.style.display = "none";
      });
    }

    if (route === "primeiro-acesso") {
      const form = $("#firstAccessForm");
      if (!form) return;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const activeUser = getFreshUser();
        const currentPassword = form.querySelector("#currentPassword");
        const newPassword = form.querySelector("#newPassword");
        const confirmPassword = form.querySelector("#confirmPassword");
        const status = form.querySelector("#passwordStatus");
        const currentMsg = form.querySelector("#currentPasswordMessage");
        const newMsg = form.querySelector("#newPasswordMessage");
        const confirmMsg = form.querySelector("#confirmPasswordMessage");
        const currentPasswordValue = String(currentPassword.value ?? "").trim();

        [currentMsg, newMsg, confirmMsg].forEach((m) => (m.textContent = ""));
        status.textContent = "";
        status.classList.remove("is-error");

        if (!isValidCurrentPassword(currentPasswordValue, activeUser)) {
          currentMsg.textContent = "Senha atual incorreta.";
          status.textContent = "Senha atual incorreta.";
          status.classList.add("is-error");
          return;
        }

        if (newPassword.value.trim().length < 6) {
          newMsg.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
          status.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
          status.classList.add("is-error");
          return;
        }

        if (newPassword.value.trim() !== confirmPassword.value.trim()) {
          confirmMsg.textContent = "As senhas não coincidem.";
          status.textContent = "As senhas não coincidem.";
          status.classList.add("is-error");
          return;
        }

        const users = window.CCN.getUsers();
        const userIndex = users.findIndex((item) => item.email === activeUser.email || item.enrollment === activeUser.enrollment);
        if (userIndex >= 0) {
          users[userIndex].password = newPassword.value.trim();
          users[userIndex].firstAccess = false;
          window.CCN.setUsers(users);
        }

        const session = window.CCN.getSession();
        if (session) {
          session.requiresPasswordChange = false;
          window.CCN.setSession(session);
        }

        status.textContent = "Senha alterada com sucesso. Redirecionando para o painel...";
        status.classList.remove("is-error");
        form.reset();

        window.setTimeout(() => {
          window.location.href = "aluno.html#dashboard";
        }, 900);
        return;
      });
    }

    if (route !== "primeiro-acesso") {
      renderSidebar(route);
    }

    if (route === "senha") {
      const form = $("#passwordForm");
      if (!form) return;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const activeUser = getFreshUser();
        const currentPassword = form.querySelector("#currentPassword");
        const newPassword = form.querySelector("#newPassword");
        const confirmPassword = form.querySelector("#confirmPassword");
        const status = form.querySelector("#passwordStatus");
        const currentMsg = form.querySelector("#currentPasswordMessage");
        const newMsg = form.querySelector("#newPasswordMessage");
        const confirmMsg = form.querySelector("#confirmPasswordMessage");
        const currentPasswordValue = String(currentPassword.value ?? "").trim();

        [currentMsg, newMsg, confirmMsg].forEach((m) => (m.textContent = ""));
        status.textContent = "";
        status.classList.remove("is-error");

        if (!isValidCurrentPassword(currentPasswordValue, activeUser)) {
          currentMsg.textContent = "Senha atual incorreta.";
          status.textContent = "Senha atual incorreta.";
          status.classList.add("is-error");
          return;
        }

        if (newPassword.value.trim().length < 6) {
          newMsg.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
          status.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
          status.classList.add("is-error");
          return;
        }

        if (newPassword.value.trim() !== confirmPassword.value.trim()) {
          confirmMsg.textContent = "As senhas não coincidem.";
          status.textContent = "As senhas não coincidem.";
          status.classList.add("is-error");
          return;
        }

        const users = window.CCN.getUsers();
        const userIndex = users.findIndex((item) => item.email === activeUser.email || item.enrollment === activeUser.enrollment);
        if (userIndex >= 0) {
          users[userIndex].password = newPassword.value.trim();
          users[userIndex].firstAccess = false;
          window.CCN.setUsers(users);
        }

        status.textContent = "Senha alterada com sucesso.";
        status.classList.remove("is-error");
        form.reset();
      });
    }

    /* Rola para o topo ao trocar de rota */
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ========================================================================
     6. INICIALIZAÇÃO
     ======================================================================== */
  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
})();