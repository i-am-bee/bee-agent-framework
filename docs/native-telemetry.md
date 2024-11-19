# Native Telemetry in Bee Agent Framework

The Bee Agent Framework comes with built-in telemetry capabilities to help users monitor and optimize their applications. This document provides an overview of the telemetry feature, including what data is collected and how to disable it if necessary.

## Overview

The telemetry functionality in the Bee Agent Framework collects performance metrics and operational data to provide insights into how the framework operates in real-world environments. This feature helps us:

- Identify performance bottlenecks.
- Improve framework stability and reliability.
- Enhance user experience by understanding usage patterns.

## Data Collected

We value your privacy and ensure that **no sensitive data** is collected through telemetry. The following types of information are gathered:

- Framework version and runtime environment details.
- Anonymized usage statistics for built-in features.

## Disabling Telemetry

We understand that not all users want to send telemetry data. You can easily disable this feature by setting an environment variable:

```
BEE_FRAMEWORK_INSTRUMENTATION_METRICS_ENABLED=false
```
