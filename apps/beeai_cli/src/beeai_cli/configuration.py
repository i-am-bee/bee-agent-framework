import functools

from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", env_nested_delimiter="__")
    server_url: AnyUrl = "http://localhost:8333"


@functools.cache
def get_configuration():
    return Configuration()
