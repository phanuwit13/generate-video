# Use a compatible base image for ARM64 architecture
FROM node:16 AS deps

# Install dependencies
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update

# Install Chrome (Note: google-chrome-stable may not be available for ARM64)
RUN apt-get install -y chromium

# Install fonts and other dependencies
RUN apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 --no-install-recommends

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./package.json /app

RUN npm install

COPY ./ ./

EXPOSE 8080

CMD ["npm", "start"]
