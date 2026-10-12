// Adds "Copy link" and "Copy stack" buttons to GitHub PR pages: next to the title, and
// next to the merge button.

const COPY_ICON =
  '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>';

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

const createButton = (label) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "prlc-button";
  button.innerHTML = `${COPY_ICON}<span></span>`;
  button.lastChild.textContent = label;
  return button;
};

const flash = (button, message) => {
  const label = button.lastChild;
  const original = label.dataset.label ?? label.textContent;
  label.dataset.label = original;
  label.textContent = message;
  setTimeout(() => (label.textContent = original), 1500);
};

const copy = (button, links, pick) => {
  // Handing ClipboardItem promises keeps the click's user activation while the PR loads.
  const payload = links.then((result) => {
    if (!result.ok) throw new Error(result.message);
    return pick(result);
  });
  const blob = (type, key) => payload.then((value) => new Blob([value[key]], { type }));

  navigator.clipboard
    .write([new ClipboardItem({ "text/html": blob("text/html", "html"), "text/plain": blob("text/plain", "text") })])
    .then(() => flash(button, "Copied"))
    .catch(async () => {
      const result = await links;
      if (result.needsToken) chrome.runtime.sendMessage({ type: "open-options" });
      else flash(button, "Couldn't copy");
    });
};

const render = (url, spot) => {
  const container = document.createElement("span");
  container.className = "prlc-actions";
  container.dataset.url = url;
  container.dataset.spot = spot;

  const prButton = createButton("Copy link");
  const stackButton = createButton("Copy stack");
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

  prButton.addEventListener("click", () => copy(prButton, links, (result) => result.pr));
  stackButton.addEventListener("click", () => copy(stackButton, links, (result) => result.stack));
  return container;
};

// Each spot says where its buttons go, or null when the page doesn't have it.
const SPOTS = {
  header: () => {
    const title = document.querySelector(TITLE_SELECTOR);
    if (!title) return null;
    // The React header keeps the "#123" next to the title, so go after it.
    const titleArea = title.closest('[data-component="TitleArea"]');
    return titleArea ? { parent: titleArea } : { parent: title.parentElement, after: title };
  },
  "merge-box": () => {
    const mergeButtons = document.querySelector(
      '[class*="MergeBox-module__mergePartialContainer"] [data-component="ButtonGroup"]',
    );
    return mergeButtons && { parent: mergeButtons.parentElement, after: mergeButtons };
  },
};

const isPlaced = (container, spot) =>
  container.parentElement === spot.parent && (!spot.after || container.previousElementSibling === spot.after);

// GitHub navigates without page loads and re-renders parts of the page, so re-check on DOM changes.
const sync = () => {
  const match = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(location.pathname);
  const url = match && `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`;

  for (const [name, find] of Object.entries(SPOTS)) {
    const existing = document.querySelector(`.prlc-actions[data-spot="${name}"]`);
    const spot = url && find();
    if (existing && spot && existing.dataset.url === url && isPlaced(existing, spot)) continue;

    existing?.remove();
    if (!spot) continue;
    const container = render(url, name);
    if (spot.after) spot.after.after(container);
    else spot.parent.append(container);
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
