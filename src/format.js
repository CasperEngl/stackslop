const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const diffStat = (pr) => `+${pr.additions}/-${pr.deletions}`;

const label = (pr) => `#${pr.number} ${pr.title}`;

/**
 * Builds the clipboard payload for one or more PRs. Rich editors like Slack read the
 * HTML (a link plus an inline-code diff stat); plain-text targets get Markdown.
 */
export const formatPrs = (prs) => ({
  html: prs
    .map((pr) => `<a href="${escapeHtml(pr.url)}">${escapeHtml(label(pr))}</a> <code>${diffStat(pr)}</code>`)
    .join("<br>"),
  text: prs.map((pr) => `[${label(pr)}](${pr.url}) \`${diffStat(pr)}\``).join("\n"),
});
