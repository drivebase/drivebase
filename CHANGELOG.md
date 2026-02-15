# Changelog

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
