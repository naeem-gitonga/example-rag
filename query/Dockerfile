FROM public.ecr.aws/lambda/nodejs:24 AS builder

# Set working directory to parent of LAMBDA_TASK_ROOT
WORKDIR /var

# Copy shared types (needed for @shared/* imports during build)
COPY shared/ ./shared/

# Copy query service with directory structure
COPY query/ ./query/

# Install dependencies
WORKDIR /var/query
RUN npm ci

# Symlink node_modules so shared types can resolve dependencies
RUN ln -s /var/query/node_modules /var/shared/node_modules

# Build TypeScript (resolves @shared/* paths and compiles)
RUN npm run build

# Final stage
FROM public.ecr.aws/lambda/nodejs:24

# Copy package files
COPY query/package*.json ${LAMBDA_TASK_ROOT}/

# Install production dependencies only
WORKDIR ${LAMBDA_TASK_ROOT}
RUN npm ci --omit=dev

# Copy built JavaScript from builder stage
COPY --from=builder /var/query/dist/ ${LAMBDA_TASK_ROOT}/dist/

# Set the CMD to your handler
CMD [ "dist/query/src/handler.handler" ]
