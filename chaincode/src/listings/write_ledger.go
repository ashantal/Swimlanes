/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright stateship.  The ASF licenses this file
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
	"fmt"
	"strings"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// ============================================================================================================================
// write() - genric write variable into ledger
//
// Shows Off PutState() - writting a key/value into the ledger
//
// Inputs - Array of strings
//    0   ,    1
//   key  ,  value
//  "abc" , "test"
// ============================================================================================================================
func write(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var key, value string
	var err error
	fmt.Println("starting write")

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2. key of the variable and value to set")
	}

	// input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	key = args[0] //rename for funsies
	value = args[1]
	err = stub.PutState(key, []byte(value)) //write the variable into the ledger
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end write")
	return shim.Success(nil)
}

// ============================================================================================================================
// delete_listing() - remove a listing from state and from listing index
//
// Shows Off DelState() - "removing"" a key/value from the ledger
//
// Inputs - Array of strings
//      0      ,         1
//     id      ,  authed_by_company
// "m999999999", "united listings"
// ============================================================================================================================
func delete_listing(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	fmt.Println("starting delete_listing")

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	// input sanitation
	err := sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	id := args[0]
	//authed_by_company := args[1]

	// get the listing
	//listing, err := get_listing(stub, id)
	//if err != nil {
	//	fmt.Println("Failed to find listing by id " + id)
	//	return shim.Error(err.Error())
	//}

	// check authorizing company (see note in set_state() about how this is quirky)
	//if listing.State.Company != authed_by_company {
	//	return shim.Error("The company '" + authed_by_company + "' cannot authorize deletion for '" + listing.State.Company + "'.")
	//}

	// remove the listing
	err = stub.DelState(id) //remove the key from chaincode state
	if err != nil {
		return shim.Error("Failed to delete state")
	}

	fmt.Println("- end delete_listing")
	return shim.Success(nil)
}

// ============================================================================================================================
// Init listing - create a new listing, store into chaincode state
//
// Shows off building a key's JSON value manually
//
// Inputs - Array of strings
//      0      ,    1  ,  2  ,      3          ,       4
//     id      ,  color, size,     state id    ,  authing company
// "m999999999", "blue", "35", "o9999999999999", "united listings"
// ============================================================================================================================
func init_listing(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting init_listing")

	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}

	//input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	id := args[0]
	uid := strings.ToLower(args[1])
	sid := strings.ToLower(args[2])
	stateID := args[3]

	//check if new state exists
	state, err := get_state(stub, stateID)
	if err != nil {
		fmt.Println("Failed to find state - " + stateID)
		return shim.Error(err.Error())
	}

	//check authorizing company (see note in set_state() about how this is quirky)
	//if state.Company != authed_by_company {
	//	return shim.Error("The company '" + authed_by_company + "' cannot authorize creation for '" + state.Company + "'.")
	//}

	//check if listing id already exists
	listing, err := get_listing(stub, id)
	if err == nil {
		fmt.Println("This listing already exists - " + id)
		fmt.Println(listing)
		return shim.Error("This listing already exists - " + id) //all stop a listing by this id exists
	}

	//build the listing json string manually
	str := `{
		"docType":"listing", 
		"id": "` + id + `", 
		"uid": "` + uid + `", 
		"sid": "` + sid + `", 
		"state": {
			"id": "` + stateID + `", 
			"state_name": "` + state.StateName + `", 
			"state_type": "` + state.StateType + `"
		}
	}`
	err = stub.PutState(id, []byte(str)) //store listing with id as key
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end init_listing")
	return shim.Success(nil)
}

// ============================================================================================================================
// Init State - create a new state aka end user, store into chaincode state
//
// Shows off building key's value from GoLang Structure
//
// Inputs - Array of Strings
//           0     ,     1   ,   2
//      state id   , username, company
// "o9999999999999",     bob", "united listings"
// ============================================================================================================================
func init_state(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting init_state")

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	//input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	var state State
	state.ObjectType = "listing_state"
	state.Id = args[0]
	state.StateName = strings.ToLower(args[1])
	state.StateType = strings.ToLower(args[2])
	state.Enabled = true
	fmt.Println(state)

	//check if state already exists
	_, err = get_state(stub, state.Id)
	if err == nil {
		fmt.Println("This state already exists - " + state.Id)
		return shim.Error("This state already exists - " + state.Id)
	}

	//store state
	stateAsBytes, _ := json.Marshal(state)      //convert to array of bytes
	err = stub.PutState(state.Id, stateAsBytes) //store state by its Id
	if err != nil {
		fmt.Println("Could not store state")
		return shim.Error(err.Error())
	}

	fmt.Println("- end init_state listing")
	return shim.Success(nil)
}

// ============================================================================================================================
// Set State on listing
//
// Shows off GetState() and PutState()
//
// Inputs - Array of Strings
//       0     ,        1      ,        2
//  listing id  ,  to state id  , state type
// "m999999999", "o99999999999", construction,marketing,sales,legal etc..."
// ============================================================================================================================
func set_state(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting set_state")

	// this is quirky
	// todo - get the "company that authed the transfer" from the certificate instead of an argument
	// should be possible since we can now add attributes to the enrollment cert
	// as is.. this is a bit broken (security wise), but it's much much easier to demo! holding off for demos sake

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	// input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	var listing_id = args[0]
	var new_state_id = args[1]
	//var authed_by_company = args[2]
	fmt.Println(listing_id + "->" + new_state_id)

	// check if user already exists
	state, err := get_state(stub, new_state_id)
	if err != nil {
		return shim.Error("This state does not exist - " + new_state_id)
	}

	// get listing's current state
	listingAsBytes, err := stub.GetState(listing_id)
	if err != nil {
		return shim.Error("Failed to get listing")
	}
	res := Listing{}
	json.Unmarshal(listingAsBytes, &res) //un stringify it aka JSON.parse()

	// check authorizing company
	//if res.State.Company != authed_by_company {
	//	return shim.Error("The company '" + authed_by_company + "' cannot authorize transfers for '" + res.State.Company + "'.")
	//}

	// transfer the listing
	res.State.Id = new_state_id //change the state
	res.State.StateName = state.StateName
	res.State.StateType = state.StateType
	jsonAsBytes, _ := json.Marshal(res)       //convert to array of bytes
	err = stub.PutState(args[0], jsonAsBytes) //rewrite the listing with id as key
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end set state")
	return shim.Success(nil)
}

// ============================================================================================================================
// Disable listing State
//
// Shows off PutState()
//
// Inputs - Array of Strings
//       0     ,        1
//  state id       , company that auth the transfer
// "o9999999999999", "united_mables"
// ============================================================================================================================
func disable_state(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting disable_state")

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	// input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	var state_id = args[0]
	//var authed_by_company = args[1]

	// get the listing state data
	state, err := get_state(stub, state_id)
	if err != nil {
		return shim.Error("This state does not exist - " + state_id)
	}

	// check authorizing company
	//if state.Company != authed_by_company {
	//	return shim.Error("The company '" + authed_by_company + "' cannot change another companies listing state")
	//}

	// disable the state
	state.Enabled = false
	jsonAsBytes, _ := json.Marshal(state)     //convert to array of bytes
	err = stub.PutState(args[0], jsonAsBytes) //rewrite the state
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end disable_state")
	return shim.Success(nil)
}
