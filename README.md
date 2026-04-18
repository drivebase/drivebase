> [!NOTE]
> The app is being written from scratch for efficiency and performance.

<img width="2167" height="1579" alt="drivebase-banner" src="https://github.com/user-attachments/assets/4ce62659-1f4e-42e0-8074-4f85fb14e53e" />

<p align="center">
  <a href="https://github.com/drivebase/drivebase/stargazers">
    <img src="https://img.shields.io/github/stars/drivebase/drivebase" alt="GitHub stars">
  </a>
 <a href="https://discord.gg/5hPZwTPp68">
    <img src="https://img.shields.io/discord/1472108078592688149" alt="Discord">
  </a>
   <a href="https://deepwiki.com/drivebase/drivebase">
    <img src="https://deepwiki.com/badge.svg" alt="Documentation" />
  </a> 
  <a href="https://www.youtube.com/watch?v=QuKxvCgBwPg">
    <img src="https://img.shields.io/badge/YouTube-%23FF0000.svg?logo=YouTube&logoColor=white" />
  </a>
</p>
 
Drivebase is a cloud-agnostic file management platform that unifies files and folders across providers while helping people and teams maintain storage ownership, control, and flexibility.

Key features include:

- **Unified workspace across providers**: Browse and manage files from multiple storage providers in one place.
- **Smart Search**: Search across all your connected providers with a single query (including text inside files and OCR).
- **Smart Uploads**: Route files automatically to the right provider using rule-based policies.
- **Vault (end-to-end encryption)**: Encrypt uploads before they leave your environment for stronger privacy.
- **Self-hosted and team-ready**: Run via Docker Compose for quick setup and invite other users to collaborate.
- **Collaboration features**: Share files and folders with granular permissions across providers.
- **WebDAV server**: Enable users to connect remotely to Drivebase using WebDAV for file access and management.

and much more!

---

## Sponsors
Drivebase is sponsored by:
<p>
  <a href="https://www.digitalocean.com/?refcode=beb117e771e7&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge"><img src="https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%201.svg" alt="DigitalOcean Referral Badge" /></a>
</p>

> Interested in [sponsoring](https://github.com/sponsors/mxvsh) this project? Your logo could appear here.


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


### Quickstart

Run the following command to install Drivebase using our automated installer. It uses Docker Compose to set up your environment and generate secure keys automatically.

```bash
curl -fsSL https://drivebase.io/install | bash
```

<img width="500" alt="image" src="https://github.com/user-attachments/assets/77574415-3c5b-4411-a0d7-94f0fe095307" />

<br/>

After you start the containers, open [http://localhost:3000](http://localhost:3000) in your browser to access the Drivebase dashboard.

Login with the default credentials:
- Email: `admin@drivebase.local`
- Password: `admin123`

Enjoy 🚀

<a href="https://www.producthunt.com/products/drivebase/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-drivebase" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1164088&theme=dark" alt="Drivebase - Unified&#0032;file&#0032;manager&#0032;for&#0032;all&#0032;your&#0032;cloud&#0032;storage&#0032;with&#0032;E2EE | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

### Manual Installation

For manual setup instructions, [check out](https://www.drivebase.io/docs/installation) our official documentation.


## Deployment

Drivebase can be deployed in various environments, including:

- **Cloud Providers**: DigitalOcean, AWS, GCP, Azure, etc.
- **VPS**: DigitalOcean, Linode, Vultr, etc.

For database storage, we recommend using a managed PostgreSQL service such as [DigitalOcean](https://www.digitalocean.com/?refcode=beb117e771e7), Neon, AWS RDS, or Google Cloud SQL for better performance and reliability.

> [Sign up](https://m.do.co/c/beb117e771e7) now on DigitalOcean to get $200 free credits.

## Support

Have questions or need help? Here's how you can reach us:

- [Discord](https://discord.gg/5hPZwTPp68)
- [Discussions](https://github.com/drivebase/drivebase/discussions)
- [Telegram](https://t.me/+fWEMYD3gp61lYWZl)
- [X](http://x.com/monawwarx)

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
