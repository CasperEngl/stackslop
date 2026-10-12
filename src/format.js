const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const diffStat = (pr) => `+${pr.additions}/-${pr.deletions}`;

// Text glyphs rather than emoji: they stay at text size in Slack, which drops colors anyway.
export const STATES = {
  open: { icon: "●", label: null },
  draft: { icon: "○", label: "draft" },
  merged: { icon: "✓", label: "merged" },
  closed: { icon: "✕", label: "closed" },
};

// Only "approved" and "changes requested" are worth a word; "review required" is the norm.
const REVIEWS = { approved: "approved", changes_requested: "changes requested" };

/** The word after a stacked PR: its state when not open, else its review decision. */
export const stackNote = (pr) => STATES[pr.state].label ?? REVIEWS[pr.review] ?? null;

const label = (pr) => `#${pr.number} ${pr.title}`;

/**
 * Where copied links point: "github", or "linear" for Linear's review page, falling back
 * to GitHub for a PR that Linear hasn't linked.
 */
export const linkFor = (pr, target) => (target === "linear" && pr.linearUrl) || pr.url;

const prHtml = (pr, target) =>
  `<a href="${escapeHtml(linkFor(pr, target))}">${escapeHtml(label(pr))}</a> <code>${diffStat(pr)}</code>`;

const prText = (pr, target) => `[${label(pr)}](${linkFor(pr, target)}) \`${diffStat(pr)}\``;

/**
 * Builds the clipboard payload for PRs. Rich editors like Slack read the HTML (a link plus
 * an inline-code diff stat); plain-text targets get Markdown.
 */
export const formatPrs = (prs, target) => ({
  html: prs.map((pr) => prHtml(pr, target)).join("<br>"),
  text: prs.map((pr) => prText(pr, target)).join("\n"),
});

/** Like formatPrs, with each PR's state and the trunk the stack merges into. */
export const formatStack = ({ trunk, prs }, target) => {
  const suffix = (pr, wrap) => (stackNote(pr) ? ` ${wrap(stackNote(pr))}` : "");
  return {
    html: [
      ...prs.map((pr) => `${STATES[pr.state].icon} ${prHtml(pr, target)}${suffix(pr, (l) => `<i>${l}</i>`)}`),
      `└ <code>${escapeHtml(trunk)}</code>`,
    ].join("<br>"),
    text: [
      ...prs.map((pr) => `${STATES[pr.state].icon} ${prText(pr, target)}${suffix(pr, (l) => `_${l}_`)}`),
      `└ \`${trunk}\``,
    ].join("\n"),
  };
};
