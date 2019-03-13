client.bundle.js: client.js gitio.js
	npx browserify client.js -o client.bundle.js -s client --ignore-missing
watch:
	fswatch -0 -o -l .1 client.js gitio.js | xargs -0 -n 1 -I {} make