FROM public.ecr.aws/lambda/nodejs:24 AS builder

WORKDIR /var

# Copy package files first for better layer caching
COPY shared/package*.json ./shared/
COPY ingestion/package*.json ./ingestion/

# Install dependencies (cached unless package.json changes)
WORKDIR /var/ingestion
RUN npm install

# Now copy source files
WORKDIR /var
COPY shared/ ./shared/
COPY ingestion/ ./ingestion/

# Build
WORKDIR /var/ingestion
RUN npm run build

# Final stage
FROM public.ecr.aws/lambda/nodejs:24

# Copy package files
COPY ingestion/package*.json ${LAMBDA_TASK_ROOT}/

# Install production dependencies only
WORKDIR ${LAMBDA_TASK_ROOT}
RUN npm ci --omit=dev

# Copy bundled JavaScript from builder stage
COPY --from=builder /var/ingestion/dist/handler.mjs ${LAMBDA_TASK_ROOT}/dist/

# Set the CMD to your handler
CMD [ "dist/handler.handler" ]
