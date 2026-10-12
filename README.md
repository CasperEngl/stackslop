<div align="center">

<img src="icons/icon.svg" width="96" alt="Stackslop logo: a purple stack, melting">

# Stackslop

Graphite-style PR links for GitHub. Copy a PR, or its whole stack, with titles and diff
stats, ready for Slack.

<img src="docs/slack.png" width="560" alt="A stack of five PRs pasted into Slack, each with a state mark, linked title, diff stat, and review note">

</div>

## Install

```sh
gh repo clone olivercederborg/stackslop ~/Developer/stackslop
gh auth token | pbcopy
```

1. Open `chrome://extensions` (or `arc://extensions`), turn on **Developer mode**, click
   **Load unpacked**, and pick the folder.
2. Paste the token into the options page that opens.

To update, run `git pull` in the folder, then click ↻ on the extension's card.

## Use

On a PR page, click **Copy link** or **Copy stack**, or press <kbd>C</kbd> then:

| Key | Copies |
| --- | --- |
| <kbd>P</kbd> | The PR, as a rich link with its diff stat |
| <kbd>S</kbd> | The whole stack |
| <kbd>L</kbd> / <kbd>G</kbd> | The link / the GitHub link |
| <kbd>T</kbd> / <kbd>B</kbd> | The title / the branch name |
| <kbd>C</kbd> | A `gh stack checkout` command |

The toolbar popup (<kbd>⌥</kbd><kbd>⇧</kbd><kbd>C</kbd>) previews the stack first.

**Linear Reviews:** set **Links point to** in the options, and links go to each PR's
Linear review instead. <kbd>C</kbd> <kbd>G</kbd> still copies the GitHub link.

## Troubleshooting

- **"GitHub couldn't find this PR"**: add a token in the options.
- **No Copy stack button**: the PR isn't in a GitHub stack (`gh stack`).
- **Buttons gone**: GitHub changed its page. The shortcuts and popup still work, so open an issue.
