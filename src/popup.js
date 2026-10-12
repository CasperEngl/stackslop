import { diffStat, formatPrs } from "./format.js";
import { GitHubError, fetchPr, fetchStack, parsePrUrl } from "./github.js";

const status = document.getElementById("status");
const preview = document.getElementById("preview");
const actions = document.getElementById("actions");
const copyPrButton = document.getElementById("copy-pr");
const copyStackButton = document.getElementById("copy-stack");

const showStatus = (message, { optionsLink = false } = {}) => {
  status.textContent = message;
  if (optionsLink) {
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = "Add a GitHub token";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    status.append(" ", link);
  }
  status.hidden = false;
};

const renderPreview = (prs, currentNumber) => {
  preview.replaceChildren(
    ...prs.map((pr) => {
      const item = document.createElement("li");
      if (pr.number === currentNumber) item.className = "current";
      const title = document.createElement("span");
      title.textContent = `#${pr.number} ${pr.title}`;
      const stat = document.createElement("code");
      stat.textContent = diffStat(pr);
      item.append(title, " ", stat);
      return item;
    }),
  );
  preview.hidden = false;
};

let copied = false;

const copy = async (prs) => {
  if (copied) return;
  copied = true;
  const { html, text } = formatPrs(prs);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
  } catch (error) {
    copied = false;
    showStatus(`Couldn't copy: ${error.message}`);
    return;
  }
  actions.hidden = true;
  showStatus(prs.length === 1 ? "Copied PR link" : `Copied ${prs.length} PR links`);
  setTimeout(() => window.close(), 700);
};

const activeTabUrl = async () => {
  // `?url=` lets the popup be opened as a page for testing.
  const override = new URLSearchParams(location.search).get("url");
  if (override) return override;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url;
};

const main = async () => {
  const ref = parsePrUrl(await activeTabUrl());
  if (!ref) {
    showStatus("Open a GitHub pull request to copy its link.");
    return;
  }

  const { token } = await chrome.storage.local.get("token");
  const [pr, stack] = await Promise.all([
    fetchPr(ref, token),
    // A missing stack must not block copying the PR itself.
    fetchStack(ref, token).catch(() => null),
  ]);

  const hasStack = stack !== null && stack.length > 1;
  renderPreview(hasStack ? stack : [pr], pr.number);
  status.hidden = true;
  actions.hidden = false;
  copyStackButton.hidden = !hasStack;
  if (hasStack) copyStackButton.firstChild.textContent = `Copy stack (${stack.length}) `;

  copyPrButton.addEventListener("click", () => copy([pr]));
  copyStackButton.addEventListener("click", () => copy(stack));
  document.addEventListener("keydown", (event) => {
    // A focused button handles its own Enter through the click listener.
    if (event.target instanceof HTMLButtonElement) return;
    if (event.key === "Enter") copy([pr]);
    if (hasStack && event.key.toLowerCase() === "s") copy(stack);
  });
};

main().catch((error) => {
  if (error instanceof GitHubError && [401, 403, 404].includes(error.status)) {
    showStatus(`GitHub said “${error.message}”. Private repos need a token.`, { optionsLink: true });
    return;
  }
  showStatus(`Couldn't load the PR: ${error.message}`);
});
