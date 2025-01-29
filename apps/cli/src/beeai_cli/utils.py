import re

import click


def parse_key_value_args(args: tuple) -> dict[str, str]:
    """Parse key=value arguments into a dictionary."""
    result = {}

    for arg in args:
        match = re.match(r"^([^=]+)=(.*)$", arg)
        if not match:
            raise click.BadParameter(f"Argument '{arg}' is not in the format key=value")

        key, value = match.groups()
        key = key.strip()
        value = value.strip()

        if not key:
            raise click.BadParameter("Empty key is not allowed")

        if key in result:
            raise click.BadParameter(f"Duplicate key: {key}")

        result[key] = value

    return result
