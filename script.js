"use strict";

/* ==========================================================
   Catálogo de Personagens: Rick and Morty API
   Organização do arquivo:
   1. Configuração e tradução de valores
   2. Acesso à API (fetch + tratamento de erros)
   3. Formatação dos dados
   4. Renderização (lista, paginação, detalhes)
   5. Eventos e inicialização
   ========================================================== */

/* ---------- 1. Configuração ---------- */

const API_URL = "https://rickandmortyapi.com/api/character";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_NAME_LENGTH = 60;
const VALID_NAME_PATTERN = /^[\p{L}\p{N} .'()-]*$/u;

const TRANSLATIONS = {
  status: {
    alive: "Vivo",
    dead: "Morto",
    unknown: "Desconhecido",
  },
  gender: {
    male: "Masculino",
    female: "Feminino",
    genderless: "Sem gênero",
    unknown: "Desconhecido",
  },
  species: {
    human: "Humano",
    alien: "Alienígena",
    humanoid: "Humanoide",
    robot: "Robô",
    animal: "Animal",
    cronenberg: "Cronenberg",
    disease: "Doença",
    parasite: "Parasita",
    vampire: "Vampiro",
    poopybutthole: "Poopybutthole",
    "mythological creature": "Criatura mitológica",
    unknown: "Desconhecida",
  },
};

const ERROR_MESSAGES = {
  timeout: "A API demorou demais para responder.",
  network: "Não foi possível conectar à API. Verifique sua conexão com a internet.",
  "rate-limit": "Muitas requisições em pouco tempo. Aguarde alguns instantes.",
  parse: "A API retornou uma resposta inesperada.",
  http: "A API encontrou um problema ao processar a consulta.",
};

/* ---------- Estado e elementos da página ---------- */

const state = {
  name: "",
  status: "",
  gender: "",
  page: 1,
  totalPages: 1,
  listController: null,
  detailController: null,
};

const elements = {
  form: document.querySelector("#search-form"),
  nameInput: document.querySelector("#name"),
  nameError: document.querySelector("#name-error"),
  statusSelect: document.querySelector("#status"),
  genderSelect: document.querySelector("#gender"),
  clearButton: document.querySelector("#clear-button"),
  resultsHeading: document.querySelector("#results-heading"),
  feedback: document.querySelector("#feedback"),
  results: document.querySelector("#results"),
  pagination: document.querySelector("#pagination"),
  prevButton: document.querySelector("#prev-button"),
  nextButton: document.querySelector("#next-button"),
  pageInfo: document.querySelector("#page-info"),
  dialog: document.querySelector("#detail-dialog"),
  dialogTitle: document.querySelector("#detail-title"),
  dialogBody: document.querySelector("#detail-body"),
  dialogClose: document.querySelector("#dialog-close"),
};

/* ---------- 2. Acesso à API ---------- */

class ApiError extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }
}

/**
 * Faz a requisição e devolve o JSON.
 * Erros conhecidos viram ApiError com um "kind" para a interface decidir a mensagem.
 * Se a requisição foi cancelada de propósito (signal.aborted), o erro original é repassado.
 */
async function requestJson(url, signal) {
  const timeoutSignal =
    typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
      : signal;

  let response;
  try {
    response = await fetch(url, { signal: timeoutSignal });
  } catch (error) {
    if (signal.aborted) throw error;
    if (error.name === "TimeoutError") throw new ApiError("timeout");
    throw new ApiError("network");
  }

  // Esta API responde 404 quando a busca não encontra nenhum personagem.
  if (response.status === 404) throw new ApiError("not-found");
  if (response.status === 429) throw new ApiError("rate-limit");
  if (!response.ok) throw new ApiError("http");

  try {
    return await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError("parse");
  }
}

function buildListUrl() {
  const params = new URLSearchParams();
  if (state.name) params.set("name", state.name);
  if (state.status) params.set("status", state.status);
  if (state.gender) params.set("gender", state.gender);
  params.set("page", String(state.page));
  return `${API_URL}?${params}`;
}

/* ---------- 3. Formatação dos dados ---------- */

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatValue(group, value, fallback = "Desconhecido") {
  const text = cleanText(value);
  if (!text) return fallback;
  return TRANSLATIONS[group]?.[text.toLowerCase()] ?? text;
}

function formatPlace(place) {
  const name = cleanText(place?.name);
  if (!name || name.toLowerCase() === "unknown") return "Desconhecida";
  return name;
}

function formatEpisodeCount(episodes) {
  if (!Array.isArray(episodes)) return "Informação indisponível";
  if (episodes.length === 0) return "Nenhum episódio registrado";
  return episodes.length === 1 ? "1 episódio" : `${episodes.length} episódios`;
}

