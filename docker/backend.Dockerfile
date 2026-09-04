FROM maven:3.9.11-eclipse-temurin-21 AS build

ARG SERVICE_NAME
WORKDIR /workspace

COPY pom.xml ./
COPY user-service/pom.xml user-service/pom.xml
COPY project-service/pom.xml project-service/pom.xml
COPY task-service/pom.xml task-service/pom.xml
COPY poker-service/pom.xml poker-service/pom.xml
COPY user-service/src user-service/src
COPY project-service/src project-service/src
COPY task-service/src task-service/src
COPY poker-service/src poker-service/src

RUN mvn -pl "${SERVICE_NAME}" -am package -DskipTests

FROM eclipse-temurin:21-jre

ARG SERVICE_NAME
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError"
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN groupadd --system spring && useradd --system --gid spring --home-dir /app spring
COPY --from=build /workspace/${SERVICE_NAME}/target/${SERVICE_NAME}-*.jar /app/app.jar
RUN chown spring:spring /app/app.jar

USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
