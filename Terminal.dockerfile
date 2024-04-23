# Use Alpine Linux as the base image
FROM alpine:latest

# Set the working directory
WORKDIR /app

# Install any required packages
RUN apk add --no-cache bash

# Copy any additional files or scripts required
# COPY script.sh /app/script.sh

# Set the entrypoint
# ENTRYPOINT ["bash", "/app/script.sh"]

# Set any default command
# CMD ["echo", "Hello, World!"]