#!/bin/sh

# garante package.json para npm
if [ ! -f package.json ] && [ -f package.basic.json ]; then
  cp package.basic.json package.json
fi

npm install

node src/app.production.js