function getErrorMessage(error) {
  return ERROR_MESSAGES[error.kind] ?? ERROR_MESSAGES.http;
}

/* ---------- 4. Renderização ---------- */

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createPlaceholder(alt, className) {
  const placeholder = createElement("div", `${className} image-placeholder`, "Sem imagem");
  if (alt) {
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", `${alt} (imagem indisponível)`);
  } else {
    placeholder.setAttribute("aria-hidden", "true");
  }
  return placeholder;
}

/** Imagem com tratamento de ausência (sem URL) e de falha ao carregar. */
function createImage(src, alt, className) {
  const url = cleanText(src);
  if (!url) return createPlaceholder(alt, className);

  const image = document.createElement("img");
  image.className = className;
  image.src = url;
  image.alt = alt;
  image.width = 300;
  image.height = 300;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => image.replaceWith(createPlaceholder(alt, className)), { once: true });
  return image;
}

function createStatusBadge(status) {
  const key = cleanText(status).toLowerCase();
  const tone = ["alive", "dead"].includes(key) ? key : "unknown";
  const badge = createElement("span", `badge badge-${tone}`);
  badge.append(createElement("span", "badge-dot"));
  badge.append(document.createTextNode(formatValue("status", status)));
  return badge;
}

/** Mostra mensagem na área de feedback (carregando, vazio, erro). Texto vazio esconde a área. */
function showFeedback(text, { loading = false, tone = "info", actionLabel, onAction } = {}) {
  elements.feedback.replaceChildren();
  elements.feedback.hidden = !text;
  if (!text) return;

  elements.feedback.dataset.tone = tone;

  if (loading) {
    const spinner = createElement("span", "spinner");
    spinner.setAttribute("aria-hidden", "true");
    elements.feedback.append(spinner);
  }

  elements.feedback.append(createElement("p", "", text));

  if (actionLabel) {
    const button = createElement("button", "button button-secondary", actionLabel);
    button.type = "button";
    button.addEventListener("click", onAction);
    elements.feedback.append(button);
  }
}

function describeSearchCriteria() {
  const parts = [];
  if (state.name) parts.push(`nome “${state.name}”`);
  if (state.status) parts.push(`status ${formatValue("status", state.status).toLowerCase()}`);
  if (state.gender) parts.push(`gênero ${formatValue("gender", state.gender).toLowerCase()}`);
  return parts.length ? ` com ${parts.join(", ")}` : "";
}

function createCharacterCard(character) {
  const name = cleanText(character.name) || "Personagem sem nome";

  const item = document.createElement("li");
  const button = createElement("button", "card");
  button.type = "button";
  button.setAttribute("aria-haspopup", "dialog");

  // Alt vazio: o nome já aparece como texto no cartão.
  button.append(createImage(character.image, "", "card-image"));

  const body = createElement("span", "card-body");
  body.append(createElement("span", "card-name", name));
  body.append(createElement("span", "card-species", formatValue("species", character.species, "Desconhecida")));
  body.append(createStatusBadge(character.status));
  button.append(body);

  button.addEventListener("click", () => openDetails({ id: character.id, name }));

  item.append(button);
  return item;
}

function renderResults(data) {
  const characters = data?.results;
  if (!Array.isArray(characters)) throw new ApiError("parse");

  const total = data.info?.count ?? characters.length;
  state.totalPages = data.info?.pages ?? 1;

  elements.results.replaceChildren(...characters.map(createCharacterCard));

  const label = total === 1 ? "personagem encontrado" : "personagens encontrados";
  showFeedback(`${total} ${label}. Página ${state.page} de ${state.totalPages}.`);

  elements.pageInfo.textContent = `Página ${state.page} de ${state.totalPages}`;
  elements.prevButton.disabled = state.page <= 1;
  elements.nextButton.disabled = state.page >= state.totalPages;
  elements.pagination.hidden = state.totalPages <= 1;
}

function showEmptyResults() {
  state.totalPages = 1;
  showFeedback(`Nenhum personagem encontrado${describeSearchCriteria()}. Revise a grafia ou altere os filtros.`, {
    actionLabel: "Limpar pesquisa",
    onAction: clearSearch,
  });
}

async function loadResults() {
  state.listController?.abort();
  const controller = new AbortController();
  state.listController = controller;

  elements.results.replaceChildren();
  elements.results.setAttribute("aria-busy", "true");
  elements.pagination.hidden = true;
  showFeedback("Carregando personagens…", { loading: true });

  try {
    const data = await requestJson(buildListUrl(), controller.signal);
    renderResults(data);
  } catch (error) {
    if (controller.signal.aborted) return; // substituída por uma busca mais recente

    if (error.kind === "not-found") {
      showEmptyResults();
    } else {
      showFeedback(getErrorMessage(error), {
        tone: "error",
        actionLabel: "Tentar novamente",
        onAction: loadResults,
      });
    }
  } finally {
    if (state.listController === controller) {
      elements.results.setAttribute("aria-busy", "false");
    }
  }
}

