# Contributing to Drivebase

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to Drivebase. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## 🛠️ Prerequisites

Before you start, make sure you have the following installed:

- **[Bun](https://bun.sh/)** (v1.x) - This project uses Bun as the package manager and runtime.
- **[Docker](https://www.docker.com/)** - Required for running the database (PostgreSQL) and Redis locally.

## 🚀 Getting Started

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-username/drivebase.git
    cd drivebase
    ```

2.  **Install dependencies**

    ```bash
    bun install
    ```

3.  **Environment Setup**

    Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

    Update the `.env` file with your local configuration if necessary. The defaults usually work for local development.

4.  **Start Infrastructure**

    Start PostgreSQL and Redis using Docker:

    ```bash
    docker compose up -d db redis
    ```

5.  **Database Migration**

    Run the database migrations to set up the schema:

    ```bash
    bun db:migrate
    ```

6.  **Start Development Server**

    Start both the API and Web application in development mode:

    ```bash
    bun dev
    ```

    - **Web App:** [http://localhost:3000](http://localhost:3000)
    - **API:** [http://localhost:4000/graphql](http://localhost:4000/graphql)

## 📂 Project Structure

This is a monorepo managed by [Turbo](https://turbo.build/) and [Bun](https://bun.sh/).

- **`apps/`**
    - **`api`**: GraphQL API server (built with GraphQL Yoga, Bun, and Drizzle ORM).
    - **`web`**: Frontend application (built with Vite, React, Tailwind CSS, and TanStack Router).
    - **`www`**: Documentation/Landing page (Next.js).
- **`packages/`**
    - **`db`**: Database schema, migrations, and Drizzle client.
    - **`core`**: Shared core business logic, types, and interfaces.
    - **`utils`**: Shared utility functions.
    - **`google-drive`**, **`dropbox`**, **`s3`**, **`local`**: Storage provider implementations.

## 💻 Development Workflow

### Scripts

- **`bun dev`**: Starts the development servers for API and Web.
- **`bun run build`**: Builds the applications for production.
- **`bun test`**: Runs the test suite.
- **`bun db:studio`**: Opens Drizzle Studio to inspect the database.

### Database Changes

If you modify the database schema in `packages/db/schema`, you need to generate a migration:

```bash
bun db:generate
bun db:migrate
```

## 🎨 Code Standards

### Linting & Formatting

We use [Biome](https://biomejs.dev/) for both linting and formatting.

To check for issues:
```bash
bun x biome check .
```

To automatically fix issues and format code:
```bash
bun x biome check --write .
```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) to format commit messages. This is enforced by Husky and Commitlint.

**Format:** `<type>(<scope>): <subject>`

**Examples:**
- `feat(api): add new user resolver`
- `fix(web): correct spacing in sidebar`
- `chore: update dependencies`
- `docs: update contributing guide`

## 🧪 Testing

Please ensure that your changes pass the existing tests and add new tests for new features or bug fixes.

```bash
bun test
```

## 📥 Pull Request Process

1.  Fork the repository and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  Ensure the test suite passes.
4.  Make sure your code lints and follows the project style.
5.  Commit your changes using descriptive commit messages (following Conventional Commits).
6.  Push your branch to GitHub and open a Pull Request.

Happy coding! 🚀
