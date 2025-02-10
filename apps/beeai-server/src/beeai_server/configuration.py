import logging
from functools import cache
from pathlib import Path

from pydantic import BaseModel, field_validator, ValidationError, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class LoggingConfiguration(BaseModel):
    level: int = logging.INFO
    level_uvicorn: int = Field(logging.FATAL, validate_default=True)

    @model_validator(mode="after")
    def level_uvicorn_validator(self):
        if self.level == logging.DEBUG:
            self.level_uvicorn = logging.WARNING
        return self

    @field_validator("level", "level_uvicorn", mode="before")
    def validate_level(cls, v: str | int | None):
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
