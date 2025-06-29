#!/bin/bash

# on ctrl+c, kill all background jobs
trap "echo 'Shutting down...'; kill 0" EXIT

# cd to backend dir
cd backend/
source .venv/bin/activate
echo "Starting Flask..."
flask run --debug &
sleep 2

cd ..

# cd to frontend
cd frontend/
echo "starting React..."
npm run dev &
sleep 2

# echo "tunneling backend..."
# lt --port 5000 --subdomain mybackend-mmc &
# sleep 2

echo "tunneling frontend..."
lt --port 5173 --subdomain myfrontend-mmc &

wait
