---
title: Components Diagrams
slug: architecture/diagrams
---

# Bee Stack Components

This diagram shows all the key components in the Bee Stack project

```mermaid
flowchart LR
    subgraph Bee_Stack
        direction LR

        subgraph Agent_Framework
            direction TB
            Core[Core] --> Agents[Agents]
            Core --> Tasks[Tasks]
            Core --> Tools[Tools]
            Agents --> BFMM[Memory Management]
            Agents --> BFCI[Communication Interfaces]
            Tasks --> BFTS[Task Scheduling]
            Tasks --> BFTE[Task Execution]
            Tools --> BFTI[Tool Integration]
            Tools --> BFTM[Tool Management]
        end

        Code_Interpreter[Bee code interpreter]
        API[Bee api]
        UI[Bee ui]
        Observer[observe]
        Observer_connector[observe connector]
    
        UI --> API
        Agent_Framework --> API
        API --> Code_Interpreter
        API --> Observer_connector
        Observer_connector --> Observer
        Agent_Framework --> Observer
    end
```

You can edit this diagram following [mermaid systax](https://mermaid.js.org/intro/syntax-reference.html).
