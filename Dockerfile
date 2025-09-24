# Build
FROM oven/bun:1 AS build
WORKDIR /app
COPY bun.lockb* package.json ./
RUN bun install --frozen-lockfile
COPY . .
# If your app has a build step, uncomment the next line:
# Install global packages for development
RUN bun install -g turbo drizzle-kit typescript @types/node

# Install bun completions
RUN mkdir -p /etc/bash_completion.d \
    && bun completions | tee /etc/bash_completion.d/bun > /dev/null

# Set up shell environment
RUN echo "export PATH=$PATH:/home/$USERNAME/.bun/bin" >> /etc/profile
RUN echo "source /etc/profile" >> /etc/bash.bashrc

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog

# Runtime
FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
RUN adduser --disabled-password --gecos "" app && chown -R app:app /app
USER app
COPY --from=build /app /app
EXPOSE 8080
CMD ["bun", "run", "start"]
