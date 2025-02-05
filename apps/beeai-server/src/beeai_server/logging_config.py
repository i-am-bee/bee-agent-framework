import contextlib
import logging
import logging.config
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Final

import structlog
from structlog.dev import RichTracebackFormatter

from beeai_server.configuration import LoggingConfiguration, get_configuration

_LOGGING_CONFIGURED = False


# Custom Processors
class ContextFilterProcessor(logging.Filter):
    def __init__(self, filter_context_vars: dict[str, Any]):
        super().__init__()
        self.filter_context_vars = filter_context_vars

    def filter(self, record: logging.LogRecord) -> bool:
        contextvars = structlog.contextvars.get_contextvars()
        for key, value in self.filter_context_vars.items():
            if contextvars.get(key, None) == value:
                return True
        return False


class FilterDuplicates(logging.Filter):
    def __init__(
        self, loggers: list[str], max_time_delay: timedelta = timedelta(minutes=1)
    ):
        super().__init__()
        self.loggers = loggers
        self.last_log_message_by_logger: dict[str, Any] = defaultdict(dict)
        self.last_log_timestamp_by_logger: dict[str, datetime] = defaultdict(
            lambda: datetime.fromtimestamp(0)
        )
        self.max_time_delay = max_time_delay

    def filter(self, record: logging.LogRecord) -> bool:
        name = record.name
        should_skip = False
        if any(name.startswith(logger_name) for logger_name in self.loggers):
            time_delay = datetime.now() - self.last_log_timestamp_by_logger[name]
            dedupe_key = {getattr(record, attr, None) for attr in ["msg", "levelno"]}
            should_skip = (
                self.last_log_message_by_logger[name] == dedupe_key
                and time_delay < self.max_time_delay
            )
            self.last_log_message_by_logger[name] = dedupe_key
            self.last_log_timestamp_by_logger[name] = datetime.now()
        return not should_skip


shared_processors: Final = [
    # Add the log level and a timestamp to the event_dict if the log entry
    # is not from structlog.
    structlog.stdlib.merge_contextvars,
    structlog.stdlib.add_logger_name,
    structlog.stdlib.add_log_level,
    structlog.stdlib.PositionalArgumentsFormatter(),
    # Add extra attributes of LogRecord objects to the event dictionary
    # so that values passed in the extra parameter of log methods pass
    # through to log output.
    structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S"),
]

formatter_processors: Final = [
    structlog.stdlib.ProcessorFormatter.remove_processors_meta,
    structlog.dev.ConsoleRenderer(
        colors=True,
        pad_event=70,
        exception_formatter=RichTracebackFormatter(
            show_locals=False, width=160, max_frames=10
        ),
    ),
]


def configure_logging(configuration: LoggingConfiguration | None = None) -> None:
    """
    Adapted from structlog documentation:
    https://www.structlog.org/en/stable/standard-library.html
    """
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED:
        return

    configuration_error = False
    try:
        configuration = configuration or get_configuration().logging
    except ValueError:
        # If configuration is not correctly loaded, we'll continue with a default level INFO
        configuration = LoggingConfiguration(level=logging.INFO)
        configuration_error = True

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "colored": {
                    "()": structlog.stdlib.ProcessorFormatter,
                    "processors": formatter_processors,
                    "foreign_pre_chain": shared_processors,
                },
            },
            "filters": {
                "filter_duplicates": {
                    "()": FilterDuplicates,
                    "loggers": ["progressbar"],
                }
            },
            "handlers": {
                "default": {
                    "level": configuration.level,
                    "class": "logging.StreamHandler",
                    "filters": ["filter_duplicates"],
                    "formatter": "colored",
                }
            },
            "loggers": {
                "": {
                    "handlers": ["default"],
                    "level": configuration.level,
                    "propagate": True,
                },
                "bee_automations.flows": {"level": configuration.level_flows},
                "httpx": {"level": logging.WARNING},
                "pymongo": {"level": logging.WARNING},
                "absl": {"level": logging.WARNING},
                "nltk_data": {"level": logging.WARNING},
                "markdown_it": {"level": logging.ERROR},
                "langchain.retrievers.multi_query": {
                    # only show generated queries if debug is enabled
                    "level": logging.INFO
                    if configuration.level == logging.DEBUG
                    else logging.WARNING,
                },
            },
        }
    )

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.StackInfoRenderer(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    override_uvicorn_logging_config()

    _LOGGING_CONFIGURED = True

    if configuration_error:
        # log if error occured durring logging initialization
        logger = logging.getLogger(__name__)
        logger.warning(
            "Error occured during logging setup, application is improperly configured"
        )


def override_uvicorn_logging_config() -> None:
    """Uvicorn needs to be configured separately, because it was already imported"""
    root_logger = logging.getLogger("")
    for logger in ("uvicorn", "uvicorn.access"):
        logger = logging.getLogger(logger)
        logger.handlers = root_logger.handlers.copy()
        logger.setLevel(root_logger.level)


@contextlib.contextmanager
def capture_context_logs_to_file(log_file: Path, filter_context_vars: dict[str, Any]):
    root_logger = logging.getLogger("")
    processors = [
        structlog.stdlib.ProcessorFormatter.remove_processors_meta,
        structlog.dev.ConsoleRenderer(
            colors=False,
            pad_event=70,
            exception_formatter=RichTracebackFormatter(
                show_locals=False, width=160, max_frames=10
            ),
        ),
    ]
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=processors,
        foreign_pre_chain=shared_processors,
    )

    handler = logging.FileHandler(filename=log_file)
    handler.setFormatter(formatter)
    handler.addFilter(ContextFilterProcessor(filter_context_vars))
    handler.addFilter(FilterDuplicates(["progressbar"]))
    root_logger.addHandler(handler)
    try:
        yield
    finally:
        root_logger.removeHandler(handler)
        handler.close()
