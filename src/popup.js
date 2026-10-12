import { STATES, diffStat, formatPrs, formatStack } from "./format.js";
import { GitHubError, fetchPrWithStack, parsePrUrl } from "./github.js";

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

const renderPreview = (pr, stack) => {
  const items = (stack?.prs ?? [pr]).map((stackPr) => {
    const item = document.createElement("li");
    if (stackPr.number === pr.number) item.className = "current";
    const title = document.createElement("span");
    title.textContent = `#${stackPr.number} ${stackPr.title}`;
    const stat = document.createElement("code");
    stat.textContent = diffStat(stackPr);
    if (stack) item.append(`${STATES[stackPr.state].icon} `);
    item.append(title, " ", stat);
    if (stack && STATES[stackPr.state].label) item.append(" ", STATES[stackPr.state].label);
    return item;
  });
  if (stack) {
    const trunk = document.createElement("li");
    const branch = document.createElement("code");
    branch.textContent = stack.trunk;
    trunk.append("└ ", branch);
    items.push(trunk);
  }
  preview.replaceChildren(...items);
  preview.hidden = false;
};

let copied = false;

const copy = async ({ html, text }, count) => {
  if (copied) return;
  copied = true;
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
  showStatus(count === 1 ? "Copied PR link" : `Copied ${count} PR links`);
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
  const { pr, stack } = await fetchPrWithStack(ref, token);

  const hasStack = stack !== null;
  renderPreview(pr, stack);
  status.hidden = true;
  actions.hidden = false;
  copyStackButton.hidden = !hasStack;
  if (hasStack) copyStackButton.firstChild.textContent = `Copy stack (${stack.prs.length}) `;

  const copyPr = () => copy(formatPrs([pr]), 1);
  const copyStack = () => copy(formatStack(stack), stack.prs.length);
  copyPrButton.addEventListener("click", copyPr);
  copyStackButton.addEventListener("click", copyStack);
  document.addEventListener("keydown", (event) => {
    // A focused button handles its own Enter through the click listener.
    if (event.target instanceof HTMLButtonElement) return;
    if (event.key === "Enter") copyPr();
    if (hasStack && event.key.toLowerCase() === "s") copyStack();
  });
};

main().catch((error) => {
  if (error instanceof GitHubError && [401, 403, 404].includes(error.status)) {
    showStatus(`GitHub said “${error.message}”. Private repos need a token.`, { optionsLink: true });
    return;
  }
  showStatus(`Couldn't load the PR: ${error.message}`);
});
