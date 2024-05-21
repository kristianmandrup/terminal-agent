# Use Alpine Linux as the base image
FROM alpine:latest

# Set the working directory
WORKDIR /app

# Define build arguments
ARG GIT_USER_NAME
ARG GIT_USER_EMAIL

# Install required packages, including Git
RUN apk add --no-cache bash git zsh curl fontconfig

# Configure Git using environment variables
RUN git config --global user.name "$GIT_USER_NAME" \
    && git config --global user.email "$GIT_USER_EMAIL"

# Install Powerline fonts
RUN git clone https://github.com/powerline/fonts.git --depth=1 && \
    cd fonts && \
    ./install.sh && \
    cd .. && \
    rm -rf fonts

# Install oh-my-zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" || true

# Set zsh as the default shell
RUN sed -i -e "s/bin\/ash/bin\/zsh/" /etc/passwd

# Configure oh-my-zsh with Agnoster theme
RUN sed -i -e "s/robbyrussell/agnoster/" ~/.zshrc

# Install FiraMono font (Powerline version)
RUN mkdir -p /usr/share/fonts/FiraMono && \
    curl -L https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.0/FiraMono.zip -o FiraMono.zip && \
    unzip FiraMono.zip -d /usr/share/fonts/FiraMono && \
    rm FiraMono.zip && \
    fc-cache -fv

# Ensure the terminal uses FiraMono for the correct display of the theme
# You might need to do this on the host terminal settings

# Install any additional required packages
RUN apk add --no-cache nodejs npm


# You can add more configuration or commands here if needed

# Copy any additional files or scripts required
# COPY script.sh /app/script.sh

# Set the entrypoint
# ENTRYPOINT ["bash", "/app/script.sh"]

# Set any default command
# CMD ["echo", "Hello, World!"]