# Changelog

# [1.0.0-alpha.7](https://github.com/drivebase/drivebase/compare/vv1.0.0-alpha.6...v1.0.0-alpha.7) (2025-03-26)


### Bug Fixes

* **app.layout:** adjust layout height for better responsiveness ([47bd587](https://github.com/drivebase/drivebase/commit/47bd587cffb0b6a9c7ba5f6964e2bc9df6090d02))
* **app.layout:** update layout height to ensure full utilization of available space ([7aa21dd](https://github.com/drivebase/drivebase/commit/7aa21dd66c171ca16f621161c364e00d6a541626))
* **data.table:** explicitly handle empty search input to clear filters for both server and client filtering ([6c1af33](https://github.com/drivebase/drivebase/commit/6c1af330db837e85f7d2bdec0b3eec9722f2e912))
* **dropbox.provider:** adjust path handling to ensure correct formatting for root path ([7ffad85](https://github.com/drivebase/drivebase/commit/7ffad851fb72fae27cb0a65a660f8afc8ca2dc3a))
* **dropbox.provider:** update Dropbox provider to use correct error handling and improve folder type identification ([2e409f1](https://github.com/drivebase/drivebase/commit/2e409f1666c87b51d93723c56604c391efea8018))
* **files.service:** add defaultUploadPath handling to improve folder identification during file processing ([35fdfae](https://github.com/drivebase/drivebase/commit/35fdfae9e70efe6c3ae1bd280754ea06cbb87238))
* **files.service:** enhance file retrieval sorting by adding folder prioritization and updated timestamp ordering ([71ceedc](https://github.com/drivebase/drivebase/commit/71ceedcd5dd7b7a490de2b3615099c48dd88210b))
* **files.service:** update metadata type and adjust sorting criteria for file retrieval ([99af095](https://github.com/drivebase/drivebase/commit/99af09524142d8850b70eb8c533f621acff68b76))
* **local.provider:** update basePath default value and improve file handling in listFiles and deleteFile methods ([df2baa2](https://github.com/drivebase/drivebase/commit/df2baa20089927e02aa979489e501c09c2cf5b09))
* **provider.interface:** update OAUTH_REDIRECT_URI to use FRONTEND_URL for improved environment configuration ([89e206f](https://github.com/drivebase/drivebase/commit/89e206f899835465214369bbc73497f0b5b9f957))


### Features

* **data.table:** implement a new DataTable component with pagination, filtering, and sorting capabilities ([deaa3cf](https://github.com/drivebase/drivebase/commit/deaa3cf2f335e9f3d9635a55e5998d71a0958e5d))
* **file.list:** integrate DataTable for file listing with pagination, filtering, and search functionality ([c7733ea](https://github.com/drivebase/drivebase/commit/c7733ea1e98e29f7f8183a21bc5bdd7dea390524))
* **files.controller:** add pagination and search query parameters for file retrieval ([11680d5](https://github.com/drivebase/drivebase/commit/11680d500ee4a41d79ec3c3920a99c07139fd2e2))
* **files.service:** implement folder deletion functionality and enhance file deletion logic ([3e3e3d1](https://github.com/drivebase/drivebase/commit/3e3e3d16e9bca9ead251692add21cbe843c22654))
* **files.service:** implement pagination and search functionality for file retrieval ([3d60b0b](https://github.com/drivebase/drivebase/commit/3d60b0bc2388368c274cff12bb99a71061bb8ec3))
* **provider.configure:** enhance provider configuration with upload path management and label editing functionality ([797cc74](https://github.com/drivebase/drivebase/commit/797cc74d30a9ad9917f131401d06fad3d5ca29b4))
* **providers.api:** add mutations for updating provider metadata and label ([128270f](https://github.com/drivebase/drivebase/commit/128270f9108824ff3e75833f80a8dd8209f27cbf))
* **providers.controller:** add update metadata and update provider endpoints with validation ([a521e66](https://github.com/drivebase/drivebase/commit/a521e669e4c625bc5dbd3db437846635a0ce037b))
* **providers.service:** add provider metadata update functionality and enhance provider retrieval with sorting ([32e323d](https://github.com/drivebase/drivebase/commit/32e323d2ec4e58f4422a350942c39dd488100b8d))

# [v1.0.0-alpha.6](https://github.com/drivebase/drivebase/compare/v0.1.0-alpha.0...vv1.0.0-alpha.6) (2025-03-25)


### Bug Fixes

* **theme:** implement dark mode support and enhance theme management ([33ec05e](https://github.com/drivebase/drivebase/commit/33ec05eb7f9ce123e2ebd78a1bf1af2ed4ca7cba))


### Features

* **ci:** add multi-platform build support in CI workflow ([5b32125](https://github.com/drivebase/drivebase/commit/5b32125e39bb42990bbe060ec0c36e4c02548bd0))
* **config:** add Vitest configuration files for testing ([42b73fd](https://github.com/drivebase/drivebase/commit/42b73fd8a8a58e742a41cc410b36662aa2474a09))

# [0.1.0-alpha.0](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.5...v0.1.0-alpha.0) (2025-03-25)


### Bug Fixes

* **provider:** implement listFiles method in AwsS3Provider for file retrieval from S3 ([0036ead](https://github.com/drivebase/drivebase/commit/0036eaddd9203aa21f5f6acea939f7bd000a5c53))


### Features

* **dashboard:** add DashboardStats component to display file statistics ([8176057](https://github.com/drivebase/drivebase/commit/8176057740831010a1719866c8ddaedd38aaf41a))
* **dashboard:** integrate stats fetching and display with loading skeletons ([69f16b7](https://github.com/drivebase/drivebase/commit/69f16b730b2864925e59ea2361c4399c14a59473))
* **files:** add delete and rename file functionalities with confirmation dialogs ([5c1d1cd](https://github.com/drivebase/drivebase/commit/5c1d1cde2168684a83c9cca40c7431fe0a935ef5))
* **lang:** add support for hindi ([fdc4f3d](https://github.com/drivebase/drivebase/commit/fdc4f3d9baa9fe9c4946b43fea6f2ae878e4975f))
* **locales:** add additional media type labels to common.json ([deb1dda](https://github.com/drivebase/drivebase/commit/deb1dda3c770a0adfa5be7eb92e7cff927983164))
* **migrations:** add migration management tool for squashing and validating migrations ([242072f](https://github.com/drivebase/drivebase/commit/242072fd047e64a0eb8fd2b9d9d077eed2295d17))
* **package:** update database commands in package.json ([9ea4070](https://github.com/drivebase/drivebase/commit/9ea40705d2a1acf06ad681fee3767c162cdf284b))
* **scripts:** add translation tool for locale files ([886d4d4](https://github.com/drivebase/drivebase/commit/886d4d4634d35766cdc5329ac76f88f55c03c79e))
* **workspaces:** implement WorkspaceStatDto and update getWorkspaceStats method ([c5d64d9](https://github.com/drivebase/drivebase/commit/c5d64d9b636909e9d21275427c529f82466a7e21))

# [1.0.0-alpha.5](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2025-03-20)


### Bug Fixes

* remove chalk dep ([b00880b](https://github.com/drivebase/drivebase/commit/b00880bba3cc14517a2be435ccf1d27eb208f5b2))

# [1.0.0-alpha.4](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2025-03-20)


### Features

* add LocalProvider for file storage management ([405b7ad](https://github.com/drivebase/drivebase/commit/405b7ad5c5ae2609eefe1b35a9fb53e0301add7b))
* add Telegram login script and update entrypoint for execution ([922373d](https://github.com/drivebase/drivebase/commit/922373d932b899fa3fb84085ce010e2fa5fc22b9))

# [1.0.0-alpha.3](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2025-03-20)


### Features

* add i18n support ([3df2c41](https://github.com/drivebase/drivebase/commit/3df2c412924591038621403206c928a091139c37))
* add translation script for locale management ([ff95d5b](https://github.com/drivebase/drivebase/commit/ff95d5b6e7d964c030d0e18715ea3af88eef34d7))
* enhance i18n configuration and language direction handling ([d241b55](https://github.com/drivebase/drivebase/commit/d241b552b5c0b75fd9d6c258cfc4619573d06dda))
* enhance sidebar and application settings for language handling ([ec33489](https://github.com/drivebase/drivebase/commit/ec3348926b813d118c3a38256f9bea83f95552ac))

# [1.0.0-alpha.2](https://github.com/drivebase/drivebase/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2025-03-20)


### Bug Fixes

* enhance input dialog component with default value support and cleanup functionality ([797a467](https://github.com/drivebase/drivebase/commit/797a467053798585bc824c68ccc85ba111fb04d3))


### Features

* add file renaming option ([741e9e9](https://github.com/drivebase/drivebase/commit/741e9e97c5b8c0aec824fbca74113196bbf18796))
