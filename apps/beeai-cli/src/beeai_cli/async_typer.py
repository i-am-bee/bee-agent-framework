import typer
import functools
import inspect
import asyncio


class AsyncTyper(typer.Typer):
    def command(self, *args, **kwargs):
        parent_decorator = super().command(*args, **kwargs)
        def decorator(f):
            if inspect.iscoroutinefunction(f):
                parent_decorator(functools.wraps(f)(lambda *args, **kwargs: asyncio.run(f(*args, **kwargs))))
            else:
                parent_decorator(f)
            return f
        return decorator
