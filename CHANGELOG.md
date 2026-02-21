# Changelog

## [2.1.1](https://github.com/drivebase/drivebase/compare/v2.1.0...v2.1.1) (2026-02-21)


### Bug Fixes

* update trigger logic with latestGithubTag ([7e583d0](https://github.com/drivebase/drivebase/commit/7e583d071735fb00bc7f34ee414c0d274bbad456))

# [2.1.0](https://github.com/drivebase/drivebase/compare/v2.0.0...v2.1.0) (2026-02-21)


### Bug Fixes

* add an extractable parameter to both decrypt functions ([34bc7c6](https://github.com/drivebase/drivebase/commit/34bc7c67320566dc5083332a35e9468eb1cd73a7))
* add inputType support to prompt dialog ([52e6e19](https://github.com/drivebase/drivebase/commit/52e6e19430ce017996404c6bd76aa437f3615425))
* backup recovery key functionality ([5c3cf32](https://github.com/drivebase/drivebase/commit/5c3cf32986c4c1f8a7254871cbc6a55a8692dd8d))
* complete missing translations ([a0b3b99](https://github.com/drivebase/drivebase/commit/a0b3b99fb2af54382e89fce61b164c5ea9ba4e58))
* enhance backup download process with passphrase prompt and error handling ([a083215](https://github.com/drivebase/drivebase/commit/a0832153ee49a107fdaf62e294fbe9355d2d669a))
* exclude vault files from regular file queries ([aa00e58](https://github.com/drivebase/drivebase/commit/aa00e5892211b95ebb15befe313a53c0c54ab44b))
* proxy download functionality for files ([289b26a](https://github.com/drivebase/drivebase/commit/289b26a66ff8b7f96e3accdcf64f126ccc6726f8))
* remove unlock requirement for backup download and passphrase change ([082e695](https://github.com/drivebase/drivebase/commit/082e695633de312f169bd9bf7fb6c2f6ee7624b0))
* sanitize error message in login form ([c25a02b](https://github.com/drivebase/drivebase/commit/c25a02bf2f4443d7ead50152bea6f8b6db767bfa))
* update .gitignore to include I18n generated files ([68e5e63](https://github.com/drivebase/drivebase/commit/68e5e6310fb37b9658cf4b3b9af47a3ed224cb85))
* update lint-staged config to correctly ignore message files ([f92ed24](https://github.com/drivebase/drivebase/commit/f92ed24cefd5f666c4ed0f9dd7ef7048322d1bfe))
* update passphrase fields during vault setup process ([e94393f](https://github.com/drivebase/drivebase/commit/e94393fd01351fde346992302cff41c4f60779ba))

# [2.0.0](https://github.com/drivebase/drivebase/compare/v1.13.0...v2.0.0) (2026-02-20)


### Bug Fixes

* add provider details to VAULT_CONTENTS_QUERY ([eabccb8](https://github.com/drivebase/drivebase/commit/eabccb8a1ecd2efd3792bcf5260acefced25147b))
* correct header assignment and import order in update hooks ([7333828](https://github.com/drivebase/drivebase/commit/73338280179073c7a79a9999bf2b51cb60b68238))
* **release:** add releaseName to GitHub configuration ([0ef48e2](https://github.com/drivebase/drivebase/commit/0ef48e27b2b4f89733fab4c079bac3d5c9d61f42))
* remove remoteId and providerId fields to clarify the organizational nature of folders ([7b6af66](https://github.com/drivebase/drivebase/commit/7b6af66ea80cb90cff75d2a4eb8dba1f7535c9da))
* remove unused var and reorder ([dc4c963](https://github.com/drivebase/drivebase/commit/dc4c963f92f66c6302c27b6be8a88e1175c2056b))
* store server instance for proper shutdown handling ([9405e5c](https://github.com/drivebase/drivebase/commit/9405e5c1b539c94be128af09d051ae232c61c442))
* tsr generate ([1809553](https://github.com/drivebase/drivebase/commit/18095531a8cf7ee2fed4a73ec327266f38abc70c))
* update descriptions in WelcomeStep for clarity ([37d34fb](https://github.com/drivebase/drivebase/commit/37d34fb8a97f97513e598b8a23b6a957c5b91cea))
* update GitHub link in Hero component to point to the correct repository ([7b9a699](https://github.com/drivebase/drivebase/commit/7b9a69988d13b64d2702b51ab3dbe5255be17c4c))
* **web:** migrate Trans imports to @lingui/react/macro ([7bef628](https://github.com/drivebase/drivebase/commit/7bef628157e03918d76f86eb01b271d2755c2bdc))


### Features

* add commit message generation prompt ([b2200a0](https://github.com/drivebase/drivebase/commit/b2200a05eae2fbe0c7e380ac2cb25bde5d250b56))
* add destination path handling for uploads and update upload hook options ([2e4b66e](https://github.com/drivebase/drivebase/commit/2e4b66ebf8326d29c405223426c5cc75315c4aec))
* add new pages for Vault, Smart Upload, Cloud Transfers, and Team Collaboration ([772d0ab](https://github.com/drivebase/drivebase/commit/772d0abdcb41759875b1420319ca1ce048698cb4))
* add recent updates feature with API integration and loading state ([327382a](https://github.com/drivebase/drivebase/commit/327382ab83d4a9778a9b0cb8194f0bf67b5fc965))
* add tab selection for invite expiration and standardize settings input widths ([5217e64](https://github.com/drivebase/drivebase/commit/5217e647aca6f67e52c7b94dfa30a7e57fa6290a))
* add updater service for application updates ([efefd39](https://github.com/drivebase/drivebase/commit/efefd39726a7fac09b43274d53f090df991e3232))
* create separate users section ([360c5ca](https://github.com/drivebase/drivebase/commit/360c5ca3a088673a12d75795ae1aa7224bf40b51))
* file upload rules ([592ad47](https://github.com/drivebase/drivebase/commit/592ad47e0c97b3d84f9f37be1321094415a2d59f))
* **i18n:** add Arabic language with RTL support and migrate to PO format ([921b7a9](https://github.com/drivebase/drivebase/commit/921b7a988794a95f944a1b9fef8d6c65c09455bb))
* implement vault ([8484c60](https://github.com/drivebase/drivebase/commit/8484c606d23722755ec6ab1356d7c1c876754a16))
* implement workspace export functionality with encryption options ([3204187](https://github.com/drivebase/drivebase/commit/3204187abe4ac367fb924184d304fc8bdc1b1adc))

# [1.13.0](https://github.com/drivebase/drivebase/compare/v1.12.0...v1.13.0) (2026-02-17)


### Bug Fixes

* enforce active-workspace scoping for files/folders and tighten role-gated file actions ([e421cd5](https://github.com/drivebase/drivebase/commit/e421cd5e689b0052a74f4ed9195793af5c5e9eda))
* safely access workspace ID from headers in file and provider resolvers ([52fd9d8](https://github.com/drivebase/drivebase/commit/52fd9d82cdc9658d7045928a9c6bd806c71781cc))


### Features

* add workspace memberships and invites ([fb33b53](https://github.com/drivebase/drivebase/commit/fb33b538f5b8d377e947cc30d8a827c9f0cdf2f1))
* add workspaces schema and related services ([715dd97](https://github.com/drivebase/drivebase/commit/715dd97160ca32a1e9c3bcfdd93a1df898c93a63))
* **auth:** implement change password functionality with UI ([0665b47](https://github.com/drivebase/drivebase/commit/0665b477f9e9337b8721a21d73e66a63fec280ac))
* **workspace:** implement workspace management with queries and hooks ([f3c9158](https://github.com/drivebase/drivebase/commit/f3c91582016bb891ac3cad34da92fd9a020b8cf0))

# [1.12.0](https://github.com/drivebase/drivebase/compare/v1.11.1...v1.12.0) (2026-02-17)


### Bug Fixes

* add getPublicApiBaseUrl function for resolving public API base URL ([4eb6b4a](https://github.com/drivebase/drivebase/commit/4eb6b4a03babc7c243f796461c108a997f3bff7b))


### Features

* **onboarding:** enhance OAuth flow with source tracking and improved redirects ([8ab9774](https://github.com/drivebase/drivebase/commit/8ab97742d4c61af8b6fa7e0e45cc28d160fe923b))

## [1.11.1](https://github.com/drivebase/drivebase/compare/v1.11.0...v1.11.1) (2026-02-17)


### Bug Fixes

* update import path for AccountSettingsSection in my-account route ([bc8006a](https://github.com/drivebase/drivebase/commit/bc8006a76180860959adcb87692fdb9fddc520e0))

# [1.11.0](https://github.com/drivebase/drivebase/compare/v1.10.0...v1.11.0) (2026-02-17)


### Bug Fixes

* add onCreated prop to handle folder creation and refresh contents ([a06fb9c](https://github.com/drivebase/drivebase/commit/a06fb9c2560e0c5d67e4ba08e4af7af7b1f109fb))
* set requestPolicy to useStarredFiles for cache-and-network strategy ([cf75e33](https://github.com/drivebase/drivebase/commit/cf75e33cc9175e642aeeffd3417894308eb1886a))


### Features

* **provider-card:** add documentation link button and refactor connect button layout ([a87c4c0](https://github.com/drivebase/drivebase/commit/a87c4c0d05bc8c06790fcf99b11ad0475b91e66d))
* **settings:** implement settings page with general and security sections ([1313b83](https://github.com/drivebase/drivebase/commit/1313b8386204ddd3d68dafc5f292ac88de04cfb7))

# [1.10.0](https://github.com/drivebase/drivebase/compare/v1.8.1...v1.10.0) (2026-02-16)


### Bug Fixes

* add uploadS3Direct and uploadProxyChunks functions for chunked file uploads ([02f1f9a](https://github.com/drivebase/drivebase/commit/02f1f9abb63fab4fe348051bbae515e2113e7718))


### Features

* implement resumable chunked file uploads ([66dd313](https://github.com/drivebase/drivebase/commit/66dd3137bc5013202ce35339d27feb4fb3c370dc))
* **providers:** add OAuth New/Existing credential tabs with reusable user-scoped credential ([eac0bdb](https://github.com/drivebase/drivebase/commit/eac0bdb152ee895bb101bc1ee8ba7715b2ab7010))

## [1.8.1](https://github.com/drivebase/drivebase/compare/v1.9.0...v1.8.1) (2026-02-15)


### Bug Fixes

* update RightPanel to display update availability and remove Sidebar update link ([63020bf](https://github.com/drivebase/drivebase/commit/63020bf587993f52dc2bab8c409797950e2e45e2))

# [1.9.0](https://github.com/drivebase/drivebase/compare/v1.8.0...v1.9.0) (2026-02-15)


### Bug Fixes

* update Dockerfile to ignore scripts during bun install ([251c67f](https://github.com/drivebase/drivebase/commit/251c67f81d275ea15c509806e52c4fd5c5cf81f6))


### Features

* add render configuration and environment variables for deployment ([3cd9cb4](https://github.com/drivebase/drivebase/commit/3cd9cb4b6396eb6a7079103b999e375d2dedc4d9))

# [1.8.0](https://github.com/drivebase/drivebase/compare/v1.7.0...v1.8.0) (2026-02-15)


### Bug Fixes

* update documentation link to the correct site ([cc2fa05](https://github.com/drivebase/drivebase/commit/cc2fa05d4fd9d88ec8b1e75a4b52c2edec25ad32))


### Features

* add ability to move files across providers ([9fb9759](https://github.com/drivebase/drivebase/commit/9fb9759cbdde9ad58601f8883f3a0b83762e118d))

# [1.7.0](https://github.com/drivebase/drivebase/compare/v1.6.0...v1.7.0) (2026-02-15)


### Bug Fixes

* biome checks ([fad5b77](https://github.com/drivebase/drivebase/commit/fad5b77d23a31d44e0f971984bd23250522e656d))
* implement cascading virtualPath updates for renamed and moved folders and files ([bb8e12c](https://github.com/drivebase/drivebase/commit/bb8e12cc6e45d83088838de383e75cb886ae5fd4))
* update Product Hunt link and optimize image component in Hero section ([3a6b07b](https://github.com/drivebase/drivebase/commit/3a6b07b0def4e5f6a14889dcbb7cc1e4f48bd13e))


### Features

* add tooltip component and integrate it into the Sidebar ([3dc4e84](https://github.com/drivebase/drivebase/commit/3dc4e841572af0b6e956edb12b1bd18144218825))
* implement blog feature ([a694dd4](https://github.com/drivebase/drivebase/commit/a694dd49555939eae5426039de97392cb1bbf632))
* implement i18n ([462038a](https://github.com/drivebase/drivebase/commit/462038a55d52d5ece8d381a9a390f7215489e785))
* refactor apps/web to feature-based architecture ([26a77ba](https://github.com/drivebase/drivebase/commit/26a77ba8d8263b8c32f0e40e3a9f9f55666a2602))
* update blog page layout and add new blog post on Drivebase ([d772248](https://github.com/drivebase/drivebase/commit/d772248c1c65925845d8c6c457d5df92866f2c83))

# [1.6.0](https://github.com/drivebase/drivebase/compare/v1.5.0...v1.6.0) (2026-02-14)


### Bug Fixes

* conditionally render quick actions in FileSystemTable based on file selection ([e2eea9f](https://github.com/drivebase/drivebase/commit/e2eea9f5a701c8a71871eeb18dc5ee24e6b40184))
* enhance layout and styling for file and folder display in FileSystemTable ([4790b29](https://github.com/drivebase/drivebase/commit/4790b29317c698d79b85188fb8b19b230cbf608b))
* onboarding flow with improved navigation ([#72](https://github.com/drivebase/drivebase/issues/72)) ([273a858](https://github.com/drivebase/drivebase/commit/273a858e3d9456b646a387df0e87d85dcfe1ce75))
* remove provider service calls from file and folder move functions ([8fe2ca8](https://github.com/drivebase/drivebase/commit/8fe2ca85c069d0f0ccb891fed34f6c5056262f5b))
* update Product Hunt badge link ([2efe352](https://github.com/drivebase/drivebase/commit/2efe3525cfd519aa938e58c8e5562d8a876d8b59))


### Features

* add rename functionality for files and folders in FileSystemTable ([a9663d9](https://github.com/drivebase/drivebase/commit/a9663d906f7cfac58b7ff7dba79359660ef45d0f))
* implement drag-and-drop functionality for file and folder management ([1da0bc4](https://github.com/drivebase/drivebase/commit/1da0bc4e1a9f8c2ff6454c2fdb2e2809d629f979))

# [1.5.0](https://github.com/drivebase/drivebase/compare/v1.4.0...v1.5.0) (2026-02-14)


### Bug Fixes

* enhance provider service and resolvers with improved sync handling ([051482c](https://github.com/drivebase/drivebase/commit/051482cece3f27d3ae15e106c81f744fa05ffdd1))


### Features

* add check-types script to all package.json ([789ef7a](https://github.com/drivebase/drivebase/commit/789ef7aa4de26bbd937e0c88ed250c4c53f55faf))

# [1.4.0](https://github.com/drivebase/drivebase/compare/v1.3.3...v1.4.0) (2026-02-14)


### Bug Fixes

* **telegram:** add connection timeout to prevent hanging during initialization ([62560d5](https://github.com/drivebase/drivebase/commit/62560d5ed3352aa710aac83d2d1c69a4174d01c2))
* update Discord link in README and footer ([eaa834e](https://github.com/drivebase/drivebase/commit/eaa834ed00fb08c4886c80aef94ba7ee3154ae47))


### Features

* **init:** initialize Redis and log available providers during app startup ([07d7553](https://github.com/drivebase/drivebase/commit/07d7553bb0f2c13ee614fe4c0db5071d86e12caa))
* **provider:** add Telegram storage provider ([78a11d6](https://github.com/drivebase/drivebase/commit/78a11d62fb9a85160dee1305497fe0fed7581576))

## [1.3.3](https://github.com/drivebase/drivebase/compare/v1.3.2...v1.3.3) (2026-02-14)

## [1.3.2](https://github.com/drivebase/drivebase/compare/v1.3.1...v1.3.2) (2026-02-14)


### Bug Fixes

* update package dependencies and remove unused build configuration ([affe3d9](https://github.com/drivebase/drivebase/commit/affe3d9ea05b0a6b32e8a1d365c95820652e6299))

## [1.3.1](https://github.com/drivebase/drivebase/compare/v1.3.0...v1.3.1) (2026-02-14)

# [1.3.0](https://github.com/drivebase/drivebase/compare/v1.2.0...v1.3.0) (2026-02-13)


### Bug Fixes

* **navbar:** update link for storage providers to point to overview and rename link text ([9f9e4e1](https://github.com/drivebase/drivebase/commit/9f9e4e1d359b71e2be1af81ae76e95add320dad3))


### Features

* **provider:** add WebDAV storage provider integration and update related documentation ([37470a8](https://github.com/drivebase/drivebase/commit/37470a823650f8259375dbac86aa1db13b49af0a))
* **tracking:** implement POST endpoint for event tracking with PostHog integration ([16ca893](https://github.com/drivebase/drivebase/commit/16ca8936ef63270b477425f892b7379a30bce7d3))

# [1.2.0](https://github.com/drivebase/drivebase/compare/v1.1.0...v1.2.0) (2026-02-13)


### Bug Fixes

* update API and CORS URLs to reflect new domain ([b604775](https://github.com/drivebase/drivebase/commit/b60477539041559db679dff979eea81e4962c6af))


### Features

* add onboardingCompleted field to users schema ([00ee3a9](https://github.com/drivebase/drivebase/commit/00ee3a990a0aed477ac67b38956d8a68128d87ce))
* add routes for downloading YAML and shell script files ([58c9e74](https://github.com/drivebase/drivebase/commit/58c9e74ec5750d946b1dd952863f12a6e8007e3a))
* add suggestion section for new storage providers on ProvidersPage ([91cffe5](https://github.com/drivebase/drivebase/commit/91cffe502d44d1195f12804f4aa4fcdbe07dcce2))
* **docs:** add create-provider skill documentation for storage integration ([7073741](https://github.com/drivebase/drivebase/commit/7073741d80be7b403776e51f04d7a14bfc806518))
* **docs:** add Dropbox integration documentation and update README ([36fcd1a](https://github.com/drivebase/drivebase/commit/36fcd1adf253694beccff86c440ef17d8b0f3cee))
* **dropbox:** add Dropbox storage provider integration with OAuth support ([2f9c092](https://github.com/drivebase/drivebase/commit/2f9c092c5f8436a58da32e7954a458b572a71a1c))
* **ftp:** add FTP storage provider integration and update documentation ([b5d04ca](https://github.com/drivebase/drivebase/commit/b5d04ca2ca27d626a02f733ed568e3330df9f07e))
* implement onboarding ([a5990e2](https://github.com/drivebase/drivebase/commit/a5990e2b2250acd743cd1964724fd9cbe33f02ad))
* implement provider synchronization with progress tracking and options ([60350bd](https://github.com/drivebase/drivebase/commit/60350bd330650f21a6e5925c5c56147bcc6dbc3e))
* update landing page components with new features and improved API links ([8d96d9f](https://github.com/drivebase/drivebase/commit/8d96d9f0ddf4770c518c2ef6704657f60cba4d1b))

# [1.1.0](https://github.com/drivebase/drivebase/compare/v1.0.3...v1.1.0) (2026-02-13)


### Bug Fixes

* gitHub repository link ([62e10c4](https://github.com/drivebase/drivebase/commit/62e10c490927dfb02fd49cb2e2efc6153c51bd32))
* github typo ([f38f90d](https://github.com/drivebase/drivebase/commit/f38f90de0ede17074c44619843a9d421acc409c1))
* update compose.yaml download URL ([6816b66](https://github.com/drivebase/drivebase/commit/6816b66ea8d6d079f14f13f4c8ce249074ea4ea1))
* use image from next/image ([3dfa55e](https://github.com/drivebase/drivebase/commit/3dfa55e85241707b0f277b1ed90886176f93e917))


### Features

* add commitlint and husky for commit message validation ([5022cc3](https://github.com/drivebase/drivebase/commit/5022cc3744eea38cb1ac9eeb4baff62794defc1c))
* add docs and landing page ([ec35d3a](https://github.com/drivebase/drivebase/commit/ec35d3ad33714af81383adc2f66415bf85388d18))
* add installer script for Drivebase deployment ([1111d5a](https://github.com/drivebase/drivebase/commit/1111d5aadb3a1b1435dba4bce1beabef51397775))
* add lint-staged for pre-commit hooks ([24ac51f](https://github.com/drivebase/drivebase/commit/24ac51fd9b3ab3bd92d7152a1e4fb0f657d901d9))
* add Netlify build ignore for www app ([adcf33a](https://github.com/drivebase/drivebase/commit/adcf33ac4d6ebcccd3d25e05dbca3875ec56a831))
* implement local storage for column visibility ([1788dc5](https://github.com/drivebase/drivebase/commit/1788dc57cc1b3daaff33e93ac6ea74ad6eb89082))
* setup wrangler ([a5f0e75](https://github.com/drivebase/drivebase/commit/a5f0e7530d6d74a6aa3ec034079db03ba32ab347))
* update docs content ([a76383b](https://github.com/drivebase/drivebase/commit/a76383be602aa8b4e31fc39a1c47b9bc5accab68))

## [1.0.3](https://github.com/drivebase/drivebase/compare/v1.0.2...v1.0.3) (2026-02-12)


### Bug Fixes

* remove unused variable ([365827a](https://github.com/drivebase/drivebase/commit/365827a8ac9d368548b6bd03548a8a5b5674e900))

## [1.0.2](https://github.com/drivebase/drivebase/compare/v1.0.1...v1.0.2) (2026-02-12)

## [1.0.1](https://github.com/drivebase/drivebase/compare/v1.0.0...v1.0.1) (2026-02-12)


### Bug Fixes

* add codegen before build ([c19caa7](https://github.com/drivebase/drivebase/commit/c19caa7b1d6c1bf99e94da86af8ab2028dfe54e8))
* run codegen in the api ([0f28e6f](https://github.com/drivebase/drivebase/commit/0f28e6fd01ca5cb91ade3f8faeeefe04b35a0dee))

# [1.0.0](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.14...v1.0.0) (2026-02-12)


### Features

* migrate techstack to bun ([087d215](https://github.com/drivebase/drivebase/commit/087d215d070ccd34598b3353676b2f6f74dd6cdf))
