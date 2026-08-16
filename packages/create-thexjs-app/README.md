<p align="center">
  <img src="https://github.com/abdelkabirouadoukou/x/raw/main/examples/landing/public/favicon.ico" alt="x framework logo" width="96" height="96">
</p>

<h1 align="center">create-thexjs-app</h1>

<p align="center">
  Scaffold a new <strong>x</strong> app with interactive feature selection — a
  single universal template, styled like <code>create-next-app</code>.
</p>

<p align="center">
  <a href="#usage">Usage</a> •
  <a href="#features">Features</a> •
  <a href="#cli-flags">CLI flags</a> •
  <a href="#development">Development</a>
</p>

## Usage

Requires [Bun](https://bun.sh). Run the scaffolder with:

```bash
bun create thexjs-app@latest
```

You'll be guided through interactive prompts:

- **Project name** — e.g. `my-app`
- **Features** — choose from Tailwind CSS, shadcn/ui, Auth, and Content collections
- **Install & git** — confirm dependency install and `git init`

```bash
bun create thexjs-app@latest my-app
cd my-app
bun run dev
```

Your app runs at `http://localhost:3000` with hot reload.

## Features

The scaffolder ships a single lean base template. Every feature is optional and
selected at prompt time (or via CLI flags).

| Feature           | Adds                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **Tailwind CSS**  | Utility-first styling + the x dev/build Tailwind pipeline                                             |
| **shadcn/ui**     | Accessible React components in `src/components/ui` (requires Tailwind)                                |
| **Auth**          | SQLite-backed demo sessions, `/login` and a protected `/dashboard` with middleware                    |
| **Content**       | Markdown/MDX with frontmatter in `content/`, auto-routed and indexed on `/blog`                       |

Enabling **shadcn/ui** automatically enables **Tailwind CSS**.

A generated project always includes a complete `.gitignore`, a self-contained
`tsconfig.json`, and (by default) an initialized git repository.

## CLI flags

Skips the interactive prompts — useful for scripting and CI:

```bash
bun create thexjs-app@latest my-app --tailwind --auth --content --shadcn
```

| Flag              | Description                                   |
| ----------------- | --------------------------------------------- |
| `<name>`          | Project name (creates a directory named `slug`) |
| `--tailwind`      | Include Tailwind CSS                          |
| `--shadcn`        | Include shadcn/ui (implies `--tailwind`)      |
| `--auth`          | Include demo auth                             |
| `--content`       | Include content collections                   |
| `--no-install`    | Skip `bun install`                            |
| `--no-git`        | Skip `git init`                               |
| `--dev`           | Start the dev server after install            |

## Development

```bash
cd packages/create-thexjs-app
bun install
bun run build           # build dist/index.js (tsup)
bun run build:watch     # rebuild on change
```

Run the built CLI locally:

```bash
node dist/index.js
```

The generator reads the base template from `templates/base` and optional
feature addons from `templates/addons/<feature>`. Addons mirror the project
root and are merged on top of the base template, so addon files can override
base files (e.g. Tailwind's `src/styles/globals.css`).

## License

MIT
