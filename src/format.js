const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const diffStat = (pr) => `+${pr.additions}/-${pr.deletions}`;

// GitHub's state colors: green open, grey draft, purple merged, red closed.
export const STATES = {
  open: { icon: "🟢", label: null },
  draft: { icon: "⚪", label: "draft" },
  merged: { icon: "🟣", label: "merged" },
  closed: { icon: "🔴", label: "closed" },
};

const label = (pr) => `#${pr.number} ${pr.title}`;

const prHtml = (pr) =>
  `<a href="${escapeHtml(pr.url)}">${escapeHtml(label(pr))}</a> <code>${diffStat(pr)}</code>`;

const prText = (pr) => `[${label(pr)}](${pr.url}) \`${diffStat(pr)}\``;

/**
 * Builds the clipboard payload for PRs. Rich editors like Slack read the HTML (a link plus
 * an inline-code diff stat); plain-text targets get Markdown.
 */
export const formatPrs = (prs) => ({
  html: prs.map(prHtml).join("<br>"),
  text: prs.map(prText).join("\n"),
});

/** Like formatPrs, with each PR's state and the trunk the stack merges into. */
export const formatStack = ({ trunk, prs }) => {
  const suffix = (pr, wrap) => (STATES[pr.state].label ? ` ${wrap(STATES[pr.state].label)}` : "");
  return {
    html: [
      ...prs.map((pr) => `${STATES[pr.state].icon} ${prHtml(pr)}${suffix(pr, (l) => `<i>${l}</i>`)}`),
      `↳ <code>${escapeHtml(trunk)}</code>`,
    ].join("<br>"),
    text: [
      ...prs.map((pr) => `${STATES[pr.state].icon} ${prText(pr)}${suffix(pr, (l) => `_${l}_`)}`),
      `↳ \`${trunk}\``,
    ].join("\n"),
  };
};
