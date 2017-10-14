#reset the entire network and start fresh

set -e
# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

starttime=$(date +%s)
#remove docker containers
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
# remove chaincode docker images
docker rmi $(docker images dev-* -q)
# remove the local state
rm -f ~/.hfc-key-store/*
if [ ! -d ~/.hfc-key-store/ ]; then
	mkdir ~/.hfc-key-store/
fi
cp $PWD/config/crypto/prebaked/* ~/.hfc-key-store/

# launch network; create channel and join peer to channel
cd ../fabric-samples/basic-network
./start.sh

# install chaincode
cd ../../demo/scripts
node install_chaincode.js
node instantiate_chaincode.js

#done
printf "\nTotal execution time : $(($(date +%s) - starttime)) secs ...\n\n"
