# Use an official Node.js runtime as a parent image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the Svelte app
RUN npm run build

# Expose the port the app runs on
EXPOSE 4173

# Define the command to run the app
CMD ["npm", "run", "preview"]