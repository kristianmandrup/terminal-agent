# Use Alpine Linux as the base image
FROM alpine:latest

# Set the working directory
WORKDIR /app

# Define build arguments
ARG GIT_USER_NAME
ARG GIT_USER_EMAIL

# Install required packages, including Git
RUN apk add --no-cache bash git

# Configure Git using environment variables
RUN git config --global user.name "$GIT_USER_NAME" \
    && git config --global user.email "$GIT_USER_EMAIL"

# You can add more configuration or commands here if needed

# Copy any additional files or scripts required
# COPY script.sh /app/script.sh

# Set the entrypoint
# ENTRYPOINT ["bash", "/app/script.sh"]

# Set any default command
# CMD ["echo", "Hello, World!"]