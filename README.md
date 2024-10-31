# Natural Language PostgreSQL

This project allows you to query a PostgreSQL database using natural language, powered by the AI SDK by Vercel.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Dependencies](#dependencies)
- [License](#license)

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository:**

    ```sh
    git clone https://github.com/JG21243/vercel-postgres.git
    cd natural-language-postgres
    ```

2. **Install dependencies:**

    ```sh
    pnpm install
    ```

3. **Set up environment variables:**

    Copy the `.env.example` file to `.env` and fill in the required values.

    ```sh
    cp .env.example .env
    ```

4. **Run the development server:**

    ```sh
    pnpm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```plaintext
.env.example
.eslintrc.json
.gitignore
.vscode/
    settings.json
app/
    actions.ts
    globals.css
    layout.tsx
    page.tsx
components/
    deploy-button.tsx
    dynamic-chart.tsx
    header.tsx
    project-info.tsx
    prompts-search.tsx
    query-viewer.tsx
    skeleton-card.tsx
    suggested-queries.tsx
    ui/
    unicorn-search.tsx
    unicorn-table.tsx
components.json
legal_prompts.csv
lib/
    api.ts
    ...
next.config.js
package.json
pnpm-lock.yaml
postcss.config.js
prisma/
    ...
public/
README.md
tailwind.config.js
tsconfig.json

GitHub Copilot
Sure, I'll update your README.md based on the provided codebase structure and details. Here's the updated content:

# Natural Language PostgreSQL

This project allows you to query a PostgreSQL database using natural language, powered by the AI SDK by Vercel.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Dependencies](#dependencies)
- [License](#license)

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository:**

    ```sh
    git clone https://github.com/JG21243/vercel-postgres.git
    cd vercel-postgres
    ```

2. **Install dependencies:**

    ```sh
    pnpm install
    ```

3. **Set up environment variables:**

    Copy the `.env.example` file to `.env` and fill in the required values.

    ```sh
    cp .env.example .env
    ```

4. **Run the development server:**

    ```sh
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```plaintext
.env.example
.eslintrc.json
.gitignore
.vscode/
    settings.json
app/
    favicon.ico
    globals.css
    layout.tsx
    opengraph-image.png
    page.tsx
components/
    expanding-arrow.tsx
    refresh-button.tsx
    table-placeholder.tsx
    table.tsx
lib/
    seed.ts
    utils.ts
next.config.js
package.json
pnpm-lock.yaml
postcss.config.js
public/
    github.svg
    next.svg
    vercel.svg
tailwind.config.js
tsconfig.json
Key Files and Directories
app: Contains the main application files.
layout.tsx: Defines the root layout of the application.
globals.css: Global CSS styles.
components: Contains React components used throughout the application.
expanding-arrow.tsx: Component for an expanding arrow icon.
refresh-button.tsx: Component for a refresh button.
table.tsx: Component for displaying data in a table format.
lib: Contains utility functions and seed data scripts.
seed.ts: Script to seed the database.
utils.ts: Utility functions.
public: Static assets.
tailwind.config.js: Tailwind CSS configuration.
postcss.config.js: PostCSS configuration.
package.json: Project metadata and dependencies.
pnpm-lock.yaml: Lockfile for dependencies.
## Scripts

- **dev**: Runs the development server.
- **build**: Builds the project for production.
- **start**: Starts the production server.
- **lint**: Lints the codebase.
## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: The URL of the PostgreSQL database.
DATABASE_URL: The URL of the PostgreSQL database.
## Dependencies

Key dependencies used in this project:

- **@vercel/postgres**: PostgreSQL client.
- **ai**: AI SDK by Vercel.
- **next**: Next.js framework.
- **react**: React library.
- **tailwindcss**: Utility-first CSS framework.

For a full list of dependencies, see the package.json file.

License
This project is licensed under the MIT License. See the LICENSE file for more information.