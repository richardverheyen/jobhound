#!/bin/bash

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "Conda is not available. Please install Conda first."
    exit 1
fi

# Check if the environment already exists
if conda info --envs | grep -q "myenv"; then
    echo "Conda environment 'myenv' already exists. Activating..."
    conda activate myenv
else
    echo "Creating new Conda environment 'myenv'..."
    conda create -n myenv python=3.10 -y
    conda activate myenv
fi

# Install necessary npm packages
echo "Installing necessary npm packages..."
npm install @supabase/supabase-js
npm install -D @types/node

echo "Conda environment setup complete!"
echo "Run 'conda activate myenv' before running npm scripts."
echo "To start the application with Supabase, run: npm run dev:supabase" 