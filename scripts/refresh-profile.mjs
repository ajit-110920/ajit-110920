import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const username = process.env.GITHUB_USERNAME || "ajit-110920";
const token = process.env.GITHUB_TOKEN;
const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]);

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "ajit-110920-profile-readme", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) throw new Error(`GitHub API ${response.status} while requesting ${path}`);
  return response.json();
}

function describeEvent(event) {
  const repo = event.repo?.name || "a repository";
  const payload = event.payload || {};
  if (event.type === "PushEvent") return payload.size ? `Pushed ${payload.size} commit${payload.size === 1 ? "" : "s"} to ${repo}` : `Updated ${repo}`;
  if (event.type === "CreateEvent") return `Created ${payload.ref_type || "repository"} in ${repo}`;
  if (event.type === "PullRequestEvent") return `${payload.action || "Updated"} a pull request in ${repo}`;
  if (event.type === "IssuesEvent") return `${payload.action || "Updated"} an issue in ${repo}`;
  if (event.type === "WatchEvent") return `Starred ${repo}`;
  return `${event.type.replace(/Event$/, "")} in ${repo}`;
}

function pulseSvg({ profile, repositories, events }) {
  const stars = repositories.reduce((total, repository) => total + repository.stargazers_count, 0);
  const recent = [...new Set(events.map(describeEvent))].slice(0, 3);
  const lines = recent.length ? recent : ["No recent public activity returned by GitHub."];
  const refreshed = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date());
  const activity = lines.map((line, index) => `<text x="76" y="${258 + index * 28}" class="activity">${escapeXml(line)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 390" role="img" aria-labelledby="title desc">
  <title id="title">GitHub pulse for ${escapeXml(username)}</title><desc id="desc">Public GitHub account totals and recent public activity, refreshed ${escapeXml(refreshed)} UTC.</desc>
  <defs><linearGradient id="b" x1="0" x2="1"><stop stop-color="#030d18"/><stop offset="1" stop-color="#071522"/></linearGradient><style>.label{font:600 13px ui-monospace,monospace;letter-spacing:2px;fill:#65dff5}.value{font:700 42px ui-monospace,monospace;fill:#e7fcff}.caption{font:14px ui-monospace,monospace;fill:#86aab4}.activity{font:15px ui-monospace,monospace;fill:#d7f8fb}</style></defs>
  <rect width="1200" height="390" rx="18" fill="url(#b)"/><path d="M48 190H1152" stroke="#1a4051"/><path d="M48 80H1152" stroke="#1a4051" stroke-dasharray="3 11"/>
  <text x="60" y="55" class="label">GITHUB // PULSE</text><text x="60" y="128" class="value">${profile.public_repos}</text><text x="60" y="157" class="caption">PUBLIC REPOSITORIES</text><text x="350" y="128" class="value">${stars}</text><text x="350" y="157" class="caption">STARS EARNED</text><text x="590" y="128" class="value">${profile.followers}</text><text x="590" y="157" class="caption">FOLLOWERS</text><text x="810" y="128" class="value">${profile.following}</text><text x="810" y="157" class="caption">FOLLOWING</text><text x="60" y="222" class="label">RECENT PUBLIC ACTIVITY</text>${activity}<text x="60" y="360" class="caption">SOURCE: GitHub REST API  •  REFRESHED: ${escapeXml(refreshed)} UTC</text></svg>`;
}

const [profile, repositories, events] = await Promise.all([
  github(`/users/${encodeURIComponent(username)}`),
  github(`/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated`),
  github(`/users/${encodeURIComponent(username)}/events/public?per_page=100`),
]);
const output = resolve("assets/github-pulse.svg");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${pulseSvg({ profile, repositories, events })}\n`, "utf8");
console.log(`Refreshed ${output} for ${username}.`);
