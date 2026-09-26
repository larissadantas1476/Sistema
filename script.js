/**
 * Colégio Cristal Norte — interações da tela de acesso.
 *
 * O código abaixo mantém a validação no front-end para uma experiência
 * imediata. Em produção, o envio deve ser conectado a uma API segura,
 * que valide as credenciais no servidor.
 *
 * Após o login bem-sucedido, a sessão é gravada no localStorage e o
 * usuário é redirecionado para o dashboard correspondente ao seu perfil.
 *
 * O perfil "coordenador" exige uma senha fixa adicional (COORD_PASSWORD)
 * que só a equipe pedagógica conhece.
 */

(() => {
  "use strict";

  /* ============================================================
     CONFIGURAÇÕES
     ============================================================ */

  /** Chave da sessão no localStorage. */
  const SESSION_KEY = "ccn:session";


  /** Rotas por perfil. */
  const ROUTES_BY_PROFILE = {
    aluno: "aluno.html",
    responsavel: "responsavel.html",
    professor: "professor.html",
    coordenador: "coordenador.html",
  };

  /* ============================================================
     REFERÊNCIAS DO DOM
     ============================================================ */
  const form = document.querySelector("#accessForm");
  const profileSelect = document.querySelector("#profile");
  const identifierInput = document.querySelector("#identifier");
  const passwordInput = document.querySelector("#password");
  const passwordToggle = document.querySelector("#passwordToggle");
  const submitButton = form?.querySelector('button[type="submit"]');

  const profileMessage = document.querySelector("#profileMessage");
  const identifierMessage = document.querySelector("#identifierMessage");
  const passwordMessage = document.querySelector("#passwordMessage");
  const formStatus = document.querySelector("#formStatus");

  if (!form || !identifierInput || !passwordInput || !profileSelect) {
    return;
  }

  /* ============================================================
     HELPERS DE UI
     ============================================================ */

  function setFieldMessage(element, message) {
    if (element) element.textContent = message;
  }

  function setInputError(input, hasError) {
    const wrapper = input.closest(".input-wrapper, .select-wrapper");
    wrapper?.classList.toggle("has-error", hasError);
    input.setAttribute("aria-invalid", String(hasError));
  }

  function clearFormStatus() {
    formStatus.textContent = "";
    formStatus.classList.remove("is-error");
  }

  /* ============================================================
     CÓPIA DO IDENTIFICADOR POR PERFIL
     ============================================================ */
  function updateIdentifierCopy(profile) {
    const label = document.querySelector("#identifierLabel");
    const copyByProfile = {
      aluno:       { label: "Matrícula do aluno",  placeholder: "Digite sua matrícula" },
      responsavel: { label: "CPF ou e-mail",       placeholder: "Digite seu CPF ou e-mail" },
      professor:   { label: "Matrícula ou e-mail", placeholder: "Digite sua matrícula ou e-mail" },
      coordenador: { label: "Matrícula funcional", placeholder: "Digite sua matrícula funcional" },
    };

    const copy = copyByProfile[profile] ?? copyByProfile.professor;
    label.textContent = copy.label;
    identifierInput.placeholder = copy.placeholder;
  }

  /* ============================================================
     LIMPEZA DE ERROS AO DIGITAR
     ============================================================ */
  function bindClearOnInput(input, messageElement) {
    input.addEventListener("input", () => {
      setInputError(input, false);
      setFieldMessage(messageElement, "");
      clearFormStatus();
    });
  }

  /* ============================================================
     EVENTOS
     ============================================================ */

  profileSelect.addEventListener("change", () => {
    setFieldMessage(profileMessage, "");
    setInputError(profileSelect, false);
    clearFormStatus();
    updateIdentifierCopy(profileSelect.value);
    identifierInput.focus();
  });

  bindClearOnInput(identifierInput, identifierMessage);
  bindClearOnInput(passwordInput, passwordMessage);

  passwordToggle?.addEventListener("click", () => {
    const shouldShowPassword = passwordInput.type === "password";
    passwordInput.type = shouldShowPassword ? "text" : "password";
    passwordToggle.classList.toggle("is-visible", shouldShowPassword);
    passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
    passwordToggle.setAttribute(
      "aria-label",
      shouldShowPassword ? "Ocultar senha" : "Mostrar senha",
    );
  });

  /* ============================================================
     VALIDAÇÃO
     ============================================================ */
  function validateForm() {
    const profile = profileSelect.value;
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;
    let isValid = true;

    setFieldMessage(profileMessage, "");
    setFieldMessage(identifierMessage, "");
    setFieldMessage(passwordMessage, "");
    setInputError(profileSelect, false);
    setInputError(identifierInput, false);
    setInputError(passwordInput, false);

    if (!profile) {
      setFieldMessage(profileMessage, "Selecione um perfil para continuar.");
      setInputError(profileSelect, true);
      isValid = false;
    }

    if (!identifier) {
      setFieldMessage(identifierMessage, "Informe sua matrícula, CPF ou e-mail.");
      setInputError(identifierInput, true);
      isValid = false;
    } else if (identifier.length < 4) {
      setFieldMessage(identifierMessage, "Digite pelo menos 4 caracteres.");
      setInputError(identifierInput, true);
      isValid = false;
    }

    if (!password) {
      setFieldMessage(passwordMessage, "Informe sua senha.");
      setInputError(passwordInput, true);
      isValid = false;
    } else if (password.length < 6) {
      setFieldMessage(passwordMessage, "A senha deve ter pelo menos 6 caracteres.");
      setInputError(passwordInput, true);
      isValid = false;
    }

    return isValid;
  }

  /* ============================================================
     HELPERS DE SESSÃO
     ============================================================ */
  function deriveDisplayName(identifier, profile) {
    if (!identifier) return "Usuário";

    if (identifier.includes("@")) {
      const local = identifier.split("@")[0];
      return local
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    }

    return profile === "aluno" ? `Aluno ${identifier}` : identifier;
  }

  function saveSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* ignora falhas */
    }
  }

  function normalizeCredential(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function normalizeCpf(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function findRegisteredUser(profile, identifier, password) {
    const users = Array.isArray(window.CCN?.getUsers?.()) ? window.CCN.getUsers() : [];
    const normalizedIdentifier = normalizeCredential(identifier);
    const normalizedPassword = String(password ?? "");

    return users.find((user) => {
      if (!user || user.role !== profile) return false;
      if (user.password !== normalizedPassword) return false;

      const candidates = [
        normalizeCredential(user.email),
        normalizeCredential(user.enrollment),
        normalizeCpf(user.cpf),
      ].filter(Boolean);

      return candidates.includes(normalizedIdentifier) ||
        candidates.includes(normalizeCredential(user.name));
    });
  }

  function findStudentIdForUser(user) {
    const students = Array.isArray(window.CCN?.getCoordinatorData?.().students) ? window.CCN.getCoordinatorData().students : [];
    return students.find((student) =>
      student && (
        normalizeCredential(student.email) === normalizeCredential(user?.email) ||
        normalizeCredential(student.enrollment) === normalizeCredential(user?.enrollment) ||
        normalizeCredential(student.name) === normalizeCredential(user?.name)
      )
    )?.id || user?.studentId || null;
  }

  /* ============================================================
     SUBMIT
     ============================================================ */
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearFormStatus();

    if (!validateForm()) {
      formStatus.textContent = "Revise os campos destacados e tente novamente.";
      formStatus.classList.add("is-error");
      return;
    }

    const profile = profileSelect.value;
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    const registeredUser = findRegisteredUser(profile, identifier, password);

    if (!registeredUser) {
      setFieldMessage(identifierMessage, "Usuário não cadastrado ou dados inválidos.");
      setFieldMessage(passwordMessage, "Usuário não cadastrado ou dados inválidos.");
      setInputError(identifierInput, true);
      setInputError(passwordInput, true);
      formStatus.textContent = "Usuário não cadastrado ou dados inválidos.";
      formStatus.classList.add("is-error");
      return;
    }

    const profileNames = {
      aluno: "aluno",
      responsavel: "responsável",
      professor: "professor",
      coordenador: "coordenador",
    };

    const session = {
      name: registeredUser.name || deriveDisplayName(identifier, profile),
      role: profile,
      identifier: registeredUser.email || identifier,
      studentId: profile === "aluno" ? findStudentIdForUser(registeredUser) : undefined,
      loggedAt: new Date().toISOString(),
      requiresPasswordChange: profile === "aluno" && Boolean(registeredUser.firstAccess),
    };

    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Verificando...";

    window.setTimeout(() => {
      saveSession(session);
      if (window.CCN?.setSession) {
        window.CCN.setSession(session);
      }

      formStatus.textContent = `Acesso validado para o perfil ${profileNames[profile]}.`;
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Entrar no sistema";

      const target = ROUTES_BY_PROFILE[profile];
      if (target) {
        if (profile === "aluno" && registeredUser.firstAccess) {
          window.location.href = `${target}#primeiro-acesso`;
        } else {
          window.location.href = target;
        }
      } else {
        formStatus.textContent = "Perfil sem dashboard configurado ainda.";
        formStatus.classList.add("is-error");
      }
    }, 650);
  });
})();