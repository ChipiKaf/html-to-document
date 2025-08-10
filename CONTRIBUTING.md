# Contributing to **html‑to‑document**

First off, **thank you** for taking the time to contribute!  
Whether you’re fixing a bug, adding a feature, or improving docs, your help makes this project better for everyone.

---

## 🛠 Local Development Workflow

1. **Fork & Clone**

   ```bash
   git clone https://github.com/your‑username/html-to-document.git
   cd html-to-document
   ```

2. **Install root dependencies (monorepo)**

   ```bash
   bun install
   ```

3. **Work in the core package**

   ```bash
   cd packages/core
   bun run dev      # rebuilds on file change
   ```

   The watcher outputs compiled files to `packages/core/dist`.

4. **Test your changes in the live demo**

   ```bash
   # back to repo root
   cd ../../packages/demo
   bun install      # pulls the fresh dist build
   bun run dev      # launches the Vite demo at http://localhost:5173
   ```

   > **Do not edit `index.ts` directly.**  
   > Create an `_index.ts` alongside it (ignored by git) to experiment locally without affecting the repo:
   >
   > ```bash
   > cp src/index.ts src/_index.ts
   > # hack on _index.ts as you wish
   > ```

5. **Run tests & lint**

   ```bash
   bun run test                  # from repo root (runs workspace tests)
   bun run lint
   ```

6. **Commit & Push**

   ```bash
   git checkout -b my-feature
   git add .
   git commit -m "feat(core): awesome new thing"
   git push origin my-feature
   ```

7. **Open a Pull Request** against `ChipiKaf/html-to-document:main`  
   Describe **what** and **why** clearly. If it fixes an issue, reference it (e.g., `Fixes #123`).

---

## 📐 Coding Standards

- **TypeScript** only—no `any` unless unavoidable.
- Keep functions small & focused.
- Add/extend **unit tests** for every new feature or bug fix (`packages/core/__tests__`).
- Run `bun run lint` and ensure no ESLint errors.

---

## 🐞 Reporting Issues

1. Use the **Bug Report** or **Feature Request** issue template.
2. **Reproduce in the live demo** or a CodeSandbox if possible.
3. Include **expected vs. actual** behaviour and any error logs.

---

Happy hacking! ✨

# Contributing to **html‑to‑document**

First off, **thank you** for taking the time to contribute!  
Whether you’re fixing a bug, adding a feature, or improving docs, your help makes this project better for everyone.

---

## 🛠 Local Development Workflow

The repo has three top‑level folders that matter when contributing:

| Folder  | Purpose                                                                                |
| ------- | -------------------------------------------------------------------------------------- |
| `src/`  | Source code of the library that gets published to npm (`dist/` is generated from this) |
| `demo/` | Vite demo app used to manually test changes                                            |
| `docs/` | Docusaurus documentation                                                               |

Follow the steps below to develop and test locally.

1. **Fork & Clone**

   ```bash
   git clone https://github.com/your‑username/html-to-document.git
   cd html-to-document
   ```

2. **Install root dependencies**

   ```bash
   bun install
   ```

3. **Develop the library**

   ```bash
   # From repo root
   bun run dev       # or `bun run build:watch` if you have that script
   ```

   This watches `src/` and emits fresh code into `dist/` on every save.

4. **Test your changes in the live demo**

   ```bash
   cd demo
   bun install       # pulls the freshly‑built library from the root
   bun run dev       # opens the demo at http://localhost:5173
   ```

   > **Do not edit `src/index.ts` in the demo directly.**  
   > Create an `_index.ts` alongside it (ignored by git) to experiment without affecting the repo:
   >
   > ```bash
   > cp src/index.ts src/_index.ts
   > # hack on _index.ts as you wish
   > ```

5. **Run tests & lint**

   ```bash
   # back to repo root
   bun test          # runs Jest tests in __tests__/
   bun run lint
   ```

6. **Commit & Push**

   ```bash
   git checkout -b my-feature
   git add .
   git commit -m "feat: awesome new thing"
   git push origin my-feature
   ```

7. **Open a Pull Request**  
   Describe **what** you changed and **why**. If it fixes an issue, reference it (e.g., `Fixes #123`).

---

## 📐 Coding Standards

- **TypeScript** only—avoid `any` unless absolutely unavoidable.
- Keep functions small & focused.
- Add or extend **unit tests** for every new feature or bug fix (`__tests__/`).
- Run `bun run lint` and ensure no ESLint errors.

---

## 🐞 Reporting Issues

1. Use the **Bug Report** or **Feature Request** template.
2. **Reproduce in the live demo** (or provide a CodeSandbox).
3. Include **expected vs. actual** behaviour and full error logs.

---

Happy hacking! ✨
