// Adds "Copy link" and "Copy stack" buttons to GitHub PR pages: in the header, and next
// to the merge button.

const COPY_ICON =
  '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>';
const svg = (paths) =>
  `<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">${paths}</svg>`;
const CHECK_ICON = svg(
  '<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>',
);
const X_ICON = svg(
  '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>',
);

// The React PR header first, then the classic one.
const TITLE_SELECTOR = 'h1[data-component="PH_Title"], .gh-header-title';
const CACHE_MS = 60_000;

const cache = new Map();

const loadLinks = (url) => {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.links;
  const links = chrome.runtime
    .sendMessage({ type: "load-links", url })
    .catch((error) => ({ ok: false, message: error.message }));
  cache.set(url, { at: Date.now(), links });
  return links;
};

// What each button copies, and its Graphite shortcut (C then the key).
const KINDS = {
  pr: { key: "p", pick: (result) => result.pr },
  stack: { key: "s", pick: (result) => result.stack },
};

const createButton = (kind, label) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "prlc-button";
  button.dataset.kind = kind;
  button.setAttribute("aria-keyshortcuts", `c ${KINDS[kind].key}`);
  button.innerHTML = `${COPY_ICON}<span></span>`;
  button.lastChild.textContent = label;
  return button;
};

// Swaps only the icon, so the button keeps its width.
const flash = (button, outcome, message) => {
  clearTimeout(button.flashTimer);
  button.firstElementChild.outerHTML = outcome === "copied" ? CHECK_ICON : X_ICON;
  button.dataset.outcome = outcome;
  button.title = message;
  button.flashTimer = setTimeout(() => {
    button.firstElementChild.outerHTML = COPY_ICON;
    delete button.dataset.outcome;
    button.removeAttribute("title");
  }, 1500);
};

/** Copies one kind of link. `button`, when given, shows the outcome. */
const copy = (kind, links, button) => {
  // Handing ClipboardItem promises keeps the user activation while the PR loads.
  const payload = links.then((result) => {
    if (!result.ok) throw Object.assign(new Error(result.message), { needsToken: result.needsToken });
    const value = KINDS[kind].pick(result);
    if (!value) throw new Error("this PR isn't in a stack");
    return value;
  });
  const blob = (type, key) => payload.then((value) => new Blob([value[key]], { type }));

  navigator.clipboard
    .write([new ClipboardItem({ "text/html": blob("text/html", "html"), "text/plain": blob("text/plain", "text") })])
    .then(() => button && flash(button, "copied", "Copied"))
    .catch(async (writeError) => {
      const error = (await payload.then(() => null, (loadError) => loadError)) ?? writeError;
      if (error.needsToken) chrome.runtime.sendMessage({ type: "open-options" });
      else if (button) flash(button, "failed", `Couldn't copy: ${error.message}`);
    });
};

const render = (url, name, spot) => {
  const container = document.createElement("span");
  container.className = "prlc-actions";
  container.dataset.url = url;
  container.dataset.spot = name;
  container.dataset.size = spot.size;

  const prButton = createButton("pr", "Copy link");
  const stackButton = createButton("stack", "Copy stack");
  stackButton.hidden = true;
  container.append(prButton, stackButton);

  const links = loadLinks(url);
  links.then((result) => {
    if (result.ok && result.stack) {
      stackButton.lastChild.textContent = `Copy stack (${result.stack.count})`;
      stackButton.hidden = false;
    }
    if (result.needsToken) prButton.title = "GitHub needs a token for this repo. Click to add one.";
  });

  prButton.addEventListener("click", () => copy("pr", links, prButton));
  stackButton.addEventListener("click", () => copy("stack", links, stackButton));
  return container;
};

// Each spot says where its buttons go and at what size, or null when the page lacks it.
const SPOTS = {
  header: () => {
    // Signed in, GitHub's own header buttons sit here; sit with them at their size.
    const actions = document.querySelector('[data-component="PH_Actions"]');
    const hasGitHubButtons = [...(actions?.children ?? [])].some((child) => !child.matches(".prlc-actions"));
    if (actions && !actions.classList.contains("d-none") && hasGitHubButtons) {
      return { parent: actions, first: true, size: "medium" };
    }
    const title = document.querySelector(TITLE_SELECTOR);
    if (!title) return null;
    // The React header keeps the "#123" next to the title, so go after it.
    const titleArea = title.closest('[data-component="TitleArea"]');
    if (titleArea) return { parent: titleArea, size: "small" };
    return { parent: title.parentElement, after: title, size: "small" };
  },
  "merge-box": () => {
    // The test id is stable; GitHub's hashed CSS module class names change between builds.
    const mergeButtons = document.querySelector(
      '[data-testid="mergebox-border-container"] [data-component="ButtonGroup"]',
    );
    return mergeButtons && { parent: mergeButtons.parentElement, after: mergeButtons, size: "medium" };
  },
};

const isPlaced = (container, spot) => {
  if (container.parentElement !== spot.parent) return false;
  if (spot.first) return spot.parent.firstElementChild === container;
  return !spot.after || container.previousElementSibling === spot.after;
};

const mount = (container, spot) => {
  if (spot.first) spot.parent.prepend(container);
  else if (spot.after) spot.after.after(container);
  else spot.parent.append(container);
};

const currentPrUrl = () => {
  const match = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(location.pathname);
  return match && `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`;
};

// GitHub navigates without page loads and re-renders parts of the page, so re-check on DOM changes.
const sync = () => {
  const url = currentPrUrl();

  for (const [name, find] of Object.entries(SPOTS)) {
    const existing = document.querySelector(`.prlc-actions[data-spot="${name}"]`);
    const spot = url && find();
    const current = existing && spot && existing.dataset.url === url && existing.dataset.size === spot.size;
    // Only touch the DOM when something changed, or the observer would loop.
    if (current && isPlaced(existing, spot)) continue;

    if (current) mount(existing, spot);
    else {
      existing?.remove();
      if (spot) mount(render(url, name, spot), spot);
    }
  }
};

let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    sync();
  });
}).observe(document.documentElement, { childList: true, subtree: true });
sync();

// Graphite's shortcuts: C then P copies the PR, C then S its stack. The C still reaches
// GitHub, which uses it on the Files tab; only the second key is ours.
const SHORTCUT_WINDOW_MS = 1500;
let pressedC = 0;

const isTyping = (target) =>
  target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

window.addEventListener(
  "keydown",
  (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat) return;
    if (isTyping(event.target)) return;

    const key = event.key.toLowerCase();
    const afterC = Date.now() - pressedC < SHORTCUT_WINDOW_MS;
    pressedC = key === "c" ? Date.now() : 0;
    const kind = Object.keys(KINDS).find((k) => KINDS[k].key === key);
    const url = currentPrUrl();
    if (!afterC || !kind || !url) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const button = document.querySelector(`.prlc-actions[data-spot="header"] .prlc-button[data-kind="${kind}"]`);
    copy(kind, loadLinks(url), button);
  },
  // Capture on window runs before GitHub's own key handlers.
  true,
);
