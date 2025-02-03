import logging
from functools import cache
from pathlib import Path

from pydantic import BaseModel, field_validator, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class LoggingConfiguration(BaseModel):
    level: int = logging.DEBUG
    level_flows: int = logging.INFO

    @field_validator("level", "level_flows", mode="before")
    def validate_level(cls, v: str | int):
        return v if isinstance(v, int) else logging.getLevelNamesMapping()[v]


class Configuration(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", env_nested_delimiter="__")
    logging: LoggingConfiguration = LoggingConfiguration()
    provider_config_path: Path = Path.home() / ".beeai" / "providers.yaml"


@cache
def get_configuration() -> Configuration:
    """Get cached configuration"""
    try:
        return Configuration()
    except ValidationError as ex:
        from beeai_server.logging_config import configure_logging

        configure_logging(configuration=LoggingConfiguration(level=logging.ERROR))

        logging.error(f"Improperly configured, Error: {ex!r}")
        raise ValueError("Improperly configured, make sure to supply all required variables") from ex
