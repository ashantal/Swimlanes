/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright owneship.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

package main

import (
	"encoding/json"
	"errors"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
)

// ============================================================================================================================
// Get listing - get a listing asset from ledger
// ============================================================================================================================
func get_listing(stub shim.ChaincodeStubInterface, id string) (Listing, error) {
	var listing Listing
	listingAsBytes, err := stub.GetState(id) //getState retreives a key/value from the ledger
	if err != nil {                          //this seems to always succeed, even if key didn't exist
		return listing, errors.New("Failed to find listing - " + id)
	}
	json.Unmarshal(listingAsBytes, &listing) //un stringify it aka JSON.parse()

	if listing.Id != id { //test if listing is actually here or just nil
		return listing, errors.New("listing does not exist - " + id)
	}

	return listing, nil
}

// ============================================================================================================================
// Get State - get the events data from ledger
// ============================================================================================================================
func get_state(stub shim.ChaincodeStubInterface, id string) (State, error) {
	var state State
	stateAsBytes, err := stub.GetState(id) //getState retreives a key/value from the ledger
	if err != nil {                        //this seems to always succeed, even if key didn't exist
		return state, errors.New("Failed to get event - " + id)
	}
	json.Unmarshal(stateAsBytes, &state) //un stringify it aka JSON.parse()

	if len(state.StateName) == 0 { //test if state is actually here or just nil
		return state, errors.New("State does not exist - " + id + ", '" + state.StateName + "'")
	}

	return state, nil
}

// ========================================================
// Input Sanitation - dumb input checking, look for empty strings
// ========================================================
func sanitize_arguments(strs []string) error {
	for i, val := range strs {
		if len(val) <= 0 {
			return errors.New("Argument " + strconv.Itoa(i) + " must be a non-empty string")
		}
		if len(val) > 32 {
			return errors.New("Argument " + strconv.Itoa(i) + " must be <= 32 characters")
		}
	}
	return nil
}
