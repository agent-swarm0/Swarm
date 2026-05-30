# ADR-002: Core Technology Stack Selection

## Status
Proposed

## Context
Following the decision to adopt a microservices architecture (ADR-001), a cohesive and performant technology stack is required. The choice needs to support a full-stack development approach, provide robustness for enterprise-grade operations, and enable rapid development while ensuring scalability and maintainability for a Pan-African logistics company. We need a stack that empowers development teams and offers a rich ecosystem for tooling and support.

## Decision
We will adopt the following core technology stack:
*   **Frontend**: React with Next.js (TypeScript) for a high-performance, developer-friendly user interface.
*   **Backend**: Node.js with NestJS (TypeScript) for scalable and structured microservices.
*   **Database**: PostgreSQL as the primary relational database for transactional data. DynamoDB for specific high-throughput, low-latency use cases.
*   **Messaging**: Apache Kafka for asynchronous inter-service communication and event streaming.
*   **Infrastructure**: AWS Cloud services, including Kubernetes (EKS) for container orchestration, AWS API Gateway for API management.

## Consequences
**Easier:**
*   **Full-Stack TypeScript**: Leverage a single language (TypeScript) across frontend and backend, reducing context switching and promoting code sharing (e.g., interfaces, validation schemas).
*   **Developer Productivity**: React, Next.js, and NestJS are highly productive frameworks with strong communities and extensive tooling.
*   **Performance**: Next.js provides built-in optimizations like SSR/SSG, image optimization, and code splitting, leading to fast user experiences. Node.js is efficient for I/O-bound microservices.
*   **Scalability**: Node.js and NestJS are well-suited for building scalable microservices. PostgreSQL and DynamoDB offer robust scaling options. Kafka is highly scalable for event streaming.
*   **Cloud-Native Adoption**: AWS services and Kubernetes provide a mature, globally distributed platform for managing infrastructure as code and ensuring high availability.
*   **Robustness**: NestJS brings enterprise-grade structure to Node.js development, facilitating maintainable and testable codebases.

**Harder:**
*   **Complexity of Distributed Systems**: Managing Kafka, Kubernetes, and multiple database types requires specialized skills and adds operational overhead.
*   **Learning Curve**: While popular, mastering the full depth of Next.js features, NestJS architecture, Kafka best practices, and AWS services requires dedicated training and experience.
*   **Resource Intensiveness**: Running multiple Node.js microservices and a Kubernetes cluster can be more resource-intensive compared to a simpler monolithic setup.
*   **Data Consistency Challenges**: Using both SQL and NoSQL databases, alongside event-driven architecture, requires careful design to ensure data consistency across services.