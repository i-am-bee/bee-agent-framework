# Changelog

## [0.0.37](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.36...v0.0.37) (2024-11-07)

### ⚠ BREAKING CHANGES

- **agent:** remove tool caption from Bee agent (#154)
- **tool:** remove pagination functionality from GoogleSearch and DuckDuckGo (#152)
- **tool:** remove pagination from search tools

### Features

- **agent:** remove tool caption from Bee agent ([#154](https://github.com/i-am-bee/bee-agent-framework/issues/154)) ([d84beeb](https://github.com/i-am-bee/bee-agent-framework/commit/d84beeb05f1eee7b4c62cb222721962f8a4ca6fb)), closes [#153](https://github.com/i-am-bee/bee-agent-framework/issues/153)
- **llm:** add Granite 3.0 models to WatsonXChatLLM Preset ([1e6aa37](https://github.com/i-am-bee/bee-agent-framework/commit/1e6aa3733afb09a32fade54fcdaf257d98588721))
- **llm:** set temperature to 0 for OpenAI LLM adapter ([ea84808](https://github.com/i-am-bee/bee-agent-framework/commit/ea8480850f1b1f84e9551e68d9165d1399909c5e))
- **template:** make validateInput method public ([34156b7](https://github.com/i-am-bee/bee-agent-framework/commit/34156b787d25eeefb146782c6a4e9d9d866bfade))
- **tool:** add public parse method ([f97f73a](https://github.com/i-am-bee/bee-agent-framework/commit/f97f73a43478d83873464b01ef20701716bee5fd))
- **tool:** improve wikipedia results filtering ([#143](https://github.com/i-am-bee/bee-agent-framework/issues/143)) ([2529a0c](https://github.com/i-am-bee/bee-agent-framework/commit/2529a0cd2c4fbfbc19113d53e35a37af7807ceed)), closes [#142](https://github.com/i-am-bee/bee-agent-framework/issues/142)
- **tool:** remove pagination from search tools ([f93d181](https://github.com/i-am-bee/bee-agent-framework/commit/f93d181c3c9f3d535323a438b92a4a8e5a3f437a))
- **tool:** remove pagination functionality from GoogleSearch and DuckDuckGo ([#152](https://github.com/i-am-bee/bee-agent-framework/issues/152)) ([59424de](https://github.com/i-am-bee/bee-agent-framework/commit/59424de69afc9567d75bc1f82263ccf7f206aa9d)), closes [#151](https://github.com/i-am-bee/bee-agent-framework/issues/151)

## [0.0.36](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.34...v0.0.36) (2024-11-04)

### Features

- **agent:** remove unused agent manager ([b22b1d0](https://github.com/i-am-bee/bee-agent-framework/commit/b22b1d04948c3c050b09dd0d132ceedc59663a66))
- **agent:** update custom agent example ([e942b18](https://github.com/i-am-bee/bee-agent-framework/commit/e942b18e3ad595309ca134bd85f199676fa2673c))
- **llm:** update the granite chat template for tools ([#125](https://github.com/i-am-bee/bee-agent-framework/issues/125)) ([b554031](https://github.com/i-am-bee/bee-agent-framework/commit/b554031908a1fb480a4fcf17f7b1b28ec2aa35ec))
- **tool:** add optional input preprocessor ([#128](https://github.com/i-am-bee/bee-agent-framework/issues/128)) ([cec2cb9](https://github.com/i-am-bee/bee-agent-framework/commit/cec2cb9b1ce2689750097e82c4ca843a50dd98e7))

### Bug Fixes

- **tool:** attach under the root emitter ([92b0a38](https://github.com/i-am-bee/bee-agent-framework/commit/92b0a38fcb31146cebe2c2a7f1376075d2d72d12))
- **tool:** propagate finish event on a run level ([b434e32](https://github.com/i-am-bee/bee-agent-framework/commit/b434e32daa77a5f6a987e6cea616559917eedd33))

## [0.0.34](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.33...v0.0.34) (2024-10-28)

### Features

- add additional validation for DynamicTool ([#100](https://github.com/i-am-bee/bee-agent-framework/issues/100)) ([b69d64c](https://github.com/i-am-bee/bee-agent-framework/commit/b69d64cc34cffb828b0cce94fbe5fe925fac26b9))
- **agent:** make bee runner easier to override ([e7b99a0](https://github.com/i-am-bee/bee-agent-framework/commit/e7b99a0e2ea8dea9a833d467876ab3f4acec09f2))
- **agent:** make bee runner serializable ([c8960ce](https://github.com/i-am-bee/bee-agent-framework/commit/c8960ce57e4b9805badbfe69fd660db2fc74f9b8))
- **llm:** export templateSchemaFactory ([8fce700](https://github.com/i-am-bee/bee-agent-framework/commit/8fce7001b9b265fc400366b693871cc5ec8bbcfe))
- **llm:** set ollama host from env ([4712e87](https://github.com/i-am-bee/bee-agent-framework/commit/4712e877c46be98208a5721f25c55308d2f91706))
- **tools:** improve python PDF capabilities ([#108](https://github.com/i-am-bee/bee-agent-framework/issues/108)) ([9e107d7](https://github.com/i-am-bee/bee-agent-framework/commit/9e107d75f570032528f1b46dec231f8d23db8741))

### Bug Fixes

- **examples:** update open library tool ([9054deb](https://github.com/i-am-bee/bee-agent-framework/commit/9054deb30c59986186410667bc2852e9595033b4)), closes [#104](https://github.com/i-am-bee/bee-agent-framework/issues/104)
- **GH:** update CODEOWNERS ([#109](https://github.com/i-am-bee/bee-agent-framework/issues/109)) ([3ea6fe5](https://github.com/i-am-bee/bee-agent-framework/commit/3ea6fe5ffe1421bbe21bedcb0cbf0c0242db7c1d))
- **serialization:** handle constructor references ([8a9a91b](https://github.com/i-am-bee/bee-agent-framework/commit/8a9a91b93350708ce95ac626c61aa69739c28ca9))

## [0.0.33](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.32...v0.0.33) (2024-10-19)

### Bug Fixes

- **code-interpreter:** prevent agent from misusing IDs ([#98](https://github.com/i-am-bee/bee-agent-framework/issues/98)) ([b366007](https://github.com/i-am-bee/bee-agent-framework/commit/b3660071fd70696bcea21f6a10a9a53cfcb24b8d))

## [0.0.32](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.30...v0.0.32) (2024-10-16)

### Bug Fixes

- **code-interpreter:** avoid crash when no files supplied ([#97](https://github.com/i-am-bee/bee-agent-framework/issues/97)) ([60c3317](https://github.com/i-am-bee/bee-agent-framework/commit/60c3317ed9b0b6ddc94422b02e1b53e4f07d4b5a))

## [0.0.30](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.29...v0.0.30) (2024-10-15)

### Bug Fixes

- add info on running with remote ollama ([#83](https://github.com/i-am-bee/bee-agent-framework/issues/83)) ([ed6405d](https://github.com/i-am-bee/bee-agent-framework/commit/ed6405d3dd071f0b1c64b4e89a6ddd4f0de2e0ff))
- **agent:** ignore newlines for a tool name ([a2c6202](https://github.com/i-am-bee/bee-agent-framework/commit/a2c6202e479baba7331b1a148373f2f92ba427c6))
- **serialization:** handle bounded functions ([58d072f](https://github.com/i-am-bee/bee-agent-framework/commit/58d072f0a16794e96e07302cac8169c74017c14c)), closes [#92](https://github.com/i-am-bee/bee-agent-framework/issues/92)

## [0.0.29](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.28...v0.0.29) (2024-10-15)

### Features

- **agent:** add endOnRepeat option to the LinePrefixParser ([de24beb](https://github.com/i-am-bee/bee-agent-framework/commit/de24bebf6eb5a66c6f7d5ea6412e1eb4e8d89988))
- **agent:** add waitForStartNode option to the LinePrefixParser ([a27a60a](https://github.com/i-am-bee/bee-agent-framework/commit/a27a60ae82c89506e1bfbc3a8a524503d4f87a53))
- **agent:** update parser settings ([42027e2](https://github.com/i-am-bee/bee-agent-framework/commit/42027e217ee40a2d8cd8f0f9d1ccad22a8815b2e))
- **agent:** update parser settings ([fdfca98](https://github.com/i-am-bee/bee-agent-framework/commit/fdfca98e9ee0949c64f2a1b4f3fd41da2a26b657))
- **agent:** update SQL tool example ([325e1ed](https://github.com/i-am-bee/bee-agent-framework/commit/325e1ed2f703ca77a560e24936398be52b79441b))
- **code-interpreter:** improve file input prompt ([#86](https://github.com/i-am-bee/bee-agent-framework/issues/86)) ([e0c5985](https://github.com/i-am-bee/bee-agent-framework/commit/e0c5985b0efffa283c17d58813dfb7e7f59459a6))
- **code-interpreter:** remove functionality ([739036c](https://github.com/i-am-bee/bee-agent-framework/commit/739036cd2bd537ce4d1465da5115320a088b64d9))
- **code-interpreter:** remove functionality ([18302f9](https://github.com/i-am-bee/bee-agent-framework/commit/18302f9887a4cbdb17f6173c5acda2acf13b7333))
- **code-interpreter:** rename "hash" to "pythonId" ([#90](https://github.com/i-am-bee/bee-agent-framework/issues/90)) ([c25cbc5](https://github.com/i-am-bee/bee-agent-framework/commit/c25cbc52a33aa8cf1c0070850a44925aacee0319))
- **examples:** replace process exit with reader close ([65b7da4](https://github.com/i-am-bee/bee-agent-framework/commit/65b7da4c624e4734f30d27690c8d7cf910210c35))
- **llm:** update credentials loading for watsonx ([44a79d3](https://github.com/i-am-bee/bee-agent-framework/commit/44a79d35a815392d73029429e56067d45e969433))
- **llm:** update default model for groq adapter ([67c3270](https://github.com/i-am-bee/bee-agent-framework/commit/67c32709bff22dcc65e28eed81f0919774ba513d))
- **serialization:** allows to pass extra classes to bootstrap ([60f8953](https://github.com/i-am-bee/bee-agent-framework/commit/60f89533dc3d31c5ffdbc5000d9e6ea3045c4a9b))

### Bug Fixes

- **internals:** fix race condition in emitterToGenerator ([dfe63f8](https://github.com/i-am-bee/bee-agent-framework/commit/dfe63f84ba0997028332b86392c13ad2508f979f))
- **llm:** handles OpenAI structured output ([23e4e0e](https://github.com/i-am-bee/bee-agent-framework/commit/23e4e0e153f570d992b26f7cf4da46d16a4e2e42))
- **memory:** make shallow copy of handlers ([be82ed5](https://github.com/i-am-bee/bee-agent-framework/commit/be82ed5e132145821cfd00b16d713d6e5a51f8ef))
- **serialization:** properly deserialize arrow functions ([25234df](https://github.com/i-am-bee/bee-agent-framework/commit/25234df75369eac3d4a2c484c13a72b9003cf8e4))

## [0.0.28](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.27...v0.0.28) (2024-10-10)

### Features

- **agent:** update system prompt ([#76](https://github.com/i-am-bee/bee-agent-framework/issues/76)) ([46e45b7](https://github.com/i-am-bee/bee-agent-framework/commit/46e45b773b3cbf6dd373ac6b25fe62b43414892c))
- improve Python tool ([#79](https://github.com/i-am-bee/bee-agent-framework/issues/79)) ([feb2f4a](https://github.com/i-am-bee/bee-agent-framework/commit/feb2f4a44946ad82580b6943c39111ffccf94b0e))
- **internals:** createURLParams handles nested objects ([2f0ec77](https://github.com/i-am-bee/bee-agent-framework/commit/2f0ec77b97479f7e9dbfdb8ef061c82f996d95c2))
- **tools:** propagate run context to the CustomTool ([b3cc10a](https://github.com/i-am-bee/bee-agent-framework/commit/b3cc10ae558758eda6f08d4a79ee15dfb99037c7))

### Bug Fixes

- **agent:** LinePrefixParser - handling termination nodes ([2a5ce16](https://github.com/i-am-bee/bee-agent-framework/commit/2a5ce1660c6e0e63d505d01551fa00c2c61b4403))
- **llm:** templates serialization ([d7584ef](https://github.com/i-am-bee/bee-agent-framework/commit/d7584ef11a38e3541c53265d2e51e4adacd83096)), closes [#78](https://github.com/i-am-bee/bee-agent-framework/issues/78)

## [0.0.27](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.26...v0.0.27) (2024-10-08)

### Features

- **agent:** improve time awareness ([89e8f0a](https://github.com/i-am-bee/bee-agent-framework/commit/89e8f0a4880cde474e3f9ad2770c1b7f5f88315c))
- **agent:** update system prompt and open meteo schema ([#72](https://github.com/i-am-bee/bee-agent-framework/issues/72)) ([c235522](https://github.com/i-am-bee/bee-agent-framework/commit/c2355227a86bd2ad9017506f8592f3f03d0e952a))
- **memory:** add iterator ([23bba65](https://github.com/i-am-bee/bee-agent-framework/commit/23bba65aac99fc24c2ae2002fd76677956520faa))
- **memory:** rename SlidingWindowMemory, add removalSelector functionality ([69702b6](https://github.com/i-am-bee/bee-agent-framework/commit/69702b6559ff1ac80de98ee28c16df789eb98c98))
- **memory:** switch from LLM to ChatLLM in SummarizeMemory ([022c05a](https://github.com/i-am-bee/bee-agent-framework/commit/022c05a727686a4b5260c6684759aafc01290631))
- **serializer:** add aliases support ([72a6640](https://github.com/i-am-bee/bee-agent-framework/commit/72a664088e44293785c129e3c06f56f6092108db))
- **tools:** auto coerce input for google search ([7236ba7](https://github.com/i-am-bee/bee-agent-framework/commit/7236ba7341d7ac24c39828ebe1201784e82eb320))

## [0.0.26](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.25...v0.0.26) (2024-10-07)

### Features

- **cache:** add getter for fullPath in FileCache ([d2beaea](https://github.com/i-am-bee/bee-agent-framework/commit/d2beaeafab4c41b3552947f91403669998718993))
- **cache:** improve fileCache typings ([4c22dae](https://github.com/i-am-bee/bee-agent-framework/commit/4c22dae4dd8c6fb1ae7659039565b49ccf7fe81a))
- **llm:** add caching support ([e330fb2](https://github.com/i-am-bee/bee-agent-framework/commit/e330fb246409296af41dce9f1bb56cde72cac556)), closes [#69](https://github.com/i-am-bee/bee-agent-framework/issues/69)
- **tools:** add type coercion to the schema ([f0995ea](https://github.com/i-am-bee/bee-agent-framework/commit/f0995ea60b897e654496c6aaf2eaeb6610c3af95))
- **tools:** update duckduckgo defaults propagation ([9ef508c](https://github.com/i-am-bee/bee-agent-framework/commit/9ef508c2ee7b621b229ccf9fbccf43735f9820f3))

## [0.0.25](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.24...v0.0.25) (2024-10-04)

### Features

- **agent:** simplify tools' schema that is passing to prompt ([c927201](https://github.com/i-am-bee/bee-agent-framework/commit/c92720170626644bd90a9a701cbf042d92e1650a))
- **agent:** update CD regex, update tools description ([#60](https://github.com/i-am-bee/bee-agent-framework/issues/60)) ([50f86e6](https://github.com/i-am-bee/bee-agent-framework/commit/50f86e6532efb86591ac8d5afd7fc4615895e4a1))
- **code-interpreter:** update to a new version ([5357215](https://github.com/i-am-bee/bee-agent-framework/commit/5357215b21a2c164eaf3e29a85135d25b90f3a8d))
- **code-interpreter:** update to a new version ([699e45f](https://github.com/i-am-bee/bee-agent-framework/commit/699e45f2a55fc80029c793cf61bebcd53466f883))

## [0.0.24](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.23...v0.0.24) (2024-10-03)

### Features

- **agent:** update line prefix parser fallback and add tests ([6932379](https://github.com/i-am-bee/bee-agent-framework/commit/693237954d7a35b1e557b5f4f5e88168c7dbae9f))
- **agent:** use fallback only if LLM output is not empty ([a6e582d](https://github.com/i-am-bee/bee-agent-framework/commit/a6e582d6856c288332ab8cf75ca3888617cca8a5))
- **llm:** update ollama default parameters ([a9dc1a9](https://github.com/i-am-bee/bee-agent-framework/commit/a9dc1a945649210f73c9ca4305cf754f4391f9ef))

## [0.0.23](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.22...v0.0.23) (2024-10-03)

### Features

- **agent:** add fallback for invalid LLM output ([5ac89c1](https://github.com/i-am-bee/bee-agent-framework/commit/5ac89c15fce25ce78698fd5a9b80437de0af5e88)), closes [#55](https://github.com/i-am-bee/bee-agent-framework/issues/55)
- **agent:** improve LinePrefixParser error messages ([710f75b](https://github.com/i-am-bee/bee-agent-framework/commit/710f75b0f6cc5a4ba73c2ad0719bc3e359b690f1))
- **agent:** update bee system prompt ([#56](https://github.com/i-am-bee/bee-agent-framework/issues/56)) ([08c4714](https://github.com/i-am-bee/bee-agent-framework/commit/08c471451ac574ad4598e87157aeb8987477bb33))
- **agent:** update bee system prompt ([#58](https://github.com/i-am-bee/bee-agent-framework/issues/58)) ([572572b](https://github.com/i-am-bee/bee-agent-framework/commit/572572b903704a5bf983e5508a1c5143238b8254)), closes [#55](https://github.com/i-am-bee/bee-agent-framework/issues/55)
- **tools:** improve Wikipedia parsing ([#57](https://github.com/i-am-bee/bee-agent-framework/issues/57)) ([513572f](https://github.com/i-am-bee/bee-agent-framework/commit/513572f4627f8e96ce917c8998ae1813ee4fe119))

### Bug Fixes

- **llm:** add missing protos to build ibm-vllm ([#52](https://github.com/i-am-bee/bee-agent-framework/issues/52)) ([6fe7bca](https://github.com/i-am-bee/bee-agent-framework/commit/6fe7bcaa16de28354b0f871ad9bd93e1e62c3213))
- **llm:** add missing run context parameter for ibm-vllm ([#54](https://github.com/i-am-bee/bee-agent-framework/issues/54)) ([9ee7957](https://github.com/i-am-bee/bee-agent-framework/commit/9ee7957d119723844bc05d05fd97ee6408f695d6))
- **llm:** bam chat preset typo ([93b3167](https://github.com/i-am-bee/bee-agent-framework/commit/93b316741e699ca8f7fc18599a7ea8bdc6d88ed7))
- **llm:** watsonx chat preset typo ([f7d5128](https://github.com/i-am-bee/bee-agent-framework/commit/f7d51283edf4bcd12faaf6fe1b9dee02621b8c3c))

## [0.0.22](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.21...v0.0.22) (2024-10-02)

### Features

- **agent:** prevent emitting tool output update during streaming ([94ab4fe](https://github.com/i-am-bee/bee-agent-framework/commit/94ab4fe6aa7497ec7c4d26145c7c63a3fcb2163d))
- **agent:** update bee system prompt, tools description ([#48](https://github.com/i-am-bee/bee-agent-framework/issues/48)) ([83fdb26](https://github.com/i-am-bee/bee-agent-framework/commit/83fdb26d6a83810bd20faf465654250f0aa88fee))
- **ibm-vllm:** add llm adapter ([ec4e455](https://github.com/i-am-bee/bee-agent-framework/commit/ec4e455627a80ae0e2ec36a9c8369b7b107dbe21))
- **ibm-vllm:** update build process ([4a73ac0](https://github.com/i-am-bee/bee-agent-framework/commit/4a73ac0c0746a62d2d322895ac251642954f675d))

### Bug Fixes

- **tools:** wikipedia - remove records that did not pass the filtering criteria ([46ce792](https://github.com/i-am-bee/bee-agent-framework/commit/46ce7929558fc8ee769b124a66de6a3ba90e868d))

## [0.0.21](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.20...v0.0.21) (2024-10-02)

### Features

- **agent:** extend line prefix parser error messages ([20efff2](https://github.com/i-am-bee/bee-agent-framework/commit/20efff2ff57de1e331c6df327fae05ced5722fa4))
- **code-interpreter:** update configuration and readme ([70280a9](https://github.com/i-am-bee/bee-agent-framework/commit/70280a97359d3850104cad88b83923b0ac34d09a))
- **code-interpreter:** update to 0.0.11 ([#41](https://github.com/i-am-bee/bee-agent-framework/issues/41)) ([f136a09](https://github.com/i-am-bee/bee-agent-framework/commit/f136a093ac998fa80c470ae2c6aeb6759112d171))
- **llm:** add llama3-8b to BAM chat preset ([8f6be11](https://github.com/i-am-bee/bee-agent-framework/commit/8f6be1110dfcb711cc62822123a7ed5f4d3da274))
- **serializer:** supports serialization for class with the same name ([11cab93](https://github.com/i-am-bee/bee-agent-framework/commit/11cab93ae11e3a3408b06e4aece5d63f30cd4a0d))
- **tools:** add langchain adapter ([332edce](https://github.com/i-am-bee/bee-agent-framework/commit/332edce8356121d7a6bbd521f6c05e5648ef74db)), closes [#42](https://github.com/i-am-bee/bee-agent-framework/issues/42)
- **tools:** rename GoogleCustomSearch to GoogleSearch ([087351f](https://github.com/i-am-bee/bee-agent-framework/commit/087351f07e747ca2cb7b614422332e1e95c8aa0c))
- **tools:** update abort signal propagation ([f718236](https://github.com/i-am-bee/bee-agent-framework/commit/f7182360ecc55d5abeb9fe15e53b75f6f1ea2ba5))

## [0.0.20](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.19...v0.0.20) (2024-09-27)

### Features

- **code-interpreter:** update to 0.0.7 ([#37](https://github.com/i-am-bee/bee-agent-framework/issues/37)) ([0392ff0](https://github.com/i-am-bee/bee-agent-framework/commit/0392ff008a3ebcd043ec9aabbac5e52d34bb28db))
- **tool:** add google custom search tool ([#34](https://github.com/i-am-bee/bee-agent-framework/issues/34)) ([ef839da](https://github.com/i-am-bee/bee-agent-framework/commit/ef839da933276c3deff21552e16627dfe9c3ef7d))
- **tools:** update Wikipedia tool, remove links, extend interface ([ee651c3](https://github.com/i-am-bee/bee-agent-framework/commit/ee651c38ae21711161dfd755987be8640519c9fc))

### Bug Fixes

- **agent:** update constraint decoding regex ([8d47cae](https://github.com/i-am-bee/bee-agent-framework/commit/8d47cae3293c80a100d422a592b0dfaf30a4243c))

## [0.0.19](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.18...v0.0.19) (2024-09-27)

### Features

- **agent:** add generic line prefix parser ([#35](https://github.com/i-am-bee/bee-agent-framework/issues/35)) ([2c39c6a](https://github.com/i-am-bee/bee-agent-framework/commit/2c39c6a8c400c8f9bb2d7deb4698e636549a61df))
- **agent:** add tools property to agent's metadata ([59036b1](https://github.com/i-am-bee/bee-agent-framework/commit/59036b1a18ac98d454302f7776c65f454b6439b4))
- **agent:** improve invalid json parsing ([da7c7e6](https://github.com/i-am-bee/bee-agent-framework/commit/da7c7e69f126495649a85b146ef41aa129a7f76a))
- **agent:** improve parser typings ([a86d85d](https://github.com/i-am-bee/bee-agent-framework/commit/a86d85d6c195121ebe4a26b9a1781f85abe8c8e2))
- **agent:** switch to a new system prompt ([#38](https://github.com/i-am-bee/bee-agent-framework/issues/38)) ([9f41663](https://github.com/i-am-bee/bee-agent-framework/commit/9f41663092869fce1dd7f622795db2e46797e0a3))
- **tool:** add sql tool ([#24](https://github.com/i-am-bee/bee-agent-framework/issues/24)) ([719d80d](https://github.com/i-am-bee/bee-agent-framework/commit/719d80dedd7593dcccb17a05a19d7ff7e452b37d))
- **tool:** OpenMeteo - add optional country parameter ([a3612a5](https://github.com/i-am-bee/bee-agent-framework/commit/a3612a50ccee544d13fe4fdbd3f0f818e884bf0e)), closes [#36](https://github.com/i-am-bee/bee-agent-framework/issues/36)
- **tools:** update Python tool description ([b1f6104](https://github.com/i-am-bee/bee-agent-framework/commit/b1f61041e4a65ab25b845ce7452aaf10f32caac5))

### Bug Fixes

- **agent:** line prefix parser types ([699ccac](https://github.com/i-am-bee/bee-agent-framework/commit/699ccac93be08981a285523f895be3aaea9913bd))
- **llm:** watsonx serialization ([b1caa9f](https://github.com/i-am-bee/bee-agent-framework/commit/b1caa9fa8c683082275c5b8c6efff786c6b2b767))
- **tool:** OpenMeteo - handle empty geocode result ([424e620](https://github.com/i-am-bee/bee-agent-framework/commit/424e620669fc06d256b9312cfd29e603afd7b98a)), closes [#36](https://github.com/i-am-bee/bee-agent-framework/issues/36)

## [0.0.18](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.17...v0.0.18) (2024-09-24)

### Features

- **agent:** update tool error handling ([d403665](https://github.com/i-am-bee/bee-agent-framework/commit/d4036652a819a2712670d5a25e94fbb271aad9ae))
- **cache:** extend instance abilities ([cb7ccc9](https://github.com/i-am-bee/bee-agent-framework/commit/cb7ccc9c0e18a3cffc832e3e0871450f6bd83147))
- **llm:** add bam adapter verbose example ([7db2835](https://github.com/i-am-bee/bee-agent-framework/commit/7db28353ee8d289a5fa77c051b6949e87b03c9a9))
- **llm:** add fromTemplate factory to the JSON driver ([6d3b356](https://github.com/i-am-bee/bee-agent-framework/commit/6d3b35637f9497a25e789a18e77e438b541db46f))
- **llm:** add types for watsonx llm inference parameters ([312626d](https://github.com/i-am-bee/bee-agent-framework/commit/312626d87d2166d3e9dddc9c963884c87ab4b119))
- **llm:** make drivers serializable ([05d6dbb](https://github.com/i-am-bee/bee-agent-framework/commit/05d6dbb37582f4a258c693c33bab993ca95466a9))
- **llm:** set default parameters for groq ([82daecd](https://github.com/i-am-bee/bee-agent-framework/commit/82daecd497c57cfe6e39b02b0a7f7e6f9f56c5c3))
- **llm:** set default parameters for ollama ([0eecb65](https://github.com/i-am-bee/bee-agent-framework/commit/0eecb6534a0998f4326cd41e3c2b55c29e2a37d8))

### Bug Fixes

- casting boolean envs ([5994152](https://github.com/i-am-bee/bee-agent-framework/commit/59941523159cfa677b5d48d60b6f6e6d243a9780))

## [0.0.17](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.16...v0.0.17) (2024-09-16)

### Bug Fixes

- **agent:** update prompt template schemas ([5373835](https://github.com/i-am-bee/bee-agent-framework/commit/5373835d96d9495ee11f5046c1944b7d5004c4a4))

## [0.0.16](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.15...v0.0.16) (2024-09-16)

### Features

- **llm:** export messagesToPromptFactory function ([d534012](https://github.com/i-am-bee/bee-agent-framework/commit/d5340128b27ad11b99b01174ec8b4c38b64f5f93))
- move llm drivers under the llm module ([8ea5136](https://github.com/i-am-bee/bee-agent-framework/commit/8ea5136a4f97323ffc9b3613b26c4886cc1f2eca))
- **tool:** update open meteo schema ([8736e21](https://github.com/i-am-bee/bee-agent-framework/commit/8736e217a366dd89680213d05c5729b9ae09377f))

### Bug Fixes

- **llm:** llama3.1 add trailing new line ([#22](https://github.com/i-am-bee/bee-agent-framework/issues/22)) ([99ace8f](https://github.com/i-am-bee/bee-agent-framework/commit/99ace8fc7b96de7811c80f22158910d5f5d2b295))

## [0.0.15](https://github.com/i-am-bee/bee-agent-framework/compare/v0.0.14...v0.0.15) (2024-09-13)

### Features

- **agent:** disable repetition checker by default ([0a5f8ac](https://github.com/i-am-bee/bee-agent-framework/commit/0a5f8ac9ad610c6beb13587b84ae179af72a020a))
- **agent:** parser ignores empty chunks ([cbceb87](https://github.com/i-am-bee/bee-agent-framework/commit/cbceb8749e87b5c14f495818516900f001408faa))
- **agent:** propagate python file identifier to the system prompt ([334e90f](https://github.com/i-am-bee/bee-agent-framework/commit/334e90f82c407e7023633d6738266f2420b2e82a))
- **groq:** add llm adapter ([#20](https://github.com/i-am-bee/bee-agent-framework/issues/20)) ([5abb614](https://github.com/i-am-bee/bee-agent-framework/commit/5abb61483727f9f98cd2a84059b293ce089e91f5))
- **llm:** add drivers ([f38cee4](https://github.com/i-am-bee/bee-agent-framework/commit/f38cee4fbaa7386c8f9860bc3a150be43ad49929))
- **watsonx:** add llama3.1-405b to the preset ([8a93496](https://github.com/i-am-bee/bee-agent-framework/commit/8a93496652ae018464bb12b1a9b94091e5eb5b40))

### Bug Fixes

- **agent:** update guided setting ([19f11cf](https://github.com/i-am-bee/bee-agent-framework/commit/19f11cf72669ab59404089af7c3b23ff75ae1633))

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
