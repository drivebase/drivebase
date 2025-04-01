# Changelog

# [1.0.0-alpha.12](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) (2025-04-01)


### Bug Fixes

* **typeorm.config.ts:** update migration path to include subdirectories for better migration management ([db27e22](https://github.com/drivebase/drivebase/commit/db27e22a76e2e137be23cea0ec8b3a2b9b96cd61))

# [1.0.0-alpha.11](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) (2025-03-30)


### Bug Fixes

* **_dashboard.tsx:** improve error handling by redirecting to workspaces on 'Workspace not found' error ([8b2fb8f](https://github.com/drivebase/drivebase/commit/8b2fb8fc259059204d765d7ef6b9de7776f91991))
* **_protected.tsx:** enhance error handling for Apollo queries by distinguishing between fetch and authorization errors ([be267ed](https://github.com/drivebase/drivebase/commit/be267ed4a39f4025edef36360e2583bde3a71105))
* **eslint.config.mjs:** disable '@typescript-eslint/no-unsafe-call' rule for improved flexibility in TypeScript code ([34b4da2](https://github.com/drivebase/drivebase/commit/34b4da291992fc60a7863b4076f171f24841be4a))
* **local.provider:** update label for basePath to indicate it is optional ([c758b1b](https://github.com/drivebase/drivebase/commit/c758b1b8597a9a5db361bf8d2a58361322acd207))
* **providers.service.ts:** add uploadPath to metadata for improved file handling ([1f253f7](https://github.com/drivebase/drivebase/commit/1f253f70c554720cfa8890f30e2184dbe9abffa3))


### Features

* **new.folder.dialog.tsx:** integrate Apollo Client for refetching files after folder creation ([6ba22f6](https://github.com/drivebase/drivebase/commit/6ba22f695f76ceae2cbaba987ae3e37d74ab32d1))
* **provider.connect.tsx:** add GET_CONNECTED_PROVIDERS query and refetch on provider connection actions ([e6663ba](https://github.com/drivebase/drivebase/commit/e6663bab6d5d3fa536921ef5322a5136e25bb31a))
* **upload.modal.tsx:** enhance upload functionality with Apollo Client integration and improved user feedback ([5cee546](https://github.com/drivebase/drivebase/commit/5cee546a1462502be17978df80c0b431dc2a1dca))

# [1.0.0-alpha.10](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2025-03-30)


### Features

* **Dockerfile:** add migrations and sdk directories to Dockerfile for improved build context ([4adc26c](https://github.com/drivebase/drivebase/commit/4adc26c5803d7e8ef3e0162b2183116d2461b2a3))

# [1.0.0-alpha.9](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2025-03-30)


### Bug Fixes

* **Dockerfile:** streamline Dockerfile by removing Prisma client generation step and adjusting file copy commands ([f85e083](https://github.com/drivebase/drivebase/commit/f85e0835e1653b282ffb6b1a54b928acbad84a07))

# [1.0.0-alpha.8](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2025-03-30)


### Bug Fixes

* **auth:** add @Public() decorator to login mutation for public access ([4e55913](https://github.com/drivebase/drivebase/commit/4e55913ee06f795c535db69b588cc5f11f816751))
* **auth:** add public access decorator to registration mutation ([a40e5ab](https://github.com/drivebase/drivebase/commit/a40e5abbf3a02ca68018dbd7d689fbeda476ac89))
* **auth:** correct request context retrieval in GqlAuthGuard to access the request object ([01b4408](https://github.com/drivebase/drivebase/commit/01b44084e2cd92a62c53b076daa33c50aca0a27a))
* **auth:** import useRegisterMutation from SDK to streamline registration process ([29bc52b](https://github.com/drivebase/drivebase/commit/29bc52bda4f4d6fb55eab132263f4b5a5d4e7a9b))
* **auth:** reorder imports in user.decorator.ts for consistency ([2874096](https://github.com/drivebase/drivebase/commit/28740967d5efb855aa9a746682e2d3067d6ded35))
* **auth:** update imports to streamline user management ([8a72b66](https://github.com/drivebase/drivebase/commit/8a72b6644cb6df92f06e76030286e336677344fb))
* **dashboard:** update authentication token retrieval from 'authToken' to 'accessToken' for improved consistency in user authentication flow ([9083a17](https://github.com/drivebase/drivebase/commit/9083a179989c938837e4634ee13071f05c61d13c))
* **eslint:** disable no-unsafe-member-access rule in ESLint configuration to allow member access without warnings ([2a0ddc2](https://github.com/drivebase/drivebase/commit/2a0ddc217ce4aba725344a0d1918f701de34a70d))
* **workflows:** update test command to disable color output for better readability ([04f0340](https://github.com/drivebase/drivebase/commit/04f0340001d8b2f75ea5609579e71069c8cd1f5f))


### Features

* **app:** integrate GraphQL and update module imports for TypeORM entities ([aa0a4ef](https://github.com/drivebase/drivebase/commit/aa0a4ef41cbc43d083bbd1622f5ceafcf14e14d8))
* **auth:** enhance authentication guards and resolver for GraphQL support ([c0ad446](https://github.com/drivebase/drivebase/commit/c0ad4460ad325fabc689ff9e32c9f9eca7f2139c))
* **codegen:** add GraphQL code generation configuration and dependencies ([2c4aaa2](https://github.com/drivebase/drivebase/commit/2c4aaa24db9978d78896e7e15a87e0ee666467f2))
* **database:** initialize TypeORM configuration and define entity models ([5afdb0c](https://github.com/drivebase/drivebase/commit/5afdb0c8ce02681b9d3545e1fca6e9d34bfee08f))
* **database:** integrate TypeORM with entity models in db.module.ts ([e261cea](https://github.com/drivebase/drivebase/commit/e261ceaf33ae7116c2922b55b2cd44f818f45146))
* **files:** enhance File entity with GraphQL support and create FilesModule ([2d16725](https://github.com/drivebase/drivebase/commit/2d167257788aff231970d47266fcd4b5c64c4380))
* **files:** implement file upload and download functionality with GraphQL integration; add file management operations and DTOs for enhanced file handling ([9f93c6f](https://github.com/drivebase/drivebase/commit/9f93c6f1c3bec44aef4fe4242a7c27011aafd310))
* **files:** integrate GraphQL for file management operations, including upload key generation, folder creation, and enhanced file queries; refactor file list and icon components for improved functionality and readability ([d2bddbc](https://github.com/drivebase/drivebase/commit/d2bddbc7bf0172dbff9f299711f280e7b3adfd81))
* **files:** update file upload logic to use dynamic upload path from provider metadata; refactor local adapter to handle root path correctly; enhance provider configuration to manage upload reference ID ([f37c123](https://github.com/drivebase/drivebase/commit/f37c12313153769c4ffcc1133ea17d3228da7cb1))
* **graphql:** add GraphQL schema definition and configure auto schema generation ([b33c9a3](https://github.com/drivebase/drivebase/commit/b33c9a3cb0803348e2a78ce85738c4dd572ccfaa))
* **graphql:** add initial GraphQL SDK structure and types from codegen ([1642146](https://github.com/drivebase/drivebase/commit/1642146581994351968a870d334b67dfc5102f18))
* **graphql:** add JSON scalar type and enhance provider metadata structure in schema; update route handling for OAuth callback ([c88f677](https://github.com/drivebase/drivebase/commit/c88f67726086dad6392d2f8c6655a9e5c2643c83))
* **graphql:** add listProviderFiles query and associated input types; update schema to include pagination support for provider files and enhance file metadata structure ([f08895f](https://github.com/drivebase/drivebase/commit/f08895f0d890239b35143a601ec7123945ffc255))
* **graphql:** add PublicModule and integrate JSON resolver in GraphQL setup ([539f766](https://github.com/drivebase/drivebase/commit/539f76630d0a9f76edfb7140b8d8bbab48b576a3))
* **graphql:** enhance file management with new mutations for file operations, including create, rename, star, and unstar; add pagination support for file listing and update schema definitions accordingly ([26dc77b](https://github.com/drivebase/drivebase/commit/26dc77bc18b0c66373effd0c333726478ddfdaeb))
* **graphql:** implement PublicResolver with version and ping queries ([36c0fd6](https://github.com/drivebase/drivebase/commit/36c0fd695fa77b4e950432d204de39c899202c5b))
* **migrations:** add new migration for database schema with provider, file, user, and workspace tables ([6adf425](https://github.com/drivebase/drivebase/commit/6adf425344a478046a373859da3cef03d6a8b0b9))
* **oauth:** add OAuth callback route to handle provider authentication and error management ([467bbab](https://github.com/drivebase/drivebase/commit/467bbab01aa9bcfbed27c5cb00ae7be44880e21b))
* **pagination:** introduce common library for pagination metadata and file metadata; update GraphQL schema and resolvers to support new pagination structure; refactor file listing queries and components for improved data handling and UI integration ([8f680cc](https://github.com/drivebase/drivebase/commit/8f680cc98808877726555043ac831f473f4910bd))
* **provider:** add connectLocalProvider mutation and ConnectLocalProviderInput DTO; enhance provider entity with nullable metadata field ([2d4e2eb](https://github.com/drivebase/drivebase/commit/2d4e2eb36e7c4331609a7c67014739cfff169be1))
* **provider:** enhance Provider entity with GraphQL support and introduce ProvidersModule ([dd51aa0](https://github.com/drivebase/drivebase/commit/dd51aa04d6014977f6f0f67ab4b43e28d6a993bc))
* **provider:** integrate Apollo Client for GraphQL support in Providers component ([992826c](https://github.com/drivebase/drivebase/commit/992826c4c4c3b035daf931ebcee322016e00d819))
* **provider:** refactor provider configuration to use Apollo Client for mutations and queries; update file listing logic to accommodate new GraphQL structure and improve state management ([dbd1083](https://github.com/drivebase/drivebase/commit/dbd1083be4e6fd60d4f9792422cde04f3e335c0e))
* **provider:** refactor ProvidersService to use TypeORM for database operations ([645c804](https://github.com/drivebase/drivebase/commit/645c804af887972177216b398e69c4ded7fe2204))
* **providers:** implement ProvidersResolver and enhance provider entity with JSON fields ([1716d48](https://github.com/drivebase/drivebase/commit/1716d48373301ebcf5ed1cdb6b6fea62615f2a1e))
* **provider:** update ConnectLocalProviderInput to make label optional and nullable; enhance dashboard route with authentication check ([46adb35](https://github.com/drivebase/drivebase/commit/46adb35bfc7248333c7f78f12a681f5ae8aefd50))
* **provider:** update listProviderFiles query to include referenceId; modify listFiles method to accept referenceId parameter; enhance file listing options for Google Drive integration ([3e23bef](https://github.com/drivebase/drivebase/commit/3e23befbf10abfab42e9c19c3205aabcf088f482))
* **upload:** implement Zustand for upload state management; replace Redux hooks with Zustand in UploadModal and SidebarUpload components ([b468c9e](https://github.com/drivebase/drivebase/commit/b468c9efef24b90662cfa7ced7951be4b4ed9597))
* **users:** add UsersResolver for user retrieval via GraphQL ([2c3479a](https://github.com/drivebase/drivebase/commit/2c3479aad6a79c554a5c8ff82fc31806c6f29a87))
* **users:** enhance User entity with GraphQL support and update exports ([dc846ac](https://github.com/drivebase/drivebase/commit/dc846ace9a4d68c40946fb56386ab6bcc7810f9b))
* **users:** integrate TypeORM with User entity in UsersService ([034880c](https://github.com/drivebase/drivebase/commit/034880c611e7767b85252be7287523e8ecb63933))
* **workflows:** add Telegram notification workflow for new GitHub stars ([7995054](https://github.com/drivebase/drivebase/commit/79950540ca7eb451d70d819157e46cfeb5c15ba8))
* **workspaces:** add GraphQL support for workspace operations and DTOs ([b0b7fcd](https://github.com/drivebase/drivebase/commit/b0b7fcdca591dc94d06c288886047dfc3deca728))
* **workspaces:** integrate TypeORM with Workspace entity and implement GraphQL support ([5bcaaad](https://github.com/drivebase/drivebase/commit/5bcaaad55fe84c28a9165b77a9288ad01b17b319))
* **workspaces:** refactor WorkspacesService to use TypeORM for database operations ([16acad0](https://github.com/drivebase/drivebase/commit/16acad0333547aaa9e9cce2e11aa176333b1169f))

# [1.0.0-alpha.7](https://github.com/drivebase/drivebase/compare/vv1.0.0-alpha.6...v1.0.0-alpha.7) (2025-03-26)

### Bug Fixes

- **app.layout:** adjust layout height for better responsiveness ([47bd587](https://github.com/drivebase/drivebase/commit/47bd587cffb0b6a9c7ba5f6964e2bc9df6090d02))
- **app.layout:** update layout height to ensure full utilization of available space ([7aa21dd](https://github.com/drivebase/drivebase/commit/7aa21dd66c171ca16f621161c364e00d6a541626))
- **data.table:** explicitly handle empty search input to clear filters for both server and client filtering ([6c1af33](https://github.com/drivebase/drivebase/commit/6c1af330db837e85f7d2bdec0b3eec9722f2e912))
- **dropbox.provider:** adjust path handling to ensure correct formatting for root path ([7ffad85](https://github.com/drivebase/drivebase/commit/7ffad851fb72fae27cb0a65a660f8afc8ca2dc3a))
- **dropbox.provider:** update Dropbox provider to use correct error handling and improve folder type identification ([2e409f1](https://github.com/drivebase/drivebase/commit/2e409f1666c87b51d93723c56604c391efea8018))
- **files.service:** add defaultUploadPath handling to improve folder identification during file processing ([35fdfae](https://github.com/drivebase/drivebase/commit/35fdfae9e70efe6c3ae1bd280754ea06cbb87238))
- **files.service:** enhance file retrieval sorting by adding folder prioritization and updated timestamp ordering ([71ceedc](https://github.com/drivebase/drivebase/commit/71ceedcd5dd7b7a490de2b3615099c48dd88210b))
- **files.service:** update metadata type and adjust sorting criteria for file retrieval ([99af095](https://github.com/drivebase/drivebase/commit/99af09524142d8850b70eb8c533f621acff68b76))
- **local.provider:** update basePath default value and improve file handling in listFiles and deleteFile methods ([df2baa2](https://github.com/drivebase/drivebase/commit/df2baa20089927e02aa979489e501c09c2cf5b09))
- **provider.interface:** update OAUTH_REDIRECT_URI to use FRONTEND_URL for improved environment configuration ([89e206f](https://github.com/drivebase/drivebase/commit/89e206f899835465214369bbc73497f0b5b9f957))

### Features

- **data.table:** implement a new DataTable component with pagination, filtering, and sorting capabilities ([deaa3cf](https://github.com/drivebase/drivebase/commit/deaa3cf2f335e9f3d9635a55e5998d71a0958e5d))
- **file.list:** integrate DataTable for file listing with pagination, filtering, and search functionality ([c7733ea](https://github.com/drivebase/drivebase/commit/c7733ea1e98e29f7f8183a21bc5bdd7dea390524))
- **files.controller:** add pagination and search query parameters for file retrieval ([11680d5](https://github.com/drivebase/drivebase/commit/11680d500ee4a41d79ec3c3920a99c07139fd2e2))
- **files.service:** implement folder deletion functionality and enhance file deletion logic ([3e3e3d1](https://github.com/drivebase/drivebase/commit/3e3e3d16e9bca9ead251692add21cbe843c22654))
- **files.service:** implement pagination and search functionality for file retrieval ([3d60b0b](https://github.com/drivebase/drivebase/commit/3d60b0bc2388368c274cff12bb99a71061bb8ec3))
- **provider.configure:** enhance provider configuration with upload path management and label editing functionality ([797cc74](https://github.com/drivebase/drivebase/commit/797cc74d30a9ad9917f131401d06fad3d5ca29b4))
- **providers.api:** add mutations for updating provider metadata and label ([128270f](https://github.com/drivebase/drivebase/commit/128270f9108824ff3e75833f80a8dd8209f27cbf))
- **providers.controller:** add update metadata and update provider endpoints with validation ([a521e66](https://github.com/drivebase/drivebase/commit/a521e669e4c625bc5dbd3db437846635a0ce037b))
- **providers.service:** add provider metadata update functionality and enhance provider retrieval with sorting ([32e323d](https://github.com/drivebase/drivebase/commit/32e323d2ec4e58f4422a350942c39dd488100b8d))

# [v1.0.0-alpha.6](https://github.com/drivebase/drivebase/compare/v0.1.0-alpha.0...vv1.0.0-alpha.6) (2025-03-25)

### Bug Fixes

- **theme:** implement dark mode support and enhance theme management ([33ec05e](https://github.com/drivebase/drivebase/commit/33ec05eb7f9ce123e2ebd78a1bf1af2ed4ca7cba))

### Features

- **ci:** add multi-platform build support in CI workflow ([5b32125](https://github.com/drivebase/drivebase/commit/5b32125e39bb42990bbe060ec0c36e4c02548bd0))
- **config:** add Vitest configuration files for testing ([42b73fd](https://github.com/drivebase/drivebase/commit/42b73fd8a8a58e742a41cc410b36662aa2474a09))

# [0.1.0-alpha.0](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.5...v0.1.0-alpha.0) (2025-03-25)

### Bug Fixes

- **provider:** implement listFiles method in AwsS3Provider for file retrieval from S3 ([0036ead](https://github.com/drivebase/drivebase/commit/0036eaddd9203aa21f5f6acea939f7bd000a5c53))

### Features

- **dashboard:** add DashboardStats component to display file statistics ([8176057](https://github.com/drivebase/drivebase/commit/8176057740831010a1719866c8ddaedd38aaf41a))
- **dashboard:** integrate stats fetching and display with loading skeletons ([69f16b7](https://github.com/drivebase/drivebase/commit/69f16b730b2864925e59ea2361c4399c14a59473))
- **files:** add delete and rename file functionalities with confirmation dialogs ([5c1d1cd](https://github.com/drivebase/drivebase/commit/5c1d1cde2168684a83c9cca40c7431fe0a935ef5))
- **lang:** add support for hindi ([fdc4f3d](https://github.com/drivebase/drivebase/commit/fdc4f3d9baa9fe9c4946b43fea6f2ae878e4975f))
- **locales:** add additional media type labels to common.json ([deb1dda](https://github.com/drivebase/drivebase/commit/deb1dda3c770a0adfa5be7eb92e7cff927983164))
- **migrations:** add migration management tool for squashing and validating migrations ([242072f](https://github.com/drivebase/drivebase/commit/242072fd047e64a0eb8fd2b9d9d077eed2295d17))
- **package:** update database commands in package.json ([9ea4070](https://github.com/drivebase/drivebase/commit/9ea40705d2a1acf06ad681fee3767c162cdf284b))
- **scripts:** add translation tool for locale files ([886d4d4](https://github.com/drivebase/drivebase/commit/886d4d4634d35766cdc5329ac76f88f55c03c79e))
- **workspaces:** implement WorkspaceStatDto and update getWorkspaceStats method ([c5d64d9](https://github.com/drivebase/drivebase/commit/c5d64d9b636909e9d21275427c529f82466a7e21))

# [1.0.0-alpha.5](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2025-03-20)

### Bug Fixes

- remove chalk dep ([b00880b](https://github.com/drivebase/drivebase/commit/b00880bba3cc14517a2be435ccf1d27eb208f5b2))

# [1.0.0-alpha.4](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2025-03-20)

### Features

- add LocalProvider for file storage management ([405b7ad](https://github.com/drivebase/drivebase/commit/405b7ad5c5ae2609eefe1b35a9fb53e0301add7b))
- add Telegram login script and update entrypoint for execution ([922373d](https://github.com/drivebase/drivebase/commit/922373d932b899fa3fb84085ce010e2fa5fc22b9))

# [1.0.0-alpha.3](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2025-03-20)

### Features

- add i18n support ([3df2c41](https://github.com/drivebase/drivebase/commit/3df2c412924591038621403206c928a091139c37))
- add translation script for locale management ([ff95d5b](https://github.com/drivebase/drivebase/commit/ff95d5b6e7d964c030d0e18715ea3af88eef34d7))
- enhance i18n configuration and language direction handling ([d241b55](https://github.com/drivebase/drivebase/commit/d241b552b5c0b75fd9d6c258cfc4619573d06dda))
- enhance sidebar and application settings for language handling ([ec33489](https://github.com/drivebase/drivebase/commit/ec3348926b813d118c3a38256f9bea83f95552ac))

# [1.0.0-alpha.2](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2025-03-20)

### Bug Fixes

- enhance input dialog component with default value support and cleanup functionality ([797a467](https://github.com/drivebase/drivebase/commit/797a467053798585bc824c68ccc85ba111fb04d3))

### Features

- add file renaming option ([741e9e9](https://github.com/drivebase/drivebase/commit/741e9e97c5b8c0aec824fbca74113196bbf18796))
