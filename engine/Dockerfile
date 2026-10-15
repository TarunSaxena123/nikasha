# Nikasha engine — Lambda container image (architecture.md §5.2, T-ENG-16).
# Build from the repo root:  docker build -f engine/Dockerfile -t nikasha-engine .
# Parquet files are generated from data/*.csv in a build stage; the CSVs are not copied into the image.

FROM python:3.12-slim AS data
WORKDIR /build
COPY engine/scripts/csv_to_parquet.py ./
RUN pip install --no-cache-dir "pandas>=2.2" "pyarrow>=16"
COPY data/*.csv ./csv/
RUN python csv_to_parquet.py ./csv ./parquet

FROM python:3.12-slim
ARG ENGINE_VERSION=dev
ENV NIKASHA_ENGINE_VERSION=${ENGINE_VERSION} \
    NIKASHA_DATA_DIR=/opt/nikasha/data \
    NIKASHA_INSTRUMENTS_DIR=/opt/nikasha/instruments \
    NIKASHA_CONTRACTS_DIR=/opt/nikasha/contracts \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /opt/nikasha
RUN pip install --no-cache-dir awslambdaric
COPY pylib/nikasha_log /tmp/pylib/nikasha_log
COPY engine/pyproject.toml /tmp/engine/pyproject.toml
COPY engine/nikasha_engine /tmp/engine/nikasha_engine
RUN pip install --no-cache-dir /tmp/pylib/nikasha_log /tmp/engine && rm -rf /tmp/pylib /tmp/engine
COPY --from=data /build/parquet/ /opt/nikasha/data/
COPY instruments/ /opt/nikasha/instruments/
COPY specs/contracts/strategy.schema.json specs/contracts/instrument.schema.json /opt/nikasha/contracts/
ENTRYPOINT ["python", "-m", "awslambdaric"]
CMD ["nikasha_engine.adapters.lambda_handler.handler"]
