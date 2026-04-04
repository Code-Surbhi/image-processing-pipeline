FROM public.ecr.aws/lambda/nodejs:20

# Copy package.json
COPY nodejs/package.json /asset/nodejs/

# Install dependencies
WORKDIR /asset/nodejs
RUN npm install --omit=dev

# The layer will be in /asset
WORKDIR /asset