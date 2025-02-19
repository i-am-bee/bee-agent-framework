# Cache

*Disclaimer: The notes below may refer to the TypeScript version or missing files as the Python version moves toward parity in the near future. Additional Python examples coming soon. TODO*

Caching is a process used to temporarily store copies of data or computations in a cache (a storage location) to facilitate faster access upon future requests. The primary purpose of caching is to improve the efficiency and performance of systems by reducing the need to repeatedly fetch or compute the same data from a slower or more resource-intensive source.

## Usage

### Capabilities showcase


```py
```

_Source: /examples/cache/unconstrainedCache.py TODO

### Caching function output + intermediate steps

```py
```

_Source: /examples/cache/unconstrainedCacheFunction.py TODO

### Usage with tools

```py
```

_Source: /examples/cache/toolCache.py TODO

### Usage with LLMs

```py
```

_Source: /examples/cache/llmCache.py TODO

## Cache types

The framework provides multiple out-of-the-box cache implementations.

### UnconstrainedCache

```py
```

### SlidingCache

```py
```

_Source: /examples/cache/slidingCache.py TODO

### FileCache

```py
```

_Source: /examples/cache/fileCache.py TODO

#### Using a custom provider

```py
```

_Source: /examples/cache/fileCacheCustomProvider.py TODO

### NullCache

The special type of cache is `NullCache` which implements the `BaseCache` interface but does nothing.

The reason for implementing is to enable [Null object pattern](https://en.wikipedia.org/wiki/Null_object_pattern).

### @Cache (decorator cache)


```py
```

_Source: /examples/cache/decoratorCache.py TODO

**Complex example**

```py
```

_Source: /examples/cache/decoratorCacheComplex.py TODO


### CacheFn

```py
```

_Source: /examples/cache/cacheFn.py TODO

## Creating a custom cache provider

```py
```

_Source: /examples/cache/custom.py TODO
