#!/bin/bash
# Create experiment directory and ensure it has the correct permissions
mkdir -p /app/mlruns/0
chmod 755 /app/mlruns/0

# The same operation for the important meta.yaml file, where the experiment id is defined
echo "artifact_location: mlflow-artifacts:/0
creation_time: 1720092866890
experiment_id: '0'
last_update_time: 1720092866890
lifecycle_stage: active
name: Default
" > /app/mlruns/0/meta.yaml
chmod 755 /app/mlruns/0/meta.yaml

exec "$@"
