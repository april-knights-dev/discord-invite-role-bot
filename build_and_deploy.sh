#!/bin/bash

GCP_CONFIGURATION_NAME=default
GCP_PROJECT_NAME=cogme-cup-329612
GCP_REGION=asia-northeast1

if [ -z "$1" ]
then
    ENVSUFFIX="test"
else
    ENVSUFFIX=$1
fi

# Ensure proper GCP configuration is set
gcloud config configurations activate ${GCP_CONFIGURATION_NAME}

rm data/config.json
cp data/config-"${ENVSUFFIX}".json data/config.json

docker build --no-cache -t asia.gcr.io/${GCP_PROJECT_NAME}/inviterole-"${ENVSUFFIX}" .
docker push asia.gcr.io/${GCP_PROJECT_NAME}/inviterole-"${ENVSUFFIX}"

echo "Deploy new revision of inviterole-${ENVSUFFIX}"

gcloud run deploy inviterole-"${ENVSUFFIX}" --image=asia.gcr.io/${GCP_PROJECT_NAME}/inviterole-"${ENVSUFFIX}" \
  --platform=managed --region=${GCP_REGION} --allow-unauthenticated \
  --max-instances 1 --memory=512Mi

echo "Ensure that there is cron job for checking inviterole-${ENVSUFFIX}"

# Get proper URL
GCP_APP_URL=$(gcloud run services list --platform=managed --region=${GCP_REGION} \
  --filter="status.address.url ~ inviterole-${ENVSUFFIX}" \
  --format="value(status.address.url)")

gcloud scheduler jobs create http GET-inviterolebot-"${ENVSUFFIX}" \
  --schedule="* * * * *" --uri="${GCP_APP_URL}" --http-method GET