#!/usr/bin/env bash
set -euo pipefail
cd /home/project
if [ ! -d backend-nodejs-capstone/.git ]; then
  git clone https://github.com/amanzhenis/backend-nodejs-capstone.git
fi
cd backend-nodejs-capstone
mkdir -p /home/project/capstone-evidence
NAMESPACE=$(kubectl config view --minify -o 'jsonpath={..namespace}')
IMAGE="us.icr.io/${NAMESPACE}/secondchanceapp:capstone"
docker build -t "$IMAGE" .
docker push "$IMAGE"
kubectl create secret generic secondchance-secret --from-literal=JWT_SECRET="$(openssl rand -hex 32)" --dry-run=client -o yaml | kubectl apply -f -
sed "s|__IMAGE__|${IMAGE}|g" deploy/kubernetes.yml | kubectl apply -f -
kubectl rollout status deployment/mongodb-deployment --timeout=240s
kubectl rollout status deployment/secondchanceapp --timeout=240s
kubectl exec deployment/secondchanceapp -- node secondChance-backend/util/import-mongo/index.js | tee /home/project/capstone-evidence/inserted_items
kubectl port-forward --address 0.0.0.0 deployment/secondchanceapp 3060:3060 > /home/project/capstone-port.log 2>&1 &
echo 'Open port 3060 using Skills Network Launch Application'
