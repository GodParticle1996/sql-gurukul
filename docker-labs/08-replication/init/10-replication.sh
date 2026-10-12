#!/bin/bash
# standby container ko replication connection ki ijaazat (sirf lab ke liye — trust)
echo "host replication all all trust" >> "$PGDATA/pg_hba.conf"
