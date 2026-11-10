FROM debian:bookworm

WORKDIR /

RUN apt-get update && apt-get install -y --no-install-recommends postgresql \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/lib/postgresql/15/bin:$PATH"

RUN rm -rf /var/lib/postgresql/*

COPY . /postgresql
COPY conf/postgresql.conf /etc/postgresql/15/main/postgresql.conf
COPY init.sql /docker-entrypoint-initdb.d/init.sql

RUN chmod +x /postgresql/tools/postgresql.sh

ENTRYPOINT ["/postgresql/tools/postgresql.sh"]