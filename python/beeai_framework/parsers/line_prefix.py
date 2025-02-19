# Copyright 2025 IBM Corp.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from collections.abc import Generator

from pydantic import BaseModel


class Prefix(BaseModel):
    name: str
    line_prefix: str
    terminal: bool = False


class ParsedLine(BaseModel):
    prefix: Prefix
    content: str


class LinePrefixParser:
    def __init__(self, prefixes: list[Prefix]) -> None:
        self.prefixes: list[Prefix] = prefixes
        self.buffer: str = ""

    def feed(self, chunk: str) -> Generator[ParsedLine | None, None, None]:
        # Feeds a chunk of text into the parser and processes complete lines
        self.buffer += chunk
        lines = self.buffer.split("\n")
        self.buffer = lines.pop()  # Keep last partial line in buffer

        for line in lines:
            yield self.process_line(line)

    def process_line(self, line: str) -> ParsedLine | None:
        # Processes a single line, extracting the prefix if present
        for prefix in self.prefixes:
            if line.startswith(prefix.line_prefix):
                return ParsedLine(prefix=prefix, content=line[len(prefix.line_prefix) :])
        return None  # no match

    def finalize(self) -> Generator[ParsedLine | None, None, None]:
        # process any remaining partial line in the buffer
        if self.buffer:
            yield self.process_line(self.buffer)
