# !/bin/bash

pushd .

PLATFORM="$1"
SIA_NODE_VERSION="v0-9-2-$PLATFORM"
SIA_RELEASE_PATH="sia-node-$SIA_NODE_VERSION"
MINGW_PATH="/c/Program Files/Git/mingw64"

if [[ ! "$1" =~ ^(win64|linux64|darwin)$ ]]; then
	echo "First argument must be a platform: linux64 win64 darwin"
	exit
fi

if [[ "$2" =~ ^(--local|--dev|--master)$ ]]; then
	echo "Building $SIA_RELEASE_PATH..."
else
	echo "Please use one of the following: --local --dev --master"
	exit
fi

cd ../../..
mkdir -p releases
cd releases

echo "Cleaning up..."
rm -rf $SIA_RELEASE_PATH

echo "Cloning..."

if [[ $* == *--local* ]]; then
	echo "Packaging LOCAL copy"
	mkdir $SIA_RELEASE_PATH
	cp -r ../sia-node/* $SIA_RELEASE_PATH/
	cd $SIA_RELEASE_PATH
	flatten-packages
elif [[ $* == *--dev* ]]; then
	echo "Packaging DEV branch"
	git clone https://github.com/aspectron/sia-node $SIA_RELEASE_PATH
	if (($? != 0)); then echo "GIT CLONE Error" && exit 1; fi
	cd $SIA_RELEASE_PATH
	git checkout -b dev
	git branch --set-upstream-to=origin/dev dev
	sleep 3
	git pull
	if (($? != 0)); then echo "GIT PULL Error" && exit 1; fi
	npm install
	if (($? != 0)); then echo "NPM Error" && exit 1; fi
	flatten-packages
elif [[ $* == *--master* ]]; then
	echo "Packaging MASTER branch"
	git clone https://github.com/aspectron/sia-node $SIA_RELEASE_PATH
	if (($? != 0)); then echo "GIT CLONE Error" && exit 1; fi
	cd $SIA_RELEASE_PATH
	npm install
	if (($? != 0)); then echo "NPM Error" && exit 1; fi
	flatten-packages
fi

# we are in $SIA_RELEASE_PATH

echo "Binaries..."

mkdir -p bin
cd bin

#mkdir mingw64
#cp -r  "$MINGW_PATH/bin/curl.exe" mingw64/
#cp -r  "$MINGW_PATH/bin/libcurl-4.dll" mingw64/

mkdir node

case "$PLATFORM" in
	win64)
		cp "/c/Program Files/nodejs/node.exe" bin/node/
		echo -e "@echo off\ncd ..\nbin\\\\node\\\\node tools/release/setup.js %1\ncd bin\npause\n" > setup.bat
		;;
	linux64)
		cp "~/node/bin/node" bin/node/
		echo -e "# !/bin/bash\ncd ..\nbin\\\\node\\\\node tools/release/setup.js %1\ncd bin\n" > setup.sh
		chmod a+x setup.sh
		;;
	darwin)
		cp "~/node/bin/node" bin/node/
		echo -e "# !/bin/bash\ncd ..\nbin\\\\node\\\\node tools/release/setup.js %1\ncd bin\n" > setup.sh
		chmod a+x setup.sh
		;;
esac	


cd ../..

if [[ ! $* == *--nopack* ]]; then
	echo "Packaging..."
	#/c/Program\ Files/WinRAR/WinRAR a -r -afzip sia-node-$SIA_NODE_VERSION.zip $SIA_RELEASE_PATH/*
	#/c/Program\ Files/Git/mingw64/zip -r sia-node-$SIA_NODE_VERSION.zip $SIA_RELEASE_PATH/*
	rm sia-node-$SIA_NODE_VERSION.zip
	zip -q -r -9 sia-node-$SIA_NODE_VERSION.zip $SIA_RELEASE_PATH/*
fi

echo "Done."

popd


