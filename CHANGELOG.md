# Changelog

## [0.0.14](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.13...v0.0.14) (2024-09-11)

### Features

- **agent:** update user prompt ([b9303ca](https://github.com/i-am-bee/bee-agent-framework/commit/b9303ca0f4a10b873f8b6ef430c872c50810fd21))
- **observability:** add createdAt to run context ([667a30a](https://github.com/i-am-bee/bee-agent-framework/commit/667a30a8c2101693a408f7a414f97e081e34d851))

### Bug Fixes

- **agent:** add createdAt to newly created messages ([9313f52](https://github.com/i-am-bee/bee-agent-framework/commit/9313f5268636a5c892435d240466fe0247c30e77))

## [0.0.13](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.12...v0.0.13) (2024-09-11)

### Features

- **agent:** inject metadata to messages ([a10d432](https://github.com/i-am-bee/bee-agent-framework/commit/a10d43268317479d05f16907d394e002900052fc))
- **agent:** make repetition checker disabled by default ([4bc3a60](https://github.com/i-am-bee/bee-agent-framework/commit/4bc3a6094f86c9ec952331dd7afb86820a40cc81))
- **templates:** add schema validation ([5a5114d](https://github.com/i-am-bee/bee-agent-framework/commit/5a5114df52a7fbce56de1e61eb025f5688097cb3))
- **templates:** add support for defaults ([8be1adb](https://github.com/i-am-bee/bee-agent-framework/commit/8be1adb863d4a17a5451e5f78d2064ba87c43176))
- **tool:** update openMeteo tool ([5726691](https://github.com/i-am-bee/bee-agent-framework/commit/572669150648a12f66bd40a6b23d543910bb5385))

## [0.0.12](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.11...v0.0.12) (2024-09-09)

### Features

- **agent:** add memory getter to the base class ([bf985d1](https://github.com/i-am-bee/bee-agent-framework/commit/bf985d13327702708e3ffeffa70d783359ee578c))
- **agent:** add runner config ([36eff24](https://github.com/i-am-bee/bee-agent-framework/commit/36eff246a66db3448199ce72d919c6853f3dde7f))
- **agent:** premature stop on sequence repetition ([d54eb2a](https://github.com/i-am-bee/bee-agent-framework/commit/d54eb2a3dc05d8aac8814596d836fbd17e0d3cee))
- **observability:** propagate current instance to async scope ([085d69a](https://github.com/i-am-bee/bee-agent-framework/commit/085d69ad0d9292bc853844202722cc7e889d4b26))

### Bug Fixes

- **bee-agent:** rendering of empty lines in prompt ([#18](https://github.com/i-am-bee/bee-agent-framework/issues/18)) ([8aad96e](https://github.com/i-am-bee/bee-agent-framework/commit/8aad96eca98445905c7f871aca88e4c8e8bfc712))
- **llm:** stream method ([9e47f1a](https://github.com/i-am-bee/bee-agent-framework/commit/9e47f1a148ef24dd8d5d04cee4f6226ef268d967))
- **utils:** prevent unhandledRejection ([f74a4f5](https://github.com/i-am-bee/bee-agent-framework/commit/f74a4f5715dc5fa75b9850d31aa0fee594acb2a0))

## [0.0.11](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.10...v0.0.11) (2024-09-06)

### Features

- **agent:** unify user's input formatting ([b6e4b02](https://github.com/i-am-bee/bee-agent-framework/commit/b6e4b02564be0cf0d1813e34e5209277abb6a3d6))
- **agent:** update runner memory setting ([adb6a7e](https://github.com/i-am-bee/bee-agent-framework/commit/adb6a7efbb0fcd42a5696976fd2602c25ad58452))
- **memory:** add sync mechanism to the TokenMemory ([63975c9](https://github.com/i-am-bee/bee-agent-framework/commit/63975c939639a94bd82ee49c31ef247bb8bbcbba))

## [0.0.10](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.9...v0.0.10) (2024-09-06)

### Features

- **agent:** allow to run with an empty prompt ([8622e2d](https://github.com/i-am-bee/bee-agent-framework/commit/8622e2d23c4bbfbc2a6621eb07a9816cfe5af3d8))
- **execution:** propagate runParams to RunContext ([925f7d8](https://github.com/i-am-bee/bee-agent-framework/commit/925f7d85b9b4af85a18817b1b9eea7658446a771))
- **tool:** add calculator tool ([#10](https://github.com/i-am-bee/bee-agent-framework/issues/10)) ([2af8af7](https://github.com/i-am-bee/bee-agent-framework/commit/2af8af751ca8df20ca7cd408d7ad6a528a2e2694))
- **tool:** update openMeteo default settings ([ad4bb21](https://github.com/i-am-bee/bee-agent-framework/commit/ad4bb2196b7d4cd0d1cc5931b84221a6bd1606c8))

## [0.0.9](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.8...v0.0.9) (2024-09-04)

### Features

- **agent:** add template for tool not found error ([c4ea1c8](https://github.com/i-am-bee/bee-agent-framework/commit/c4ea1c85a83f5f70599116683ca41177d14a30d1))
- **custom-tool:** add ssl support for code interpreter ([#14](https://github.com/i-am-bee/bee-agent-framework/issues/14)) ([7de84d1](https://github.com/i-am-bee/bee-agent-framework/commit/7de84d15ecb4df0cc463709a57a6a9e4101e6462))
- **example:** add bee advanced example ([775c21c](https://github.com/i-am-bee/bee-agent-framework/commit/775c21c9be2b0193737663df712a65a1a344e6bf))
- **examples:** use bee-agent-framework in imports ([50f7d72](https://github.com/i-am-bee/bee-agent-framework/commit/50f7d725697abd1b16184314897451b43d1e8d31))
- **template:** add support for adding mustache functions ([6cda741](https://github.com/i-am-bee/bee-agent-framework/commit/6cda741a5b7a97e3095d881ba7012e370bde8e7d))
- **tool:** improve arxiv ([d6df723](https://github.com/i-am-bee/bee-agent-framework/commit/d6df7238d105722006a005ba3faa854580793f7c))
- **utils:** change ajv coerceTypes setting ([f3489b1](https://github.com/i-am-bee/bee-agent-framework/commit/f3489b12cd535604278d081e2586239d4c13f90c))
- **watsonx:** make second parameter in preset required ([6d45901](https://github.com/i-am-bee/bee-agent-framework/commit/6d459011bd4e892500e317a6fc87356a844bcab3))

### Bug Fixes

- **agent:** make templates property partial ([01e63e4](https://github.com/i-am-bee/bee-agent-framework/commit/01e63e4b66a3577cc0f150ca4c4f14ee428e8855))
- **agent:** prevent wrapping the same error twice ([19328cb](https://github.com/i-am-bee/bee-agent-framework/commit/19328cb4040c6eed497507fc5128cca11660c992))

## [0.0.8](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.7...v0.0.8) (2024-09-03)

### Features

- **agent:** add support for overriding templates ([58c89d9](https://github.com/i-am-bee/bee-agent-framework/commit/58c89d93b737e5221ffb2f4c63f8e1cf508a4c33))
- **tool:** improve arxiv error handling ([d4faf00](https://github.com/i-am-bee/bee-agent-framework/commit/d4faf0052070b78e6dc0c408f8a37755536cfa1f))
- **tool:** stop using getters in custom tool ([0e25450](https://github.com/i-am-bee/bee-agent-framework/commit/0e254504cb197832fa5ed98188d0f62489def7c2))

### Bug Fixes

- **tool:** handle default values in JSON/zod schema ([777c684](https://github.com/i-am-bee/bee-agent-framework/commit/777c684d7a154b48c441515605127e017983128d))

## [0.0.7](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.6...v0.0.7) (2024-09-02)

### Features

- **agent:** group iterations, add meta property ([ec9fb96](https://github.com/i-am-bee/bee-agent-framework/commit/ec9fb96a26da851520104271124d246003afd131))

## [0.0.6](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.5...v0.0.6) (2024-09-02)

### Features

- **agent:** extends bee success event ([889da33](https://github.com/i-am-bee/bee-agent-framework/commit/889da331f809f79d322d8df5129e068e59e3a7dd))
- **react:** emit `toolError` event for an invalid input ([cd33204](https://github.com/i-am-bee/bee-agent-framework/commit/cd3320407a870f92aabe9db06efebdd46b432fcf))
- remove modules index file ([6c5f045](https://github.com/i-am-bee/bee-agent-framework/commit/6c5f045cd1315ed4ee88ecbce3e0236c42734de9))
- **tools:** update python tool output file prefix ([716e74d](https://github.com/i-am-bee/bee-agent-framework/commit/716e74d4727d418b78a7af69789db93c53853c2f))

## [0.0.5](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.4...v0.0.5) (2024-08-30)

### Features

- **bam:** refactor chat preset ([5f5fa05](https://github.com/i-am-bee/bee-agent-framework/commit/5f5fa05ad502fd1e140f4e0c3048e0d629d0f16d))
- **python:** add custom id support ([d23d4f8](https://github.com/i-am-bee/bee-agent-framework/commit/d23d4f8f0717434bc55478253d5a8f0c71a34151))
- **watsonx:** add chat preset ([f4797b8](https://github.com/i-am-bee/bee-agent-framework/commit/f4797b80ad2712444c15f3aa050f2f2db8c1d86e))
- **watsonx:** auto load accessToken/apiKey from env ([369da92](https://github.com/i-am-bee/bee-agent-framework/commit/369da929281932ae6151eb388601370c83c113b5))

### Bug Fixes

- **example:** fix code interpreter path ([7f2f466](https://github.com/i-am-bee/bee-agent-framework/commit/7f2f466cb6f2d35575358073be6fd222e13117bb))

## [0.0.4](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.3...v0.0.4) (2024-08-29)

### Features

- **example:** update bee ([ea28b43](https://github.com/i-am-bee/bee-agent-framework/commit/ea28b43b8a1aad3f51d191b4f7179a3672888c4f))
- pin bee-proto and code interpreter ([79513cf](https://github.com/i-am-bee/bee-agent-framework/commit/79513cfbb1730bdd989d4d5828d0d8e249232b1e))

## [0.0.3](https://github.com/i-am-bee/bee-agent-framework/compare/0.0.2...v0.0.3) (2024-08-28)

### Features

- **bam:** add llama3 to preset ([5d8df8c](https://github.com/i-am-bee/bee-agent-framework/commit/5d8df8c9c3ad756b46867285fdadd33c2affdc71))
- **react:** improve max retries error message ([54895f9](https://github.com/i-am-bee/bee-agent-framework/commit/54895f982c097e720ba32cb292841e67c20d89e4))
- update .env.template ([7ebad1f](https://github.com/i-am-bee/bee-agent-framework/commit/7ebad1fbcd5514fed3610da3025bfb2e5ea7d9e3))

### Bug Fixes

- env script handle existing file ([51961af](https://github.com/i-am-bee/bee-agent-framework/commit/51961afb8a610c224d023bf2e0dd5bec2e02c1a4))

## [0.0.2](https://github.com/i-am-bee/bee-agent-framework/compare/0.0.1...0.0.2) (2024-08-27)

### Features

- **python:** add ignoredFiles support to local storage ([4c65b88](https://github.com/i-am-bee/bee-agent-framework/commit/4c65b88aeaa2b9d7ad4fbde4ee645311f2694c2f))

### Bug Fixes

- keep code interpreter related folders in examples ([cc8ca40](https://github.com/i-am-bee/bee-agent-framework/commit/cc8ca40c8200882cbb1e902fc706f4d2cc6434f6))
- **watsonx:** tokenization ([399d8cb](https://github.com/i-am-bee/bee-agent-framework/commit/399d8cba7292ae22492739362df584dd7295a5b6)), closes [#3](https://github.com/i-am-bee/bee-agent-framework/issues/3)

## [0.0.1](https://github.com/i-am-bee/bee-agent-framework/compare/7ebb60a4206337b98c5dfd500c6e06a5df559106...0.0.1) (2024-08-23)

### Features

- init project ([7ebb60a](https://github.com/i-am-bee/bee-agent-framework/commit/7ebb60a4206337b98c5dfd500c6e06a5df559106))

## [0.0.2](https://github.com/i-am-bee/bee-agent-framework/compare/0.0.1...0.0.2) (2024-08-27)

### Features

- **python:** add ignoredFiles support to local storage ([4c65b88](https://github.com/i-am-bee/bee-agent-framework/commit/4c65b88aeaa2b9d7ad4fbde4ee645311f2694c2f))

### Bug Fixes

- keep code interpreter related folders in examples ([cc8ca40](https://github.com/i-am-bee/bee-agent-framework/commit/cc8ca40c8200882cbb1e902fc706f4d2cc6434f6))
- **watsonx:** tokenization ([399d8cb](https://github.com/i-am-bee/bee-agent-framework/commit/399d8cba7292ae22492739362df584dd7295a5b6)), closes [#3](https://github.com/i-am-bee/bee-agent-framework/issues/3)

## 0.0.1 (2024-08-23)

### Features

- init project ([7ebb60a](https://github.com/i-am-bee/bee-agent-framework/commit/7ebb60a4206337b98c5dfd500c6e06a5df559106))
