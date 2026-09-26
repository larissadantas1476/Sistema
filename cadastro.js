/**
 * Colégio Cristal Norte — Cadastro de novos usuários.
 *
 * Fluxo:
 *   1. Usuário preenche o formulário.
 *   2. Validamos tudo no front-end.
 *   3. Gravamos os dados no localStorage (via CCN).
 *   4. Criamos a sessão automaticamente e redirecionamos
 *      para o dashboard do perfil escolhido.
 *
 * Em produção: enviar para uma API segura e só criar a sessão
 * depois do retorno do servidor.
 */

(() => {
  "use strict";

  const form = document.querySelector("#signupForm");
  if (!form) return;

  /* ---------------------------------------------------------------
     Referências
     --------------------------------------------------------------- */
  const profileSelect = document.querySelector("#signupProfile");
  const nameInput     = document.querySelector("#signupName");
  const emailInput    = document.querySelector("#signupEmail");
  const phoneInput    = document.querySelector("#signupPhone");
  const birthInput    = document.querySelector("#signupBirth");
  const enrollmentInput = document.querySelector("#signupEnrollment");
  const enrollmentLabel = document.querySelector("#signupEnrollmentLabel");
  const enrollmentGroup = document.querySelector("#enrollmentGroup");
  const cpfGroup        = document.querySelector("#cpfGroup");
  const cpfInput        = document.querySelector("#signupCpf");
  const passwordInput   = document.querySelector("#signupPassword");
  const confirmInput    = document.querySelector("#signupConfirm");
  const termsCheckbox   = document.querySelector("#signupTerms");

  const passwordToggle  = document.querySelector("#signupPasswordToggle");
  const confirmToggle   = document.querySelector("#signupConfirmToggle");

  const submitButton = form.querySelector('button[type="submit"]');
  const formStatus   = document.querySelector("#signupStatus");

  /* Mensagens */
  const msg = {
    profile:    document.querySelector("#signupProfileMessage"),
    name:       document.querySelector("#signupNameMessage"),
    email:      document.querySelector("#signupEmailMessage"),
    phone:      document.querySelector("#signupPhoneMessage"),
    birth:      document.querySelector("#signupBirthMessage"),
    enrollment: document.querySelector("#signupEnrollmentMessage"),
    cpf:        document.querySelector("#signupCpfMessage"),
    password:   document.querySelector("#signupPasswordMessage"),
    confirm:    document.querySelector("#signupConfirmMessage"),
  };

  /* ---------------------------------------------------------------
     Helpers de UI
     --------------------------------------------------------------- */
  function setMessage(el, text) {
    if (el) el.textContent = text;
  }

  function setError(input, hasError) {
    const wrapper = input.closest(".input-wrapper, .select-wrapper");
    wrapper?.classList.toggle("has-error", hasError);
    input.setAttribute("aria-invalid", String(hasError));
  }

  function clearStatus() {
    formStatus.textContent = "";
    formStatus.classList.remove("is-error");
  }

  function bindClear(input, messageEl) {
    input.addEventListener("input", () => {
      setError(input, false);
      setMessage(messageEl, "");
      clearStatus();
    });
  }

  /* ---------------------------------------------------------------
     Toggles de senha
     --------------------------------------------------------------- */
  function bindPasswordToggle(button, input) {
    button?.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.classList.toggle("is-visible", show);
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    });
  }

  bindPasswordToggle(passwordToggle, passwordInput);
  bindPasswordToggle(confirmToggle, confirmInput);

  /* ---------------------------------------------------------------
     Ajustes por perfil
     --------------------------------------------------------------- */
  function updateFieldsByProfile(profile) {
    // Aluno → mostra matrícula, esconde CPF
    // Responsável → mostra CPF, esconde matrícula
    // Professor → mostra matrícula, esconde CPF
    if (profile === "responsavel") {
      enrollmentGroup.hidden = true;
      cpfGroup.hidden = false;
    } else {
      enrollmentGroup.hidden = false;
      cpfGroup.hidden = true;
      enrollmentLabel.textContent =
        profile === "professor" ? "Matrícula do professor" : "Matrícula do aluno";
      enrollmentInput.placeholder =
        profile === "professor" ? "Digite sua matrícula funcional" : "Digite sua matrícula";
    }
  }

  profileSelect.addEventListener("change", () => {
    setMessage(msg.profile, "");
    setError(profileSelect, false);
    clearStatus();
    updateFieldsByProfile(profileSelect.value);
    nameInput.focus();
  });

  /* ---------------------------------------------------------------
     Máscaras simples
     --------------------------------------------------------------- */
  phoneInput.addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let out = digits;
    if (digits.length > 6)      out = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    else if (digits.length > 2) out = `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    else if (digits.length > 0) out = `(${digits}`;
    e.target.value = out;
  });

  cpfInput.addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let out = digits;
    if (digits.length > 9)      out = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
    else if (digits.length > 6) out = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
    else if (digits.length > 3) out = `${digits.slice(0,3)}.${digits.slice(3)}`;
    e.target.value = out;
  });

  /* ---------------------------------------------------------------
     Limpeza de erros ao digitar
     --------------------------------------------------------------- */
  bindClear(nameInput, msg.name);
  bindClear(emailInput, msg.email);
  bindClear(phoneInput, msg.phone);
  bindClear(birthInput, msg.birth);
  bindClear(enrollmentInput, msg.enrollment);
  bindClear(cpfInput, msg.cpf);
  bindClear(passwordInput, msg.password);
  bindClear(confirmInput, msg.confirm);

  /* ---------------------------------------------------------------
     Validações
     --------------------------------------------------------------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    const profile    = profileSelect.value;
    const name       = nameInput.value.trim();
    const email      = emailInput.value.trim();
    const phone      = phoneInput.value.trim();
    const birth      = birthInput.value;
    const enrollment = enrollmentInput.value.trim();
    const cpf        = cpfInput.value.trim();
    const password   = passwordInput.value;
    const confirm    = confirmInput.value;
    const terms      = termsCheckbox.checked;

    let ok = true;

    // Limpa tudo antes de validar de novo
    Object.values(msg).forEach((el) => setMessage(el, ""));
    [profileSelect, nameInput, emailInput, phoneInput, birthInput,
     enrollmentInput, cpfInput, passwordInput, confirmInput]
      .forEach((i) => setError(i, false));

    // Perfil
    if (!profile) {
      setMessage(msg.profile, "Selecione um perfil.");
      setError(profileSelect, true);
      ok = false;
    }

    // Nome
    if (name.length < 3) {
      setMessage(msg.name, "Informe seu nome completo (mín. 3 caracteres).");
      setError(nameInput, true);
      ok = false;
    } else if (!name.includes(" ")) {
      setMessage(msg.name, "Digite nome e sobrenome.");
      setError(nameInput, true);
      ok = false;
    }

    // E-mail
    if (!EMAIL_RE.test(email)) {
      setMessage(msg.email, "Digite um e-mail válido.");
      setError(emailInput, true);
      ok = false;
    } else if (emailJaCadastrado(email)) {
      setMessage(msg.email, "Este e-mail já está cadastrado.");
      setError(emailInput, true);
      ok = false;
    }

    // Telefone (opcional, mas se preenchido precisa ter 10 ou 11 dígitos)
    const phoneDigits = phone.replace(/\D/g, "");
    if (phone && phoneDigits.length < 10) {
      setMessage(msg.phone, "Telefone incompleto.");
      setError(phoneInput, true);
      ok = false;
    }

    // Nascimento (opcional)
    if (birth) {
      const year = new Date(birth).getFullYear();
      const now = new Date().getFullYear();
      if (year < 1900 || year > now) {
        setMessage(msg.birth, "Data inválida.");
        setError(birthInput, true);
        ok = false;
      }
    }

    // Matrícula (obrigatória exceto responsável)
    if (profile !== "responsavel" && enrollment.length < 4) {
      setMessage(msg.enrollment, "Matrícula inválida.");
      setError(enrollmentInput, true);
      ok = false;
    }

    // CPF (obrigatório só para responsável)
    if (profile === "responsavel") {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        setMessage(msg.cpf, "CPF deve ter 11 dígitos.");
        setError(cpfInput, true);
        ok = false;
      }
    }

    // Senha
    if (password.length < 6) {
      setMessage(msg.password, "A senha deve ter pelo menos 6 caracteres.");
      setError(passwordInput, true);
      ok = false;
    }

    // Confirmação
    if (confirm !== password) {
      setMessage(msg.confirm, "As senhas não coincidem.");
      setError(confirmInput, true);
      ok = false;
    }

    // Termos
    if (!terms) {
      clearStatus();
      formStatus.textContent = "Você precisa aceitar os termos de uso.";
      formStatus.classList.add("is-error");
      ok = false;
    }

    return ok;
  }

  /* ---------------------------------------------------------------
     Verificação de duplicidade
     --------------------------------------------------------------- */
  function emailJaCadastrado(email) {
    if (!window.CCN) return false;
    const session = CCN.getSession();
    if (session && session.identifier === email) return true;
    // Aqui você poderia consultar uma lista de usuários salvos em CCN.read("ccn:users", [])
    const users = CCN.read("ccn:users", []) || [];
    return users.some((u) => u.email === email);
  }

  /* ---------------------------------------------------------------
     Helpers de nome para saudação
     --------------------------------------------------------------- */
  function deriveDisplayName(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  /* ---------------------------------------------------------------
     Submit
     --------------------------------------------------------------- */
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearStatus();

    if (!validate()) {
      formStatus.textContent = "Revise os campos destacados e tente novamente.";
      formStatus.classList.add("is-error");
      return;
    }

    const profile    = profileSelect.value;
    const name       = nameInput.value.trim();
    const email      = emailInput.value.trim();
    const phone      = phoneInput.value.trim();
    const birth      = birthInput.value;
    const enrollment = enrollmentInput.value.trim();
    const cpf        = cpfInput.value.trim();

    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Cadastrando...";

    window.setTimeout(() => {
      /* -------- Persiste o usuário na lista global -------- */
      const users = (window.CCN ? CCN.read("ccn:users", []) : null) || [];
      users.push({
        name,
        email,
        password: passwordInput.value,
        phone,
        birth,
        enrollment: profile === "responsavel" ? null : enrollment,
        cpf: profile === "responsavel" ? cpf : null,
        role: profile,
        createdAt: new Date().toISOString(),
      });
      window.CCN?.write("ccn:users", users);

      /* -------- Semeia dados específicos por perfil -------- */
      if (profile === "aluno") {
        const studentData = CCN.getStudentData();
        studentData.personal.name       = name;
        studentData.personal.email      = email;
        studentData.personal.phone      = phone || studentData.personal.phone;
        studentData.personal.birth      = birth || studentData.personal.birth;
        studentData.personal.enrollment = enrollment;
        CCN.setStudentData(studentData);
      } else if (profile === "responsavel") {
        const guardianData = CCN.getGuardianData();
        guardianData.personal.name  = name;
        guardianData.personal.email = email;
        guardianData.personal.phone = phone || guardianData.personal.phone;
        guardianData.personal.cpf   = cpf;
        CCN.setGuardianData(guardianData);
      } else if (profile === "professor") {
        const teacherData = CCN.getTeacherData();
        teacherData.personal.name       = name;
        teacherData.personal.email      = email;
        teacherData.personal.phone      = phone || teacherData.personal.phone;
        teacherData.personal.enrollment = enrollment;
        CCN.setTeacherData(teacherData);
      }

      /* -------- Cria a sessão e redireciona -------- */
      const session = {
        name: deriveDisplayName(name),
        role: profile,
        identifier: email,
        loggedAt: new Date().toISOString(),
      };
      CCN?.setSession(session);

      formStatus.textContent = "Conta criada com sucesso! Redirecionando…";
      submitButton.querySelector("span").textContent = "Conta criada!";

      const routes = {
        aluno:       "aluno.html",
        responsavel: "responsavel.html",
        professor:   "professor.html",
        coordenador: "coordenador.html",
      };
      const target = routes[profile];

      window.setTimeout(() => {
        if (target) {
          window.location.href = target;
        } else {
          formStatus.textContent = "Perfil sem dashboard configurado ainda.";
          formStatus.classList.add("is-error");
          submitButton.disabled = false;
          submitButton.querySelector("span").textContent = "Criar conta";
        }
      }, 700);
    }, 700);
  });

  /* Estado inicial */
  updateFieldsByProfile("");
})();