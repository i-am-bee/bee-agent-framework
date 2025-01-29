from typing import TypeVar, Generic
from pydantic import BaseModel

BaseModelT = TypeVar("BaseModelT", bound=BaseModel)


class PaginatedResponse(BaseModel, Generic[BaseModelT]):
    items: list[BaseModelT]
    total_count: int
