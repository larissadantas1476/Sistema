/**
 * ============================================================================
 * Colégio Cristal Norte — Camada única de acesso ao localStorage
 * ============================================================================
 *
 * Chaves:
 *   • ccn:session          → quem está logado
 *   • ccn:studentData      → dados acadêmicos do aluno
 *   • ccn:guardianData     → dados do responsável
 *   • ccn:teacherData      → dados do professor
 *   • ccn:coordinatorData  → dados gerenciados pelo coordenador
 *   • ccn:users            → lista global de cadastros
 *   • ccn:announcements    → comunicados publicados pela coordenação
 *
 * Uso:
 *   <script src="storage.js" defer></script>
 *   <script src="coordenador.js" defer></script>
 *
 * API global: window.CCN
 * ============================================================================
 */

window.CCN = (() => {
  "use strict";

  /* ==========================================================================
     1. CHAVES
     ========================================================================== */
  const KEYS = {
    session:         "ccn:session",
    studentData:     "ccn:studentData",
    guardianData:    "ccn:guardianData",
    teacherData:     "ccn:teacherData",
    coordinatorData: "ccn:coordinatorData",
    users:           "ccn:users",
    announcements:   "ccn:announcements",
  };


  /* ==========================================================================
     2. DADOS PADRÃO
     ========================================================================== */

  /* -------------------- 2.1 Aluno -------------------- */
  const DEFAULT_STUDENT_DATA = {
    personal: {
      name: "Ana Beatriz Souza",
      enrollment: "2025-004512",
      birth: "12/03/2009",
      cpf: "123.456.789-00",
      email: "ana.souza@aluno.cristalnorte.edu.br",
      phone: "(11) 98888-1234",
      guardian: "Marta Souza (mãe)",
      address: "Rua das Acácias, 245 — Jardim Primavera, São Paulo/SP",
    },
    classInfo: {
      code: "9º Ano B",
      grade: "9º ano do Ensino Fundamental",
      shift: "Manhã",
      room: "Sala 12 — Bloco A",
      year: "2025",
      coordinator: "Profª. Helena Martins",
    },
    subjects: [
      "Língua Portuguesa","Matemática","Ciências","História",
      "Geografia","Inglês","Arte","Educação Física",
    ],
    teachers: [
      { name: "Cláudia Ferreira", subject: "Língua Portuguesa" },
      { name: "Rogério Alves",    subject: "Matemática" },
      { name: "Patrícia Lima",    subject: "Ciências" },
      { name: "Eduardo Ramos",    subject: "História" },
      { name: "Sandra Oliveira",  subject: "Geografia" },
      { name: "Marcos Tavares",   subject: "Inglês" },
      { name: "Juliana Prado",    subject: "Arte" },
      { name: "Bruno Costa",      subject: "Educação Física" },
    ],
    grades: [
      { subject: "Língua Portuguesa", b1: 8.5, b2: 7.8, b3: 8.2, b4: 8.9 },
      { subject: "Matemática",        b1: 7.0, b2: 6.5, b3: 7.4, b4: 8.0 },
      { subject: "Ciências",          b1: 9.0, b2: 8.7, b3: 9.1, b4: 9.3 },
      { subject: "História",          b1: 8.0, b2: 7.5, b3: 8.0, b4: 8.4 },
      { subject: "Geografia",         b1: 7.5, b2: 8.0, b3: 7.8, b4: 8.2 },
      { subject: "Inglês",            b1: 8.8, b2: 9.0, b3: 9.2, b4: 9.4 },
      { subject: "Arte",              b1: 9.5, b2: 9.5, b3: 9.5, b4: 9.5 },
      { subject: "Educação Física",   b1: 10,  b2: 10,  b3: 10,  b4: 10  },
    ],
    attendance: [
      { subject: "Língua Portuguesa", given: 40, present: 38, absences: 2 },
      { subject: "Matemática",        given: 40, present: 36, absences: 4 },
      { subject: "Ciências",          given: 32, present: 31, absences: 1 },
      { subject: "História",          given: 32, present: 30, absences: 2 },
      { subject: "Geografia",         given: 32, present: 29, absences: 3 },
      { subject: "Inglês",            given: 24, present: 24, absences: 0 },
      { subject: "Arte",              given: 20, present: 20, absences: 0 },
      { subject: "Educação Física",   given: 20, present: 19, absences: 1 },
    ],
    absences: [
      { date: "12/03", subject: "Matemática", reason: "Atestado médico apresentado" },
      { date: "04/04", subject: "Geografia",  reason: "Falta justificada pelo responsável" },
      { date: "22/05", subject: "História",   reason: "Consulta médica" },
      { date: "17/06", subject: "Matemática", reason: "Sem justificativa" },
    ],
    activities: [
      { date: "20/09", title: "Redação — Tema: Meio ambiente",  subject: "Língua Portuguesa", status: "pendente", due: "Entrega até 27/09" },
      { date: "22/09", title: "Lista de exercícios — Equações", subject: "Matemática",        status: "pendente", due: "Entrega até 29/09" },
      { date: "15/09", title: "Relatório de experimento",       subject: "Ciências",          status: "entregue", due: "Entregue em 15/09" },
      { date: "10/09", title: "Mapa — Regiões do Brasil",       subject: "Geografia",         status: "entregue", due: "Entregue em 10/09" },
      { date: "05/09", title: "Resumo de leitura",              subject: "Inglês",            status: "avaliado", due: "Nota: 9,0" },
    ],
    announcements: [
      { date: "25/09", title: "Reunião de pais e mestres",           desc: "Dia 30/09, às 19h, no auditório principal.", tag: "Importante", level: "warn" },
      { date: "23/09", title: "Feira de ciências",                   desc: "Inscrições até 05/10.", tag: "Evento", level: "info" },
      { date: "20/09", title: "Calendário de provas — 4º bimestre",  desc: "Entre 14 e 25 de outubro.", tag: "Avaliação", level: "info" },
    ],
    occurrences: [
      { date: "18/09", title: "Elogio — Participação em sala",  desc: "Grande participação nas discussões de História.", tag: "Positivo", level: "ok" },
      { date: "02/09", title: "Atraso na entrega de atividade", desc: "Trabalho de Matemática com dois dias de atraso.", tag: "Atenção",  level: "warn" },
    ],
  };

  /* -------------------- 2.2 Responsável -------------------- */
  const DEFAULT_GUARDIAN_DATA = {
    personal: { name: "Marta Souza", cpf: "987.654.321-00", email: "marta.souza@email.com", phone: "(11) 97777-4321" },
    students: [{ name: "Ana Beatriz Souza", enrollment: "2025-004512", class: "9º Ano B" }],
    grades: [], attendance: [], absences: [], activities: [], announcements: [], occurrences: [],
  };

  /* -------------------- 2.3 Professor -------------------- */
  const DEFAULT_TEACHER_DATA = {
    personal: { name: "Cláudia Ferreira", enrollment: "PROF-0007", email: "claudia.ferreira@cristalnorte.edu.br", phone: "(11) 96666-1122", subject: "Língua Portuguesa" },
    classes: [
      { code: "9º Ano B", room: "Sala 12 — Bloco A", students: 28 },
      { code: "8º Ano A", room: "Sala 08 — Bloco B", students: 30 },
    ],
    students: [], activities: [], announcements: [],
  };

  /* -------------------- 2.4 Coordenador -------------------- */
  const DEFAULT_COORDINATOR_DATA = {
    personal: {
      name: "Prof. Ricardo Menezes",
      enrollment: "COORD-0003",
      email: "ricardo.menezes@cristalnorte.edu.br",
      phone: "(11) 95555-7788",
      role: "Coordenador Pedagógico",
    },
    students: [
      { id: "s-001", name: "Ana Beatriz Souza",     enrollment: "2025-004512", birth: "12/03/2009", class: "9º Ano B", shift: "Manhã", email: "ana.souza@aluno.cristalnorte.edu.br", phone: "(11) 98888-1234", guardian: "Marta Souza (mãe)",  address: "Rua das Acácias, 245 — Jardim Primavera, São Paulo/SP" },
      { id: "s-002", name: "Bruno Carvalho Lima",   enrollment: "2025-004513", birth: "22/07/2009", class: "9º Ano B", shift: "Manhã", email: "bruno.lima@aluno.cristalnorte.edu.br", phone: "(11) 97777-2211", guardian: "Sérgio Lima (pai)",   address: "Av. das Palmeiras, 88 — Centro, São Paulo/SP" },
      { id: "s-003", name: "Carla Mendes Rocha",    enrollment: "2025-004514", birth: "05/11/2009", class: "9º Ano A", shift: "Manhã", email: "carla.rocha@aluno.cristalnorte.edu.br", phone: "(11) 96666-3322", guardian: "Paula Rocha (mãe)",  address: "Rua dos Ipês, 12 — Vila Nova, São Paulo/SP" },
      { id: "s-004", name: "Diego Fernandes Alves", enrollment: "2025-004515", birth: "18/01/2009", class: "9º Ano A", shift: "Manhã", email: "diego.alves@aluno.cristalnorte.edu.br", phone: "(11) 95555-4433", guardian: "Cláudia Alves (mãe)", address: "Rua das Hortênsias, 301 — Jardim Sul, São Paulo/SP" },
      { id: "s-005", name: "Eduarda Nunes Prado",   enrollment: "2025-004516", birth: "30/09/2009", class: "8º Ano A", shift: "Tarde", email: "eduarda.prado@aluno.cristalnorte.edu.br", phone: "(11) 94444-5544", guardian: "Marcos Prado (pai)", address: "Rua das Violetas, 47 — Vila Bela, São Paulo/SP" },
    ],
    classes: [
      { code: "9º Ano B", grade: "9º ano", shift: "Manhã", room: "Sala 12 — Bloco A", coordinator: "Prof. Ricardo Menezes", subjects: [
        { name: "Língua Portuguesa", teacher: "Cláudia Ferreira" },
        { name: "Matemática",        teacher: "Rogério Alves" },
        { name: "Ciências",          teacher: "Patrícia Lima" },
        { name: "História",          teacher: "Eduardo Ramos" },
        { name: "Geografia",         teacher: "Sandra Oliveira" },
        { name: "Inglês",            teacher: "Marcos Tavares" },
        { name: "Arte",              teacher: "Juliana Prado" },
        { name: "Educação Física",   teacher: "Bruno Costa" },
      ]},
      { code: "9º Ano A", grade: "9º ano", shift: "Manhã", room: "Sala 11 — Bloco A", coordinator: "Prof. Ricardo Menezes", subjects: [
        { name: "Língua Portuguesa", teacher: "Cláudia Ferreira" },
        { name: "Matemática",        teacher: "Rogério Alves" },
        { name: "Ciências",          teacher: "Patrícia Lima" },
        { name: "História",          teacher: "Eduardo Ramos" },
        { name: "Geografia",         teacher: "Sandra Oliveira" },
        { name: "Inglês",            teacher: "Marcos Tavares" },
        { name: "Arte",              teacher: "Juliana Prado" },
        { name: "Educação Física",   teacher: "Bruno Costa" },
      ]},
      { code: "8º Ano A", grade: "8º ano", shift: "Tarde", room: "Sala 08 — Bloco B", coordinator: "Profª. Helena Martins", subjects: [
        { name: "Língua Portuguesa", teacher: "Renata Lopes" },
        { name: "Matemática",        teacher: "Fábio Castro" },
        { name: "Ciências",          teacher: "Patrícia Lima" },
        { name: "História",          teacher: "Eduardo Ramos" },
      ]},
    ],
    teachers: [
      { name: "Cláudia Ferreira", subject: "Língua Portuguesa", classes: ["9º Ano A", "9º Ano B"], email: "claudia.ferreira@cristalnorte.edu.br" },
      { name: "Rogério Alves",    subject: "Matemática",        classes: ["9º Ano A", "9º Ano B"], email: "rogerio.alves@cristalnorte.edu.br" },
      { name: "Patrícia Lima",    subject: "Ciências",          classes: ["8º Ano A", "9º Ano A", "9º Ano B"], email: "patricia.lima@cristalnorte.edu.br" },
      { name: "Eduardo Ramos",    subject: "História",          classes: ["8º Ano A", "9º Ano A", "9º Ano B"], email: "eduardo.ramos@cristalnorte.edu.br" },
      { name: "Sandra Oliveira",  subject: "Geografia",         classes: ["9º Ano A", "9º Ano B"], email: "sandra.oliveira@cristalnorte.edu.br" },
      { name: "Marcos Tavares",   subject: "Inglês",            classes: ["9º Ano A", "9º Ano B"], email: "marcos.tavares@cristalnorte.edu.br" },
      { name: "Juliana Prado",    subject: "Arte",              classes: ["9º Ano A", "9º Ano B"], email: "juliana.prado@cristalnorte.edu.br" },
      { name: "Bruno Costa",      subject: "Educação Física",   classes: ["9º Ano A", "9º Ano B"], email: "bruno.costa@cristalnorte.edu.br" },
    ],
    grades: [
      { studentId: "s-001", subject: "Língua Portuguesa", b1: 8.5, b2: 7.8, b3: 8.2, b4: 8.9 },
      { studentId: "s-001", subject: "Matemática",        b1: 7.0, b2: 6.5, b3: 7.4, b4: 8.0 },
      { studentId: "s-001", subject: "Ciências",          b1: 9.0, b2: 8.7, b3: 9.1, b4: 9.3 },
      { studentId: "s-002", subject: "Língua Portuguesa", b1: 6.5, b2: 6.0, b3: 5.8, b4: 6.2 },
      { studentId: "s-002", subject: "Matemática",        b1: 5.5, b2: 4.8, b3: 5.0, b4: 5.5 },
      { studentId: "s-003", subject: "Língua Portuguesa", b1: 9.2, b2: 9.5, b3: 9.1, b4: 9.6 },
      { studentId: "s-003", subject: "Matemática",        b1: 8.8, b2: 9.0, b3: 9.2, b4: 9.4 },
      { studentId: "s-004", subject: "Língua Portuguesa", b1: 4.5, b2: 5.0, b3: 4.8, b4: 5.2 },
      { studentId: "s-004", subject: "Matemática",        b1: 5.0, b2: 5.5, b3: 4.7, b4: 5.0 },
      { studentId: "s-005", subject: "Língua Portuguesa", b1: 7.5, b2: 8.0, b3: 7.8, b4: 8.2 },
      { studentId: "s-005", subject: "Matemática",        b1: 6.5, b2: 7.0, b3: 6.8, b4: 7.2 },
    ],
    attendance: [
      { studentId: "s-001", subject: "Língua Portuguesa", given: 40, present: 38, absences: 2 },
      { studentId: "s-001", subject: "Matemática",        given: 40, present: 36, absences: 4 },
      { studentId: "s-002", subject: "Língua Portuguesa", given: 40, present: 30, absences: 10 },
      { studentId: "s-002", subject: "Matemática",        given: 40, present: 28, absences: 12 },
      { studentId: "s-003", subject: "Língua Portuguesa", given: 40, present: 39, absences: 1 },
      { studentId: "s-003", subject: "Matemática",        given: 40, present: 40, absences: 0 },
      { studentId: "s-004", subject: "Língua Portuguesa", given: 40, present: 26, absences: 14 },
      { studentId: "s-004", subject: "Matemática",        given: 40, present: 25, absences: 15 },
      { studentId: "s-005", subject: "Língua Portuguesa", given: 32, present: 30, absences: 2 },
      { studentId: "s-005", subject: "Matemática",        given: 32, present: 28, absences: 4 },
    ],
    occurrences: [
      { id: "o-001", studentId: "s-002", date: "10/09", title: "Falta sem justificativa",        desc: "Ausente em duas aulas consecutivas sem justificativa.", tag: "Atenção",  level: "warn" },
      { id: "o-002", studentId: "s-004", date: "12/09", title: "Baixo rendimento em Matemática", desc: "Média abaixo de 5,0 no 2º bimestre.",                    tag: "Atenção",  level: "warn" },
      { id: "o-003", studentId: "s-001", date: "18/09", title: "Elogio — Participação",           desc: "Destaque nas discussões de História.",                   tag: "Positivo", level: "ok"   },
      { id: "o-004", studentId: "s-003", date: "20/09", title: "Elogio — Olimpíada de Matemática",desc: "Classificada para a 2ª fase da OBMEP.",                  tag: "Positivo", level: "ok"   },
    ],
  };

  /* -------------------- 2.5 Comunicados -------------------- */
  const DEFAULT_ANNOUNCEMENTS = [
    { id: "a-001", date: "25/09", title: "Reunião de pais e mestres", desc: "Dia 30/09, às 19h, no auditório.", tag: "Importante", level: "warn", target: "todos" },
    { id: "a-002", date: "23/09", title: "Feira de ciências",          desc: "Inscrições até 05/10.",              tag: "Evento",     level: "info", target: "alunos" },
  ];

  function buildDemoUsers() {
    return [
      {
        name: "Ana Beatriz Souza",
        email: "ana.souza@aluno.cristalnorte.edu.br",
        password: "aluno123",
        role: "aluno",
        enrollment: "2025-004512",
        phone: "(11) 98888-1234",
        birth: "12/03/2009",
        firstAccess: false,
        createdAt: new Date().toISOString(),
      },
      {
        name: "Marta Souza",
        email: "marta.souza@email.com",
        password: "responsavel123",
        role: "responsavel",
        cpf: "987.654.321-00",
        phone: "(11) 97777-4321",
        firstAccess: false,
        createdAt: new Date().toISOString(),
      },
      {
        name: "Cláudia Ferreira",
        email: "claudia.ferreira@cristalnorte.edu.br",
        password: "professor123",
        role: "professor",
        enrollment: "PROF-0007",
        phone: "(11) 96666-1122",
        firstAccess: false,
        createdAt: new Date().toISOString(),
      },
      {
        name: "Prof. Ricardo Menezes",
        email: "ricardo.menezes@cristalnorte.edu.br",
        password: "coordenacao123",
        role: "coordenador",
        enrollment: "COORD-0003",
        phone: "(11) 95555-7788",
        firstAccess: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  function ensureRequiredUsers() {
    const users = Array.isArray(read(KEYS.users, [])) ? read(KEYS.users, []) : [];
    const defaults = buildDemoUsers();
    const keys = new Set(
      users
        .filter(Boolean)
        .map((user) => String(user.email || user.enrollment || "").trim().toLowerCase())
        .filter(Boolean)
    );

    defaults.forEach((template) => {
      const key = String(template.email || template.enrollment || "").trim().toLowerCase();
      if (!key || keys.has(key)) return;
      users.push({ ...template, createdAt: new Date().toISOString() });
      keys.add(key);
    });

    if (!users.some((user) => user && user.role === "coordenador")) {
      const coordinator = defaults.find((user) => user.role === "coordenador");
      if (coordinator) users.push({ ...coordinator, createdAt: new Date().toISOString() });
    }

    write(KEYS.users, users);
  }

  /* ==========================================================================
     3. HELPERS
     ========================================================================== */
  function read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ==========================================================================
     4. SEED
     ========================================================================== */
  function seedIfMissing() {
    if (!read(KEYS.studentData, null))     write(KEYS.studentData,     clone(DEFAULT_STUDENT_DATA));
    if (!read(KEYS.guardianData, null))    write(KEYS.guardianData,    clone(DEFAULT_GUARDIAN_DATA));
    if (!read(KEYS.teacherData, null))     write(KEYS.teacherData,     clone(DEFAULT_TEACHER_DATA));
    if (!read(KEYS.coordinatorData, null)) write(KEYS.coordinatorData, clone(DEFAULT_COORDINATOR_DATA));
    if (!read(KEYS.announcements, null))   write(KEYS.announcements,   clone(DEFAULT_ANNOUNCEMENTS));

    const existingUsers = Array.isArray(read(KEYS.users, [])) ? read(KEYS.users, []) : [];
    if (!existingUsers.length) {
      write(KEYS.users, buildDemoUsers());
      return;
    }

    ensureRequiredUsers();
  }

  /* ==========================================================================
     5. API PÚBLICA
     ========================================================================== */
  const API = {
    KEYS,

    /* Sessão */
    getSession:   () => read(KEYS.session, null),
    setSession:   (s) => write(KEYS.session, s),
    clearSession: () => remove(KEYS.session),

    /* Aluno */
    getStudentData:   (fb = null) => read(KEYS.studentData, fb ?? clone(DEFAULT_STUDENT_DATA)),
    setStudentData:   (d) => write(KEYS.studentData, d),
    resetStudentData: () => write(KEYS.studentData, clone(DEFAULT_STUDENT_DATA)),

    /* Responsável */
    getGuardianData: (fb = null) => read(KEYS.guardianData, fb ?? clone(DEFAULT_GUARDIAN_DATA)),
    setGuardianData: (d) => write(KEYS.guardianData, d),

    /* Professor */
    getTeacherData: (fb = null) => read(KEYS.teacherData, fb ?? clone(DEFAULT_TEACHER_DATA)),
    setTeacherData: (d) => write(KEYS.teacherData, d),

    /* Coordenador */
    getCoordinatorData:   (fb = null) => read(KEYS.coordinatorData, fb ?? clone(DEFAULT_COORDINATOR_DATA)),
    setCoordinatorData:   (d) => write(KEYS.coordinatorData, d),
    resetCoordinatorData: () => write(KEYS.coordinatorData, clone(DEFAULT_COORDINATOR_DATA)),

    /* Comunicados */
    getAnnouncements: () => read(KEYS.announcements, []),
    setAnnouncements: (list) => write(KEYS.announcements, list),

    /* Usuários globais */
    getUsers: () => read(KEYS.users, []),
    setUsers: (l) => write(KEYS.users, l),

    /* Genéricos */
    read, write, remove,
    listKeys() { return Object.values(KEYS).filter((k) => localStorage.getItem(k) !== null); },
    dump() { const out = {}; this.listKeys().forEach((k) => { out[k] = read(k); }); return out; },
    clearAll() { Object.values(KEYS).forEach(remove); },
    resetAll() { this.clearAll(); seedIfMissing(); },

    defaults: {
      student:     clone(DEFAULT_STUDENT_DATA),
      guardian:    clone(DEFAULT_GUARDIAN_DATA),
      teacher:     clone(DEFAULT_TEACHER_DATA),
      coordinator: clone(DEFAULT_COORDINATOR_DATA),
    },
  };

  seedIfMissing();
  return API;
})();