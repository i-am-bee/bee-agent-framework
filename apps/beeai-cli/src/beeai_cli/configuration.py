import functools

import pydantic
import pydantic_settings

@functools.cache
class Configuration(pydantic_settings.BaseSettings):
    model_config = pydantic_settings.SettingsConfigDict(
        env_prefix="BEEAI",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
    )
    host: pydantic.AnyUrl = "http://localhost:8333"
