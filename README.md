

<img width="2167" height="1579" alt="drivebase-banner" src="https://github.com/user-attachments/assets/77f0b47e-6230-42ef-bd07-368a7de36a48" />

<p align="center">
  <a href="https://t.me/+fWEMYD3gp61lYWZl">
    <img src="https://img.shields.io/badge/Telegram-Join%20Chat-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram">
  </a> 
  <a href="https://drivebase.io/docs">
    <img src="https://img.shields.io/badge/Documentation-red?style=for-the-badge" alt="Documentation" />
  </a> 
  <a href="https://discord.gg/5hPZwTPp68">
    <img src="https://img.shields.io/discord/1472108078592688149?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=5865F2" alt="Discord">
  </a>
</p>

Drivebase is a cloud-agnostic file management platform for people and teams using multiple storage providers. It gives you one unified file and folder workspace across providers, with Vault for end-to-end encrypted uploads, AI-powered search that searches down to image level and Smart Uploads for rule-based file routing. The goal is to reduce provider lock-in while keeping storage ownership and control in your hands.

<p>
  <a href="https://deepwiki.com/drivebase/drivebase">
    <img src="https://deepwiki.com/badge.svg" alt="Documentation" />
  </a> 
  <a href="https://www.youtube.com/watch?v=QuKxvCgBwPg">
    <img src="https://img.shields.io/badge/YouTube-%23FF0000.svg?logo=YouTube&logoColor=white" />
  </a> 
</p>

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
- [Quickstart (Recommended)](#quickstart-recommended)
- [Manual Installation](#manual-installation)
  - [Prerequisites](#prerequisites)
  - [Steps](#steps)
- [Supported Providers](#supported-providers)
- [Contributing](#contributing)
- [License](#license)
- [Star History](#star-history)

## Getting Started

You can get started with Drivebase in multiple ways:

## Quickstart (Recommended)


Run the following command to install Drivebase using our automated installer. It uses Docker Compose to set up your environment and generate secure keys automatically.

```bash
curl -fsSL https://drivebase.io/install | bash
```

<img width="600" alt="Group" src="https://github.com/user-attachments/assets/19e11300-83e1-4e8b-a31e-17be9e2f81c9" />

After you start the containers, open [http://localhost:3000](http://localhost:3000) in your browser to access the Drivebase dashboard.

Login with the default credentials:
- Email: `admin@drivebase.local`
- Password: `admin123`

## Manual Installation

If you prefer to run the application manually without Docker Compose, you can follow the steps below.

### Prerequisites

- Bun - https://bun.sh/
- Postgres + Redis (if running app locally without full Docker app container)

### Steps

1. Clone the repository:

```bash
git clone https://github.com/drivebase/drivebase.git
cd drivebase
```

2. Install dependencies:

```bash
bun install
```

3. Update `.env.local` with required values:

```bash
cp .env.example .env.local
```

4. Start the application:

```bash
bun run dev
```

5. Open:

- App: `http://localhost:3000`
- GraphQL: `http://localhost:4000/graphql`

## Supported Providers

Drivebase supports the following cloud providers:

- [x] S3
- [x] Local Storage
- [x] Google Drive
- [x] Dropbox
- [x] FTP
- [x] WebDAV
- [x] Telegram
- [x] Nextcloud
- [x] Darkibox
- [ ] sFTP
- [ ] Box
- [ ] OneDrive


## Support

Have questions or need help? Here's how you can reach us:

- [Discord](https://discord.gg/5hPZwTPp68)
- [Telegram](https://t.me/+fWEMYD3gp61lYWZl)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Star History

<a href="https://www.star-history.com/#drivebase/drivebase&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=drivebase/drivebase&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=drivebase/drivebase&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=drivebase/drivebase&type=date&legend=top-left" />
 </picture>
</a>
