# Changelog

## [4.0.0](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.8...v4.0.0) (2026-06-03)

### Features

* add dropbox provider ([28d84d6](https://github.com/drivebase/drivebase/commit/28d84d6c54bc55d96e469494e0f4d3ca49325bfa))
* add install event, derive EventName from ALLOWED_EVENT_NAMES ([b9d7824](https://github.com/drivebase/drivebase/commit/b9d7824eb2c2f21d8344627eb0bc01a4476abd2d))
* add onedrive provider ([3234e42](https://github.com/drivebase/drivebase/commit/3234e42fc83ee1cafcbce61207029d3df64545a5))
* preview option for images ([2c7f7e0](https://github.com/drivebase/drivebase/commit/2c7f7e0487928028f4daaf723bd65a5677e2c844))
* rate limiting, payload size guard, event name validation in telemetry worker ([0ece434](https://github.com/drivebase/drivebase/commit/0ece4343475fe02cb7927b9eea00e05260647a71))

### Fixes

* export ALLOWED_EVENT_NAMES + correct ratelimits field in wrangler ([c3f0d74](https://github.com/drivebase/drivebase/commit/c3f0d74b0713f7e26b70497bb5868ee54484b83d))
* handle oauth route ([710c4c9](https://github.com/drivebase/drivebase/commit/710c4c98eb1f3192c39945c3c3dee1f3939bfdfc))
* refetch providers on desktop after oauth connect ([0794f84](https://github.com/drivebase/drivebase/commit/0794f84059bd55c508bac016900f0cfcf895f465))

### Styles

* use dark mode only ([69f3d94](https://github.com/drivebase/drivebase/commit/69f3d94dc104f56722cfa1353a1daf61f4425648))

### Others

* add makefile ([1bcd2ce](https://github.com/drivebase/drivebase/commit/1bcd2ce43363ddb2073f513912c699f508c12051))
* reset migrations ([cdf2e04](https://github.com/drivebase/drivebase/commit/cdf2e04038a7d994cdca35eb0d80432d714948c6))
* update .gitignore ([4cb2163](https://github.com/drivebase/drivebase/commit/4cb2163d1e89d8f8f6b81bdc3b73ec499b38bce4))
* update docker config for production deployment ([a473a65](https://github.com/drivebase/drivebase/commit/a473a65140fd7d5dc444b617fb0495b9f99cd146))

## [4.0.0-alpha.8](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.7...v4.0.0-alpha.8) (2026-04-25)

### Fixes

* refetch providers after connect for realtime update ([9b16026](https://github.com/drivebase/drivebase/commit/9b16026ff33246da619f394e5aca523d3c810766))

### Others

* add vite/client types to packages via per-package devDep ([36344cf](https://github.com/drivebase/drivebase/commit/36344cffc8994d9320e4a972640371429f8c9f31))
* remove predev ([e2c2f61](https://github.com/drivebase/drivebase/commit/e2c2f61c620d0b9d4a049cfa1d9a6203873abe38))

## [4.0.0-alpha.7](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.6...v4.0.0-alpha.7) (2026-04-25)

### Fixes

* local provider errors when root parent path does not exist ([1c69f46](https://github.com/drivebase/drivebase/commit/1c69f46cdf9dc8212931aaf2bd65abbadaa8e633))

## [4.0.0-alpha.6](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.5...v4.0.0-alpha.6) (2026-04-25)

### Fixes

* preserve backdrop-filter in production CSS via var() reference ([5ca0bfb](https://github.com/drivebase/drivebase/commit/5ca0bfbeb74926757925aba59338b2fb69e10e9b))

### Others

* remove proxy ([6e4740a](https://github.com/drivebase/drivebase/commit/6e4740aca2f14baf0f7f22512fcce272ee82c1e9))

## [4.0.0-alpha.5](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.4...v4.0.0-alpha.5) (2026-04-25)

### Fixes

* dev api url, glass backdrop-filter, vite proxy ([8d09cec](https://github.com/drivebase/drivebase/commit/8d09cecc9a8abbe8b69d3975549affd2925cb8e9))

## [4.0.0-alpha.4](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.3...v4.0.0-alpha.4) (2026-04-25)

### Fixes

* use relative API URL fallback ([3c433da](https://github.com/drivebase/drivebase/commit/3c433dab3cc032754842a42abb77d33a47af76db))

## [4.0.0-alpha.3](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.2...v4.0.0-alpha.3) (2026-04-25)

### Features

* setup telemetry ([356ae83](https://github.com/drivebase/drivebase/commit/356ae834a9e1f6f1ec97b61120e9538b9fded059))

### Fixes

* config path ([3f9d267](https://github.com/drivebase/drivebase/commit/3f9d2670f97799d42467f82aa0b32494b797a79c))
* port ([f73e202](https://github.com/drivebase/drivebase/commit/f73e20200115b6ad40ea4b9eea2914bb45ab90dd))

### Others

* add telemetry package ([59c1a78](https://github.com/drivebase/drivebase/commit/59c1a78206a3c5be4f2eb0bfd117a2e488ba9220))
* create install.sh ([44f93f7](https://github.com/drivebase/drivebase/commit/44f93f778e571faf515fc67eda91edb2e9109b88))
* create network ([98b5486](https://github.com/drivebase/drivebase/commit/98b5486f7a3c43d5616cf1f6e78646ade7debb17))
* error handling ([4d75b15](https://github.com/drivebase/drivebase/commit/4d75b15da78bb8706aaa4f8548350fc4465bb685))
* include time ([0aef00f](https://github.com/drivebase/drivebase/commit/0aef00fed371647f72e03e9a3b8d192c231ec710))
* no cache ([f32af12](https://github.com/drivebase/drivebase/commit/f32af1246154169aedf06ac3dc4a6babe893a8d5))
* refactor and fix telemetry ([4fab24f](https://github.com/drivebase/drivebase/commit/4fab24fc8091a22bf02aa008d9b8742284f80290))
* remove accidental install script test output ([ab68397](https://github.com/drivebase/drivebase/commit/ab683970acd32dcc760208a41250a261213c5ee3))
* remove vars from wrangelr ([486e6de](https://github.com/drivebase/drivebase/commit/486e6de0bf3c392c16a060560f967094d6d1e4c9))
* renmae telemetry ([4c1cc7a](https://github.com/drivebase/drivebase/commit/4c1cc7a333a716ef3e4e584e0fd818486955223e))
* setup release it bumper ([9f59585](https://github.com/drivebase/drivebase/commit/9f59585f97c3a471c0ca4c3aaf2ce9b063c71ae1))
* setup telemtry api ([8ee77ef](https://github.com/drivebase/drivebase/commit/8ee77efdc9087c36bbc488dfad4042c9af277daf))
* **tel:** use umami token ([d8e0c07](https://github.com/drivebase/drivebase/commit/d8e0c071761a53b9484211100f16a53fb516d0a5))
* update installation script ([f38996c](https://github.com/drivebase/drivebase/commit/f38996c9b435215fec619a6f0d9735c32e82b2ab))
* use hostname ([71a2690](https://github.com/drivebase/drivebase/commit/71a2690b60b621a7b39f3b92e1a40de3a9461167))

## [4.0.0-alpha.2](https://github.com/drivebase/drivebase/compare/v4.0.0-alpha.1...v4.0.0-alpha.2) (2026-04-25)

## [4.0.0-alpha.1](https://github.com/drivebase/drivebase/compare/v3.5.5...v4.0.0-alpha.1) (2026-04-25)

### Others

* migrate to tanstack router ([bc6a485](https://github.com/drivebase/drivebase/commit/bc6a485a7d3385c41916b44d93e5194bfd3da4ee))
* replace codebase with v4 ([25457a7](https://github.com/drivebase/drivebase/commit/25457a708b875c6cbf54d13c20f2341a5869becb))
* update gitignore to commit generated gql code ([113d9ce](https://github.com/drivebase/drivebase/commit/113d9ce3f9efccc5f7e9abf13f91e34eb660da3f))