/* ----- Detalhes do personagem (janela modal) ----- */

function addDetailRow(list, label, value) {
  list.append(createElement("dt", "", label));
  const description = createElement("dd");
  if (value instanceof Node) {
    description.append(value);
  } else {
    description.textContent = value;
  }
  list.append(description);
}

function renderDetails(character) {
  const name = cleanText(character.name) || "Personagem sem nome";
  elements.dialogTitle.textContent = name;

  const layout = createElement("div", "detail");
  layout.append(createImage(character.image, `Retrato de ${name}`, "detail-image"));

  const list = createElement("dl", "detail-list");
  addDetailRow(list, "Espécie", formatValue("species", character.species, "Desconhecida"));
  addDetailRow(list, "Status", createStatusBadge(character.status));
  addDetailRow(list, "Gênero", formatValue("gender", character.gender));
  addDetailRow(list, "Origem", formatPlace(character.origin));
  addDetailRow(list, "Localização atual", formatPlace(character.location));
  addDetailRow(list, "Aparece em", formatEpisodeCount(character.episode));
  layout.append(list);

  elements.dialogBody.replaceChildren(layout);
}

function renderDetailLoading() {
  const wrapper = createElement("div", "detail-status");
  const spinner = createElement("span", "spinner");
  spinner.setAttribute("aria-hidden", "true");
  wrapper.append(spinner, createElement("p", "", "Carregando detalhes…"));
  elements.dialogBody.replaceChildren(wrapper);
}

function renderDetailError(error, character) {
  const wrapper = createElement("div", "detail-status");
  const message =
    error.kind === "not-found" ? "Este personagem não foi encontrado na API." : getErrorMessage(error);
  wrapper.append(createElement("p", "", message));

  const retry = createElement("button", "button button-secondary", "Tentar novamente");
  retry.type = "button";
  retry.addEventListener("click", () => openDetails(character));
  wrapper.append(retry);

  elements.dialogBody.replaceChildren(wrapper);
}

async function openDetails(character) {
  state.detailController?.abort();
  const controller = new AbortController();
  state.detailController = controller;

  elements.dialogTitle.textContent = character.name;
  renderDetailLoading();
  if (!elements.dialog.open) elements.dialog.showModal();

  try {
    const data = await requestJson(`${API_URL}/${encodeURIComponent(character.id)}`, controller.signal);
    renderDetails(data);
  } catch (error) {
    if (controller.signal.aborted) return;
    renderDetailError(error, character);
  }
}

/* ---------- 5. Eventos e inicialização ---------- */

function validateName(name) {
  if (name.length > MAX_NAME_LENGTH) {
    return `use no máximo ${MAX_NAME_LENGTH} caracteres no nome.`;
  }
  if (!VALID_NAME_PATTERN.test(name)) {
    return "use apenas letras, números, espaços e os símbolos . ' ( ) -";
  }
  return "";
}

function showNameError(message) {
  elements.nameError.textContent = `Atenção: ${message}`;
  elements.nameError.hidden = false;
  elements.nameInput.setAttribute("aria-invalid", "true");
  elements.nameInput.focus();
}

function clearNameError() {
  elements.nameError.textContent = "";
  elements.nameError.hidden = true;
  elements.nameInput.removeAttribute("aria-invalid");
}

function clearSearch() {
  elements.form.reset();
  clearNameError();
  state.name = "";
  state.status = "";
  state.gender = "";
  state.page = 1;
  loadResults();
}

function changePage(step) {
  state.page += step;
  loadResults();
  elements.resultsHeading.focus();
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  // Remove espaços nas pontas e repetidos no meio.
  const name = elements.nameInput.value.trim().replace(/\s+/g, " ");
  const errorMessage = validateName(name);
  if (errorMessage) {
    showNameError(errorMessage);
    return;
  }

  clearNameError();
  elements.nameInput.value = name;
  state.name = name;
  state.status = elements.statusSelect.value;
  state.gender = elements.genderSelect.value;
  state.page = 1;
  loadResults();
});

// Os filtros aplicam assim que mudam, usando o mesmo fluxo do botão Pesquisar.
elements.statusSelect.addEventListener("change", () => elements.form.requestSubmit());
elements.genderSelect.addEventListener("change", () => elements.form.requestSubmit());

elements.clearButton.addEventListener("click", clearSearch);
elements.prevButton.addEventListener("click", () => changePage(-1));
elements.nextButton.addEventListener("click", () => changePage(1));

elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  // Clique no fundo escurecido fecha a janela.
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.dialog.addEventListener("close", () => state.detailController?.abort());

loadResults();
