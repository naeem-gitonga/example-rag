#!/bin/bash

set -e

echo "Installing dependencies in shared..."
cd shared && npm install && cd ..

echo "Installing dependencies in ingestion..."
cd ingestion && npm install && cd ..

echo "Installing dependencies in chat..."
cd chat && npm install && cd ..

echo "Installing dependencies in web..."
cd web && npm install && cd ..

echo "All dependencies installed!"
