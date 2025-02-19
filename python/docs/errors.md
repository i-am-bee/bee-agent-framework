# Error Handling

*Disclaimer: The notes below may refer to the TypeScript version or missing files as the Python version moves toward parity in the near future. Additional Python examples coming soon. TODO*

Error handling is a critical part of any JavaScript application, especially when dealing with asynchronous operations, various error types, and error propagation across multiple layers. In the BeeAI Framework, we provide a robust and consistent error-handling structure that ensures reliability and ease of debugging.

## The `FrameworkError` class

All errors thrown within the BeeAI Framework extend from the base FrameworkError class.

Benefits of using `FrameworkError`:

- **Multiple Error Handling**: Supports handling multiple errors simultaneously, which is particularly useful in asynchronous or concurrent operations.
- **Preserved Error Chains**: Retains the full history of errors, giving developers greater context for debugging.
- **Consistent Structure:** All errors across the framework share a uniform structure, simplifying error tracking and management.
- **Native Support:** Built on native Python functionality, avoiding the need for additional dependencies while leveraging familiar mechanisms.
- **Utility Functions:** Includes methods for formatting error stack traces and explanations, making them suitable for use with LLMs and other external tools.

This structure ensures that users can trace the complete error history while clearly identifying any errors originating from the BeeAI Framework.

```py
```

_Source: /examples/errors/base.py TODO

## Specialized Error Classes

The BeeAI Framework extends FrameworkError to create specialized error classes for different components. This ensures that each part of the framework has clear and well-defined error types, improving debugging and error handling.

> [!TIP]
>
> Casting an unknown error to a `FrameworkError` can be done by calling the `FrameworkError.ensure` static method ([example TODO]()).

### Tools

When a tool encounters an error, it throws a `ToolError`, which extends `FrameworkError`. If input validation fails, a `ToolInputValidationError` (which extends `ToolError`) is thrown.

```py
```

_Source: /examples/errors/tool.py TODO

> [!TIP]
>
> If you throw a `ToolError` intentionally in a custom tool, the framework will not apply any additional "wrapper" errors, preserving the original error context.

### Agents

Throw `AgentError` class which extends `FrameworkError` class.

### Prompt Templates

Throw `PromptTemplateError` class which extends `FrameworkError` class.

### Loggers

Throw `LoggerError` class which extends `FrameworkError` class.

### Serializers

Throw `SerializerError` class which extends `FrameworkError` class.
